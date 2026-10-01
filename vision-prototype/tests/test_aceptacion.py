import json
import subprocess
import sys
import unittest
from pathlib import Path

from clasificador_simbolos import MARGEN, UMBRAL
from plataforma.escena_virtual import CONFIGURACION_PASOS, fuentes, render
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import completa, ejecutable
from plataforma.lectura import leer_cuadro
from plataforma.vocabulario import Vocabulario

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / 'datos_locales' / 'virtual'
INTERPRETE = RAIZ / 'simulador_3d' / 'generado' / 'interprete.js'
ESPERADO = ['PUSH a 3', 'ADD a']
ESPERADO_EJECUTABLE = ['PUSH a 3', 'PUSH a 5', 'ADD a']


def ejecutar_en_scala(codigo):
    guion = (
        "import {sculptEjecutar} from %s;"
        "const r = sculptEjecutar(process.argv[1] + '\\n', 2000);"
        "process.stdout.write('@@' + JSON.stringify({valido: r.valido, etapa: r.etapa, "
        "decide: r.decide, pasos: r.pasos ? r.pasos.length : 0, final: r.pasos ? r.pasos.at(-1) : null}) + '@@');"
    ) % json.dumps(INTERPRETE.as_uri())
    salida = subprocess.run([sys.executable and 'node', '--input-type=module', '-e', guion, codigo],
                            capture_output=True, text=True, timeout=120)
    marca = salida.stdout.split('@@')
    if len(marca) < 3:
        raise AssertionError(f'el intérprete no respondió: {salida.stdout[-300:]} {salida.stderr[-300:]}')
    return json.loads(marca[1])


class DesdeImagenes(unittest.TestCase):
    guion = None

    @classmethod
    def setUpClass(cls):
        if cls.guion is None:
            raise unittest.SkipTest('clase base')
        if not INTERPRETE.exists():
            raise unittest.SkipTest('falta generado/interprete.js; ejecuta npm run build:simulator')
        cls.vocabulario = Vocabulario(RAIZ, DATOS)
        cls.escena, _ = cls.guion(cls.vocabulario)
        cls.fusion = Fusion()
        cls.resultado = None
        for paso in range(12):
            instante = 10.0 + paso * 0.1
            marcos, _ = fuentes(cls.escena, cls.vocabulario, instante, paso + 1)
            cls.resultado = cls.fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        cls.codigo = '\n'.join(' '.join([i['token'], *i['operandos']]) for i in cls.resultado['instrucciones'])


class AceptacionEscenaMinimaTest(DesdeImagenes):
    guion = staticmethod(completa)

    def test_la_verdad_conocida_no_entra_en_la_tuberia(self):
        marcos, _ = fuentes(self.escena, self.vocabulario, 10.0, 1)
        for marco in marcos:
            for observacion in marco['historial'][0]['observaciones']:
                self.assertNotIn('verdad', observacion)
                self.assertTrue(observacion['candidatos'], 'toda observación viene de puntuar una imagen')

    def test_cada_camara_lee_desde_su_propia_imagen(self):
        for camara in self.escena.camaras:
            imagen = render(self.escena, camara)
            _, lecturas = leer_cuadro(imagen, self.vocabulario)
            self.assertTrue(lecturas, f'{camara.id} no produjo ninguna observación')

    def test_el_render_es_determinista(self):
        for camara in self.escena.camaras:
            primero, segundo = render(self.escena, camara), render(self.escena, camara)
            self.assertTrue((primero == segundo).all(), f'{camara.id} rinde distinto con la misma escena')

    def test_toda_pieza_confirmada_la_sostienen_dos_camaras(self):
        piezas = self.resultado['piezas']
        self.assertEqual(len(piezas), len(self.escena.verdad()))
        for pieza in piezas:
            self.assertEqual(pieza['estado'], 'confirmada', pieza['lexema'])
            self.assertGreaterEqual(len(pieza['camaras']), 2, pieza['lexema'])

    def test_la_fusion_reconstruye_el_programa_de_la_verdad(self):
        self.assertEqual(sorted(p['lexema'] for p in self.resultado['piezas']), sorted(self.escena.verdad()))
        self.assertEqual(self.codigo.split('\n'), ESPERADO)

    def test_la_lectura_visual_habilita_la_ejecucion(self):
        self.assertTrue(self.resultado['estable'])
        self.assertTrue(self.resultado['compatible'])
        self.assertTrue(puede_ejecutar(self.resultado))
        self.assertEqual(self.resultado['avisos'], [])

    def test_scala_recibe_el_candidato_y_emite_su_veredicto(self):
        r = ejecutar_en_scala(self.codigo)
        self.assertEqual(r['etapa'], 'runtime', r)
        self.assertEqual(r['decide'], 'lenguaje')
        self.assertEqual(r['pasos'], 1)
        self.assertEqual(r['final'], {'a': [3]})

    def test_la_certeza_visual_no_es_validez_semantica(self):
        self.assertTrue(puede_ejecutar(self.resultado))
        self.assertFalse(ejecutar_en_scala(self.codigo)['valido'])


class AceptacionProgramaEjecutableTest(DesdeImagenes):
    guion = staticmethod(ejecutable)

    def test_la_verdad_conocida_no_entra_en_la_tuberia(self):
        marcos, _ = fuentes(self.escena, self.vocabulario, 10.0, 1)
        for marco in marcos:
            for observacion in marco['historial'][0]['observaciones']:
                self.assertNotIn('verdad', observacion)
                self.assertTrue(observacion['candidatos'])

    def test_las_ocho_fichas_las_sostienen_dos_camaras(self):
        piezas = self.resultado['piezas']
        self.assertEqual(len(piezas), 8)
        self.assertEqual(sorted(p['lexema'] for p in piezas), sorted(self.escena.verdad()))
        for pieza in piezas:
            self.assertEqual(pieza['estado'], 'confirmada', pieza['lexema'])
            self.assertGreaterEqual(len(pieza['camaras']), 2, pieza['lexema'])

    def test_ninguna_lectura_aceptada_incumple_los_umbrales(self):
        for pieza in self.resultado['piezas']:
            candidatos = sorted((c['puntaje'] for c in pieza['candidatos']), reverse=True)
            self.assertGreaterEqual(candidatos[0], UMBRAL, pieza['lexema'])
            if len(candidatos) > 1:
                self.assertGreaterEqual(candidatos[0] - candidatos[1], MARGEN, pieza['lexema'])

    def test_el_codigo_nace_de_la_fusion_y_no_de_una_constante(self):
        self.assertEqual(self.codigo.split('\n'), ESPERADO_EJECUTABLE)
        for instruccion in self.resultado['instrucciones']:
            self.assertIn(instruccion['token'], self.escena.verdad())
            for operando in instruccion['operandos']:
                self.assertIn(operando, self.escena.verdad())

    def test_la_lectura_visual_habilita_la_ejecucion(self):
        self.assertTrue(self.resultado['estable'])
        self.assertTrue(self.resultado['compatible'])
        self.assertTrue(puede_ejecutar(self.resultado))
        self.assertEqual(self.resultado['avisos'], [])

    def test_scala_ejecuta_el_candidato_reconstruido(self):
        self.assertTrue(puede_ejecutar(self.resultado))
        r = ejecutar_en_scala(self.codigo)
        self.assertTrue(r['valido'], r)
        self.assertEqual(r['etapa'], 'ok')
        self.assertEqual(r['decide'], 'lenguaje')
        self.assertEqual(r['pasos'], 3)
        self.assertEqual(r['final'], {'a': [8]})
