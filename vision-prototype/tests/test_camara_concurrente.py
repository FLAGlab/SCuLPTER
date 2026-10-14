import time
import unittest
from unittest.mock import patch

import numpy as np

from plataforma import dispositivos
from plataforma.dispositivos import Camara, Cuadro


class Rapida:
    """Una cámara que entrega un cuadro cada 10 ms."""

    def __init__(self, fuente):
        pass

    def leer(self):
        time.sleep(.01)
        return Cuadro(np.zeros((4, 4, 3), np.uint8), time.monotonic())

    def cerrar(self):
        pass


class CamaraConcurrenteTest(unittest.TestCase):
    def test_un_detector_lento_no_acumula_cuadros_viejos(self):
        procesados = []

        def lento(camara, cuadro):
            procesados.append(time.monotonic() - cuadro.instante)
            time.sleep(.15)

        with patch.object(dispositivos, 'Webcam', Rapida):
            camara = Camara({'id': 'w', 'tipo': 'webcam', 'fuente': '0', 'nombre': 'w', 'rol': 'simbolos'}, lento)
            camara.iniciar()
            time.sleep(1.2)
            rendimiento = camara.rendimiento()
            camara.detener()
        self.assertGreater(rendimiento['descartados'], 0, 'los cuadros que no da tiempo a procesar se descartan')
        self.assertLessEqual(rendimiento['cola'], 1)
        self.assertLess(max(procesados), .05, 'siempre se procesa el último cuadro, no uno atrasado')
        self.assertGreater(rendimiento['captura_hz'], 3 * rendimiento['proceso_hz'],
                           'la captura no espera al procesamiento')

    def test_un_fallo_al_procesar_no_detiene_la_captura(self):
        def falla(camara, cuadro):
            raise RuntimeError('detector roto')

        with patch.object(dispositivos, 'Webcam', Rapida):
            camara = Camara({'id': 'w', 'tipo': 'webcam', 'fuente': '0', 'nombre': 'w', 'rol': 'simbolos'}, falla)
            camara.iniciar()
            time.sleep(.4)
            antes = camara.rendimiento()['leidos']
            time.sleep(.3)
            rendimiento = camara.rendimiento()
            camara.detener()
        self.assertGreater(rendimiento['leidos'], antes)
        self.assertGreater(rendimiento['errores_proceso'], 0)
        self.assertIn('detector roto', camara.error)


if __name__ == '__main__':
    unittest.main()
