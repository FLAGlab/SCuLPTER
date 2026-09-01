import os

import cv2
import numpy as np

CARPETA_REFERENCIAS = os.path.join(os.path.dirname(__file__), "referencias")
UMBRAL_COINCIDENCIA = 0.45
ANGULOS_GRADOS = range(-40, 41, 8)


def rotar(imagen, angulo):
    alto, ancho = imagen.shape[:2]
    matriz = cv2.getRotationMatrix2D((ancho / 2, alto / 2), angulo, 1.0)
    return cv2.warpAffine(imagen, matriz, (ancho, alto), borderValue=255)


def cargar_referencias() -> dict[str, list["cv2.typing.MatLike"]]:
    referencias = {}
    if not os.path.isdir(CARPETA_REFERENCIAS):
        return referencias
    for nombre_archivo in os.listdir(CARPETA_REFERENCIAS):
        ruta = os.path.join(CARPETA_REFERENCIAS, nombre_archivo)
        lexema, extension = os.path.splitext(nombre_archivo)
        if extension.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        imagen = cv2.imread(ruta, cv2.IMREAD_GRAYSCALE)
        if imagen is None:
            continue
        lexema = lexema.replace("PREGUNTA", "?")
        referencias[lexema] = [rotar(imagen, angulo) for angulo in ANGULOS_GRADOS]
    return referencias


_REFERENCIAS = cargar_referencias()


def hay_referencias() -> bool:
    return len(_REFERENCIAS) > 0


def reconocer(recorte) -> str | None:
    if not _REFERENCIAS or recorte is None or recorte.size == 0:
        return None

    gris = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY) if recorte.ndim == 3 else recorte
    alto, ancho = gris.shape
    if alto < 8 or ancho < 8:
        return None

    mejor_lexema = None
    mejor_puntaje = 0.0

    for lexema, variantes in _REFERENCIAS.items():
        for variante in variantes:
            variante_ajustada = cv2.resize(variante, (ancho, alto))
            resultado = cv2.matchTemplate(gris, variante_ajustada, cv2.TM_CCOEFF_NORMED)
            puntaje = float(resultado.max())
            if puntaje > mejor_puntaje:
                mejor_puntaje = puntaje
                mejor_lexema = lexema

    return mejor_lexema if mejor_puntaje >= UMBRAL_COINCIDENCIA else None
