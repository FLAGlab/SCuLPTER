import unittest

from plataforma.escena_virtual import CONFIGURACION_PASOS, fuentes, olvidar_vistas, render
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import completa
from plataforma.lectura import leer_cuadro

from tests.entorno import en_scala, vocabulario

ESPERADO = ['PUSH a 3', 'ADD a']


class DesdeImagenes(unittest.TestCase):
    guion = None

    @classmethod
    def setUpClass(cls):
        if cls.guion is None:
            raise unittest.SkipTest('clase base')
        cls.vocabulario = vocabulario()
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
            primero = render(self.escena, camara)
            olvidar_vistas()
            segundo = render(self.escena, camara)
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
        r = en_scala(self.codigo)
        self.assertEqual(r['etapa'], 'runtime', r)
        self.assertEqual(r['decide'], 'lenguaje')
        self.assertEqual(r['pasos'], 1)
        self.assertEqual(r['final'], {'a': [3]})

    def test_la_certeza_visual_no_es_validez_semantica(self):
        self.assertTrue(puede_ejecutar(self.resultado))
        self.assertFalse(en_scala(self.codigo)['valido'])
