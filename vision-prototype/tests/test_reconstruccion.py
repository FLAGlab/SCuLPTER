"""Tests for the 3D reconstruction pipeline that need no cameras or blocks.

Run from the repo root:
    PYTHONPATH=vision-prototype python3 -m unittest discover -s vision-prototype/tests
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

import adjacency
import calibrate_cameras
import clasificador_simbolos as clasif
from herramientas import evaluar_dataset
import reconstruir
import triangulate

PUNTOS = os.path.join(AQUI, "datos", "puntos")


def cargar(nombre):
    return adjacency.puntos(os.path.join(PUNTOS, nombre))


class ProgramaDesdePuntos(unittest.TestCase):
    def test_cadena_con_parametros(self):
        lineas, avisos = adjacency.programa(cargar("chain_with_params.json"))
        self.assertEqual(lineas, ["PUSH heart 3", "PUSH heart 10", "ADD heart"])
        self.assertEqual(avisos, [])

    def test_cadena_invertida_da_el_mismo_programa(self):
        lineas, avisos = adjacency.programa(cargar("chain_reversed.json"))
        self.assertEqual(lineas, ["PUSH heart 3", "PUSH heart 10", "ADD heart"])
        self.assertEqual(avisos, [])

    def test_loop_con_prefijo_emite_jmp_al_reingreso(self):
        lineas, avisos = adjacency.programa(cargar("loop_with_prefix.json"))
        self.assertEqual(
            lineas,
            ["PUSH heart 1", "PUSH circle 0", "DUP heart", "ADD heart", "MOV circle heart", "POP heart", "JMP -4"],
        )
        self.assertEqual(avisos, [])

    def test_loop_puro_emite_jmp_menos_n(self):
        lineas, _ = adjacency.programa(cargar("loop.json"))
        self.assertEqual(lineas[-1], "JMP -4")
        self.assertEqual(len(lineas), 5)

    def test_sin_parametros_avisa_direccion(self):
        _, avisos = adjacency.programa(cargar("simple_chain.json"))
        self.assertTrue(any("direction unconfirmed" in w for w in avisos))

    def test_bloque_aislado_se_reporta(self):
        _, avisos = adjacency.programa(cargar("isolated_block.json"))
        self.assertTrue(any(w.startswith("POP:") and "not reachable" in w for w in avisos))

    def test_vacio(self):
        self.assertEqual(adjacency.programa([]), ([], []))


def _camara_sintetica(rotacion_deg_y: float, traslacion):
    """Intrinsics + pose for a virtual 640x480 camera rotated about Y."""
    mtx = np.array([[600.0, 0, 320.0], [0, 600.0, 240.0], [0, 0, 1]])
    dist = np.zeros(5)
    rot, _ = cv2.Rodrigues(np.array([0.0, np.deg2rad(rotacion_deg_y), 0.0]))
    return mtx, dist, rot, np.array(traslacion, dtype=float).reshape(3, 1)


def _proyectar(points_3d, mtx, rot, trans):
    proj = mtx @ np.hstack([rot, trans])
    out = []
    for lexema, p in points_3d:
        h = proj @ np.array([*p, 1.0])
        out.append((lexema, float(h[0] / h[2]), float(h[1] / h[2])))
    return out


class PipelineEstereoSintetica(unittest.TestCase):
    def setUp(self):

        self.mtx_a, self.dist_a, _, _ = _camara_sintetica(0, [0, 0, 0])

        self.mtx_b, self.dist_b, self.rot, self.trans = _camara_sintetica(-15, [-200, 0, 40])
        self.proj_a, self.proj_b = triangulate.proyecciones(self.mtx_a, self.mtx_b, self.rot, self.trans)
        self.fund = triangulate.fundamental(self.mtx_a, self.mtx_b, self.rot, self.trans)


        self.escena = [(lexema, p + np.array([-100.0, -30.0, 600.0])) for lexema, p in cargar("loop_with_prefix.json")]

    def test_duplicados_se_emparejan_por_epipolar_y_se_recupera_el_programa(self):
        dets_a = _proyectar(self.escena, self.mtx_a, np.eye(3), np.zeros((3, 1)))
        dets_b = _proyectar(self.escena, self.mtx_b, self.rot, self.trans)

        dets_b = dets_b[::-1]

        pairs, avisos, _ = triangulate.emparejar(dets_a, dets_b, self.fund, self.proj_a, self.proj_b)
        self.assertEqual(avisos, [])
        self.assertEqual(len(pairs), len(self.escena))

        puntos = triangulate.triangular(pairs, self.proj_a, self.proj_b)

        pendientes = list(self.escena)
        for lexema, p in puntos:
            idx = next(
                (i for i, (l, p_orig) in enumerate(pendientes) if l == lexema and np.linalg.norm(p - p_orig) < 1.0),
                None,
            )
            self.assertIsNotNone(idx, f"{lexema} at {np.round(p, 1)} matches no original point")
            pendientes.pop(idx)
        self.assertEqual(pendientes, [])

        lineas, program_warnings = adjacency.programa(puntos)
        self.assertEqual(
            lineas,
            ["PUSH heart 1", "PUSH circle 0", "DUP heart", "ADD heart", "MOV circle heart", "POP heart", "JMP -4"],
        )
        self.assertEqual(program_warnings, [])

    def test_deteccion_sin_pareja_se_avisa(self):
        dets_a = _proyectar(self.escena, self.mtx_a, np.eye(3), np.zeros((3, 1)))
        dets_b = _proyectar(self.escena[:-1], self.mtx_b, self.rot, self.trans)
        pairs, avisos, no_resueltas = triangulate.emparejar(
            dets_a, dets_b, self.fund, self.proj_a, self.proj_b)
        self.assertEqual(len(pairs), len(self.escena) - 1)
        self.assertTrue(any(w.startswith("heart:") for w in avisos))

        self.assertTrue(any(lexema == "heart" for lexema, _, _ in no_resueltas))

    def test_deteccion_de_una_sola_camara_no_se_pierde(self):
        """Un símbolo que solo aparece en una vista se reporta como no resuelto."""
        dets_a = _proyectar(self.escena, self.mtx_a, np.eye(3), np.zeros((3, 1)))
        dets_a.append(("MUL", 100.0, 100.0))
        dets_b = _proyectar(self.escena, self.mtx_b, self.rot, self.trans)
        _, _, no_resueltas = triangulate.emparejar(
            dets_a, dets_b, self.fund, self.proj_a, self.proj_b)
        self.assertIn(("MUL", "a", 1), no_resueltas)


class ClasificadorDeSimbolos(unittest.TestCase):
    """Con las plantillas que haya en referencias/ (hoy, las del render)."""

    def setUp(self):
        if not clasif.hay_referencias():
            self.skipTest("referencias/ vacía")

    def test_cada_plantilla_se_reconoce_a_si_misma_con_margen(self):
        tabla = clasif.tabla_simbolos()
        for nombre_archivo in sorted(os.listdir(clasif.REFERENCIAS)):
            nombre, ext = os.path.splitext(nombre_archivo)
            if ext.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            imagen = cv2.imread(os.path.join(clasif.REFERENCIAS, nombre_archivo))
            lexema, candidatos = clasif.reconocer_con_puntajes(imagen)
            with self.subTest(plantilla=nombre_archivo):
                self.assertEqual(lexema, tabla.get(nombre, nombre))
                self.assertGreater(candidatos[0][1], 0.95)

    def test_ruido_y_blanco_se_rechazan(self):
        rng = np.random.default_rng(0)
        self.assertIsNone(clasif.reconocer(rng.integers(0, 255, (60, 60, 3), dtype=np.uint8)))
        self.assertIsNone(clasif.reconocer(np.full((60, 60, 3), 240, np.uint8)))

    def test_mancha_cuadrada_sin_estructura_se_rechaza(self):
        mancha = np.full((60, 60, 3), 230, np.uint8)
        cv2.rectangle(mancha, (15, 15), (45, 45), (40, 40, 40), -1)
        lexema, candidatos = clasif.reconocer_con_puntajes(mancha)
        self.assertIsNone(lexema)
        self.assertLess(candidatos[0][1], clasif.UMBRAL,
                        "los canales de intensidad y gradiente no coinciden en un ganador, "
                        "así que ninguno alcanza el umbral")

    def test_imagen_de_prueba_da_tres_operaciones(self):
        ruta = os.path.join(AQUI, "datos", "imagenes", "demo_simbolos_reales.png")
        if not os.path.isfile(ruta):
            self.skipTest("sin imagen de prueba")
        detecciones, _ = reconstruir.detectar(cv2.imread(ruta))
        self.assertEqual(sorted(lexema for lexema, _, _ in detecciones), ["ADD", "DUP", "MUL"])


class FiltroDeRegiones(unittest.TestCase):
    def _cuadro_con_rectangulo(self, w, h):
        cuadro = np.full((480, 640, 3), 235, np.uint8)
        cv2.rectangle(cuadro, (100, 100), (100 + w, 100 + h), (30, 30, 30), -1)
        return cuadro

    def test_region_cuadrada_pasa(self):
        regiones = reconstruir.regiones(self._cuadro_con_rectangulo(60, 60))
        self.assertEqual(len(regiones), 1)

    def test_region_alargada_se_descarta(self):
        regiones = reconstruir.regiones(self._cuadro_con_rectangulo(200, 30))
        self.assertEqual(regiones, [])

    def test_region_enorme_se_descarta(self):
        regiones = reconstruir.regiones(self._cuadro_con_rectangulo(400, 300))
        self.assertEqual(regiones, [])


def _componer(lexemas: list[str]):
    """Imagen sintética con las plantillas de referencias/ en fila, como generar_imagen_prueba_simbolos.py."""
    iconos = [cv2.imread(os.path.join(clasif.REFERENCIAS, f"{l}.jpg")) for l in lexemas]
    alto, ancho = iconos[0].shape[:2]
    espacio = 80
    lienzo = np.full((alto + 2 * espacio, espacio + len(iconos) * (ancho + espacio), 3), 200, np.uint8)
    for i, icono in enumerate(iconos):
        x = espacio + i * (ancho + espacio)
        lienzo[espacio : espacio + icono.shape[0], x : x + icono.shape[1]] = icono
    return lienzo


class EvaluacionDeDataset(unittest.TestCase):
    def setUp(self):
        if not clasif.hay_referencias():
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

        self.assertEqual(informe["simbolos"]["ADD"]["precision"], 1.0)
        self.assertEqual(informe["simbolos"]["ADD"]["recall"], 1.0)

        self.assertEqual(informe["simbolos"]["DUP"]["fn"], 1)
        self.assertEqual(informe["simbolos"]["DUP"]["fp"], 0)

        self.assertEqual(informe["simbolos"]["SUB"]["fn"], 1)
        self.assertEqual(informe["simbolos"]["MUL"]["fp"], 1)
        confusiones = {(c["esperado"], c["leido"]): c["veces"] for c in informe["confusiones"]}
        self.assertEqual(confusiones, {("SUB", "MUL"): 1, ("DUP", "(nada)"): 1})

    def test_filtro_por_split(self):
        filas = evaluar_dataset.leer_manifiesto(os.path.join(self.carpeta.name, "manifest.jsonl"), "train", None)
        self.assertEqual(filas, [])


class InstruccionesConPosicion(unittest.TestCase):
    def test_loop_con_prefijo_lleva_posiciones_direccion_y_jmp_virtual(self):
        instrucciones, avisos = adjacency.instrucciones(cargar("loop_with_prefix.json"))
        self.assertEqual(avisos, [])
        self.assertEqual([i["token"] for i in instrucciones], ["PUSH", "PUSH", "DUP", "ADD", "MOV", "POP", "JMP"])
        primera = instrucciones[0]
        self.assertEqual(primera["posicion"], [0.0, 0.0, 0.0])
        np.testing.assert_allclose(primera["direccion"], [1.0, 0.0, 0.0])
        self.assertEqual(primera["posiciones_operandos"], [[20.0, 0.0, 0.0], [35.0, 0.0, 0.0]])

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
        camara_en_mesa = np.array([0.0, -200.0, 500.0])
        trans = -rot @ camara_en_mesa
        planos = [(l, np.array(p, dtype=float)) for l, p in cargar("loop_with_prefix.json")]
        en_camara = [(l, rot @ p + trans) for l, p in planos]
        return planos, en_camara, (rot, trans)

    def test_con_pose_de_mesa_recupera_las_coordenadas_exactas(self):
        planos, en_camara, mesa = self._mesa_inclinada()
        recuperados = triangulate.a_mesa(en_camara, mesa)
        for (l1, p1), (l2, p2) in zip(planos, recuperados):
            self.assertEqual(l1, l2)
            np.testing.assert_allclose(p1, p2, atol=1e-6)

    def test_sin_pose_ajusta_un_plano_con_z_hacia_la_camara(self):
        planos, en_camara, (rot, trans) = self._mesa_inclinada()

        en_camara.append(("SUB", rot @ np.array([90.0, 30.0, 40.0]) + trans))
        recuperados = triangulate.a_mesa(en_camara, None)
        zs = [p[2] for _, p in recuperados]

        self.assertLess(max(zs[:-1]) - min(zs[:-1]), 10.0)
        self.assertGreater(zs[-1] - np.median(zs[:-1]), 30.0)

        d_orig = np.linalg.norm(planos[0][1] - planos[3][1])
        d_rec = np.linalg.norm(recuperados[0][1] - recuperados[3][1])
        self.assertAlmostEqual(d_orig, d_rec, places=6)

    def test_table_pose_deja_la_camara_por_encima(self):
        rvec = np.array([np.deg2rad(150.0), 0.0, 0.0])
        tvec = np.array([0.0, 0.0, 700.0])
        pose = calibrate_cameras.pose_mesa(rvec, tvec)
        rotation = np.array(pose["rot"])
        translation = np.array(pose["tras"])
        camara_en_mesa = -rotation.T @ translation
        self.assertGreater(camara_en_mesa[2], 0)
        self.assertAlmostEqual(np.linalg.det(rotation), 1.0, places=6)


class FichasSinLeer(unittest.TestCase):
    """Una ficha detectada pero ilegible mantiene vivo su bloque y bloquea la ejecución."""

    SIN_LEER = clasif.SIN_LEER

    def test_parametro_sin_leer_queda_pendiente_en_su_bloque(self):
        puntos = cargar("chain_with_params.json")
        puntos = [(self.SIN_LEER if lexema == "3" else lexema, p) for lexema, p in puntos]
        instrucciones, _ = adjacency.instrucciones(puntos)
        self.assertEqual([i["token"] for i in instrucciones], ["PUSH", "PUSH", "ADD"])
        self.assertEqual(instrucciones[0]["operandos"], ["heart", self.SIN_LEER])
        self.assertTrue(instrucciones[0]["pendiente"])
        self.assertFalse(instrucciones[2]["pendiente"])
        self.assertEqual(adjacency.pendientes(instrucciones),
                         ["instrucción 1: el parámetro 2 está sin leer"])

    def test_operacion_sin_leer_conserva_el_bloque(self):
        puntos = cargar("chain_with_params.json")
        puntos = [(self.SIN_LEER if (lexema == "PUSH" and p[0] == 60) else lexema, p) for lexema, p in puntos]
        instrucciones, _ = adjacency.instrucciones(puntos)

        self.assertEqual(len(instrucciones), 3)
        self.assertEqual([i["token"] for i in instrucciones], ["PUSH", self.SIN_LEER, "ADD"])
        self.assertTrue(instrucciones[1]["pendiente"])
        self.assertEqual(adjacency.pendientes(instrucciones),
                         ["instrucción 2: la operación está sin leer"])

    def test_el_interprete_no_recibe_una_lectura_incompleta(self):
        codigo = f"PUSH heart {self.SIN_LEER}\nADD heart"
        self.assertEqual(reconstruir.ejecutar(codigo), "(lectura incompleta, no se ejecuta)")

    def test_ruta_2d_ubica_la_ficha_pendiente(self):
        detecciones = [("PUSH", 10, 10), ("heart", 40, 10), (self.SIN_LEER, 70, 10), ("ADD", 10, 200)]
        self.assertEqual(reconstruir.programa(detecciones),
                         f"PUSH heart {self.SIN_LEER}\nADD")
        pendientes = reconstruir.pendientes(detecciones)
        self.assertEqual(len(pendientes), 1)
        self.assertIn("instrucción 1: el parámetro 2", pendientes[0])

    def test_una_region_medio_oscura_no_cuenta_como_ficha(self):
        """Mitad clara y mitad oscura es un borde entre superficies, no un trazo."""
        borde = np.full((60, 60), 240, np.uint8)
        borde[:, :30] = 30
        self.assertIsNone(clasif.normalizar(borde))


if __name__ == "__main__":
    unittest.main()
