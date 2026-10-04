import json
import subprocess
import unittest
from pathlib import Path

import cv2
import numpy as np

from clasificador_simbolos import SIN_LEER
from plataforma.escena_virtual import CONFIGURACION_PASOS, fuentes
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import GUIONES, _preparar
from plataforma.vocabulario import Vocabulario

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / 'datos_locales' / 'virtual'
INTERPRETE = RAIZ / 'simulador_3d' / 'generado' / 'interprete.js'
PASOS = 12

_voc = None


def vocabulario():
    global _voc
    if _voc is None:
        _voc = Vocabulario(RAIZ, DATOS)
    return _voc


def garabato():
    imagen = np.full((180, 180, 3), 250, np.uint8)
    cv2.rectangle(imagen, (16, 16), (164, 164), (120, 120, 120), 14, cv2.LINE_AA)
    cv2.polylines(imagen, [np.array([[58, 126], [76, 56], [102, 122], [124, 58]], np.int32)],
                  False, (40, 40, 40), 10, cv2.LINE_AA)
    cv2.line(imagen, (62, 92), (122, 92), (40, 40, 40), 8, cv2.LINE_AA)
    return imagen


def con_operacion_ilegible(posicion):
    escena = _preparar(['PUSH a 3', 'PUSH a 5', 'ADD a'], vocabulario())
    escena.plantillas['garabato'] = garabato()
    operaciones = [f for f in escena.fichas if f.lexema in ('PUSH', 'ADD')]
    operaciones[posicion].lexema = 'garabato'
    return escena, lambda escena, paso: None


def recorrer(escena, guion, pasos=PASOS):
    fusion = Fusion()
    resultado = None
    for paso in range(pasos):
        guion(escena, paso)
        instante = 10.0 + paso * 0.1
        marcos, _ = fuentes(escena, vocabulario(), instante, paso + 1)
        resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
    return resultado


def leido(resultado):
    return [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]


def en_scala(codigo):
    guion = (
        "import {sculptEjecutar} from %s;"
        "const r = sculptEjecutar(process.argv[1] + '\\n', 2000);"
        "process.stdout.write('@@' + JSON.stringify({valido: r.valido, etapa: r.etapa, decide: r.decide,"
        "pasos: r.pasos ? r.pasos.length : 0, final: r.pasos ? r.pasos.at(-1) : null,"
        "traza: r.traza ? r.traza.length : 0}) + '@@');"
    ) % json.dumps(INTERPRETE.as_uri())
    salida = subprocess.run(['node', '--input-type=module', '-e', guion, codigo],
                            capture_output=True, text=True, timeout=180)
    partes = salida.stdout.split('@@')
    if len(partes) < 3:
        raise AssertionError(f'el intérprete no respondió: {salida.stdout[-200:]} {salida.stderr[-200:]}')
    return json.loads(partes[1])


class Base(unittest.TestCase):
    escena_nombre = None
    constructor = None

    @classmethod
    def setUpClass(cls):
        if cls.escena_nombre is None and cls.constructor is None:
            raise unittest.SkipTest('clase base')
        if cls.constructor is not None:
            cls.escena, guion = cls.constructor()
        else:
            cls.escena, guion = GUIONES[cls.escena_nombre][0](vocabulario())
        cls.resultado = recorrer(cls.escena, guion)
        cls.codigo = leido(cls.resultado)


class Positivo(Base):
    esperado = None
    scala = None

    def test_la_secuencia_completa_coincide(self):
        self.assertEqual(self.codigo, self.esperado)

    def test_las_piezas_coinciden_con_las_de_la_mesa(self):
        self.assertEqual(sorted(p['lexema'] for p in self.resultado['piezas']),
                         sorted(self.escena.verdad()))

    def test_se_acepta_sin_avisos(self):
        self.assertTrue(puede_ejecutar(self.resultado), self.resultado['avisos'])
        self.assertEqual(self.resultado['avisos'], [])

    def test_scala_emite_el_veredicto_y_la_traza(self):
        if not INTERPRETE.exists():
            self.skipTest('falta generado/interprete.js; ejecuta npm run build:simulator')
        r = en_scala('\n'.join(self.codigo))
        for clave, valor in self.scala.items():
            self.assertEqual(r[clave], valor, f'{clave}: {r}')
        self.assertEqual(r['traza'], r['pasos'] + 1, 'la traza lleva el estado inicial más cada paso')


class Negativo(Base):
    def test_no_confirma(self):
        self.assertFalse(puede_ejecutar(self.resultado),
                         f'confirmó {self.codigo} con la mesa en {list(self.escena.programa)}')

    def test_explica_el_motivo(self):
        motivo = self.resultado['avisos'] or self.resultado['estado'] != 'estable'
        self.assertTrue(motivo, 'quedar pendiente exige un motivo concreto')
        if not self.resultado['avisos']:
            self.assertEqual(self.resultado['estado'], 'estabilizando',
                             'sin avisos, el motivo solo puede ser que el montaje no se queda quieto')

    def test_no_inventa_simbolos_confirmados(self):
        for pieza in self.resultado['piezas']:
            if pieza['estado'] == 'confirmada' and pieza['lexema'] != SIN_LEER:
                self.assertIn(pieza['lexema'], self.escena.verdad(),
                              'una pieza confirmada tiene que estar sobre la mesa')


