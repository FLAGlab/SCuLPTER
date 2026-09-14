"""Tests for the 3D reconstruction pipeline that need no cameras or blocks.

Run from the repo root:  python3 -m unittest discover -s vision-prototype/tests
"""
import json
import os
import sys
import tempfile
import unittest

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))

import adjacency  # noqa: E402
import calibrate_cameras  # noqa: E402
import clasificador_simbolos  # noqa: E402
import evaluar_dataset  # noqa: E402
import reconstruir  # noqa: E402
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


class ClasificadorDeSimbolos(unittest.TestCase):
    """Con las plantillas que haya en referencias/ (hoy, las del render)."""

    def setUp(self):
        if not clasificador_simbolos.hay_referencias():
            self.skipTest("referencias/ vacía")

    def test_cada_plantilla_se_reconoce_a_si_misma_con_margen(self):
        tabla = clasificador_simbolos.cargar_tabla_simbolos()
        for nombre_archivo in sorted(os.listdir(clasificador_simbolos.CARPETA_REFERENCIAS)):
            nombre, ext = os.path.splitext(nombre_archivo)
            if ext.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            imagen = cv2.imread(os.path.join(clasificador_simbolos.CARPETA_REFERENCIAS, nombre_archivo))
            lexema, candidatos = clasificador_simbolos.reconocer_detallado(imagen)
            with self.subTest(plantilla=nombre_archivo):
                self.assertEqual(lexema, tabla.get(nombre, nombre))
                self.assertGreater(candidatos[0][1], 0.95)

    def test_ruido_y_blanco_se_rechazan(self):
        rng = np.random.default_rng(0)
        self.assertIsNone(clasificador_simbolos.reconocer(rng.integers(0, 255, (60, 60, 3), dtype=np.uint8)))
        self.assertIsNone(clasificador_simbolos.reconocer(np.full((60, 60, 3), 240, np.uint8)))

    def test_mancha_cuadrada_se_rechaza_por_margen(self):
        mancha = np.full((60, 60, 3), 230, np.uint8)
        cv2.rectangle(mancha, (15, 15), (45, 45), (40, 40, 40), -1)
        lexema, candidatos = clasificador_simbolos.reconocer_detallado(mancha)
        self.assertIsNone(lexema)
        self.assertLess(candidatos[0][1] - candidatos[1][1], clasificador_simbolos.MARGEN_MINIMO)

    def test_imagen_de_prueba_da_tres_operaciones(self):
        ruta = os.path.join(os.path.dirname(AQUI), "imagenes_prueba", "demo_simbolos_reales.png")
        if not os.path.isfile(ruta):
            self.skipTest("sin imagen de prueba")
        detecciones, _ = reconstruir.detectar_en_cuadro(cv2.imread(ruta))
        self.assertEqual(sorted(lexema for lexema, _, _ in detecciones), ["ADD", "DUP", "MUL"])


class FiltroDeRegiones(unittest.TestCase):
    def _cuadro_con_rectangulo(self, w, h):
        cuadro = np.full((480, 640, 3), 235, np.uint8)
        cv2.rectangle(cuadro, (100, 100), (100 + w, 100 + h), (30, 30, 30), -1)
        return cuadro

    def test_region_cuadrada_pasa(self):
        regiones = reconstruir.detectar_regiones_por_contorno(self._cuadro_con_rectangulo(60, 60))
        self.assertEqual(len(regiones), 1)

    def test_region_alargada_se_descarta(self):
        regiones = reconstruir.detectar_regiones_por_contorno(self._cuadro_con_rectangulo(200, 30))
        self.assertEqual(regiones, [])

    def test_region_enorme_se_descarta(self):
        regiones = reconstruir.detectar_regiones_por_contorno(self._cuadro_con_rectangulo(400, 300))
        self.assertEqual(regiones, [])


def _componer(lexemas: list[str]):
    """Imagen sintética con las plantillas de referencias/ en fila, como generar_imagen_prueba_simbolos.py."""
    iconos = [cv2.imread(os.path.join(clasificador_simbolos.CARPETA_REFERENCIAS, f"{l}.jpg")) for l in lexemas]
    alto, ancho = iconos[0].shape[:2]
    espacio = 80
    lienzo = np.full((alto + 2 * espacio, espacio + len(iconos) * (ancho + espacio), 3), 200, np.uint8)
    for i, icono in enumerate(iconos):
        x = espacio + i * (ancho + espacio)
        lienzo[espacio : espacio + icono.shape[0], x : x + icono.shape[1]] = icono
    return lienzo


