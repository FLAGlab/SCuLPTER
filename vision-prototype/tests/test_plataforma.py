import base64
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
from plataforma.estado import Estado
from plataforma.dispositivos import Cuadro, Camara
from plataforma.calibracion import Calibracion
from plataforma.vocabulario import lexema
from plataforma.fusion import ganador
from clasificador_simbolos import aceptar_candidatos
from plataforma.lectura import leer_cuadro
from herramientas.evaluar_dataset import evaluar_imagen

RAIZ = Path(__file__).resolve().parents[1]


class PlataformaTest(unittest.TestCase):
    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, Path(self.temporal.name))

    def tearDown(self):
        self.estado.cerrar()
        self.temporal.cleanup()

    def agregar(self, fuente='0'):
        return self.estado.accion('agregar', {'tipo': 'webcam', 'fuente': fuente, 'nombre': 'Cenital', 'rol': 'simbolos'})['id']

    def test_persistencia_sin_encender_camaras(self):
        id = self.agregar()
        self.estado.accion('principal', {'id': id})
        otro = Estado(RAIZ, self.temporal.name)
        self.assertEqual(otro.resumen()['principal'], id)
        self.assertEqual(otro.camaras[id].estado, 'desconectada')
        otro.cerrar()
        with self.assertRaises(ValueError):
            self.agregar()
        self.estado.accion('eliminar', {'id': id})
        self.assertIsNone(self.estado.resumen()['principal'])

    def test_varias_camaras_estabilidad_y_obsolescencia(self):
        a, b = self.agregar(), self.agregar('1')
        imagen = np.full((80, 80, 3), 255, np.uint8)
        ahora = time.monotonic()
        with patch('plataforma.lectura.regiones', return_value=[(imagen, 40, 40)]), patch.object(self.estado.vocabulario, 'puntuar', return_value=[{'lexema': 'POP', 'puntaje': .9}]):
            self.estado.procesar(self.estado.camaras[a], Cuadro(imagen, ahora-1))
            self.estado.procesar(self.estado.camaras[a], Cuadro(imagen, ahora))
        self.assertTrue(self.estado.resumen()['camaras'][0]['estable'])
        self.assertEqual(self.estado.camaras[b].secuencia, 0)
        self.estado.camaras[a].cuadro.instante -= 3
        self.assertFalse(self.estado.resumen()['camaras'][0]['estable'])
        with self.assertRaises(ValueError):
            self.estado.cuadro(a)

    def test_movimiento_y_empate_no_se_ocultan(self):
        id = self.agregar()
        cam = self.estado.camaras[id]
        img = np.full((80, 80, 3), 255, np.uint8)
        with patch('plataforma.lectura.regiones', return_value=[(img, 40, 40)]), patch.object(self.estado.vocabulario, 'puntuar', return_value=[{'lexema': 'POP', 'puntaje': .9}, {'lexema': 'DUP', 'puntaje': .88}]):
            self.estado.procesar(cam, Cuadro(img, time.monotonic()-1))
            self.estado.procesar(cam, Cuadro(img, time.monotonic()))
        self.assertEqual(cam.observaciones[0]['lexema'], '<sin leer>')
        with patch('plataforma.lectura.regiones', return_value=[(img, 60, 40)]):
            self.estado.procesar(cam, Cuadro(img, time.monotonic()))
        self.assertFalse(cam.datos['estable'])

    def test_regla_compartida_en_los_valores_limite(self):
        casos = [
            ([('PUSH', .45), ('MOV', .37)], 'PUSH'),
            ([('PUSH', .449999), ('MOV', .36)], None),
            ([('PUSH', .8), ('MOV', .720001)], None),
            ([('PUSH', .8), ('MOV', .72)], 'PUSH'),
        ]
        for candidatos, esperado in casos:
            diccionarios = [{'lexema': lexema, 'puntaje': valor} for lexema, valor in candidatos]
            self.assertEqual(aceptar_candidatos(candidatos), esperado)
            self.assertEqual(aceptar_candidatos(diccionarios), esperado)
            self.assertEqual(ganador(diccionarios), esperado)

    def test_evaluador_y_camara_comparten_lectura(self):
        id = self.agregar()
        imagen = np.full((80, 80, 3), 255, np.uint8)
        ruta = Path(self.temporal.name) / 'cuadro.png'
        cv2.imwrite(str(ruta), imagen)
        with patch('plataforma.lectura.regiones', return_value=[(imagen, 40, 40)]), patch.object(self.estado.vocabulario, 'puntuar', return_value=[{'lexema': 'PUSH', 'puntaje': .45}, {'lexema': 'MOV', 'puntaje': .37}]):
            self.estado.procesar(self.estado.camaras[id], Cuadro(imagen, time.monotonic()))
            medido = evaluar_imagen(str(ruta), 'PUSH', self.estado.vocabulario)
        self.assertEqual(self.estado.camaras[id].observaciones[0]['lexema'], 'PUSH')
        self.assertEqual(medido['reconstruido'], ['PUSH'])
        self.assertTrue(medido['programa_exacto'])
        with patch('plataforma.lectura.regiones', return_value=[(imagen, 40, 40)]), patch.object(self.estado.vocabulario, 'puntuar', return_value=[]):
            _, lecturas = leer_cuadro(imagen, self.estado.vocabulario)
        self.assertEqual(lecturas, [])

    def test_referencias_multiples_e_identidad_libre(self):
        img = np.full((120, 120, 3), 255, np.uint8)
        cv2.line(img, (35, 25), (85, 95), (0, 0, 0), 5)
        contenido = base64.b64encode(cv2.imencode('.png', img)[1]).decode()
        v = self.estado.vocabulario
        token = v.guardar({'nombre': '★', 'tipo': 'pila', 'imagen': contenido})
        n = len(v.plantillas[token])
        v.guardar({'nombre': '★', 'tipo': 'pila', 'imagen': contenido})
        self.assertEqual(len(v.plantillas[token]), n*2)
        self.assertEqual(token, 'sculpt_label_2605')
        self.assertNotEqual(lexema('nil', 'pila'), lexema('nil', 'literal'))
        with self.assertRaises(ValueError):
            v.ruta_foto('../../archivo')
        with self.assertRaises(ValueError):
            lexema('inventada', 'operacion')

    def test_calibracion_sintetica(self):
        cal = Calibracion()
        k = np.array([[700., 0, 320], [0, 700, 240], [0, 0, 1]])
        cal.tamano = (640, 480)
        for i in range(16):
            puntos, _ = cv2.projectPoints(cal.objeto, np.array([.1+i*.015, -.15+i*.02, i*.01]), np.array([-90.+i*2, -60.+i, 600.+i*8]), k, np.zeros(5))
            cal.muestras.append(puntos)
        resultado = cal.calcular()
        self.assertLess(resultado['rms'], .01)
        np.testing.assert_allclose(resultado['camera_matrix'], k, atol=.1)
        with self.assertRaises(ValueError):
            Calibracion().calcular()

    def test_rechaza_capturas_repetidas_y_cambio_resolucion(self):
        cal = Calibracion()
        puntos = np.zeros((54, 1, 2), np.float32)
        img = np.zeros((480, 640, 3), np.uint8)
        with patch.object(cal, 'esquinas', return_value=puntos):
            cal.capturar(img)
            with self.assertRaises(ValueError):
                cal.capturar(img)
            with self.assertRaises(ValueError):
                cal.capturar(img[:200])

    def test_registro_conjunto_atomico(self):
        a, b = self.agregar(), self.agregar('1')
        imagen = np.zeros((480, 640, 3), np.uint8)
        intr = {'camera_matrix': [[700, 0, 320], [0, 700, 240], [0, 0, 1]], 'dist_coeffs': [0]*5, 'image_size': [640, 480]}
        for id in [a, b]:
            self.estado.camaras[id].estado = 'conectada'
            self.estado.camaras[id].cuadro = Cuadro(imagen, time.monotonic(), intrinsecos=intr)
        datos = {'id': a, 'columnas': 9, 'filas': 6, 'mm': 25}
        pose = {'rot': np.eye(3).tolist(), 'tras': [0, 0, 500], 'rms': .1}
        with patch.object(Calibracion, 'pose', side_effect=[pose, ValueError('tablero oculto')]):
            with self.assertRaises(ValueError):
                self.estado.accion('registrar', datos)
        self.assertEqual(self.estado.config['poses'], {})
        with patch.object(Calibracion, 'pose', return_value=pose):
            self.estado.accion('registrar', datos)
        self.assertEqual(set(self.estado.config['poses']), {a, b})
        self.estado.camaras[b].cuadro.instante -= 1
        with self.assertRaises(ValueError):
            self.estado.accion('registrar', datos)

    def test_filas_incompatibles_no_se_recortan_para_ejecutar(self):
        id = self.agregar()
        imagen = np.full((80, 80, 3), 255, np.uint8)
        regiones = [(imagen, x, 40) for x in [10, 30, 50, 70]]
        with patch('plataforma.lectura.regiones', return_value=regiones), patch.object(self.estado.vocabulario, 'puntuar', return_value=[{'lexema': 'a', 'puntaje': .9}]):
            self.estado.procesar(self.estado.camaras[id], Cuadro(imagen, time.monotonic()))
        datos = self.estado.camaras[id].datos
        self.assertFalse(datos['compatible'])
        self.assertEqual(len(datos['instrucciones'][0]['operandos']), 3)
        self.assertEqual(len(datos['avisos']), 2)

    def test_coordenadas_de_observacion_usadas_por_fusion_son_originales(self):
        id = self.agregar()
        img = np.full((1080,1920,3),255,np.uint8)
        pequena = np.full((540,960,3),255,np.uint8)
        with patch('plataforma.lectura.reducir_resolucion', return_value=pequena), patch('plataforma.lectura.regiones', return_value=[(pequena[:20,:30],100,200)]), patch.object(self.estado.vocabulario,'puntuar', return_value=[{'lexema':'PUSH','puntaje':.9}]):
            self.estado.procesar(self.estado.camaras[id],Cuadro(img,time.monotonic()))
        o = self.estado.camaras[id].historial[-1]['observaciones'][0]
        self.assertEqual((o['x'],o['y']),(200,400))
        self.assertEqual(o['caja'],[170,380,60,40])
        self.assertEqual(self.estado.camaras[id].historial[-1]['resolucion'],[1920,1080])

    def test_configuracion_fusion_y_reinicio_sin_dispositivo(self):
        self.estado.accion('configurar_fusion',{'modo':'fusion','paso_mm':105})
        self.assertTrue(self.estado.config['fusion']['medido'])
        self.assertEqual(self.estado.config['fusion']['paso_mm'],105)
        self.estado.accion('reiniciar_fusion',{})
        self.assertFalse(self.estado.resumen()['fusion']['estable'])
        for datos in [{'modo':'otro','paso_mm':100},{'modo':'fusion','paso_mm':'nan'},{'modo':'fusion','paso_mm':0}]:
            with self.assertRaises(ValueError): self.estado.accion('configurar_fusion',datos)

    def test_captura_antigua_no_reemplaza_una_nueva(self):
        id = self.agregar()
        cam = self.estado.camaras[id]
        img = np.full((80,80,3),255,np.uint8)
        with patch('plataforma.lectura.regiones',return_value=[]):
            t=time.monotonic()
            self.estado.procesar(cam,Cuadro(img,t))
            self.estado.procesar(cam,Cuadro(img,t-1))
        self.assertEqual(cam.secuencia,1)
        self.assertEqual(cam.cuadro.instante,t)

    def test_adaptador_fallido_no_afecta_otras_camaras(self):
        a, b = self.agregar(), self.agregar('1')
        with patch('plataforma.dispositivos.Webcam', side_effect=RuntimeError('no disponible')):
            self.estado.camaras[a].iniciar()
            self.estado.camaras[a].hilo.join(2)
        self.assertEqual(self.estado.camaras[a].estado, 'error')
        self.assertEqual(self.estado.camaras[b].estado, 'desconectada')


if __name__ == '__main__':
    unittest.main()
