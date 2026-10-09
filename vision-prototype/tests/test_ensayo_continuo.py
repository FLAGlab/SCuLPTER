import unittest

from herramientas.ensayo_continuo import GUIONES
from plataforma.ensayo import ensayar
from plataforma.lector import programa_de

from tests.entorno import vocabulario


class EnsayoDeUsoTest(unittest.TestCase):
    """Construir y modificar el montaje como lo haría una persona. Con el programa quieto y
    visible debe terminar leyéndolo entero; durante los cambios debe quedar pendiente con motivo.
    Nunca un prefijo confirmado ni un veredicto de una versión que ya no está."""

    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()
        cls.corridas = {}
        for nombre, guion in sorted(GUIONES.items()):
            programa, camaras, acciones = guion()
            cls.corridas[nombre] = (programa, *ensayar(cls.voc, programa, acciones, camaras))

    def test_ninguna_captura_confirma_algo_distinto_de_la_mesa(self):
        """Seguridad en cada captura, no solo al final de cada acción."""
        for nombre, (_, _, _, _, bitacora) in self.corridas.items():
            self.assertGreater(len(bitacora), 50, 'la bitácora tiene que cubrir cada captura')
            for n, paso in enumerate(bitacora):
                if paso['estado'] != 'confirmada':
                    continue
                with self.subTest(guion=nombre, captura=n):
                    self.assertEqual(paso['programa'], paso['real'],
                                     f"captura {n}: confirma {paso['programa']} con la mesa en {paso['real']}")

    def test_cada_captura_pendiente_trae_motivo(self):
        for nombre, (_, _, _, _, bitacora) in self.corridas.items():
            for n, paso in enumerate(bitacora):
                if paso['estado'] == 'pendiente':
                    with self.subTest(guion=nombre, captura=n):
                        self.assertTrue(paso['motivo'])

    def test_cada_accion_cumple_lo_que_se_espera_de_ella(self):
        for nombre, (programa, _, lector, registro, _) in self.corridas.items():
            for fila in registro:
                if fila['espera'] == 'cualquiera':
                    continue
                with self.subTest(guion=nombre, accion=fila['accion']):
                    self.assertEqual(fila['lectura']['estado'], fila['espera'],
                                     fila['lectura'].get('motivo'))

    def test_toda_lectura_pendiente_trae_un_motivo(self):
        for nombre, (_, _, lector, _, _) in self.corridas.items():
            for h in lector.historial:
                if h['estado'] == 'pendiente':
                    with self.subTest(guion=nombre):
                        self.assertTrue(h['motivo'], 'pendiente sin motivo')

    def test_lo_que_se_lee_completo_es_lo_que_hay_sobre_la_mesa(self):
        for nombre, (_, _, _, registro, _) in self.corridas.items():
            for fila in registro:
                if fila['lectura']['estado'] != 'confirmada':
                    continue
                with self.subTest(guion=nombre, accion=fila['accion']):
                    self.assertEqual(fila['lectura']['programa'], fila['real'],
                                     'una lectura completa tiene que ser el programa montado')

    def test_nunca_se_confirma_un_prefijo(self):
        for nombre, (_, _, _, registro, _) in self.corridas.items():
            for fila in registro:
                leido, real = fila['lectura']['programa'], fila['real']
                if fila['lectura']['estado'] != 'confirmada' or leido == real:
                    continue
                with self.subTest(guion=nombre, accion=fila['accion']):
                    self.fail(f'confirma {leido} con la mesa en {real}')

    def test_el_veredicto_mostrado_es_de_la_version_mostrada(self):
        for nombre, (_, _, lector, registro, _) in self.corridas.items():
            for fila in registro:
                veredicto = fila['veredicto']
                if veredicto is None:
                    continue
                with self.subTest(guion=nombre, accion=fila['accion']):
                    self.assertEqual(veredicto['version'], fila['lectura']['version'])

    def test_no_se_reejecuta_la_misma_version_en_cada_captura(self):
        for nombre, (_, _, lector, _, _) in self.corridas.items():
            with self.subTest(guion=nombre):
                self.assertLessEqual(len(lector.ejecuciones), len(lector.cache),
                                     'una ejecución por programa distinto como máximo')
                self.assertLess(len(lector.ejecuciones), lector.metricas()['capturas'] / 10,
                                'las ejecuciones no pueden crecer con las capturas')
