import itertools
import unittest

import numpy as np

import adjacency


CORTO, LARGO = 95.0, 115.0
MEDIDOS = (CORTO, LARGO)
UNO = "POP"
DOS = "PUSH"
MIXTA = "ADD"


def paso_de(token):
    return CORTO if adjacency.ARIDAD_BLOQUE[token] == 1 else LARGO


def recta(tokens, pasos=None):
    pasos = pasos or [paso_de(t) for t in tokens[:-1]]
    x = 0.0
    puntos = [np.array([0.0, 0.0, 0.0])]
    for paso in pasos:
        x += paso
        puntos.append(np.array([x, 0.0, 0.0]))
    return list(zip(tokens, puntos))


def curva(tokens, giro):
    ang, x, z = 0.0, 0.0, 0.0
    puntos = [np.array([0.0, 0.0, 0.0])]
    for token in tokens[:-1]:
        ang += np.radians(giro)
        x += paso_de(token) * np.cos(ang)
        z += paso_de(token) * np.sin(ang)
        puntos.append(np.array([x, 0.0, z]))
    return list(zip(tokens, puntos))


def enlaces(ops, paso):
    g = adjacency.grafo(ops, paso)
    return {tuple(sorted((i, j))) for i, vecinos in g.items() for j in vecinos}


def consecutivos(n):
    return {(i, i + 1) for i in range(n - 1)}


class PasoTest(unittest.TestCase):
    def test_un_solo_paso_o_rompe_la_cadena_mixta_o_la_une_sin_distinguir(self):
        mixta = recta([DOS, UNO, DOS, UNO, DOS])
        self.assertEqual(enlaces(mixta, CORTO), {(1, 2), (3, 4)})
        self.assertEqual(enlaces(mixta, LARGO), consecutivos(5))
        ancho = 2 * adjacency.margen(adjacency.pasos_admisibles(LARGO))
        self.assertGreater(ancho, LARGO - CORTO)
        self.assertEqual(enlaces(recta([UNO, UNO], [LARGO]), LARGO), {(0, 1)})
        self.assertEqual(enlaces(mixta, MEDIDOS), consecutivos(5))
        self.assertEqual(enlaces(recta([UNO, UNO], [LARGO]), MEDIDOS), set())

    def test_la_medida_correcta_del_bloque_corto_rompe_la_cadena_larga(self):
        self.assertEqual(enlaces(recta([DOS] * 4), CORTO), set())
        self.assertEqual(enlaces(recta([UNO] * 4), CORTO), consecutivos(4))

    def test_los_dos_pasos_medidos_cubren_las_tres_cadenas(self):
        for tokens in ([UNO] * 5, [DOS] * 5, [DOS, UNO, DOS, UNO, DOS]):
            self.assertEqual(enlaces(recta(tokens), MEDIDOS), consecutivos(5), tokens)

    def test_el_paso_se_ata_al_bloque_de_origen(self):
        self.assertEqual(enlaces(recta([UNO, UNO], [LARGO]), MEDIDOS), set())
        self.assertEqual(enlaces(recta([DOS, DOS], [CORTO]), MEDIDOS), set())
        self.assertEqual(enlaces(recta([DOS, UNO], [LARGO]), MEDIDOS), {(0, 1)})
        self.assertEqual(enlaces(recta([UNO, DOS], [CORTO]), MEDIDOS), {(0, 1)})

    def test_una_vecindad_falsa_al_curvarse_ya_no_une_bloques_de_un_parametro(self):
        ops = curva([UNO] * 6, 58)
        lejanos = [(i, j) for i, j in itertools.combinations(range(6), 2) if j > i + 1]
        distancias = {par: float(np.linalg.norm(ops[par[0]][1] - ops[par[1]][1])) for par in lejanos}
        cercanos = [par for par, d in distancias.items() if abs(d - LARGO) <= 8]
        self.assertTrue(cercanos, "el montaje debe acercar algún par no consecutivo al paso largo")
        unidos = enlaces(ops, MEDIDOS)
        for par in cercanos:
            self.assertNotIn(par, unidos, f"{par} a {distancias[par]:.0f} mm no son bloques contiguos")

    def test_una_vecindad_falsa_al_paso_propio_sigue_siendo_indistinguible(self):
        ops = curva([UNO] * 6, 60)
        unidos = enlaces(ops, MEDIDOS)
        falsas = unidos - consecutivos(6)
        self.assertTrue(falsas, "la distancia sola no distingue un bloque contiguo de uno que vuelve a su lado")
        for i, j in falsas:
            self.assertAlmostEqual(float(np.linalg.norm(ops[i][1] - ops[j][1])), CORTO, delta=8)

    def test_una_operacion_de_aridad_mixta_deja_la_union_sin_confirmar(self):
        ops = recta([MIXTA, MIXTA], [LARGO])
        self.assertEqual(enlaces(ops, MEDIDOS), {(0, 1)})
        self.assertEqual(adjacency.uniones_ambiguas(ops, MEDIDOS), [(0, 1)])

    def test_una_union_respaldada_por_un_bloque_conocido_no_es_ambigua(self):
        for tokens, pasos in ([[DOS, MIXTA], [LARGO]], [[UNO, MIXTA], [CORTO]], [[MIXTA, UNO], [CORTO]]):
            ops = recta(tokens, pasos)
            self.assertEqual(enlaces(ops, MEDIDOS), {(0, 1)}, tokens)
            self.assertEqual(adjacency.uniones_ambiguas(ops, MEDIDOS), [], tokens)

    def test_sin_dos_pasos_medidos_no_se_declara_ambiguedad(self):
        self.assertEqual(adjacency.uniones_ambiguas(recta([MIXTA, MIXTA], [LARGO]), LARGO), [])
        self.assertEqual(adjacency.uniones_ambiguas(recta([MIXTA, MIXTA], [60.0]), None), [])

    def test_pasos_admisibles_normaliza_y_descarta_basura(self):
        self.assertEqual(adjacency.pasos_admisibles(None), (adjacency.PASO_MM,))
        self.assertEqual(adjacency.pasos_admisibles([LARGO, CORTO, CORTO]), MEDIDOS)
        self.assertEqual(adjacency.pasos_admisibles([CORTO, None, 0]), (CORTO,))
        self.assertEqual(adjacency.pasos_admisibles([]), (adjacency.PASO_MM,))

    def test_el_margen_nunca_solapa_dos_pasos_vecinos(self):
        self.assertEqual(adjacency.margen((adjacency.PASO_MM,)), adjacency.TOLERANCIA_MM)
        self.assertEqual(adjacency.margen(MEDIDOS), 8.0)
        self.assertEqual(adjacency.margen((100.0, 106.0)), 3.0)

    def test_el_paso_por_omision_sigue_siendo_el_no_medido(self):
        self.assertEqual(adjacency.PASO_MM, 60.0)
        self.assertEqual(enlaces(recta([UNO] * 4, [60.0] * 3), None), consecutivos(4))

    def test_todas_las_operaciones_declaran_su_tamano_o_su_ambiguedad(self):
        from plataforma.vocabulario import OPERACIONES
        self.assertEqual(set(adjacency.ARIDAD_BLOQUE), OPERACIONES)
        for token, n in adjacency.ARIDAD_BLOQUE.items():
            self.assertIn(n, (1, 2, None), token)
            esperado = {CORTO} if n == 1 else {LARGO} if n == 2 else set(MEDIDOS)
            self.assertEqual(adjacency.pasos_de(token, MEDIDOS), esperado, token)
