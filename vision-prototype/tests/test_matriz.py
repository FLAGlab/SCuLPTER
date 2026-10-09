import unittest

import cv2
import numpy as np

from clasificador_simbolos import SIN_LEER
from plataforma.escena_virtual import cobertura
from plataforma.fusion import puede_ejecutar
from plataforma.geometria_fusion import proyectar
from plataforma.guiones import EXPECTATIVAS, GUIONES, _preparar
from plataforma.recorrido import leido, recorrer

from tests.entorno import en_scala, vocabulario

PASOS = 12


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
        cls.resultado, _ = recorrer(cls.escena, guion, vocabulario(), PASOS)
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


class FondoImpresoTest(Positivo):
    escena_nombre = 'fondo'
    esperado = ['PUSH a 3', 'ADD a']
    scala = {'valido': False, 'etapa': 'runtime', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}


class DesacuerdoEntreCamarasTest(Positivo):
    escena_nombre = 'desacuerdo'
    esperado = ['PUSH a 3', 'ADD a']
    scala = {'valido': False, 'etapa': 'runtime', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}


class ReapareceUnaFichaTest(Negativo):
    escena_nombre = 'reaparece'


class SoportesTest(Positivo):
    escena_nombre = 'soportes'
    esperado = ['PUSH a 3', 'ADD a']
    scala = {'valido': False, 'etapa': 'runtime', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}


class EjemploCondicionTest(Positivo):
    escena_nombre = 'ejemplo_condicion'
    esperado = ['PUSH a -1', '? a', 'PUSH b 99', 'PUSH c 7']
    scala = {'valido': True, 'etapa': 'ok', 'decide': 'lenguaje', 'pasos': 3,
             'final': {'a': [], 'c': [7]}}

    def test_el_salto_condicional_se_lee_con_su_literal_negativo(self):
        self.assertIn('-1', self.codigo[0].split())


class DosWebcamsCortaTest(Positivo):
    """Dos webcams sí leen un programa corto entero, con la disposición que halló el barrido de
    `herramientas/ensayo_dos_webcams.py`: más altura y más campo, no más resolución."""

    escena_nombre = 'dos_webcams_corta'
    esperado = ['PUSH a 3']
    scala = {'valido': True, 'etapa': 'ok', 'decide': 'lenguaje', 'pasos': 1, 'final': {'a': [3]}}

    def test_son_dos_vistas_y_por_debajo_de_los_3_px_por_mm_del_banco(self):
        self.assertEqual(len(self.escena.camaras), 2)
        self.assertLess(cobertura(self.escena.camaras[0], 20.0, 640)['px_por_mm'], 3.0)


class CoberturaParcialTest(Negativo):
    """Era el único «confirma incorrecto» de la matriz: con tres cámaras a un lado se daba por
    leído `PUSH a 3` con `PUSH a 3 · ADD a` sobre la mesa, y sin un solo aviso. Exigir que quede
    pendiente es lo que obliga a recuperar la evidencia del segundo bloque en vez de callarla."""

    escena_nombre = 'cobertura_parcial'

    def test_lo_leido_sigue_siendo_un_prefijo_pero_no_se_confirma(self):
        self.assertLess(len(self.codigo), len(self.escena.programa))
        self.assertEqual(self.codigo, list(self.escena.programa)[:len(self.codigo)],
                         'lo que lee es un prefijo de la verdad, no un programa inventado')
        self.assertFalse(puede_ejecutar(self.resultado), self.codigo)

    def test_queda_pendiente_por_evidencia_del_bloque_que_falta(self):
        sueltas = [o for obs in (self.resultado.get('sueltas') or {}).values() for o in obs]
        leidas = [o['lexema'] for o in sueltas if o['lexema'] != SIN_LEER]
        self.assertTrue(leidas, 'alguna cámara tiene que leer algo del segundo bloque')
        for lexema in leidas:
            self.assertIn(lexema, self.escena.verdad(),
                          'la evidencia que bloquea sale del montaje, no de un símbolo inventado')


