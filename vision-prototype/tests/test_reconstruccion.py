"""Tests for the 3D reconstruction pipeline that need no cameras or blocks.

Run from the repo root:  python3 -m unittest discover -s vision-prototype/tests
"""
import os
import sys
import unittest

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))

import adjacency  # noqa: E402
import triangulate  # noqa: E402

PUNTOS = os.path.join(os.path.dirname(AQUI), "test_points")


def cargar(nombre):
    return adjacency.load_points(os.path.join(PUNTOS, nombre))


class ProgramaDesdePuntos(unittest.TestCase):
    def test_cadena_con_parametros(self):
        lines, warnings = adjacency.build_program(cargar("chain_with_params.json"))
        self.assertEqual(lines, ["PUSH heart 3", "PUSH heart 10", "ADD heart"])
        self.assertEqual(warnings, [])

    def test_cadena_invertida_da_el_mismo_programa(self):
        lines, warnings = adjacency.build_program(cargar("chain_reversed.json"))
        self.assertEqual(lines, ["PUSH heart 3", "PUSH heart 10", "ADD heart"])
        self.assertEqual(warnings, [])

    def test_loop_con_prefijo_emite_jmp_al_reingreso(self):
        lines, warnings = adjacency.build_program(cargar("loop_with_prefix.json"))
        self.assertEqual(
            lines,
            ["PUSH heart 1", "PUSH circle 0", "DUP heart", "ADD heart", "MOV circle heart", "POP heart", "JMP -4"],
        )
        self.assertEqual(warnings, [])

    def test_loop_puro_emite_jmp_menos_n(self):
        lines, _ = adjacency.build_program(cargar("loop.json"))
        self.assertEqual(lines[-1], "JMP -4")
        self.assertEqual(len(lines), 5)

    def test_sin_parametros_avisa_direccion(self):
        _, warnings = adjacency.build_program(cargar("simple_chain.json"))
        self.assertTrue(any("direction unconfirmed" in w for w in warnings))

    def test_bloque_aislado_se_reporta(self):
        _, warnings = adjacency.build_program(cargar("isolated_block.json"))
        self.assertTrue(any(w.startswith("POP:") and "not reachable" in w for w in warnings))

    def test_vacio(self):
        self.assertEqual(adjacency.build_program([]), ([], []))


def _camara_sintetica(rotacion_deg_y: float, traslacion):
    """Intrinsics + pose for a virtual 640x480 camera rotated about Y."""
    mtx = np.array([[600.0, 0, 320.0], [0, 600.0, 240.0], [0, 0, 1]])
    dist = np.zeros(5)
    rot, _ = cv2.Rodrigues(np.array([0.0, np.deg2rad(rotacion_deg_y), 0.0]))
    return mtx, dist, rot, np.array(traslacion, dtype=float).reshape(3, 1)


def _proyectar(points_3d, mtx, rot, trans):
    proj = mtx @ np.hstack([rot, trans])
    out = []
    for lexeme, p in points_3d:
        h = proj @ np.array([*p, 1.0])
        out.append((lexeme, float(h[0] / h[2]), float(h[1] / h[2])))
    return out


class PipelineEstereoSintetica(unittest.TestCase):
    def setUp(self):
        # Camera A at the origin looking down +z; the table sits ~600 mm away.
        self.mtx_a, self.dist_a, _, _ = _camara_sintetica(0, [0, 0, 0])
        # Camera B: 200 mm to the right, yawed 15 degrees back towards the table.
        self.mtx_b, self.dist_b, self.rot, self.trans = _camara_sintetica(-15, [-200, 0, 40])
        self.proj_a, self.proj_b = triangulate.build_projections(self.mtx_a, self.mtx_b, self.rot, self.trans)
        self.fund = triangulate.fundamental_matrix(self.mtx_a, self.mtx_b, self.rot, self.trans)

        # Program from the fixture, moved in front of the cameras.
        self.escena = [(lexeme, p + np.array([-100.0, -30.0, 600.0])) for lexeme, p in cargar("loop_with_prefix.json")]

    def test_duplicados_se_emparejan_por_epipolar_y_se_recupera_el_programa(self):
        dets_a = _proyectar(self.escena, self.mtx_a, np.eye(3), np.zeros((3, 1)))
        dets_b = _proyectar(self.escena, self.mtx_b, self.rot, self.trans)
        # Shuffle B so the pairing cannot rely on detection order.
        dets_b = dets_b[::-1]

        pairs, warnings = triangulate.match_detections(dets_a, dets_b, self.fund, self.proj_a, self.proj_b)
        self.assertEqual(warnings, [])
        self.assertEqual(len(pairs), len(self.escena))

        points = triangulate.triangulate_pairs(pairs, self.proj_a, self.proj_b)
        # Every triangulated point must land within 1 mm of an original of the same lexeme.
        pendientes = list(self.escena)
        for lexeme, p in points:
            idx = next(
                (i for i, (l, p_orig) in enumerate(pendientes) if l == lexeme and np.linalg.norm(p - p_orig) < 1.0),
                None,
            )
            self.assertIsNotNone(idx, f"{lexeme} at {np.round(p, 1)} matches no original point")
            pendientes.pop(idx)
        self.assertEqual(pendientes, [])

        lines, program_warnings = adjacency.build_program(points)
        self.assertEqual(
            lines,
            ["PUSH heart 1", "PUSH circle 0", "DUP heart", "ADD heart", "MOV circle heart", "POP heart", "JMP -4"],
        )
        self.assertEqual(program_warnings, [])

    def test_deteccion_sin_pareja_se_avisa(self):
        dets_a = _proyectar(self.escena, self.mtx_a, np.eye(3), np.zeros((3, 1)))
        dets_b = _proyectar(self.escena[:-1], self.mtx_b, self.rot, self.trans)
        pairs, warnings = triangulate.match_detections(dets_a, dets_b, self.fund, self.proj_a, self.proj_b)
        self.assertEqual(len(pairs), len(self.escena) - 1)
        self.assertTrue(any(w.startswith("heart:") for w in warnings))


if __name__ == "__main__":
    unittest.main()
