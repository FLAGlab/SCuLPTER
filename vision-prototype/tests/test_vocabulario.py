import base64
import json
import shutil
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from plataforma.vocabulario import PROGRAMAS, Vocabulario

RAIZ = Path(__file__).resolve().parents[1]


def foto_valida():
    imagen = np.full((120, 120, 3), 255, np.uint8)
    cv2.line(imagen, (30, 30), (90, 90), (20, 20, 20), 9)
    cv2.line(imagen, (90, 30), (30, 90), (20, 20, 20), 9)
    return "data:image/png;base64," + base64.b64encode(cv2.imencode(".png", imagen)[1].tobytes()).decode()


class ProcedenciaTest(unittest.TestCase):
    def setUp(self):
        self.datos = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.datos, ignore_errors=True)
        self.vocabulario = Vocabulario(RAIZ, self.datos)

    def entrada(self, lexema):
        return next((s for s in self.vocabulario.listar() if s["lexema"] == lexema), None)

    def test_el_catalogo_parte_de_renders_sin_ninguna_foto(self):
        push = self.entrada("PUSH")
        self.assertEqual(push["origen"], "render")
        self.assertEqual(push["fotografiadas"], 0)
        self.assertEqual(self.entrada("3")["origen"], None)
        self.assertEqual(self.entrada("3")["referencias"], [])

    def test_una_foto_real_sobre_un_render_cambia_la_procedencia(self):
        self.vocabulario.guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        push = self.entrada("PUSH")
        self.assertEqual(push["origen"], "foto")
        self.assertEqual(push["fotografiadas"], 1)
        self.assertEqual(len(push["referencias"]), 2)
        self.assertEqual([r["origen"] for r in push["referencias"]], ["render", "foto"])

    def test_el_render_conserva_su_origen_cuando_convive_con_una_foto(self):
        self.vocabulario.guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        renders = [r for r in self.entrada("PUSH")["referencias"] if r["origen"] == "render"]
        self.assertEqual([r["foto"] for r in renders], ["PUSH.jpg"])

    def test_una_foto_sobre_un_declarado_sin_referencia_lo_deja_fotografiado(self):
        self.assertIsNone(self.entrada("3")["origen"])
        self.vocabulario.guardar({"nombre": "3", "tipo": "literal", "imagen": foto_valida()})
        tres = self.entrada("3")
        self.assertEqual(tres["origen"], "foto")
        self.assertEqual(tres["fotografiadas"], 1)
        self.assertEqual(tres["tipo"], "literal")

    def test_un_simbolo_nuevo_nace_fotografiado(self):
        self.vocabulario.guardar({"nombre": "estrella", "tipo": "pila", "imagen": foto_valida()})
        nuevo = self.entrada("estrella")
        self.assertEqual(nuevo["origen"], "foto")
        self.assertEqual(nuevo["fotografiadas"], 1)
        self.assertEqual([r["origen"] for r in nuevo["referencias"]], ["foto"])

    def test_varias_fotos_del_mismo_simbolo_se_acumulan(self):
        for _ in range(3):
            self.vocabulario.guardar({"nombre": "estrella", "tipo": "pila", "imagen": foto_valida()})
        self.assertEqual(self.entrada("estrella")["fotografiadas"], 3)

    def test_la_auditoria_deja_de_marcar_provisional_lo_ya_fotografiado(self):
        antes = self.vocabulario.ensayo(PROGRAMAS["minimo"])
        self.assertEqual(antes["desde_ficha"], 0)
        self.assertEqual([s["lexema"] for s in antes["provisionales"]], ["ADD", "PUSH"])
        self.assertEqual([s["lexema"] for s in antes["faltan"]], ["3", "5", "a"])
        self.vocabulario.guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        self.vocabulario.guardar({"nombre": "3", "tipo": "literal", "imagen": foto_valida()})
        despues = self.vocabulario.ensayo(PROGRAMAS["minimo"])
        self.assertEqual([s["lexema"] for s in despues["listos"]], ["3", "PUSH"])
        self.assertEqual([s["lexema"] for s in despues["provisionales"]], ["ADD"])
        self.assertEqual([s["lexema"] for s in despues["faltan"]], ["5", "a"])
        self.assertEqual(despues["desde_ficha"], 2)

    def test_la_plantilla_nueva_queda_disponible_para_puntuar(self):
        self.assertNotIn("estrella", self.vocabulario.plantillas)
        self.vocabulario.guardar({"nombre": "estrella", "tipo": "pila", "imagen": foto_valida()})
        self.assertIn("estrella", self.vocabulario.plantillas)


