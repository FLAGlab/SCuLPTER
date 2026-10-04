import unittest

import numpy as np

from plataforma.escena_virtual import (CONFIGURACION_PASOS, Camara, Mano, centro_de, cobertura,
                                       fuentes, pose, render)
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.geometria_fusion import modelo, proyectar
from plataforma.guiones import GUIONES, completa
from clasificador_simbolos import MARGEN, SIN_LEER, UMBRAL
from plataforma.vocabulario import Vocabulario

RAIZ = __file__.rsplit('/tests/', 1)[0]
DATOS = RAIZ + '/datos_locales/virtual'


def vocabulario():
    return Vocabulario(RAIZ, DATOS)


def observaciones_cerca(marco, camara, punto, radio=40.0):
    m = camara.modelo()
    uv = proyectar(m, [punto])[0][0]
    return [o for o in marco['observaciones'] if np.hypot(o['x'] - uv[0], o['y'] - uv[1]) <= radio]


def tapar(camara, punto, fraccion=0.45, radio=30.0):
    centro = camara.centro + (np.asarray(punto, float) - camara.centro) * fraccion
    return Mano((centro[0], centro[1], 0.), radio, float(centro[2]))


class GeometriaVirtualTest(unittest.TestCase):
    def test_la_pose_cenital_coincide_con_la_convencion_de_la_fusion(self):
        p = pose((0., 0., 600.), (0., 0., 0.))
        np.testing.assert_allclose(p['rot'], np.diag([1., -1., -1.]), atol=1e-9)
        np.testing.assert_allclose(p['tras'], [0., 0., 600.], atol=1e-9)

    def test_toda_camara_virtual_produce_un_modelo_valido_para_la_fusion(self):
        for camara in completa(vocabulario())[0].camaras:
            self.assertIsNotNone(modelo(camara.intrinsecos(), camara.pose(), list(camara.resolucion)))

    def test_la_pose_sigue_a_la_camara_al_moverla(self):
        camara = Camara('c', 'c', (0., 0., 300.), (0., 0., 20.))
        antes = np.asarray(camara.modelo()['centro'])
        camara.centro = np.array([80., -40., 300.])
        despues = np.asarray(camara.modelo()['centro'])
        np.testing.assert_allclose(despues, [80., -40., 300.], atol=1e-6)
        self.assertGreater(np.linalg.norm(despues - antes), 50)

    def test_la_cobertura_avisa_cuando_la_ficha_queda_pequena(self):
        cerca = cobertura(Camara('c', 'c', (0., 0., 240.), (0., 0., 20.), 48.))
        lejos = cobertura(Camara('c', 'c', (0., 0., 900.), (0., 0., 20.), 60.))
        self.assertTrue(cerca['suficiente'])
        self.assertFalse(lejos['suficiente'])
        self.assertGreater(cerca['px_por_mm'], lejos['px_por_mm'])


class EvidenciaPorCamaraTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def test_una_camara_tapada_no_aporta_observacion_de_esa_ficha(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == 'PUSH')
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        libres = {m['id']: observaciones_cerca(m['historial'][0], c, objetivo.centro)
                  for m, c in zip(marcos, escena.camaras)}
        self.assertTrue(any(libres.values()), 'sin obstáculo alguna cámara debe ver la ficha')
        tapada = escena.camaras[0]
        escena.manos = [tapar(tapada, objetivo.centro)]
        marcos, _ = fuentes(escena, self.vocabulario, 10.1, 2)
        ahora = {m['id']: observaciones_cerca(m['historial'][0], c, objetivo.centro)
                 for m, c in zip(marcos, escena.camaras)}
        self.assertEqual(ahora[tapada.id], [], 'la cámara tapada no puede reportar lo que no ve')

    def test_un_banco_cenital_no_ve_por_detras_de_una_mano(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == 'PUSH')
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        por_id = {m['id']: m['historial'][0] for m in marcos}
        ven = [c for c in escena.camaras if observaciones_cerca(por_id[c.id], c, objetivo.centro)]
        self.assertGreaterEqual(len(ven), 2, 'la disposición debe darle a la ficha más de una vista')
        escena.manos = [tapar(ven[0], objetivo.centro)]
        marcos, _ = fuentes(escena, self.vocabulario, 10.1, 2)
        por_id = {m['id']: m['historial'][0] for m in marcos}
        quedan = [c.id for c in ven if observaciones_cerca(por_id[c.id], c, objetivo.centro)]
        self.assertEqual(quedan, [],
                         'todas las cámaras miran desde arriba y del mismo lado: una mano sobre '
                         'la ficha las ciega a todas. Quitar una cámara sí se tolera; tapar una '
                         'ficha desde arriba, no.')

    def test_tapar_una_ficha_deja_la_lectura_pendiente_sin_adivinar(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == 'PUSH')
        escena.manos = [tapar(escena.camaras[0], objetivo.centro)]
        fusion = Fusion()
        resultado = None
        for paso in range(12):
            instante = 10.0 + paso * .1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        self.assertFalse(puede_ejecutar(resultado))
        self.assertNotIn('PUSH', [p['lexema'] for p in resultado['piezas'] if p['estado'] == 'confirmada'])
        self.assertTrue(resultado['avisos'])

    def test_la_evidencia_recuperada_llega_a_la_fusion(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == 'ADD')
        escena.manos = [tapar(escena.camaras[0], objetivo.centro)]
        fusion = Fusion()
        resultado = None
        for paso in range(6):
            instante = 10.0 + paso * .1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        for pieza in resultado['piezas']:
            if pieza['estado'] == 'confirmada':
                self.assertTrue(pieza['camaras'], 'toda pieza confirmada nombra la cámara que la sostiene')

    def test_el_literal_de_un_digito_se_detecta_como_region(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == '3')
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        vistas = [observaciones_cerca(m['historial'][0], c, objetivo.centro)
                  for m, c in zip(marcos, escena.camaras)]
        self.assertTrue(any(vistas), 'alguna cámara debe detectar la ficha del literal')
        leidas = [o['lexema'] for v in vistas for o in v]
        self.assertTrue(leidas, 'la detección debe llegar como observación, leída o no')

    def test_una_lectura_sin_margen_queda_sin_leer_y_no_inventa_simbolo(self):
        escena, _ = completa(self.vocabulario)
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        for marco in marcos:
            for observacion in marco['historial'][0]['observaciones']:
                if observacion['lexema'] == SIN_LEER:
                    continue
                mejor, *resto = observacion['candidatos']
                self.assertGreaterEqual(mejor['puntaje'], UMBRAL)
                if resto:
                    self.assertGreaterEqual(mejor['puntaje'] - resto[0]['puntaje'], MARGEN)

    def test_si_ninguna_camara_observa_la_ficha_no_se_confirma(self):
        escena, _ = completa(self.vocabulario)
        objetivo = next(f for f in escena.fichas if f.lexema == 'PUSH')
        escena.manos = [tapar(c, objetivo.centro) for c in escena.camaras]
        fusion = Fusion()
        resultado = None
        for paso in range(8):
            marcos, _ = fuentes(escena, self.vocabulario, 10.0 + paso * .1, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, 10.0 + paso * .1)
        leidos = [p['lexema'] for p in resultado['piezas']]
        self.assertNotIn('3', leidos, 'nadie observó el literal, no puede darse por leído')
        self.assertFalse(puede_ejecutar(resultado))

    def test_retirar_una_ficha_la_quita_de_la_verdad_y_de_las_vistas(self):
        escena, guion = GUIONES['retirada'][0](self.vocabulario)
        self.assertIn('ADD', escena.verdad())
        guion(escena, 6)
        self.assertNotIn('ADD', escena.verdad())
        objetivo = next(f for f in escena.fichas if f.lexema == 'ADD')
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        for marco, camara in zip(marcos, escena.camaras):
            self.assertEqual(observaciones_cerca(marco['historial'][0], camara, objetivo.centro), [])


class SeguridadDelGemeloTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def test_ninguna_escena_confirma_un_programa_distinto_de_la_verdad(self):
        for nombre, (constructor, _, _) in GUIONES.items():
            escena, guion = constructor(self.vocabulario)
            fusion = Fusion()
            for paso in range(6):
                guion(escena, paso)
                instante = 10.0 + paso * .1
                marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
                resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
                if puede_ejecutar(resultado):
                    self.assertEqual(sorted(p['lexema'] for p in resultado['piezas']),
                                     sorted(escena.verdad()),
                                     f'{nombre}: confirmó un montaje que no coincide con la verdad conocida')

    def test_las_imagenes_quedan_marcadas_como_sinteticas(self):
        escena, _ = completa(self.vocabulario)
        self.assertTrue(escena.sintetica)
        marcos, imagenes = fuentes(escena, self.vocabulario, 10.0, 1)
        self.assertTrue(all(m['virtual'] for m in marcos))
        self.assertEqual(set(imagenes), {c.id for c in escena.camaras})

    def test_la_verdad_conocida_no_entra_en_la_tuberia_de_reconocimiento(self):
        escena, _ = completa(self.vocabulario)
        marcos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        for marco in marcos:
            for observacion in marco['historial'][0]['observaciones']:
                self.assertNotIn('verdad', observacion)
                self.assertIn('candidatos', observacion)
                self.assertTrue(observacion['candidatos'], 'cada lectura debe venir de puntuar una imagen')

    def test_una_camara_anadida_participa_en_la_fusion(self):
        escena, _ = completa(self.vocabulario)
        antes = len(fuentes(escena, self.vocabulario, 10.0, 1)[0])
        escena.camaras.append(Camara('extra', 'Extra', centro_de(escena.fichas) + [0., 90., 250.],
                                     centro_de(escena.fichas), 50.))
        marcos, imagenes = fuentes(escena, self.vocabulario, 10.1, 2)
        self.assertEqual(len(marcos), antes + 1)
        self.assertIn('extra', imagenes)


class RenderTest(unittest.TestCase):
    def test_un_objeto_mas_cercano_tapa_al_de_detras(self):
        escena, _ = completa(vocabulario())
        camara = escena.camaras[0]
        objetivo = next(f for f in escena.fichas if f.lexema == 'PUSH')
        limpio = render(escena, camara)
        escena.manos = [tapar(camara, objetivo.centro)]
        tapado = render(escena, camara)
        uv = proyectar(camara.modelo(), [objetivo.centro])[0][0]
        x, y = int(round(uv[0])), int(round(uv[1]))
        self.assertFalse(np.array_equal(limpio[y, x], tapado[y, x]),
                         'el oclusor debe cambiar el píxel donde se proyecta la ficha')


class RevisionDelGemeloTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def test_la_revision_de_la_fusion_no_retrocede(self):
        escena, _ = completa(self.vocabulario)
        fusion = Fusion()
        revisiones = []
        for paso in range(5):
            instante = 10.0 + paso * .1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            revisiones.append(fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)['revision'])
        self.assertEqual(revisiones, sorted(revisiones))

    def test_un_cuadro_atrasado_no_reemplaza_el_estado_mas_reciente(self):
        escena, _ = completa(self.vocabulario)
        fusion = Fusion()
        for paso in range(4):
            instante = 10.0 + paso * .1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            reciente = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        firma_reciente, revision_reciente = reciente['firma'], reciente['revision']
        viejos, _ = fuentes(escena, self.vocabulario, 10.0, 1)
        despues = fusion.actualizar(viejos, CONFIGURACION_PASOS, 10.0)
        self.assertGreaterEqual(despues['revision'], revision_reciente)
        self.assertFalse(puede_ejecutar(despues) and despues['firma'] != firma_reciente
                         and despues['revision'] < revision_reciente)
