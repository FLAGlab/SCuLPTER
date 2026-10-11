"""Etapa 1 sobre renders del gemelo con profundidad, no sobre fichas reales."""

import unittest

import numpy as np

from tests.entorno import vocabulario as preparar_vocabulario
from plataforma import guiones
from plataforma.escena_virtual import Camara, centro_de, escenario_de, olvidar_vistas
from plataforma.geometria_fusion import modelo, proyectar
from plataforma.localizacion import _sin_contenidas, _sin_fusiones, localizar, mm_por_px
from plataforma.mesa import Mesa, ajustar_plano
from reconstruir import analizar, reducir_resolucion

RESOLUCION = (1280, 720)
FOV = 69.0


def escena_de(nombre, vocabulario):
    hacer = guiones.GUIONES[nombre][0] if nombre in guiones.GUIONES else getattr(guiones, nombre)
    return hacer(vocabulario)


def camara_a(altura, escena):
    centro = centro_de(escena.fichas) if escena.fichas else (0., 0., 0.)
    return Camara('c0', 'cenital', (centro[0], centro[1], altura),
                  objetivo=(centro[0], centro[1], 0.), fov=FOV, resolucion=RESOLUCION)


def render(escena, camara):
    color, profundidad, _ = escenario_de(escena).rasterizar(camara.modelo(), camara.resolucion)
    return color, np.where(np.isfinite(profundidad), profundidad, 0.0)


def fichas_en_pixeles(escena, camara):
    m = modelo(camara.intrinsecos(), camara.pose(), camara.resolucion)
    centros = np.array([f.centro for f in escena.visibles()], float)
    if not len(centros):
        return np.empty((0, 2))
    uv, z = proyectar(m, centros)
    return uv[z > 0]


def cubre(caja, punto):
    x, y, w, h = caja
    return x <= punto[0] <= x + w and y <= punto[1] <= y + h


def halladas(candidatos, verdad):
    return sum(1 for p in verdad if any(cubre(c['caja'], p) for c in candidatos))


def vaciar(escena):
    escena.fichas, escena.cuerpos, escena.conexiones = [], [], []
    escena.soportes, escena.tes, escena.manos = [], [], []
    return escena


def mesa_de(nombre, altura, vocabulario):
    """Referencia tomada con la mesa despejada."""
    olvidar_vistas()
    escena, _ = escena_de(nombre, vocabulario)
    camara = camara_a(altura, escena)
    vaciar(escena)
    _, profundidad = render(escena, camara)
    return Mesa.desde_captura(profundidad, camara.intrinsecos()), camara


class EscalaTest(unittest.TestCase):
    def test_un_pixel_cubre_mas_milimetros_cuanto_mas_lejos(self):
        intr = {'camera_matrix': [[900., 0., 640.], [0., 900., 360.], [0., 0., 1.]]}
        self.assertAlmostEqual(mm_por_px(intr, 900.), 1.0)
        self.assertAlmostEqual(mm_por_px(intr, 450.), 0.5)

    def test_sin_intrinsecos_utiles_no_hay_escala(self):
        self.assertIsNone(mm_por_px(None, 800.))
        self.assertIsNone(mm_por_px({'camera_matrix': [[0., 0., 0.]] * 3}, 800.))


class LocalizarTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.voc = preparar_vocabulario()

    def localizar_en(self, nombre, altura, pasos=0, vacia=False):
        olvidar_vistas()
        escena, avanzar = escena_de(nombre, self.voc)
        for paso in range(pasos):
            avanzar(escena, paso)
        if vacia:
            vaciar(escena)
        camara = camara_a(altura, escena)
        color, profundidad = render(escena, camara)
        mesa, _ = mesa_de(nombre, altura, self.voc)
        candidatos, objetos, diagnostico = localizar(color, profundidad, camara.intrinsecos(),
                                                     mesa=mesa)
        return escena, camara, color, profundidad, candidatos, objetos, diagnostico

    def test_lo_hallado_no_se_desploma_con_la_distancia(self):
        """Se comprueba la invariancia con la distancia, no una cifra concreta."""
        por_altura = {}
        for altura in (400, 700, 1000):
            escena, camara, color, _, candidatos, _, _ = self.localizar_en('completa', altura)
            verdad = fichas_en_pixeles(escena, camara)
            por_altura[altura] = (halladas(candidatos, verdad), len(verdad))
            viejas, _ = analizar(reducir_resolucion(color))
            self.assertGreaterEqual(por_altura[altura][0], 3,
                                    f'a {altura} mm quedan menos de 3 caras: {por_altura}')
            if altura >= 700:
                self.assertEqual(len(viejas), 0,
                                 f'a {altura} mm el detector por contornos debería ver cero; '
                                 'si ve algo, esta prueba ya no compara lo que dice comparar')
        self.assertGreaterEqual(por_altura[1000][0], por_altura[400][0] - 1,
                                'alejarse no puede empeorar mucho lo hallado')

    def test_varias_fichas_unidas_no_se_funden_en_una_sola_cara(self):
        escena, camara, _, _, candidatos, objetos, _ = self.localizar_en('completa', 800)
        self.assertEqual(len(objetos), 1, 'la cadena unida es un solo objeto sobre la mesa')
        self.assertGreaterEqual(len(candidatos), 4,
                                'de ese objeto deben salir varias caras, no una')

    def test_la_mesa_vacia_no_produce_ninguna_cara(self):
        _, _, _, _, candidatos, objetos, diagnostico = self.localizar_en('completa', 800, vacia=True)
        self.assertEqual(candidatos, [])
        self.assertEqual(objetos, [])
        self.assertIn('nada sobre la mesa', diagnostico['motivo'])

    def test_un_marcador_impreso_en_el_plano_no_es_una_ficha(self):
        """Lo impreso está en el plano de la mesa: la altura lo descarta sin mirar su contraste."""
        olvidar_vistas()
        escena, _ = escena_de('fondo_dificil', self.voc)
        vaciar(escena)
        camara = camara_a(800, escena)
        color, profundidad = render(escena, camara)
        mesa = Mesa.desde_captura(profundidad, camara.intrinsecos())
        candidatos, objetos, diagnostico = localizar(color, profundidad, camara.intrinsecos(),
                                                     mesa=mesa)
        self.assertEqual(candidatos, [], 'un fondo impreso no puede dar caras de ficha')
        self.assertEqual(objetos, [])

    def test_una_mano_encima_quita_caras_pero_no_rompe_la_lectura(self):
        """Se cuentan caras verdaderas: la mano misma puede dar candidatos falsos."""
        _, _, _, _, con_mano, _, _ = self.localizar_en('oclusion', 800, pasos=4)
        escena_s, camara_s, _, _, sin_mano, _, _ = self.localizar_en('completa', 800)
        halladas_sin = halladas(sin_mano, fichas_en_pixeles(escena_s, camara_s))
        halladas_con = halladas(con_mano, fichas_en_pixeles(escena_s, camara_s))
        self.assertGreater(halladas_sin, 0)
        self.assertLess(halladas_con, halladas_sin,
                        'tapar fichas debe quitar caras verdaderas halladas')