class EvaluacionDeDataset(unittest.TestCase):
    def setUp(self):
        if not clasificador_simbolos.hay_referencias():
            self.skipTest("referencias/ vacía")
        self.carpeta = tempfile.TemporaryDirectory()
        self.addCleanup(self.carpeta.cleanup)
        filas = [
            ("correcta.png", ["ADD", "MUL", "DUP"], "ADD MUL DUP"),
            ("falta_una.png", ["ADD", "MUL"], "ADD MUL DUP"),
            ("confusion.png", ["ADD", "MUL", "DUP"], "ADD SUB DUP"),
        ]
        with open(os.path.join(self.carpeta.name, "manifest.jsonl"), "w", encoding="utf-8") as manifiesto:
            for nombre, en_imagen, esperado in filas:
                cv2.imwrite(os.path.join(self.carpeta.name, nombre), _componer(en_imagen))
                manifiesto.write(json.dumps({"image": nombre, "expected": esperado, "split": "test"}) + "\n")

    def test_metricas_por_simbolo_y_programa(self):
        filas = evaluar_dataset.leer_manifiesto(os.path.join(self.carpeta.name, "manifest.jsonl"), None, None)
        informe = evaluar_dataset.evaluar(filas, self.carpeta.name)

        self.assertEqual(informe["imagenes"], 3)
        self.assertEqual(informe["programa"]["exactos"], 1)
        # ADD aparece en las tres y siempre se lee: perfecto.
        self.assertEqual(informe["simbolos"]["ADD"]["precision"], 1.0)
        self.assertEqual(informe["simbolos"]["ADD"]["recall"], 1.0)
        # DUP se espera 3 veces y se lee 2 (falta en la segunda imagen).
        self.assertEqual(informe["simbolos"]["DUP"]["fn"], 1)
        self.assertEqual(informe["simbolos"]["DUP"]["fp"], 0)
        # SUB se esperaba una vez y nunca apareció; en su lugar se leyó MUL de más.
        self.assertEqual(informe["simbolos"]["SUB"]["fn"], 1)
        self.assertEqual(informe["simbolos"]["MUL"]["fp"], 1)
        confusiones = {(c["esperado"], c["leido"]): c["veces"] for c in informe["confusiones"]}
        self.assertEqual(confusiones, {("SUB", "MUL"): 1, ("DUP", "(nada)"): 1})

    def test_filtro_por_split(self):
        filas = evaluar_dataset.leer_manifiesto(os.path.join(self.carpeta.name, "manifest.jsonl"), "train", None)
        self.assertEqual(filas, [])


class InstruccionesConPosicion(unittest.TestCase):
    def test_loop_con_prefijo_lleva_posiciones_direccion_y_jmp_virtual(self):
        instrucciones, warnings = adjacency.build_instructions(cargar("loop_with_prefix.json"))
        self.assertEqual(warnings, [])
        self.assertEqual([i["token"] for i in instrucciones], ["PUSH", "PUSH", "DUP", "ADD", "MOV", "POP", "JMP"])
        primera = instrucciones[0]
        self.assertEqual(primera["posicion"], [0.0, 0.0, 0.0])
        np.testing.assert_allclose(primera["direccion"], [1.0, 0.0, 0.0])
        self.assertEqual(primera["posiciones_operandos"], [[20.0, 0.0, 0.0], [35.0, 0.0, 0.0]])
        # ADD está en (180,0) y el flujo sube hacia MOV en (180,60).
        np.testing.assert_allclose(instrucciones[3]["direccion"], [0.0, 1.0, 0.0])
        jmp = instrucciones[-1]
        self.assertTrue(jmp["virtual"])
        self.assertIsNone(jmp["posicion"])
        self.assertEqual(jmp["destino"], 2)
        self.assertEqual(jmp["operandos"], ["-4"])
        self.assertTrue(all(not i["virtual"] for i in instrucciones[:-1]))


class MarcoDeMesa(unittest.TestCase):
    def _mesa_inclinada(self):
        """Puntos planos vistos por una cámara inclinada 35° que mira hacia abajo."""
        rot, _ = cv2.Rodrigues(np.array([np.deg2rad(35.0), 0.0, 0.0]))
        camara_en_mesa = np.array([0.0, -200.0, 500.0])      # por encima de la mesa, mirando hacia abajo
        trans = -rot @ camara_en_mesa                          # camara = rot·mesa + trans
        planos = [(l, np.array(p, dtype=float)) for l, p in cargar("loop_with_prefix.json")]
        en_camara = [(l, rot @ p + trans) for l, p in planos]
        return planos, en_camara, (rot, trans)

    def test_con_pose_de_mesa_recupera_las_coordenadas_exactas(self):
        planos, en_camara, mesa = self._mesa_inclinada()
        recuperados = triangulate.to_table_frame(en_camara, mesa)
        for (l1, p1), (l2, p2) in zip(planos, recuperados):
            self.assertEqual(l1, l2)
            np.testing.assert_allclose(p1, p2, atol=1e-6)

    def test_sin_pose_ajusta_un_plano_con_z_hacia_la_camara(self):
        planos, en_camara, (rot, trans) = self._mesa_inclinada()
        # Un punto fuera del plano, por encima de la mesa (hacia la cámara), para fijar el signo de z.
        en_camara.append(("SUB", rot @ np.array([90.0, 30.0, 40.0]) + trans))
        recuperados = triangulate.to_table_frame(en_camara, None)
        zs = [p[2] for _, p in recuperados]
        # Ajuste por mínimos cuadrados con un punto fuera del plano: el plano se inclina unos mm.
        self.assertLess(max(zs[:-1]) - min(zs[:-1]), 10.0)              # el programa queda (casi) plano
        self.assertGreater(zs[-1] - np.median(zs[:-1]), 30.0)           # y lo elevado queda arriba
        # Las distancias entre bloques se conservan (es una rotación + traslación).
        d_orig = np.linalg.norm(planos[0][1] - planos[3][1])
        d_rec = np.linalg.norm(recuperados[0][1] - recuperados[3][1])
        self.assertAlmostEqual(d_orig, d_rec, places=6)

    def test_table_pose_deja_la_camara_por_encima(self):
        rvec = np.array([np.deg2rad(150.0), 0.0, 0.0])   # tablero casi de espaldas a la cámara
        tvec = np.array([0.0, 0.0, 700.0])
        pose = calibrate_cameras.table_pose(rvec, tvec)
        rotation = np.array(pose["rotation"])
        translation = np.array(pose["translation"])
        camara_en_mesa = -rotation.T @ translation
        self.assertGreater(camara_en_mesa[2], 0)
        self.assertAlmostEqual(np.linalg.det(rotation), 1.0, places=6)


if __name__ == "__main__":
    unittest.main()
