import tempfile
import time
import unittest
from pathlib import Path

import numpy as np

from plataforma.escena_virtual import render
from plataforma.estado import Estado
from plataforma.dispositivos import Cuadro
from plataforma.guiones import GUIONES
from plataforma.lector import version_de

from tests.entorno import vocabulario

RAIZ = Path(__file__).resolve().parents[1]
SIN_SCALA = {'etapa': 'ok', 'valido': True}


class ServicioConLectorTest(unittest.TestCase):
    """La aplicación que conecta las webcams tiene que decidir por la misma ruta que las
    grabaciones: un solo `Lector` dentro de `Estado`, alimentado con las observaciones y la
    tinta de cada cámara."""

    escena_nombre = 'dos_webcams_corta'

    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, Path(self.temporal.name))
        # El hilo de fusión del servicio usa el reloj real; aquí conduce la prueba, así que se
        # detiene para no mezclar dos relojes sobre el mismo Lector.
        self.estado.stop_fusion.set()
        self.estado.hilo_fusion.join(timeout=3)
        self.estado.lector.validar = lambda codigo: dict(SIN_SCALA, codigo=codigo)
        self.estado.vocabulario = vocabulario()
        self.estado.lector.vocabulario = self.estado.vocabulario
        self.escena, _ = GUIONES[self.escena_nombre][0](self.estado.vocabulario)
        self.ids = {}
        for camara in self.escena.camaras:
            config = self.estado.accion('agregar', {'tipo': 'webcam', 'fuente': str(len(self.ids)),
                                                    'nombre': camara.id, 'rol': 'simbolos'})
            self.ids[camara.id] = config['id']
            self.estado.config['intrinsecos'][config['id']] = camara.intrinsecos()
            self.estado.config['poses'][config['id']] = camara.pose()
        from plataforma.escena_virtual import (AREA_TRABAJO, PASO_CORTO_MM, PASO_LARGO_MM,
                                               PLANO_FICHA_MAX_MM, PLANO_FICHA_MIN_MM)
        self.estado.config['fusion'].update(plano_min_mm=PLANO_FICHA_MIN_MM,
                                            plano_max_mm=PLANO_FICHA_MAX_MM)
        self.estado.accion('configurar_fusion', {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM,
                                                 'paso_2_mm': PASO_LARGO_MM, **AREA_TRABAJO})

    def tearDown(self):
        self.estado.cerrar()
        self.temporal.cleanup()

    def empujar(self, instante=None):
        instante = time.monotonic() if instante is None else instante
        for camara in self.escena.camaras:
            cam = self.estado.camaras[self.ids[camara.id]]
            cam.estado = 'conectada'
            self.estado.procesar(cam, Cuadro(render(self.escena, camara), instante))

    def fuentes(self):
        salida = []
        for camara in self.escena.camaras:
            cid = self.ids[camara.id]
            cam = self.estado.camaras[cid]
            salida.append({'id': cid, 'nombre': camara.id, 'estado': cam.estado,
                           'historial': list(cam.historial),
                           'intrinsecos': self.estado.config['intrinsecos'][cid],
                           'pose': self.estado.config['poses'][cid]})
        return salida

    def correr(self, capturas=12, base=None):
        base = time.monotonic() if base is None else base
        estados = []
        for n in range(capturas):
            instante = base + n*0.1
            self.empujar(instante)
            self.estado.lector.actualizar(self.fuentes(), instante)
            estados.append(self.estado.lector.estado())
        self.estado.lector.esperar()
        return estados

    def test_la_tinta_llega_al_historial_de_cada_camara(self):
        self.empujar()
        for cid in self.ids.values():
            cuadro = self.estado.camaras[cid].historial[-1]
            self.assertIn('tinta', cuadro, 'Estado.procesar tiene que conservar la tinta')
            self.assertIsInstance(cuadro['tinta'], list)

    def test_el_servicio_decide_con_el_lector_y_publica_version_y_veredicto(self):
        self.correr()
        resumen = self.estado.resumen()
        self.assertIn('lectura', resumen, 'el resumen del servicio tiene que traer la lectura')
        self.assertIn('veredicto', resumen)
        self.assertEqual(resumen['lectura']['estado'], 'confirmada', resumen['lectura']['motivo'])
        self.assertEqual(resumen['lectura']['programa'], list(self.escena.programa))
        self.assertEqual(resumen['veredicto']['version'], resumen['lectura']['version'])

    def test_una_sola_ejecucion_por_programa_aunque_lleguen_muchos_cuadros(self):
        self.correr(capturas=18)
        self.assertEqual(len(self.estado.lector.cache), 1)
        self.assertLessEqual(len(self.estado.lector.enviados), 1)

    def test_cambiar_una_ficha_cambia_la_version_y_revalida(self):
        self.correr()
        antes = self.estado.lector.version
        programa_antes = self.estado.resumen()['lectura']['programa']
        next(f for f in self.escena.fichas if f.lexema == '3').lexema = '5'
        self.correr(base=time.monotonic() + 5.0)
        resumen = self.estado.resumen()
        self.assertNotEqual(self.estado.lector.version, antes)
        self.assertNotEqual(resumen['lectura']['programa'], programa_antes)
        self.assertEqual(resumen['lectura']['estado'], 'confirmada', resumen['lectura']['motivo'])
        self.assertEqual(resumen['veredicto']['version'], resumen['lectura']['version'])
        self.assertEqual(len(self.estado.lector.cache), 2)

    def test_reiniciar_la_lectura_borra_version_y_veredicto(self):
        self.correr()
        self.assertIsNotNone(self.estado.lector.version)
        self.estado.accion('reiniciar_fusion', {})
        self.assertIsNone(self.estado.lector.version)
        self.assertIsNone(self.estado.resumen()['lectura'])


class VeredictoEnVueloTest(unittest.TestCase):
    """Un programa que reaparece mientras su validación anterior sigue en curso no debe
    producir dos ejecuciones ni quedarse sin veredicto."""

    def test_el_programa_que_reaparece_no_se_valida_dos_veces(self):
        from plataforma.lector import Lector
        arranques = []

        def lento(codigo):
            arranques.append(codigo)
            time.sleep(0.8)
            return dict(SIN_SCALA, codigo=codigo)

        lector = Lector(vocabulario(), validar=lento)
        lector.orden, lector.version = 1, 'uno'
        lector._pedir(1, 'uno', 'PUSH a 3')
        lector._pedir(1, 'uno', 'PUSH a 3')
        lector.orden, lector.version = 2, 'dos'
        lector._pedir(2, 'dos', 'PUSH a 3')
        lector.esperar()
        self.assertEqual(len(arranques), 1, f'se lanzó {len(arranques)} veces el mismo programa')

    def test_un_veredicto_en_vuelo_de_version_vieja_no_pisa_la_nueva(self):
        from plataforma.lector import Lector
        lector = Lector(vocabulario(), validar=lambda c: SIN_SCALA)
        lector.orden, lector.version = 5, 'nueva'
        self.assertFalse(lector._aceptar(4, 'vieja', {'etapa': 'ok'}, 0.2))
        self.assertIsNone(lector.veredicto)
        self.assertTrue(lector._aceptar(5, 'nueva', {'etapa': 'ok'}, 0.2))
