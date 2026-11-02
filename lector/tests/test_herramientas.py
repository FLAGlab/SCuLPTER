import numpy as np

from lector.detector import Caja
from lector.herramientas.prellenar import renglones
from lector.herramientas.ver import dibujar


def test_las_etiquetas_quedan_en_formato_yolo():
    cajas = [Caja("operacion", 100, 50, 300, 150)]
    assert renglones(cajas, 1000, 500) == "1 0.200000 0.200000 0.200000 0.200000\n"


def test_dibujar_no_cambia_el_cuadro_original():
    cuadro = np.zeros((200, 400, 3), np.uint8)
    cajas = [
        Caja("bloque", 10, 10, 200, 80),
        Caja("operacion", 20, 20, 60, 70),
        Caja("parametro", 80, 20, 120, 70),
    ]
    vista = dibujar(cuadro, cajas, None)
    assert vista.shape == cuadro.shape
    assert vista.any()
    assert not cuadro.any()
