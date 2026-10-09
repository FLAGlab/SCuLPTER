import unittest

import numpy as np

import reconstruir
from plataforma.escena_virtual import Camara, centro_de, olvidar_vistas
from plataforma.fusion import puede_ejecutar
from plataforma.gemelo import Gemelo
from plataforma.guiones import GUIONES
from plataforma.recorrido import leido, recorrer

from tests.entorno import RAIZ, datos, vocabulario

DESVIO_MM = 15.0
GIRO_GRADOS = 5.0


def asentar(gemelo, pasos=12):
    estado = None
    for _ in range(pasos):
        estado = gemelo.avanzar(1)
    return estado


def programa(estado):
    return estado['codigo']


def confirmadas(estado):
    return {p['id']: p for p in estado['fusion']['piezas'] if p['estado'] == 'confirmada'}


class RedundanciaTest(unittest.TestCase):
    def setUp(self):
        self.gemelo = Gemelo(RAIZ, datos())
        self.gemelo.cargar('completa')
        self.estado = asentar(self.gemelo)

    def test_la_escena_de_partida_se_acepta(self):
        self.assertTrue(self.estado['fusion']['habilita_ejecucion'], self.estado['fusion']['avisos'])
        self.assertEqual(programa(self.estado), 'PUSH a 3\nADD a')

    def test_apartar_una_camara_redundante_no_cambia_el_programa(self):
        antes = programa(self.estado)
        sobrantes = [p for p in self.estado['fusion']['piezas'] if len(p['camaras']) >= 3]
        self.assertTrue(sobrantes, 'sin cobertura de tres vistas no hay redundancia que probar')
        quitada = sobrantes[0]['camaras'][0]
        self.gemelo.quitar(quitada)
        despues = asentar(self.gemelo)
        self.assertEqual(programa(despues), antes, 'las vistas restantes deben sostener el mismo programa')
        self.assertTrue(despues['fusion']['habilita_ejecucion'], despues['fusion']['avisos'])
        self.assertNotIn(quitada, [c['id'] for c in despues['camaras']])

    def test_quedarse_sin_cobertura_deja_la_lectura_pendiente_y_lo_explica(self):
        for camara in [c['id'] for c in self.estado['camaras']][:-1]:
            self.gemelo.quitar(camara)
        despues = asentar(self.gemelo)
        self.assertEqual(len(despues['camaras']), 1)
        self.assertFalse(despues['fusion']['habilita_ejecucion'],
                         'con una sola vista y sin profundidad no se puede situar ninguna ficha')
        self.assertTrue(despues['fusion']['avisos'], 'debe decir por qué no se puede ejecutar')
        for pieza in despues['fusion']['piezas']:
            self.assertNotEqual(pieza['estado'], 'confirmada', pieza['lexema'])

    def test_el_detalle_por_ficha_clasifica_cada_camara(self):
        clases = {'asociada', 'contradice', 'ilegible', 'sin_asociar', 'sin_deteccion', 'fuera'}
        for pieza in self.estado['fusion']['piezas']:
            vistas = pieza['vistas']
            self.assertEqual(len(vistas), len(self.estado['camaras']))
            for v in vistas:
                self.assertIn(v['clase'], clases)
                self.assertTrue(v['motivo'], 'cada vista debe decir en qué situación está')
            asociadas = [v for v in vistas if v['clase'] == 'asociada']
            self.assertTrue(asociadas, pieza['lexema'])
            for v in asociadas:
                self.assertEqual(v['propone'], pieza['lexema'])

    def test_el_respaldo_mostrado_es_el_que_uso_la_fusion(self):
        for pieza in self.estado['fusion']['piezas']:
            asociadas = [v['camara'] for v in pieza['vistas'] if v['clase'] == 'asociada']
            self.assertEqual(sorted(asociadas), sorted(pieza['lectores']))
            self.assertEqual(pieza['respaldo'], len(pieza['lectores']))

    def test_el_simbolo_mostrado_sale_de_la_observacion_que_uso_la_fusion(self):
        """Antes el panel buscaba la región más cercana a la proyección y rellenaba el lexema
        desde el resultado fusionado, así que podía atribuir a una cámara una lectura que no
        hizo. Ahora cada fila cita la observación concreta que la fusión agrupó en esa pieza."""
        for pieza in self.estado['fusion']['piezas']:
            lecturas = pieza['lecturas']
            for vista in pieza['vistas']:
                if vista['clase'] in ('asociada', 'contradice', 'ilegible'):
                    usada = lecturas.get(vista['camara'])
                    self.assertIsNotNone(usada, f"{pieza['lexema']}: {vista['camara']} sin lectura")
                    self.assertEqual(vista['candidatos'], usada['candidatos'])
                    self.assertEqual(vista['caja'], usada['caja'])
                    esperado = None if usada['lexema'] == '<sin leer>' else usada['lexema']
                    self.assertEqual(vista['propone'], esperado)
                else:
                    self.assertNotIn(vista['camara'], lecturas,
                                     f"{pieza['lexema']}: {vista['camara']} aportó y se la da por ciega")

    def test_el_detalle_corresponde_al_cuadro_mostrado(self):
        for pieza in self.estado['fusion']['piezas']:
            sostienen = set(pieza['lectores'])
            proponen = {v['camara'] for v in pieza['vistas'] if v['propone'] == pieza['lexema']}
            self.assertTrue(sostienen <= proponen | {v['camara'] for v in pieza['vistas'] if v['ve']},
                            f"{pieza['lexema']}: la fusión cita cámaras que el detalle no reconoce")