class UnaInstruccionTest(Positivo):
    escena_nombre = 'una_instruccion'
    esperado = ['PUSH a 3']
    scala = {'valido': True, 'etapa': 'ok', 'pasos': 1, 'final': {'a': [3]}}


class SumaDeDosValoresTest(Positivo):
    escena_nombre = 'ejecutable'
    esperado = ['PUSH a 3', 'PUSH a 5', 'ADD a']
    scala = {'valido': True, 'etapa': 'ok', 'pasos': 3, 'final': {'a': [8]}}


class DosPilasTest(Positivo):
    escena_nombre = 'dos_pilas'
    esperado = ['PUSH a 3', 'PUSH b 5', 'MOV a b']
    scala = {'valido': True, 'etapa': 'ok', 'pasos': 3, 'final': {'a': [5, 3], 'b': []}}


class SimbolosRepetidosTest(Positivo):
    escena_nombre = 'repetidos'
    esperado = ['PUSH a 3', 'PUSH a 3']
    scala = {'valido': True, 'etapa': 'ok', 'pasos': 2, 'final': {'a': [3, 3]}}


class RechazoSemanticoTest(Positivo):
    escena_nombre = 'completa'
    esperado = ['PUSH a 3', 'ADD a']
    scala = {'valido': False, 'etapa': 'runtime', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}


class OclusionTest(Negativo):
    escena_nombre = 'oclusion'


class RetiradaTest(Negativo):
    escena_nombre = 'retirada'


class RetirarUnaDeDosTest(Negativo):
    escena_nombre = 'retirar_una'


class MovimientoTest(Negativo):
    escena_nombre = 'movimiento'


class BloqueQueTapaTest(Negativo):
    escena_nombre = 'bloque_tapa'


class FondoDificilTest(Negativo):
    escena_nombre = 'fondo_dificil'


class DosWebcamsTest(Negativo):
    escena_nombre = 'dos_webcams'

    def test_dos_vistas_no_bastan_para_esta_cadena(self):
        self.assertEqual(len(self.escena.camaras), 2)
        self.assertLess(len(self.codigo), len(self.escena.programa),
                        'si dos webcams bastaran, habría que promoverlo a caso positivo')


class OperacionIlegibleEnMedioTest(Negativo):
    constructor = staticmethod(lambda: con_operacion_ilegible(1))

    def test_no_confirma_un_prefijo(self):
        self.assertNotEqual(self.codigo, ['PUSH a 3'])


class OperacionIlegibleAlFinalTest(Negativo):
    constructor = staticmethod(lambda: con_operacion_ilegible(2))

    def test_la_ficha_ilegible_sigue_contando_como_pieza(self):
        self.assertIn(SIN_LEER, [p['lexema'] for p in self.resultado['piezas']],
                      'una ficha que se ve pero no se lee no puede desaparecer del montaje')

    def test_no_confirma_el_prefijo_legible(self):
        self.assertNotEqual(self.codigo, ['PUSH a 3', 'PUSH a 5'])


class VistaContradictoriaTest(Positivo):
    escena_nombre = 'contradiccion'
    esperado = ['PUSH a 3', 'ADD a']
    scala = {'valido': False, 'etapa': 'runtime', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}

    def test_una_vista_enfrentada_no_arrastra_a_las_demas(self):
        self.assertGreaterEqual(len(self.escena.camaras), 9)
        for pieza in self.resultado['piezas']:
            self.assertEqual(pieza['estado'], 'confirmada', pieza['lexema'])


class PrefijoSilenciosoPendienteTest(Base):
    """Bloqueo conocido: con cobertura escasa el programa se trunca sin avisar."""

    escena_nombre = 'cobertura_parcial'

    def test_reproduce_el_prefijo_silencioso(self):
        self.assertTrue(puede_ejecutar(self.resultado),
                        'si deja de confirmar, el bloqueo se resolvió y esto pasa a ser un caso negativo')
        self.assertLess(len(self.codigo), len(self.escena.programa))
        self.assertEqual(self.codigo, list(self.escena.programa)[:len(self.codigo)],
                         'lo que confirma es un prefijo de la verdad, no un programa inventado')

    def test_la_causa_es_falta_de_deteccion_no_de_lectura(self):
        for pieza in self.resultado['piezas']:
            if pieza['lexema'] != SIN_LEER:
                self.assertIn(pieza['lexema'], self.escena.verdad())
        self.assertEqual(self.resultado['avisos'], [],
                         'no hay aviso porque no hay evidencia del bloque que falta: ese es el bloqueo')