class ProcedenciaDePlantillasTest(unittest.TestCase):
    def setUp(self):
        self.datos = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.datos, ignore_errors=True)

    def vocabulario(self, solo_fotos=False):
        return Vocabulario(RAIZ, self.datos, solo_fotos=solo_fotos)

    def test_por_omision_el_reconocimiento_no_cambia(self):
        v = self.vocabulario()
        self.assertFalse(v.solo_fotos)
        self.assertIn("PUSH", v.plantillas)
        self.assertEqual(v.procedencia["PUSH"], {"foto": 0, "sintetico": 0, "render": 1})

    def test_una_foto_nueva_convive_con_el_render_en_el_clasificador(self):
        v = self.vocabulario()
        antes = len(v.plantillas["PUSH"])
        v.guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        self.assertEqual(v.procedencia["PUSH"], {"foto": 1, "sintetico": 0, "render": 1})
        self.assertGreater(len(v.plantillas["PUSH"]), antes)
        self.assertEqual(v.ensayo(PROGRAMAS["minimo"])["mixtos"], ["PUSH"])

    def test_el_modo_solo_fotos_descarta_los_renders(self):
        self.vocabulario().guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        v = self.vocabulario(solo_fotos=True)
        self.assertTrue(v.solo_fotos)
        self.assertEqual(list(v.plantillas), ["PUSH"])
        self.assertEqual(v.procedencia["PUSH"], {"foto": 1, "sintetico": 0, "render": 0})
        self.assertEqual(v.ensayo(PROGRAMAS["minimo"])["mixtos"], [])

    def test_sin_ninguna_foto_el_modo_solo_fotos_no_deja_plantillas(self):
        v = self.vocabulario(solo_fotos=True)
        self.assertEqual(v.plantillas, {})
        self.assertEqual(v.ensayo(PROGRAMAS["minimo"])["con_plantilla"], 0)

    def test_el_ensayo_declara_el_modo_y_el_recuento_por_procedencia(self):
        self.vocabulario().guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        mezclado = self.vocabulario().ensayo(PROGRAMAS["minimo"])
        self.assertFalse(mezclado["solo_fotos"])
        self.assertEqual(mezclado["plantillas_foto"], 1)
        self.assertEqual(mezclado["plantillas_render"], 12)
        limpio = self.vocabulario(solo_fotos=True).ensayo(PROGRAMAS["minimo"])
        self.assertTrue(limpio["solo_fotos"])
        self.assertEqual(limpio["plantillas_render"], 0)

    def test_desde_ficha_no_implica_que_el_clasificador_use_solo_fotos(self):
        self.vocabulario().guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        e = self.vocabulario().ensayo(PROGRAMAS["minimo"])
        self.assertEqual(e["desde_ficha"], 1)
        self.assertEqual(e["mixtos"], ["PUSH"])
        self.assertGreater(e["plantillas_render"], 0)

    def test_el_aviso_de_procedencia_distingue_los_tres_casos(self):
        from herramientas.evaluar_dataset import procedencia_plantillas
        solo_render = procedencia_plantillas(self.vocabulario())
        self.assertEqual(solo_render["plantillas_foto"], 0)
        self.assertEqual(solo_render["simbolos_mixtos"], [])
        self.vocabulario().guardar({"nombre": "PUSH", "tipo": "operacion", "imagen": foto_valida()})
        mezcla = procedencia_plantillas(self.vocabulario())
        self.assertEqual(mezcla["simbolos_mixtos"], ["PUSH"])
        self.assertFalse(mezcla["solo_fotos"])
        limpio = procedencia_plantillas(self.vocabulario(solo_fotos=True))
        self.assertTrue(limpio["solo_fotos"])
        self.assertEqual(limpio["plantillas_render"], 0)