class MoverCamaraTest(unittest.TestCase):
    def setUp(self):
        self.gemelo = Gemelo(RAIZ, datos())
        self.gemelo.cargar('completa')
        self.estado = asentar(self.gemelo)

    def test_mover_una_camara_produce_un_cuadro_nuevo(self):
        camara = self.estado['camaras'][0]
        antes = self.gemelo.fusion.clave
        movido = self.gemelo.mover(camara['id'], centro=[400., -600., 240.])
        self.assertNotEqual(self.gemelo.fusion.clave, antes,
                            'una pose nueva debe producir un cuadro identificable como nuevo')
        self.assertNotEqual(movido['camaras'][0]['imagen'], camara['imagen'])

    def test_apartar_una_camara_actualiza_fusion_y_procedencia(self):
        camara = self.estado['camaras'][0]['id']
        movido = self.gemelo.mover(camara, centro=[900., -900., 260.])
        for _ in range(3):
            movido = self.gemelo.avanzar(0)
        for pieza in movido['fusion']['piezas']:
            if pieza['estado'] == 'confirmada':
                self.assertNotIn(camara, pieza['lectores'],
                                 'una cámara que ya no la lee no puede seguir sosteniendo su lectura')

    def test_cambios_rapidos_de_pose_no_dejan_respuestas_atrasadas(self):
        camara = self.estado['camaras'][0]['id']
        for altura in (300., 320., 340., 360.):
            estado = self.gemelo.mover(camara, centro=[60., -15., altura])
        actual = next(c for c in estado['camaras'] if c['id'] == camara)
        self.assertAlmostEqual(actual['centro'][2], 360., places=3)
        self.assertEqual(estado['fusion']['revision'], self.gemelo.fusion.revision)


def girar_hacia(camara, grados):
    alcance = float(np.linalg.norm(camara.objetivo - camara.centro))
    return camara.objetivo + [alcance * np.tan(np.radians(grados)), 0., 0.]


