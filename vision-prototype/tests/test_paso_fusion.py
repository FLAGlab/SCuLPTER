import unittest

from plataforma.fusion import CONFIGURACION, Fusion, puede_ejecutar
from tests.test_fusion import con_area, fuente

CORTO, LARGO = 95.0, 115.0
CONFIG = {**CONFIGURACION, 'medido': True, 'paso_mm': CORTO, 'paso_2_mm': LARGO}
UN_PASO = {**CONFIGURACION, 'medido': True, 'paso_mm': LARGO, 'paso_2_mm': None}


def bloque(token, operandos, x):
    puntos = [(token, [x, 0, 20])]
    for n, operando in enumerate(operandos):
        puntos.append((operando, [x + 20 + n * 20, 0, 20]))
    return puntos


def escena(bloques, pasos):
    x, puntos = -40.0, []
    for n, (token, operandos) in enumerate(bloques):
        puntos += bloque(token, operandos, x)
        if n < len(pasos):
            x += pasos[n]
    return puntos


def leer(puntos, config=CONFIG, vueltas=12):
    config = con_area(config, puntos)
    fusion = Fusion()
    resultado = None
    for n in range(vueltas):
        t = 10.0 + n * 0.1
        resultado = fusion.actualizar([fuente('arriba', [-100, -70, 600], puntos, t, secuencia=n + 1),
                                       fuente('lado', [100, 70, 600], puntos, t, secuencia=n + 1)], config, t)
    return resultado


def programa(resultado):
    return [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]


class PasoPorSentidoTest(unittest.TestCase):
    def test_un_bloque_de_dos_parametros_no_admite_el_paso_corto_delante(self):
        r = leer(escena([('PUSH', ['a', '2']), ('POP', ['b'])], [CORTO]))
        self.assertFalse(puede_ejecutar(r))
        self.assertTrue(any('no corresponde al bloque que iría delante' in a for a in r['avisos']), r['avisos'])

    def test_la_misma_escena_con_el_paso_largo_si_se_confirma(self):
        r = leer(escena([('PUSH', ['a', '2']), ('POP', ['b'])], [LARGO]))
        self.assertTrue(puede_ejecutar(r), r['avisos'])
        self.assertEqual(programa(r), ['PUSH a 2', 'POP b'])

    def test_el_sentido_inverso_con_su_paso_propio_se_confirma(self):
        r = leer(escena([('POP', ['b']), ('PUSH', ['a', '2'])], [CORTO]))
        self.assertTrue(puede_ejecutar(r), r['avisos'])
        self.assertEqual(programa(r), ['POP b', 'PUSH a 2'])

    def test_una_cadena_mixta_correcta_se_confirma(self):
        r = leer(escena([('PUSH', ['a', '3']), ('POP', ['a']), ('MOV', ['b', 'a'])], [LARGO, CORTO]))
        self.assertTrue(puede_ejecutar(r), r['avisos'])
        self.assertEqual(programa(r), ['PUSH a 3', 'POP a', 'MOV b a'])

    def test_una_cadena_mixta_con_un_paso_cambiado_no_se_confirma(self):
        r = leer(escena([('PUSH', ['a', '3']), ('POP', ['a']), ('MOV', ['b', 'a'])], [CORTO, CORTO]))
        self.assertFalse(puede_ejecutar(r))

    def test_una_cadena_corta_homogenea_se_confirma_en_los_dos_sentidos(self):
        for bloques in ([('POP', ['a']), ('DUP', ['a'])], [('DUP', ['a']), ('POP', ['a'])]):
            r = leer(escena(bloques, [CORTO]))
            self.assertTrue(puede_ejecutar(r), (bloques, r['avisos']))

    def test_los_parametros_observados_resuelven_la_aridad_mixta(self):
        corta = leer(escena([('ADD', ['a']), ('POP', ['a'])], [CORTO]))
        self.assertTrue(puede_ejecutar(corta), corta['avisos'])
        self.assertEqual(programa(corta), ['ADD a', 'POP a'])
        larga = leer(escena([('ADD', ['a', '2']), ('POP', ['a'])], [LARGO]))
        self.assertTrue(puede_ejecutar(larga), larga['avisos'])
        self.assertEqual(programa(larga), ['ADD a 2', 'POP a'])

    def test_una_aritmetica_de_un_parametro_no_admite_el_paso_largo(self):
        r = leer(escena([('ADD', ['a']), ('POP', ['a'])], [LARGO]))
        self.assertFalse(puede_ejecutar(r))
        self.assertTrue(any('no corresponden a los parámetros observados' in a for a in r['avisos']), r['avisos'])

    def test_con_un_solo_paso_medido_no_se_aplica_la_comprobacion(self):
        r = leer(escena([('PUSH', ['a', '2']), ('POP', ['b'])], [LARGO]), UN_PASO)
        self.assertTrue(puede_ejecutar(r), r['avisos'])
        self.assertFalse(any('no corresponde al bloque que iría delante' in a for a in r['avisos']), r['avisos'])
