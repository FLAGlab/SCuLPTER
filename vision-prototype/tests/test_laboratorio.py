import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import numpy as np
from plataforma.dispositivos import Cuadro
from plataforma.estado import Estado
from plataforma.laboratorio import Laboratorio

RAIZ = Path(__file__).resolve().parents[1]

class LaboratorioTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, Path(self.tmp.name))
        self.estado.stop_fusion.set()
        self.estado.hilo_fusion.join(timeout=3)
        self.lab = Laboratorio(self.estado)
        config = self.estado.accion('agregar', {'tipo': 'webcam', 'fuente': '0', 'nombre': 'Prueba', 'rol': 'simbolos'})
        self.cid = config['id']
        self.cam = self.estado.camaras[self.cid]
        self.cam.cuadro = Cuadro(np.full((60, 80, 3), 180, np.uint8), time.monotonic())
        self.cam.secuencia = 7
        self.cam.estado = 'conectada'

    def tearDown(self):
        self.lab.cerrar()
        self.estado.cerrar()
        self.tmp.cleanup()

    def esperar(self):
        self.lab.hilo.join(timeout=10)
        self.assertFalse(self.lab.hilo.is_alive())
        self.assertNotEqual(self.lab.trabajo['estado'], 'error', self.lab.trabajo)
        return Path(self.lab.trabajo['carpeta'])

    def test_captura_no_reprocesa_ni_usa_el_programa_esperado(self):
        with patch('plataforma.laboratorio.leer_detallado', side_effect=AssertionError('No reprocesar')):
            self.lab.accion('capturar', {'sesion': 'prueba', 'escena': 'cadena', 'camaras': [self.cid], 'duracion': 1, 'esperado': 'PUSH a 999'})
            carpeta = self.esperar()
        meta = json.loads((carpeta / 'sesion.json').read_text())
        self.assertEqual(meta['esperado'], 'PUSH a 999')
        self.assertFalse(meta['revisada'])
        filas = [json.loads(l) for l in (carpeta / 'cuadros.jsonl').read_text().splitlines()]
        self.assertEqual(filas[0]['vistas'][0]['secuencia'], 7)
        self.assertFalse(filas[0]['vistas'][0]['repetida'])
        self.assertTrue(filas[1]['vistas'][0]['repetida'])
        self.assertEqual(len(list(carpeta.glob('*.color.png'))), 1)
        self.assertIn('estado_servicio', filas[0])

    def test_traza_conserva_secuencia(self):
        self.lab.accion('traza', {'id': self.cid})
        carpeta = self.esperar()
        resultado = json.loads((carpeta / 'traza.json').read_text())
        self.assertEqual(resultado['vista']['secuencia'], 7)
        self.assertTrue((carpeta / resultado['pasos'][0]['archivo']).is_file())

    def test_rechaza_cuadro_viejo_y_escape_de_carpeta(self):
        self.cam.cuadro = Cuadro(self.cam.cuadro.color, time.monotonic() - 10)
        with self.assertRaises(ValueError):
            self.lab.accion('traza', {'id': self.cid})
        (Path(self.tmp.name) / 'secreto.json').write_text('{}')
        with self.assertRaises(ValueError):
            self.lab.archivo('../secreto.json')

    def test_cambio_de_detector_invalida_lectura(self):
        with self.assertRaises(ValueError):
            self.lab.accion('detector', {'ruta': 'inventada'})
        self.cam.estado = 'desconectada'
        self.estado.lector.lectura = {'estado': 'confirmada'}
        self.lab.accion('detector', {'ruta': 'caras'})
        self.assertEqual(self.estado.ruta_rgb, 'caras')
        self.assertIsNone(self.estado.lector.lectura)

    def test_no_cambia_detector_con_hilo_activo(self):
        self.cam.hilo = Mock()
        self.cam.hilo.is_alive.return_value = True
        with self.assertRaises(ValueError):
            self.lab.accion('detector', {'ruta': 'caras'})
        self.cam.hilo = None

    def test_identidad_confirmada_no_inventa_nombre_del_sistema(self):
        self.lab.accion('confirmar', {'id': self.cid})
        info = self.lab.resumen()['camaras'][0]
        self.assertTrue(info['identidad_confirmada'])
        self.assertIsNone(info['nombre_sistema'])
        self.cam.config['fuente'] = '2'
        self.assertFalse(self.lab.resumen()['camaras'][0]['identidad_confirmada'])

    def test_busqueda_acotada_sin_abrir_hardware_en_la_prueba(self):
        self.cam.estado = 'desconectada'
        respuesta = Mock(returncode=0, stdout='{"disponible": false, "resolucion": null}')
        with patch('plataforma.laboratorio.subprocess.run', return_value=respuesta) as ejecutar:
            self.lab.accion('identificar', {})
            self.esperar()
        self.assertEqual(ejecutar.call_count, 6)
        self.assertTrue(all(c.kwargs['timeout'] == 8 for c in ejecutar.call_args_list))
        self.assertEqual(len(self.lab.trabajo['dispositivos']), 6)

    def test_no_busca_con_camara_conectada(self):
        with self.assertRaises(ValueError):
            self.lab.accion('identificar', {})

    def test_recupera_registro_y_no_incluye_campos_privados(self):
        self.lab.registrar('laboratorio/confirmar', {'id': self.cid, 'password': 'NO-GUARDAR'})
        otro = Laboratorio(self.estado)
        self.assertEqual(otro.eventos[-1]['id'], self.cid)
        self.assertNotIn('NO-GUARDAR', json.dumps(list(otro.eventos)))