class ProfundidadIncompletaTest(unittest.TestCase):
    """Huecos de profundidad como los de la D435i."""

    @classmethod
    def setUpClass(cls):
        cls.voc = preparar_vocabulario()
        olvidar_vistas()
        cls.escena, _ = escena_de('completa', cls.voc)
        cls.camara = camara_a(800, cls.escena)
        cls.color, cls.profundidad = render(cls.escena, cls.camara)
        cls.verdad = fichas_en_pixeles(cls.escena, cls.camara)
        cls.mesa, _ = mesa_de('completa', 800, cls.voc)

    def localizar_con(self, profundidad):
        return localizar(self.color, profundidad, self.camara.intrinsecos(), mesa=self.mesa)

    def test_huecos_dispersos_no_pierden_las_fichas(self):
        for fraccion in (0.3, 0.5, 0.8):
            with self.subTest(fraccion=fraccion):
                azar = np.random.default_rng(7)
                roto = self.profundidad.copy()
                roto[azar.random(roto.shape) < fraccion] = 0.0
                candidatos, _, _ = self.localizar_con(roto)
                self.assertGreaterEqual(halladas(candidatos, self.verdad), len(self.verdad) - 2)

    def test_una_franja_contigua_sin_medida_se_resuelve_por_color(self):
        """El plano da la escala aunque falte la medida."""
        roto = self.profundidad.copy()
        roto[:, 500:800] = 0.0
        candidatos, _, diagnostico = self.localizar_con(roto)
        self.assertGreater(len(candidatos), 0, 'una franja sin medida no puede borrar el montaje')
        self.assertGreater(diagnostico['sin_profundidad'], 0,
                           'esas caras deben declararse sostenidas solo por color')
        self.assertTrue(all(c['origen'] in ('profundidad', 'color') for c in candidatos))

    def test_sin_profundidad_ni_intrinsecos_se_niega_en_vez_de_inventar(self):
        candidatos, _, diagnostico = localizar(self.color, None, self.camara.intrinsecos(),
                                               mesa=self.mesa)
        self.assertEqual(candidatos, [])
        self.assertIn('profundidad', diagnostico['motivo'])
        candidatos, _, diagnostico = localizar(self.color, self.profundidad, None, mesa=self.mesa)
        self.assertEqual(candidatos, [])
        self.assertIn('intrínsecos', diagnostico['motivo'])

    def test_sin_referencia_de_mesa_se_niega_a_localizar(self):
        """Sin referencia no se sabe dónde acaba la mesa."""
        candidatos, _, diagnostico = localizar(self.color, self.profundidad,
                                               self.camara.intrinsecos())
        self.assertEqual(candidatos, [])
        self.assertIn('referencia de mesa', diagnostico['motivo'])

    def test_el_plano_de_la_mesa_sale_del_propio_cuadro(self):
        plano = ajustar_plano(self.profundidad, self.camara.intrinsecos())
        self.assertIsNotNone(plano)
        normal, _ = plano
        self.assertAlmostEqual(float(np.linalg.norm(normal)), 1.0, places=5)


