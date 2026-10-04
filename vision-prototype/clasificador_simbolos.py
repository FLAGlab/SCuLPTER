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


AREA_PIEZA = 0.25
LADO_PIEZA_MINIMO = 12


def rectificar(gris):
    alto, ancho = gris.shape
    suave = cv2.GaussianBlur(gris, (5, 5), 0)
    _, binaria = cv2.threshold(suave, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contornos, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contornos:
        return gris
    mayor = max(contornos, key=cv2.contourArea)
    if cv2.contourArea(mayor) < AREA_PIEZA * alto * ancho:
        return gris
    caja = cv2.boxPoints(cv2.minAreaRect(mayor))
    suma, resta = caja.sum(axis=1), np.diff(caja, axis=1).ravel()
    orden = np.float32([caja[np.argmin(suma)], caja[np.argmin(resta)],
                        caja[np.argmax(suma)], caja[np.argmax(resta)]])
    if len({tuple(p) for p in orden}) != 4:
        return gris
    lado = int(max(np.linalg.norm(orden[0] - orden[1]), np.linalg.norm(orden[1] - orden[2])))
    if lado < LADO_PIEZA_MINIMO:
        return gris
    destino = np.float32([[0, 0], [lado - 1, 0], [lado - 1, lado - 1], [0, lado - 1]])
    return cv2.warpPerspective(gris, cv2.getPerspectiveTransform(orden, destino), (lado, lado),
                               flags=cv2.INTER_LINEAR, borderValue=255)


def normalizar(gris):
    gris = rectificar(gris)
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


def rasgos(canonico):
    f = canonico.astype(np.float32) / 255.0
    return (f, cv2.Sobel(f, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(f, cv2.CV_32F, 0, 1, ksize=3))


def canales(observado, referencia):
    return [float(cv2.matchTemplate(a, b, cv2.TM_CCOEFF_NORMED).max())
            for a, b in zip(observado, referencia)]


def comparar(observado, referencia):
    return float(np.mean(canales(observado, referencia)))


def puntuar_contra(observado, referencias):
    medidas = {}
    for lexema, variantes in referencias.items():
        mejor = max(variantes, key=lambda v: comparar(observado, v))
        medidas[lexema] = canales(observado, mejor)
    if not medidas:
        return []
    lideres = {max(medidas, key=lambda k: medidas[k][c]) for c in range(len(next(iter(medidas.values()))))}
    acuerdo = next(iter(lideres)) if len(lideres) == 1 else None
    return sorted(((lexema, float(np.mean(v)) if lexema == acuerdo else float(np.min(v)))
                   for lexema, v in medidas.items()), key=lambda par: par[1], reverse=True)


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
        variantes = [rasgos(v) for v in variantes if v is not None]
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

    return puntuar_contra(rasgos(canonico), _REFERENCIAS)


def aceptar_candidatos(candidatos):
    if not candidatos:
        return None
    orden = sorted(candidatos, key=lambda c: c["puntaje"] if isinstance(c, dict) else c[1], reverse=True)
    primero = orden[0]
    lexema = primero["lexema"] if isinstance(primero, dict) else primero[0]
    puntaje = primero["puntaje"] if isinstance(primero, dict) else primero[1]
    segundo = 0.0
    if len(orden) > 1:
        segundo = orden[1]["puntaje"] if isinstance(orden[1], dict) else orden[1][1]
    return lexema if puntaje >= UMBRAL and puntaje - segundo >= MARGEN else None


def reconocer_con_puntajes(recorte) -> tuple[str | None, list[tuple[str, float]]]:
    candidatos = puntuar(recorte)
    return aceptar_candidatos(candidatos), candidatos


def reconocer(recorte) -> str | None:
    return reconocer_con_puntajes(recorte)[0]


def ilegible(lexema) -> bool:
    return lexema == SIN_LEER
