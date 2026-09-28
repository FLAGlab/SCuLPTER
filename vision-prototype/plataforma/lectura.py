import cv2
import numpy as np

from clasificador_simbolos import SIN_LEER, aceptar_candidatos
from reconstruir import reducir_resolucion, regiones


def leer_cuadro(cuadro, vocabulario):
    imagen = reducir_resolucion(cuadro)
    sx, sy = cuadro.shape[1] / imagen.shape[1], cuadro.shape[0] / imagen.shape[0]
    lecturas = []
    for recorte, x, y in regiones(imagen)[:80]:
        candidatos = vocabulario.puntuar(recorte)
        if not candidatos:
            continue
        token = aceptar_candidatos(candidatos) or SIN_LEER
        h, w = recorte.shape[:2]
        nitidez = float(cv2.Laplacian(cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())
        calidad = float(np.clip(min(w, h) / 24, .2, 1) * np.clip(nitidez / 100, .2, 1))
        observacion = {'calidad': calidad, 'lexema': token, 'x': x * sx, 'y': y * sy,
                       'caja': [(x - w / 2) * sx, (y - h / 2) * sy, w * sx, h * sy], 'candidatos': candidatos}
        lecturas.append({'recorte': recorte, 'x': x, 'y': y, 'w': w, 'h': h, 'token': token,
                         'candidatos': candidatos, 'observacion': observacion})
    return imagen, lecturas