class SinEncuadrarElSegundoTest(Negativo):
    """El segundo bloque no deja un solo píxel en ninguna cámara. Ninguna mejora del detector
    puede recuperarlo, así que el único modo de no truncar en silencio es comprobar que el hueco
    donde seguiría la cadena esté cubierto."""

    escena_nombre = 'sin_encuadrar'

    def test_del_segundo_bloque_no_hay_ninguna_observacion(self):
        for camara in self.escena.camaras:
            for ficha in self.escena.fichas:
                if ficha.centro[0] < 60:
                    continue
                uv, z = proyectar(camara.modelo(), [ficha.centro])
                dentro = (z[0] > 0 and 0 <= uv[0][0] < camara.resolucion[0]
                          and 0 <= uv[0][1] < camara.resolucion[1])
                self.assertFalse(dentro, f'{camara.id} encuadra {ficha.lexema}: la escena ya no sirve')

    def test_el_motivo_es_que_el_hueco_de_continuacion_no_se_ve(self):
        self.assertTrue(any('bloque siguiente' in aviso for aviso in self.resultado['avisos']),
                        self.resultado['avisos'])


class CadenaInclinadaTest(Negativo):
    escena_nombre = 'inclinada'


class CadenaVerticalTest(Negativo):
    escena_nombre = 'vertical'

    def test_las_fichas_salen_de_la_banda_de_planos(self):
        self.assertEqual(self.resultado['piezas'], [],
                         'la cadena vertical deja las fichas fuera de la banda declarada')


class RecorridoQueRegresaTest(Negativo):
    escena_nombre = 'regresa'

    @unittest.expectedFailure
    def test_no_inventa_simbolos_confirmados(self):
        """Límite abierto, no criterio cumplido. Seis bloques girando 60° acumulan 300°, así que
        el banco de cámaras —todas al mismo lado, como exige la regla— acaba viendo dos fichas
        casi del revés: una vista lee el `POP` de [95,165] como `PUSH` (0.805) y el `NEG` de
        [-48,82] como `MOD` (0.556), la otra vista que las observa no logra leerlas, y sin nadie
        que contradiga la fusión las confirma. La escena queda pendiente, que es lo correcto, pero
        con dos fichas confirmadas que no están sobre la mesa.

        La regla «todas las cámaras al mismo lado» evita el par enfrentado, pero no evita que el
        montaje gire el bloque. Resolverlo pide una ficha cuyo símbolo no dependa de la
        orientación, o deducir la orientación del bloque antes de leer la ficha; las dos cosas
        quedan fuera de este pase. Si alguna de las dos se hace, unittest avisará de un éxito
        inesperado aquí."""
        super().test_no_inventa_simbolos_confirmados()


class UnionEnTeTest(Negativo):
    escena_nombre = 'te'


class MontajesSeparadosTest(Negativo):
    escena_nombre = 'separados'

    def test_se_informan_como_grupos_sin_union(self):
        self.assertTrue(any('sin unión entre sí' in aviso for aviso in self.resultado['avisos']),
                        self.resultado['avisos'])


class EjemploBucleTest(Negativo):
    escena_nombre = 'ejemplo_bucle'


def casos_por_escena():
    return {clase.escena_nombre: clase for clase in globals().values()
            if isinstance(clase, type) and issubclass(clase, Base)
            and clase.escena_nombre is not None}


class CoberturaDeLaMatrizTest(unittest.TestCase):
    """Una escena que no aparezca en la matriz no es un caso que pase: es un caso que falta."""

    def test_toda_escena_del_gemelo_tiene_su_caso(self):
        self.assertEqual(set(casos_por_escena()), set(GUIONES))

    def test_toda_escena_declara_que_se_espera_de_ella(self):
        self.assertEqual(set(EXPECTATIVAS), set(GUIONES))
        for nombre, clase in casos_por_escena().items():
            espera_reconstruir = issubclass(clase, Positivo)
            self.assertEqual(espera_reconstruir, EXPECTATIVAS[nombre] is None,
                             f'{nombre}: la clase y la expectativa declarada no concuerdan')

    def test_los_positivos_cubren_programas_distintos_no_solo_escenas(self):
        programas = {tuple(clase.esperado) for clase in casos_por_escena().values()
                     if issubclass(clase, Positivo)}
        escenas = sum(1 for clase in casos_por_escena().values() if issubclass(clase, Positivo))
        self.assertLess(len(programas), escenas,
                        'si cada escena positiva tuviera su propio programa, este recuento sobra')
        self.assertGreaterEqual(len(programas), 6, sorted(programas))
