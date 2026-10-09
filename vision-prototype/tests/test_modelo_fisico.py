import math
import unittest

import cv2
import numpy as np

from plataforma.escena_virtual import (CONFIGURACION_PASOS, Conector, Ficha, Fondo, Soporte, Te,
                                       fuentes, marco_desde_avance, olvidar_vistas, render, rumbos)
from plataforma.fusion import Fusion, componentes, diagnosticar_grafo, puede_ejecutar, reconstruir
from plataforma.guiones import GUIONES
from clasificador_simbolos import SIN_LEER

from tests.entorno import vocabulario

PASOS = (95.0, 115.0)


def pieza(n, lexema, xyz, camaras=('a', 'b')):
    return {'id': f'p{n}', 'lexema': lexema, 'posicion': list(xyz), 'estado': 'confirmada',
            'camaras': list(camaras), 'candidatos': []}


def anillo(n, paso=95.0):
    radio = paso / (2 * math.sin(math.pi / n))
    return [(radio * math.cos(2 * math.pi * k / n), radio * math.sin(2 * math.pi * k / n)) for k in range(n)]


class GeometriaNoPlanaTest(unittest.TestCase):
    def test_un_marco_de_avance_es_ortonormal_en_cualquier_direccion(self):
        for avance in ([1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [-3, 2, 5]):
            a, lateral, normal = marco_desde_avance(avance)
            for eje in (a, lateral, normal):
                self.assertAlmostEqual(float(np.linalg.norm(eje)), 1.0, places=9)
            for x, y in ((a, lateral), (a, normal), (lateral, normal)):
                self.assertAlmostEqual(float(np.dot(x, y)), 0.0, places=9)
            np.testing.assert_allclose(np.cross(a, lateral), normal, atol=1e-9)

    def test_una_ficha_inclinada_deja_de_ser_horizontal(self):
        plana = Ficha('a', [0, 0, 23])
        inclinada = Ficha('a', [0, 0, 23], avance=[1, 0, 1])
        self.assertAlmostEqual(float(abs(plana.normal[2])), 1.0, places=9)
        self.assertLess(float(abs(inclinada.normal[2])), 0.9)
        self.assertAlmostEqual(float(np.linalg.norm(plana.esquinas()[0] - plana.centro)),
                               float(np.linalg.norm(inclinada.esquinas()[0] - inclinada.centro)), places=6)

    def test_la_inclinacion_sube_el_recorrido(self):
        caminos = rumbos(['POP a', 'POP a', 'POP a'], inclinaciones=[0.0, math.radians(40), 0.0])
        self.assertAlmostEqual(float(caminos[0][2]), 0.0, places=9)
        self.assertGreater(float(caminos[1][2]), 0.5)

    def test_el_giro_mantiene_el_recorrido_en_el_plano(self):
        caminos = rumbos(['POP a'] * 4, giros=[0.0] + [math.radians(60)] * 3)
        for avance in caminos:
            self.assertAlmostEqual(float(avance[2]), 0.0, places=9)
        self.assertAlmostEqual(float(np.dot(caminos[0], caminos[3])), math.cos(math.radians(180)), places=6)

    def test_la_escena_vertical_apila_fichas_a_distintas_alturas(self):
        escena, _ = GUIONES['vertical'][0](vocabulario())
        alturas = {round(float(f.centro[2])) for f in escena.fichas}
        self.assertGreater(len(alturas), 2)
        self.assertGreater(max(alturas), 100)
        self.assertGreaterEqual(min(alturas), 0)


class PiezasQueNoComputanTest(unittest.TestCase):
    def test_solo_las_fichas_computan(self):
        self.assertTrue(Ficha('a', [0, 0, 23]).computa)
        for otra in (Soporte([0, 0, 0]), Conector([0, 0, 0], [1, 0, 0]),
                     Te([0, 0, 0], [1, 0, 0], [0, 1, 0]), Fondo([0, 0, 0], 100, 100)):
            self.assertFalse(otra.computa, type(otra).__name__)

    def test_soportes_conectores_y_fondo_no_entran_en_el_programa(self):
        escena, _ = GUIONES['soportes'][0](vocabulario())
        del escena.camaras
        escena.camaras = []
        piezas = escena.piezas_del_programa()
        self.assertTrue(all(isinstance(p, Ficha) for p in piezas))
        self.assertEqual(sorted(p.lexema for p in piezas), sorted(escena.verdad()))

    def test_una_hoja_impresa_no_aporta_piezas_al_programa(self):
        escena, _ = GUIONES['fondo'][0](vocabulario())
        self.assertTrue(escena.fondos)
        self.assertEqual(sorted(p.lexema for p in escena.piezas_del_programa()), sorted(escena.verdad()))

    def test_la_te_declara_sus_tres_puertos(self):
        te = Te([0, 0, 6], [1, 0, 0], [0, -1, 0])
        puertos = te.puertos()
        self.assertEqual(set(puertos), {'vastago_plano', 'vastago_esferico', 'rama'})
        self.assertGreater(float(np.linalg.norm(puertos['vastago_plano'] - puertos['vastago_esferico'])), 10)
        self.assertEqual(len(te.piezas()), 2)


class DiagnosticoDelGrafoTest(unittest.TestCase):
    def test_los_componentes_separan_grupos_sin_union(self):
        self.assertEqual(componentes({0: [1], 1: [0], 2: []}), [[0, 1], [2]])
        self.assertEqual(componentes({0: [1], 1: [0, 2], 2: [1]}), [[0, 1, 2]])

    def test_una_confluencia_de_tres_se_informa_como_posible_te(self):
        te = [pieza(0, 'POP', [-95, 0, 20]), pieza(1, 'a', [-75, 0, 20]),
              pieza(2, 'POP', [0, -95, 20]), pieza(3, 'a', [20, -95, 20]),
              pieza(4, 'DUP', [0, 0, 20]), pieza(5, 'a', [20, 0, 20]),
              pieza(6, 'NEG', [95, 0, 20]), pieza(7, 'a', [115, 0, 20])]
        instrucciones, avisos = reconstruir(te, PASOS)
        self.assertEqual(instrucciones, [])
        self.assertTrue(any('conector en T' in a for a in avisos), avisos)
        self.assertTrue(any('pendiente' in a for a in avisos), avisos)

    def test_un_ciclo_cerrado_queda_pendiente_sin_inventar_orden(self):
        piezas = []
        for k, (x, y) in enumerate(anillo(6)):
            piezas.append(pieza(2 * k, 'POP', [x, y, 20]))
            piezas.append(pieza(2 * k + 1, 'a', [x + 8, y, 20]))
        instrucciones, avisos = reconstruir(piezas, PASOS)
        self.assertEqual(instrucciones, [])
        self.assertTrue(any('ciclo' in a or 'cierra sobre sí' in a for a in avisos), avisos)

    def test_dos_montajes_separados_se_informan_como_grupos(self):
        piezas = [pieza(0, 'POP', [0, 0, 20]), pieza(1, 'a', [20, 0, 20]),
                  pieza(2, 'DUP', [95, 0, 20]), pieza(3, 'a', [115, 0, 20]),
                  pieza(4, 'NEG', [0, 400, 20]), pieza(5, 'a', [20, 400, 20]),
                  pieza(6, 'POP', [95, 400, 20]), pieza(7, 'a', [115, 400, 20])]
        instrucciones, avisos = reconstruir(piezas, PASOS)
        self.assertEqual(instrucciones, [])
        self.assertTrue(any('grupos de bloques' in a for a in avisos), avisos)

    def test_una_cadena_limpia_no_produce_diagnostico(self):
        enlaces = {0: [1], 1: [0, 2], 2: [1]}
        operaciones = [('POP', np.zeros(3)), ('DUP', np.zeros(3)), ('NEG', np.zeros(3))]
        self.assertEqual(diagnosticar_grafo(operaciones, enlaces), [])


class UnionEstimadaTest(unittest.TestCase):
    def test_las_uniones_se_declaran_estimadas_por_geometria(self):
        piezas = [pieza(0, 'POP', [0, 0, 20]), pieza(1, 'a', [20, 0, 20]),
                  pieza(2, 'DUP', [95, 0, 20]), pieza(3, 'a', [115, 0, 20])]
        instrucciones, _ = reconstruir(piezas, PASOS)
        self.assertTrue(instrucciones)
        for i in instrucciones:
            self.assertTrue(i['conexion_estimada'], 'ninguna unión se observa directamente')

    def test_la_fusion_nunca_declara_conexiones_confirmadas(self):
        vocab = vocabulario()
        escena, guion = GUIONES['completa'][0](vocab)
        fusion = Fusion()
        for paso in range(12):
            guion(escena, paso)
            instante = 10.0 + paso * 0.1
            marcos, _ = fuentes(escena, vocab, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        self.assertTrue(puede_ejecutar(resultado))
        self.assertFalse(resultado['conexiones_confirmadas'])


class EscenasDelAlbumTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def recorrer(self, nombre, pasos=10):
        escena, guion = GUIONES[nombre][0](self.vocabulario)
        fusion = Fusion()
        resultado = None
        for paso in range(pasos):
            guion(escena, paso)
            instante = 10.0 + paso * 0.1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        return escena, resultado

    def test_ninguna_escena_confirma_un_montaje_distinto_de_la_verdad(self):
        for nombre in sorted(GUIONES):
            escena, resultado = self.recorrer(nombre, 8)
            if puede_ejecutar(resultado):
                self.assertEqual(sorted(p['lexema'] for p in resultado['piezas']),
                                 sorted(escena.verdad()), f'{nombre} confirmó algo distinto de la verdad')

    def test_la_te_no_confirma_ningun_orden_de_ejecucion(self):
        _, resultado = self.recorrer('te')
        self.assertFalse(puede_ejecutar(resultado))

    def test_un_bloque_que_tapa_a_otro_impide_confirmar(self):
        _, resultado = self.recorrer('bloque_tapa')
        self.assertFalse(puede_ejecutar(resultado))

    def test_la_mano_en_movimiento_impide_confirmar(self):
        _, resultado = self.recorrer('movimiento')
        self.assertFalse(puede_ejecutar(resultado))

    def test_el_fondo_impreso_no_impide_leer_el_programa(self):
        escena, resultado = self.recorrer('fondo', 12)
        self.assertEqual(sorted(p['lexema'] for p in resultado['piezas']), sorted(escena.verdad()))
        self.assertTrue(puede_ejecutar(resultado))

    def test_todas_las_escenas_rinden_de_forma_determinista(self):
        for nombre in ('vertical', 'inclinada', 'te', 'regresa', 'separados', 'soportes', 'fondo'):
            escena, _ = GUIONES[nombre][0](self.vocabulario)
            camara = escena.camaras[0]
            primero = render(escena, camara)
            olvidar_vistas()
            self.assertTrue((primero == render(escena, camara)).all(), nombre)


class IdentidadDeFichasTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def test_dos_fichas_con_el_mismo_lexema_tienen_identidad_distinta(self):
        escena, _ = GUIONES['retirar_una'][0](self.vocabulario)
        repetidas = [f for f in escena.fichas if f.lexema == 'a']
        self.assertEqual(len(repetidas), 2)
        self.assertNotEqual(repetidas[0].id, repetidas[1].id)

    def test_retirar_una_ficha_no_retira_a_su_homonima(self):
        escena, guion = GUIONES['retirar_una'][0](self.vocabulario)
        guion(escena, 0)
        self.assertEqual(sorted(escena.verdad()).count('a'), 2)
        guion(escena, 6)
        visibles = sorted(escena.verdad())
        self.assertEqual(visibles.count('a'), 1, 'solo debe desaparecer la ficha retirada')
        self.assertEqual(visibles.count('3'), 2)
        self.assertEqual(len(escena.fichas), 6, 'la ficha retirada sigue existiendo en la escena')

    def test_una_ficha_retirada_puede_volver(self):
        escena, guion = GUIONES['reaparece'][0](self.vocabulario)
        guion(escena, 0)
        self.assertIn('3', escena.verdad())
        guion(escena, 6)
        self.assertNotIn('3', escena.verdad())
        guion(escena, 10)
        self.assertIn('3', escena.verdad())

    def test_retirar_y_devolver_por_identidad(self):
        escena, _ = GUIONES['retirar_una'][0](self.vocabulario)
        objetivo = [f for f in escena.fichas if f.lexema == 'a'][0]
        escena.retirar(objetivo.id)
        self.assertEqual(sorted(escena.verdad()).count('a'), 1)
        escena.devolver(objetivo.id)
        self.assertEqual(sorted(escena.verdad()).count('a'), 2)

    def test_la_escena_de_repetidos_mantiene_las_dos_fichas_iguales(self):
        escena, _ = GUIONES['repetidos'][0](self.vocabulario)
        self.assertEqual(sorted(escena.verdad()).count('3'), 2)
        self.assertEqual(len({f.id for f in escena.fichas}), len(escena.fichas))


class FondoImpresoTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def espurias(self, nombre):
        from plataforma.geometria_fusion import proyectar
        from plataforma.lectura import leer_cuadro
        escena, _ = GUIONES[nombre][0](self.vocabulario)
        camara = escena.camaras[0]
        modelo = camara.modelo()
        _, lecturas = leer_cuadro(render(escena, camara), self.vocabulario)
        reales = [proyectar(modelo, [f.centro])[0][0] for f in escena.fichas]
        return escena, [l for l in lecturas
                        if min(float(np.hypot(l['observacion']['x'] - u[0], l['observacion']['y'] - u[1]))
                               for u in reales) > 45]

    def recorrer(self, nombre, pasos=12):
        escena, guion = GUIONES[nombre][0](self.vocabulario)
        fusion = Fusion()
        resultado = None
        for paso in range(pasos):
            guion(escena, paso)
            instante = 10.0 + paso * 0.1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        return escena, resultado

    def test_la_hoja_lleva_texto_impreso_de_verdad(self):
        escena, _ = GUIONES['fondo'][0](self.vocabulario)
        hoja = escena.fondos[0]
        self.assertIsNotNone(hoja.imagen)
        gris = hoja.imagen.reshape(-1, 3).min(axis=1)
        self.assertLess(int(gris.min()), 120, 'la hoja debe tener tinta, no ser una superficie lisa')

    def test_un_fondo_con_texto_no_produce_lecturas_falsas(self):
        _, espurias = self.espurias('fondo')
        self.assertEqual(espurias, [])

    def test_un_fondo_dificil_si_produce_lecturas_falsas(self):
        _, espurias = self.espurias('fondo_dificil')
        self.assertTrue(espurias, 'los recuadros impresos deben llegar a parecer fichas')

    def test_un_fondo_con_texto_no_impide_confirmar(self):
        escena, resultado = self.recorrer('fondo')
        self.assertTrue(puede_ejecutar(resultado))
        self.assertEqual(sorted(p['lexema'] for p in resultado['piezas']), sorted(escena.verdad()))

    def test_un_fondo_dificil_se_descarta_por_altura(self):
        _, espurias = self.espurias('fondo_dificil')
        self.assertTrue(espurias, 'los recuadros impresos deben detectarse en la imagen')
        escena, resultado = self.recorrer('fondo_dificil')
        self.assertEqual(sorted(p['lexema'] for p in resultado['piezas']), sorted(escena.verdad()),
                         'las marcas impresas no deben añadirse como piezas del programa')
        hoja = escena.fondos[0]
        for pieza in resultado['piezas']:
            self.assertGreater(pieza['posicion'][2], hoja.centro[2] + 10,
                               'ninguna pieza del programa puede estar a la altura del papel')

    def test_un_fondo_dificil_no_confirma_nada_falso(self):
        escena, resultado = self.recorrer('fondo_dificil')
        if puede_ejecutar(resultado):
            codigo = [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
            self.assertEqual(codigo, list(escena.programa),
                             'solo puede confirmar si lo confirmado es el programa que hay sobre la mesa')


class DibujoDesconocidoTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def garabato(self):
        imagen = np.full((180, 180, 3), 250, np.uint8)
        cv2.rectangle(imagen, (16, 16), (164, 164), (120, 120, 120), 14, cv2.LINE_AA)
        trazo = np.array([[58, 126], [76, 56], [102, 122], [124, 58]], np.int32)
        cv2.polylines(imagen, [trazo], False, (40, 40, 40), 10, cv2.LINE_AA)
        cv2.line(imagen, (62, 92), (122, 92), (40, 40, 40), 8, cv2.LINE_AA)
        return imagen

    def escena_con_garabato(self):
        escena, _ = GUIONES['completa'][0](self.vocabulario)
        escena.plantillas['garabato'] = self.garabato()
        original = next(f for f in escena.fichas if f.lexema == '3')
        original.lexema = 'garabato'
        return escena, original

    def test_un_dibujo_libre_no_se_convierte_en_un_token_conocido(self):
        from plataforma.geometria_fusion import proyectar
        from plataforma.lectura import leer_cuadro
        escena, suelta = self.escena_con_garabato()
        visto = 0
        for camara in escena.camaras:
            donde = proyectar(camara.modelo(), [suelta.centro])[0][0]
            _, lecturas = leer_cuadro(render(escena, camara), self.vocabulario)
            for lectura in lecturas:
                o = lectura['observacion']
                if float(np.hypot(o['x'] - donde[0], o['y'] - donde[1])) > 30:
                    continue
                visto += 1
                self.assertEqual(o['lexema'], SIN_LEER, f"el garabato se leyó como {o['lexema']}")
        self.assertGreaterEqual(visto, 2, 'el garabato ocupa el sitio de una ficha y debe detectarse')

    def test_un_dibujo_libre_deja_el_programa_sin_confirmar(self):
        escena, _ = self.escena_con_garabato()
        fusion = Fusion()
        resultado = None
        for paso in range(12):
            instante = 10.0 + paso * 0.1
            marcos, _ = fuentes(escena, self.vocabulario, instante, paso + 1)
            resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        leidos = [p['lexema'] for p in resultado['piezas']]
        self.assertNotIn('garabato', leidos)
        self.assertNotIn('3', leidos, 'no hay ningún 3 sobre la mesa que se pueda confirmar')
        self.assertFalse(puede_ejecutar(resultado))