class DosWebcamsTest(unittest.TestCase):
    """Qué aporta la redundancia cuando solo hay dos vistas. El resultado admisible de cada
    variación es el programa entero y correcto o un estado pendiente con motivo concreto;
    un prefijo confirmado no lo es nunca."""

    escena_nombre = 'dos_webcams_corta'

    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()

    def leer(self, camaras=None):
        escena, guion = GUIONES[self.escena_nombre][0](self.voc)
        if camaras is not None:
            escena.camaras = camaras
        resultado, _ = recorrer(escena, guion, self.voc, 12)
        return escena, resultado

    def copia(self):
        escena, _ = GUIONES[self.escena_nombre][0](self.voc)
        return [Camara(c.id, c.nombre, c.centro.copy(), c.objetivo.copy(), c.fov, c.resolucion)
                for c in escena.camaras]

    def admisible(self, etiqueta, camaras):
        escena, resultado = self.leer(camaras)
        codigo, real = leido(resultado), list(escena.programa)
        if puede_ejecutar(resultado):
            self.assertEqual(codigo, real,
                             f'{etiqueta}: confirma «{" · ".join(codigo)}» con la mesa en '
                             f'«{" · ".join(real)}»')
            return 'completo'
        self.assertTrue(resultado['avisos'] or resultado['estado'] != 'estable',
                        f'{etiqueta}: queda pendiente y no dice por qué')
        return 'pendiente'

    def test_la_disposicion_hallada_lee_el_programa_entero(self):
        escena, resultado = self.leer()
        self.assertEqual(len(escena.camaras), 2)
        self.assertTrue(puede_ejecutar(resultado), resultado['avisos'])
        self.assertEqual(leido(resultado), list(escena.programa))

    def test_desplazar_cada_camara_nunca_confirma_un_prefijo(self):
        veredictos = {}
        for n in range(2):
            for eje, nombre in enumerate('xyz'):
                for delta in (-DESVIO_MM, DESVIO_MM):
                    camaras = self.copia()
                    camaras[n].centro[eje] += delta
                    etiqueta = f'{camaras[n].id} {nombre} {delta:+.0f} mm'
                    veredictos[etiqueta] = self.admisible(etiqueta, camaras)
        self.assertEqual(len(veredictos), 12)
        self.assertTrue(any(v == 'completo' for v in veredictos.values()),
                        f'ninguna variación de {DESVIO_MM:.0f} mm sobrevive: {veredictos}')

    def test_desviar_la_punteria_nunca_confirma_un_prefijo(self):
        veredictos = {}
        for n in range(2):
            for grados in (-GIRO_GRADOS, GIRO_GRADOS):
                camaras = self.copia()
                camaras[n].objetivo = girar_hacia(camaras[n], grados)
                etiqueta = f'{camaras[n].id} apunta {grados:+.0f}°'
                veredictos[etiqueta] = self.admisible(etiqueta, camaras)
        self.assertEqual(len(veredictos), 4)

    def test_retirar_una_vista_deja_la_lectura_pendiente_con_motivo(self):
        escena, resultado = self.leer(self.copia()[:1])
        self.assertEqual(len(escena.camaras), 1)
        self.assertFalse(puede_ejecutar(resultado),
                         'con una sola vista y sin profundidad no se puede situar ninguna ficha')
        self.assertTrue(resultado['avisos'], 'debe decir por qué no se puede ejecutar')


class AnchoDeTrabajoMayorTest(unittest.TestCase):
    """Qué desbloquearía la cadena de dos bloques con solo dos webcams, y qué rompe al hacerlo.

    La resolución efectiva no la pone el sensor: `reducir_resolucion` baja todo cuadro a
    `ANCHO_TRABAJO_PX` antes de buscar regiones. Subir ese tope de 640 a 1024 px es la única
    palanca que da a la vez campo ancho (para cubrir los huecos de continuación) y px/mm
    suficiente (para resolver las fichas). Al subirlo reaparecía el truncamiento silencioso: dos
    de las dieciocho configuraciones barridas confirmaban `PUSH a 3` con `PUSH a 3 · ADD a` sobre
    la mesa y sin un solo aviso, porque del hueco se comprobaba que alguna cámara lo encuadrara,
    no que se viera vacío. Con el canal de tinta sin resolver ya se exige lo segundo.
    """

    altura, fov = 500., 40.
    ancho = 1024

    def setUp(self):
        self.original = reconstruir.ANCHO_TRABAJO_PX
        reconstruir.ANCHO_TRABAJO_PX = self.ancho
        olvidar_vistas()

    def tearDown(self):
        reconstruir.ANCHO_TRABAJO_PX = self.original
        olvidar_vistas()

    def leer(self):
        escena, guion = GUIONES['completa'][0](vocabulario())
        centro = centro_de(escena.fichas)
        mira = [float(centro[0]), float(centro[1]), 30.]
        escena.camaras = [
            Camara('web1', 'izquierda', [centro[0] - 30., -45., self.altura], mira, self.fov,
                   (self.ancho, self.ancho * 3 // 4)),
            Camara('web2', 'derecha', [centro[0] + 30., -45., self.altura], mira, self.fov,
                   (self.ancho, self.ancho * 3 // 4))]
        resultado, _ = recorrer(escena, guion, vocabulario(), 12)
        return escena, resultado

    def test_no_confirma_un_prefijo_al_subir_el_ancho_de_trabajo(self):
        escena, resultado = self.leer()
        codigo, real = leido(resultado), list(escena.programa)
        if puede_ejecutar(resultado):
            self.assertEqual(codigo, real,
                             f'confirma «{" · ".join(codigo)}» con la mesa en «{" · ".join(real)}»')

    def test_lo_que_lee_sigue_siendo_prefijo_de_la_verdad(self):
        """Quede pendiente o no, lo que lee nunca es un programa inventado."""
        escena, resultado = self.leer()
        codigo, real = leido(resultado), list(escena.programa)
        self.assertEqual(codigo, real[:len(codigo)], codigo)