class CandidatosSinLeerTest(unittest.TestCase):
    """Un candidato ilegible se publica, y nunca como instrucción."""

    @classmethod
    def setUpClass(cls):
        cls.voc = preparar_vocabulario()

    def test_una_cara_ilegible_sigue_siendo_un_candidato_con_posicion(self):
        from clasificador_simbolos import SIN_LEER
        from plataforma.lectura import leer_detallado

        olvidar_vistas()
        escena, _ = escena_de('completa', self.voc)
        camara = camara_a(800, escena)
        color, profundidad = render(escena, camara)
        mesa, _ = mesa_de('completa', 800, self.voc)
        _, lecturas, _, diagnostico = leer_detallado(color, self.voc, profundidad,
                                                     camara.intrinsecos(), mesa=mesa)
        self.assertGreater(len(lecturas), 0)
        self.assertEqual(diagnostico['etapa'], 'profundidad')
        for lectura in lecturas:
            observacion = lectura['observacion']
            self.assertIn('x', observacion)
            self.assertIn('caja', observacion)
            self.assertEqual(len(observacion['caja']), 4)
        sin_leer = [l for l in lecturas if l['token'] == SIN_LEER]
        for lectura in sin_leer:
            self.assertEqual(lectura['observacion']['lexema'], SIN_LEER,
                             'una cara ilegible no puede publicarse como un símbolo cualquiera')

    def test_rgbd_sin_referencia_no_vuelve_al_detector_antiguo(self):
        from plataforma.lectura import leer_detallado

        olvidar_vistas()
        escena, _ = escena_de('completa', self.voc)
        camara = camara_a(800, escena)
        color, profundidad = render(escena, camara)
        _, lecturas, tinta, diagnostico = leer_detallado(
            color, self.voc, profundidad, camara.intrinsecos())
        self.assertEqual(lecturas, [])
        self.assertEqual(tinta, [])
        self.assertEqual(diagnostico['etapa'], 'profundidad')
        self.assertIn('referencia de mesa', diagnostico['motivo'])

    def test_servicio_carga_referencia_al_conectar_realsense(self):
        """La referencia sale de la cámara de la sesión activa."""
        import tempfile
        from pathlib import Path
        from unittest.mock import patch

        from plataforma.dispositivos import Camara
        from plataforma.estado import Estado
        from plataforma.sesiones import Dataset

        mesa, _ = mesa_de('completa', 800, self.voc)
        with tempfile.TemporaryDirectory() as carpeta:
            datos = Path(carpeta)
            ds = Dataset(datos / 'dataset')
            sesion = ds.crear_sesion('2026-10-11-cenital')
            sesion.agregar_camara('rs0', 'realsense', fuente='944622074682')
            mesa.guardar(sesion.ruta_mesa('rs0'))
            ds.activar('2026-10-11-cenital')
            estado = Estado(Path(__file__).resolve().parents[1], datos)
            try:
                config = estado.accion('agregar', {'tipo': 'realsense', 'fuente': '944622074682',
                                                   'nombre': 'D435i', 'rol': 'ambos'})
                disponible = [{'tipo': 'realsense', 'disponible': True, 'requisito': ''}]
                with patch('plataforma.estado.capacidades', return_value=disponible), \
                     patch.object(Camara, 'iniciar'):
                    estado.accion('iniciar', {'id': config['id']})
                self.assertIn(config['id'], estado.mesas)
                self.assertEqual(estado.mesas[config['id']].resolucion, mesa.resolucion)
                informe = estado.resumen()['sesion_dataset']
                self.assertEqual(informe['id'], '2026-10-11-cenital')
                self.assertTrue(informe['camaras'][config['id']]['mesa'])
            finally:
                estado.cerrar()

    def test_la_ruta_global_de_referencia_ya_no_se_usa(self):
        """Una referencia fuera de una sesión no vale para ninguna cámara."""
        import tempfile
        from pathlib import Path

        from plataforma.estado import Estado

        mesa, _ = mesa_de('completa', 800, self.voc)
        with tempfile.TemporaryDirectory() as carpeta:
            datos = Path(carpeta)
            mesa.guardar(datos / 'mesa' / 'referencia')
            estado = Estado(Path(__file__).resolve().parents[1], datos)
            try:
                config = estado.accion('agregar', {'tipo': 'realsense', 'fuente': '944622074682',
                                                   'nombre': 'D435i', 'rol': 'ambos'})
                self.assertNotIn(config['id'], estado.mesas)
                self.assertEqual(estado.motivos_mesa[config['id']], 'no hay sesión activa')
            finally:
                estado.cerrar()

    def test_cambiar_de_sesion_cambia_la_referencia(self):
        """Cada sesión trae el plano de su posición de cámara."""
        import tempfile
        from pathlib import Path

        from plataforma.estado import Estado
        from plataforma.sesiones import Dataset

        cerca, _ = mesa_de('completa', 500, self.voc)
        lejos, _ = mesa_de('completa', 1000, self.voc)
        with tempfile.TemporaryDirectory() as carpeta:
            datos = Path(carpeta)
            ds = Dataset(datos / 'dataset')
            for nombre, mesa in (('sesion-cerca', cerca), ('sesion-lejos', lejos)):
                s = ds.crear_sesion(nombre)
                s.agregar_camara('rs0', 'realsense', fuente='944622074682')
                mesa.guardar(s.ruta_mesa('rs0'))
            ds.activar('sesion-cerca')
            estado = Estado(Path(__file__).resolve().parents[1], datos)
            try:
                config = estado.accion('agregar', {'tipo': 'realsense', 'fuente': '944622074682',
                                                   'nombre': 'D435i', 'rol': 'ambos'})
                d_cerca = estado.mesas[config['id']].plano[1]
                estado.accion('activar_sesion', {'sesion': 'sesion-lejos'})
                d_lejos = estado.mesas[config['id']].plano[1]
                self.assertNotAlmostEqual(d_cerca, d_lejos, delta=100,
                                          msg='las dos sesiones deberían traer planos distintos')
                estado.accion('activar_sesion', {'sesion': None})
                self.assertNotIn(config['id'], estado.mesas)
            finally:
                estado.cerrar()


class RutaRgbTest(unittest.TestCase):
    def test_una_caja_que_abarca_dos_caras_vecinas_se_descarta(self):
        caras = [(0, 0, 20, 20), (22, 0, 20, 20)]
        self.assertEqual(_sin_fusiones(caras + [(0, 0, 42, 20)]), caras)

    def test_un_detalle_dentro_de_una_cara_se_descarta(self):
        self.assertEqual(_sin_contenidas([(0, 0, 40, 40), (10, 10, 8, 8), (50, 0, 40, 40)]),
                         [(0, 0, 40, 40), (50, 0, 40, 40)])


if __name__ == '__main__':
    unittest.main()
