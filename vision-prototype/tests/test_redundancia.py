import unittest
from pathlib import Path

import numpy as np

from plataforma.gemelo import Gemelo

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / 'datos_locales' / 'virtual'


def asentar(gemelo, pasos=12):
    estado = None
    for _ in range(pasos):
        estado = gemelo.avanzar(1)
    return estado


def programa(estado):
    return estado['codigo']


def confirmadas(estado):
    return {p['id']: p for p in estado['fusion']['piezas'] if p['estado'] == 'confirmada'}


class RedundanciaTest(unittest.TestCase):
    def setUp(self):
        self.gemelo = Gemelo(RAIZ, DATOS)
        self.gemelo.cargar('completa')
        self.estado = asentar(self.gemelo)

    def test_la_escena_de_partida_se_acepta(self):
        self.assertTrue(self.estado['fusion']['habilita_ejecucion'], self.estado['fusion']['avisos'])
        self.assertEqual(programa(self.estado), 'PUSH a 3\nADD a')

    def test_apartar_una_camara_redundante_no_cambia_el_programa(self):
        antes = programa(self.estado)
        sobrantes = [p for p in self.estado['fusion']['piezas'] if len(p['camaras']) >= 3]
        self.assertTrue(sobrantes, 'sin cobertura de tres vistas no hay redundancia que probar')
        quitada = sobrantes[0]['camaras'][0]
        self.gemelo.quitar(quitada)
        despues = asentar(self.gemelo)
        self.assertEqual(programa(despues), antes, 'las vistas restantes deben sostener el mismo programa')
        self.assertTrue(despues['fusion']['habilita_ejecucion'], despues['fusion']['avisos'])
        self.assertNotIn(quitada, [c['id'] for c in despues['camaras']])

    def test_quedarse_sin_cobertura_deja_la_lectura_pendiente_y_lo_explica(self):
        for camara in [c['id'] for c in self.estado['camaras']][:-1]:
            self.gemelo.quitar(camara)
        despues = asentar(self.gemelo)
        self.assertEqual(len(despues['camaras']), 1)
        self.assertFalse(despues['fusion']['habilita_ejecucion'],
                         'con una sola vista y sin profundidad no se puede situar ninguna ficha')
        self.assertTrue(despues['fusion']['avisos'], 'debe decir por qué no se puede ejecutar')
        for pieza in despues['fusion']['piezas']:
            self.assertNotEqual(pieza['estado'], 'confirmada', pieza['lexema'])

    def test_el_detalle_por_ficha_clasifica_cada_camara(self):
        clases = {'asociada', 'contradice', 'ilegible', 'sin_deteccion', 'fuera'}
        for pieza in self.estado['fusion']['piezas']:
            vistas = pieza['vistas']
            self.assertEqual(len(vistas), len(self.estado['camaras']))
            for v in vistas:
                self.assertIn(v['clase'], clases)
                self.assertTrue(v['motivo'], 'cada vista debe decir en qué situación está')
            asociadas = [v for v in vistas if v['clase'] == 'asociada']
            self.assertTrue(asociadas, pieza['lexema'])
            for v in asociadas:
                self.assertEqual(v['propone'], pieza['lexema'])

    def test_el_respaldo_mostrado_es_el_que_uso_la_fusion(self):
        for pieza in self.estado['fusion']['piezas']:
            asociadas = [v['camara'] for v in pieza['vistas'] if v['clase'] == 'asociada']
            self.assertEqual(sorted(asociadas), sorted(pieza['lectores']))
            self.assertEqual(pieza['respaldo'], len(pieza['lectores']))

    def test_el_detalle_corresponde_al_cuadro_mostrado(self):
        for pieza in self.estado['fusion']['piezas']:
            sostienen = set(pieza['lectores'])
            proponen = {v['camara'] for v in pieza['vistas'] if v['propone'] == pieza['lexema']}
            self.assertTrue(sostienen <= proponen | {v['camara'] for v in pieza['vistas'] if v['ve']},
                            f"{pieza['lexema']}: la fusión cita cámaras que el detalle no reconoce")


class MoverCamaraTest(unittest.TestCase):
    def setUp(self):
        self.gemelo = Gemelo(RAIZ, DATOS)
        self.gemelo.cargar('completa')
        self.estado = asentar(self.gemelo)

    def test_mover_una_camara_produce_un_cuadro_nuevo(self):
        camara = self.estado['camaras'][0]
        antes = self.gemelo.fusion.clave
        movido = self.gemelo.mover(camara['id'], centro=[400., -600., 240.])
        self.assertNotEqual(self.gemelo.fusion.clave, antes,
                            'una pose nueva debe producir un cuadro identificable como nuevo')
        self.assertNotEqual(movido['camaras'][0]['imagen'], camara['imagen'])

    def test_apartar_una_camara_actualiza_fusion_y_procedencia(self):
        camara = self.estado['camaras'][0]['id']
        movido = self.gemelo.mover(camara, centro=[900., -900., 260.])
        for _ in range(3):
            movido = self.gemelo.avanzar(0)
        for pieza in movido['fusion']['piezas']:
            if pieza['estado'] == 'confirmada':
                self.assertNotIn(camara, pieza['lectores'],
                                 'una cámara que ya no la lee no puede seguir sosteniendo su lectura')

    def test_cambios_rapidos_de_pose_no_dejan_respuestas_atrasadas(self):
        camara = self.estado['camaras'][0]['id']
        for altura in (300., 320., 340., 360.):
            estado = self.gemelo.mover(camara, centro=[60., -15., altura])
        actual = next(c for c in estado['camaras'] if c['id'] == camara)
        self.assertAlmostEqual(actual['centro'][2], 360., places=3)
        self.assertEqual(estado['fusion']['revision'], self.gemelo.fusion.revision)
