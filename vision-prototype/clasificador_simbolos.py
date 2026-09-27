import json
import os

import cv2
import numpy as np

REFERENCIAS = os.path.join(os.path.dirname(__file__), "referencias")
TABLA = os.path.join(os.path.dirname(__file__), "simbolos.json")
SIN_LEER = "<sin leer>"
UMBRAL = 0.45
MARGEN = 0.08
ANGULOS = range(-40, 41, 8)
LADO = 64
BORDE = 0.08
HOLGURA = 0.10
TINTA_MINIMA = 0.005
TINTA_MAXIMA = 0.45


def rotar(imagen, angulo):
    alto, ancho = imagen.shape[:2]
    matriz = cv2.getRotationMatrix2D((ancho / 2, alto / 2), angulo, 1.0)
    return cv2.warpAffine(imagen, matriz, (ancho, alto), borderValue=255)


def normalizar(gris):
    alto, ancho = gris.shape
    if alto < 8 or ancho < 8:
        return None
    by, bx = int(alto * BORDE), int(ancho * BORDE)
    interior = gris[by : alto - by, bx : ancho - bx]
    _, tinta = cv2.threshold(interior, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    cobertura = cv2.countNonZero(tinta) / tinta.size
    if not TINTA_MINIMA <= cobertura <= TINTA_MAXIMA:
        return None

    ys, xs = np.where(tinta > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    my, mx = int((y1 - y0) * HOLGURA) + 1, int((x1 - x0) * HOLGURA) + 1
    recorte = interior[max(0, y0 - my) : y1 + my, max(0, x0 - mx) : x1 + mx]

    lado = max(recorte.shape)
    cuadrado = np.full((lado, lado), 255, dtype=np.uint8)
    oy, ox = (lado - recorte.shape[0]) // 2, (lado - recorte.shape[1]) // 2
    cuadrado[oy : oy + recorte.shape[0], ox : ox + recorte.shape[1]] = recorte
    return cv2.resize(cuadrado, (LADO, LADO), interpolation=cv2.INTER_AREA)


def tabla_simbolos() -> dict[str, str]:
    if not os.path.isfile(TABLA):
        return {}
    with open(TABLA, encoding="utf-8") as archivo:
        tabla = json.load(archivo)
    return {entrada["archivo"]: entrada["lexema"] for entrada in tabla.get("simbolos", [])}


def cargar() -> dict[str, list["cv2.typing.MatLike"]]:
    referencias = {}
    if not os.path.isdir(REFERENCIAS):
        return referencias
    tabla = tabla_simbolos()
    for archivo in os.listdir(REFERENCIAS):
        nombre, extension = os.path.splitext(archivo)
        if extension.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        imagen = cv2.imread(os.path.join(REFERENCIAS, archivo), cv2.IMREAD_GRAYSCALE)
        if imagen is None:
            continue
        variantes = [normalizar(rotar(imagen, angulo)) for angulo in ANGULOS]
        variantes = [v for v in variantes if v is not None]
        if not variantes:
            print(f"[clasificador] {archivo}: sin trazo reconocible, se ignora")
            continue
        referencias[tabla.get(nombre, nombre)] = variantes
    return referencias


_REFERENCIAS = cargar()


def hay_referencias() -> bool:
    return len(_REFERENCIAS) > 0


def sin_plantilla() -> list[str]:
    return sorted(set(tabla_simbolos().values()) - set(_REFERENCIAS))


def puntuar(recorte) -> list[tuple[str, float]]:
    if not _REFERENCIAS or recorte is None or recorte.size == 0:
        return []
    gris = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY) if recorte.ndim == 3 else recorte
    canonico = normalizar(gris)
    if canonico is None:
        return []

    puntajes = {
        lexema: max(float(cv2.matchTemplate(canonico, v, cv2.TM_CCOEFF_NORMED).max()) for v in variantes)
        for lexema, variantes in _REFERENCIAS.items()
    }
    return sorted(puntajes.items(), key=lambda par: par[1], reverse=True)


def reconocer_con_puntajes(recorte) -> tuple[str | None, list[tuple[str, float]]]:
    candidatos = puntuar(recorte)
    if not candidatos:
        return None, candidatos
    lexema, puntaje = candidatos[0]
    segundo = candidatos[1][1] if len(candidatos) > 1 else 0.0
    if puntaje < UMBRAL or puntaje - segundo < MARGEN:
        return None, candidatos
    return lexema, candidatos


def reconocer(recorte) -> str | None:
    return reconocer_con_puntajes(recorte)[0]


def ilegible(lexema) -> bool:
    return lexema == SIN_LEER
