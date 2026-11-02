import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

from plataforma.calibracion import LIMITE_RMS, Calibracion
from plataforma.dispositivos import Cuadro
from plataforma.estado import Estado

RAIZ = Path(__file__).resolve().parents[1]
K = np.array([[700., 0, 320], [0, 700, 240], [0, 0, 1]])


def tablero(rvec, tvec, ancho=640, alto=480, columnas=9, filas=6, mm=25.):
    """Un tablero de `columnas` x `filas` esquinas interiores visto con K desde esa pose."""
    lado = 40
    plano = np.full(((filas + 3) * lado, (columnas + 3) * lado), 255, np.uint8)
    for j in range(filas + 1):
        for i in range(columnas + 1):
            if (i + j) % 2 == 0:
                plano[(j + 1) * lado:(j + 2) * lado, (i + 1) * lado:(i + 2) * lado] = 0
    origen = np.float32([[2 * lado, 2 * lado], [(columnas + 1) * lado, 2 * lado],
                         [(columnas + 1) * lado, (filas + 1) * lado], [2 * lado, (filas + 1) * lado]])
    mundo = np.float32([[0, 0, 0], [(columnas - 1) * mm, 0, 0], [(columnas - 1) * mm, (filas - 1) * mm, 0], [0, (filas - 1) * mm, 0]])
    destino = cv2.projectPoints(mundo, np.float64(rvec), np.float64(tvec), K, np.zeros(5))[0].reshape(-1, 2).astype(np.float32)
    imagen = cv2.warpPerspective(plano, cv2.getPerspectiveTransform(origen, destino), (ancho, alto), borderValue=200)
    return cv2.cvtColor(imagen, cv2.COLOR_GRAY2BGR)


def poses(n=16):
    return [([.25 * np.sin(i), .3 * np.cos(i * 1.3), .1 * i], [-100 + 6 * i, -70 + 5 * i, 520 + 15 * i]) for i in range(n)]


class SesionTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.carpeta = Path(self.tmp.name) / 'cam' / 'sesion-1'

    def tearDown(self):
        self.tmp.cleanup()

    def test_una_sesion_guardada_se_reanuda_con_sus_puntos_e_imagenes(self):
        cal = Calibracion(carpeta=self.carpeta, camara='LifeCam')
        for rvec, tvec in poses(3):
            cal.capturar(tablero(rvec, tvec))
        otra = Calibracion.cargar(self.carpeta)
        self.assertEqual(len(otra.muestras), 3)
        self.assertEqual(otra.tamano, (640, 480))
        self.assertEqual(otra.tablero, (9, 6))
        for a, b in zip(cal.muestras, otra.muestras):
            np.testing.assert_allclose(a.reshape(-1, 2), b.reshape(-1, 2), atol=1e-3)
        self.assertTrue(otra.imagen(1).is_file(), 'la imagen original de cada muestra se conserva')

    def test_una_vista_repetida_se_rechaza_diciendo_con_cual(self):
        cal = Calibracion(carpeta=self.carpeta)
        rvec, tvec = poses(1)[0]
        cal.capturar(tablero(rvec, tvec))
        with self.assertRaisesRegex(ValueError, 'Repetida: se parece a la captura 1'):
            cal.capturar(tablero(rvec, tvec))

    def test_un_tablero_curvado_se_rechaza_con_su_motivo(self):
        cal = Calibracion(carpeta=self.carpeta)
        imagen = tablero(*poses(1)[0])
        puntos = cal.detectar(imagen)['puntos'].copy()
        x = puntos[:, 0, 0]
        puntos[:, 0, 1] += .002 * (x - x.mean()) ** 2
        with self.assertRaisesRegex(ValueError, 'no está plano'):
            cal.capturar(imagen, puntos)
        self.assertEqual(cal.muestras, [])

    def test_un_calculo_rechazado_conserva_su_diagnostico(self):
        cal = Calibracion(carpeta=self.carpeta)
        cal.tamano = (640, 480)
        rng = np.random.default_rng(0)
        for rvec, tvec in poses():
            puntos = cv2.projectPoints(cal.objeto, np.float64(rvec), np.float64(tvec), K, np.zeros(5))[0]
            cal.muestras.append((puntos + rng.normal(0, 2.5, puntos.shape)).astype(np.float32))
        resultado = cal.calcular()
        self.assertGreaterEqual(resultado['rms'], LIMITE_RMS)
        self.assertEqual(cal.diagnostico['estado'], 'rechazada')
        self.assertEqual(len(cal.diagnostico['errores']), 16)
        self.assertEqual(len(cal.diagnostico['peores']), 3)
        otra = Calibracion.cargar(self.carpeta)
        self.assertEqual(otra.diagnostico['estado'], 'rechazada', 'el diagnóstico rechazado se guarda en disco')

    def test_excluir_conserva_la_muestra_y_exige_suficientes(self):
        cal = Calibracion(carpeta=self.carpeta)
        cal.tamano = (640, 480)
        for rvec, tvec in poses():
            cal.muestras.append(cv2.projectPoints(cal.objeto, np.float64(rvec), np.float64(tvec), K, np.zeros(5))[0].astype(np.float32))
        self.assertLess(cal.calcular()['rms'], LIMITE_RMS)
        cal.excluir(3, 'borrosa')
        self.assertEqual(len(cal.muestras), 16, 'la muestra excluida se conserva')
        self.assertEqual(cal.registro[2]['historial'][-1]['motivo'], 'borrosa')
        cal.excluir(4, 'repetida')
        with self.assertRaisesRegex(ValueError, 'al menos 15'):
            cal.calcular()
        cal.excluir(4, 'era válida', excluida=False)
        self.assertEqual(cal.calcular()['capturas'], 15)


class ModoCalibracionTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, Path(self.tmp.name))
        self.id = self.estado.accion('agregar', {'tipo': 'webcam', 'fuente': '0', 'nombre': 'LifeCam', 'rol': 'simbolos'})['id']
        self.datos = {'id': self.id, 'columnas': 9, 'filas': 6, 'mm': 25}

    def tearDown(self):
        self.estado.cerrar()
        self.tmp.cleanup()

    def entrar(self):
        self.estado.accion('modo_calibracion', {**self.datos, 'activo': True})

    def test_entrar_deja_la_lectura_pendiente_y_salir_la_reinicia(self):
        camara = self.estado.camaras[self.id]
        camara.historial.append({'secuencia': 1, 'instante': time.monotonic(), 'observaciones': []})
        self.entrar()
        lectura = self.estado.lector.estado()['lectura']
        self.assertEqual(lectura['estado'], 'pendiente')
        self.assertFalse(lectura['confirmada'])
        self.assertEqual(len(camara.historial), 0)
        self.estado.procesar(camara, Cuadro(tablero(*poses(1)[0]), time.monotonic()))
        self.assertEqual(len(camara.historial), 0, 'en calibración la cámara no alimenta la fusión')
        self.estado.accion('modo_calibracion', {**self.datos, 'activo': False})
        self.assertNotIn(self.id, self.estado.calibrando)
        self.assertIsNone(self.estado.lector.estado()['lectura'])

    def test_las_esquinas_corresponden_al_cuadro_mostrado(self):
        self.entrar()
        camara = self.estado.camaras[self.id]
        self.estado.procesar(camara, Cuadro(tablero(*poses(1)[0]), time.monotonic()))
        con = self.estado.calibrando[self.id]
        self.assertTrue(con['deteccion']['encontrado'])
        vacio = np.full((480, 640, 3), 200, np.uint8)
        self.estado.procesar(camara, Cuadro(vacio, time.monotonic()))
        sin = self.estado.calibrando[self.id]
        self.assertEqual(sin['secuencia'], con['secuencia'] + 1)
        self.assertFalse(sin['deteccion']['encontrado'])
        self.assertIs(sin['color'], sin['color'])
        self.assertEqual(self.estado.vista_calibracion(self.id)['secuencia'], sin['secuencia'])
        with self.assertRaisesRegex(ValueError, 'no se encontraron'):
            self.estado.accion('capturar', self.datos)
        self.estado.procesar(camara, Cuadro(tablero(*poses(2)[1]), time.monotonic()))
        self.estado.accion('capturar', self.datos)
        guardada = cv2.imread(str(self.estado.sesiones[self.id].imagen(1)))
        np.testing.assert_array_equal(guardada, self.estado.calibrando[self.id]['color'],
                                      'se guarda el mismo cuadro del que salieron las esquinas')

    def test_el_servicio_responde_mientras_calcula_y_no_duplica(self):
        sesion = self.estado._sesion_calibracion(self.id, self.datos)
        sesion.tamano = (640, 480)
        for rvec, tvec in poses():
            sesion.muestras.append(cv2.projectPoints(sesion.objeto, np.float64(rvec), np.float64(tvec), K, np.zeros(5))[0].astype(np.float32))
        original = Calibracion.calcular
        liberar = threading.Event()

        def lento(cal):
            liberar.wait(5)
            return original(cal)

        with patch.object(Calibracion, 'calcular', lento):
            inicio = time.monotonic()
            self.estado.accion('calcular', self.datos)
            self.assertLess(time.monotonic() - inicio, .5)
            inicio = time.monotonic()
            resumen = self.estado.resumen()
            self.assertLess(time.monotonic() - inicio, .5, 'el estado se puede consultar durante el cálculo')
            camara = next(c for c in resumen['camaras'] if c['id'] == self.id)
            self.assertTrue(camara['calibracion']['calculando'])
            with self.assertRaisesRegex(ValueError, 'en curso'):
                self.estado.accion('calcular', self.datos)
            liberar.set()
            for _ in range(100):
                if not self.estado.calculando.get(self.id):
                    break
                time.sleep(.05)
        self.assertEqual(self.estado.ultimo_calculo[self.id]['estado'], 'aceptada')
        self.assertIn(self.id, self.estado.config['intrinsecos'])

    def test_una_sesion_sin_aceptar_se_reanuda_tras_reiniciar_el_servicio(self):
        self.entrar()
        camara = self.estado.camaras[self.id]
        for n, (rvec, tvec) in enumerate(poses(2)):
            self.estado.procesar(camara, Cuadro(tablero(rvec, tvec), time.monotonic() + n))
            self.estado.accion('capturar', self.datos)
        otro = Estado(RAIZ, Path(self.tmp.name))
        try:
            otro.accion('modo_calibracion', {**self.datos, 'activo': True})
            self.assertEqual(len(otro.sesiones[self.id].muestras), 2)
            otro.accion('reiniciar_calibracion', self.datos)
            self.assertEqual(len(otro.sesiones[self.id].muestras), 0)
            self.assertEqual(len(list((Path(self.tmp.name) / 'calibracion' / 'sesiones' / self.id).iterdir())), 2,
                             'reiniciar abre otra sesión y la anterior sigue en disco')
        finally:
            otro.cerrar()


if __name__ == '__main__':
    unittest.main()
