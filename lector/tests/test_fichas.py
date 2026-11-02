import cv2
import numpy as np

from lector.fichas import Fichas


def modelo_por_color(recorte):
    """Un modelo de mentira: el vector es el color promedio."""
    vector = recorte.reshape(-1, 3).mean(axis=0) + 1
    return vector / np.linalg.norm(vector)


def guardar(carpeta, tipo, nombre, color):
    destino = carpeta / tipo / nombre
    destino.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(destino / "0.png"), np.full((20, 20, 3), color, np.uint8))


def test_la_ficha_mas_parecida_sale_primero(tmp_path):
    guardar(tmp_path, "operaciones", "PUSH", (200, 0, 0))
    guardar(tmp_path, "operaciones", "POP", (0, 0, 200))
    fichas = Fichas(tmp_path, modelo_por_color)
    recorte = np.full((20, 20, 3), (190, 10, 10), np.uint8)
    candidatos = fichas.candidatos(recorte, "operaciones")
    assert candidatos[0][0] == "PUSH"
    assert candidatos[0][1] > candidatos[1][1]


def test_sin_fichas_inscritas_no_hay_candidatos(tmp_path):
    fichas = Fichas(tmp_path, modelo_por_color)
    assert fichas.candidatos(np.zeros((5, 5, 3), np.uint8), "parametros") == []
