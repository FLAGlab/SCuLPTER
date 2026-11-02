import numpy as np

from lector.detector import Caja
from lector.lectura import agrupar, encadenar, leer, ordenar_parametros


def bloque(x, y, operacion_a_la_izquierda=True):
    """Un bloque de 100x30 con su operación y dos parámetros, leído de izquierda a derecha
    o al revés."""
    cajas = [Caja("bloque", x, y, x + 100, y + 30)]
    posiciones = [x + 5, x + 40, x + 70]
    if not operacion_a_la_izquierda:
        posiciones.reverse()
    cajas.append(Caja("operacion", posiciones[0], y + 5, posiciones[0] + 20, y + 25))
    cajas.append(Caja("parametro", posiciones[1], y + 5, posiciones[1] + 20, y + 25))
    cajas.append(Caja("parametro", posiciones[2], y + 5, posiciones[2] + 20, y + 25))
    return cajas


class FichasFalsas:
    """Reconoce cada cara por su posición x en el cuadro, para no depender del modelo."""

    def candidatos(self, recorte, tipo):
        return [(f"{tipo[:2]}{int(recorte.mean())}", 1.0)]


def test_cada_cara_queda_en_su_bloque():
    bloques = agrupar(bloque(0, 0) + bloque(200, 0))
    assert len(bloques) == 2
    for b in bloques:
        assert b.operacion is not None
        assert len(b.parametros) == 2


def test_una_cara_fuera_de_todo_bloque_se_ignora():
    cajas = bloque(0, 0) + [Caja("parametro", 500, 500, 520, 520)]
    bloques = agrupar(cajas)
    assert len(bloques[0].parametros) == 2


def test_los_parametros_se_ordenan_desde_la_operacion():
    b = agrupar(bloque(0, 0, operacion_a_la_izquierda=False))[0]
    ordenar_parametros(b)
    xs = [cara.centro[0] for cara in b.parametros]
    assert xs == sorted(xs, reverse=True)


def test_la_cadena_sigue_el_sentido_de_lectura():
    cajas = bloque(400, 0) + bloque(0, 0) + bloque(200, 0)
    bloques = agrupar(cajas)
    for b in bloques:
        ordenar_parametros(b)
    xs = [b.centro[0] for b in encadenar(bloques)]
    assert xs == [50, 250, 450]


def test_la_cadena_al_reves_se_lee_al_reves():
    cajas = bloque(0, 0, False) + bloque(200, 0, False) + bloque(400, 0, False)
    bloques = agrupar(cajas)
    for b in bloques:
        ordenar_parametros(b)
    xs = [b.centro[0] for b in encadenar(bloques)]
    assert xs == [450, 250, 50]


def test_una_cadena_curva_se_recorre_por_vecinos():
    cajas = bloque(0, 0) + bloque(150, 60) + bloque(300, 160)
    bloques = agrupar(cajas)
    for b in bloques:
        ordenar_parametros(b)
    ys = [b.centro[1] for b in encadenar(bloques)]
    assert ys == [15, 75, 175]


def test_leer_arma_una_instruccion_por_bloque():
    cuadro = np.zeros((100, 600, 3), np.uint8)
    for x in range(600):
        cuadro[:, x] = x // 3
    instrucciones = leer(bloque(0, 0) + bloque(200, 0), cuadro, FichasFalsas())
    assert len(instrucciones) == 2
    assert [len(ranuras) for ranuras in instrucciones] == [3, 3]
    assert instrucciones[0][0][0][0].startswith("op")
    assert instrucciones[0][1][0][0].startswith("pa")
