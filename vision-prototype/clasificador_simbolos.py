import json
import os

import cv2
import numpy as np

CARPETA_REFERENCIAS = os.path.join(os.path.dirname(__file__), "referencias")
RUTA_TABLA_SIMBOLOS = os.path.join(os.path.dirname(__file__), "simbolos.json")
UMBRAL_COINCIDENCIA = 0.45
MARGEN_MINIMO = 0.08       # el mejor candidato debe separarse del segundo al menos esto
ANGULOS_GRADOS = range(-40, 41, 8)
LADO_CANONICO_PX = 64      # las comparaciones se hacen a este tamaño, solo sobre la tinta
BORDE_IGNORADO = 0.08      # fracción del recorte que se ignora en cada lado (borde/sombra de la ficha)
MARGEN_TINTA = 0.10        # holgura alrededor del trazo al recortar
TINTA_MINIMA = 0.005       # fracción mínima de píxeles de tinta para considerar que hay un símbolo


def rotar(imagen, angulo):
    alto, ancho = imagen.shape[:2]
    matriz = cv2.getRotationMatrix2D((ancho / 2, alto / 2), angulo, 1.0)
    return cv2.warpAffine(imagen, matriz, (ancho, alto), borderValue=255)


def normalizar(gris):
    """Recorta al trazo oscuro, lo centra en un cuadrado y lo lleva al tamaño canónico.

    Comparar fichas enteras hace que el fondo (el cuadrado de la ficha, sus
    bordes) domine la correlación y que todas se parezcan entre sí; aquí solo
    sobrevive el símbolo. Devuelve None si el recorte no tiene tinta.
    """
    alto, ancho = gris.shape
    if alto < 8 or ancho < 8:
        return None
    by, bx = int(alto * BORDE_IGNORADO), int(ancho * BORDE_IGNORADO)
    interior = gris[by : alto - by, bx : ancho - bx]
    _, tinta = cv2.threshold(interior, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    if cv2.countNonZero(tinta) < TINTA_MINIMA * tinta.size:
        return None
    ys, xs = np.where(tinta > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    my, mx = int((y1 - y0) * MARGEN_TINTA) + 1, int((x1 - x0) * MARGEN_TINTA) + 1
    recorte = interior[max(0, y0 - my) : y1 + my, max(0, x0 - mx) : x1 + mx]

    lado = max(recorte.shape)
    cuadrado = np.full((lado, lado), 255, dtype=np.uint8)
    oy, ox = (lado - recorte.shape[0]) // 2, (lado - recorte.shape[1]) // 2
    cuadrado[oy : oy + recorte.shape[0], ox : ox + recorte.shape[1]] = recorte
    return cv2.resize(cuadrado, (LADO_CANONICO_PX, LADO_CANONICO_PX), interpolation=cv2.INTER_AREA)


def cargar_tabla_simbolos() -> dict[str, str]:
    """Nombre de archivo (sin extensión) -> lexema, según simbolos.json."""
    if not os.path.isfile(RUTA_TABLA_SIMBOLOS):
        return {}
    with open(RUTA_TABLA_SIMBOLOS, encoding="utf-8") as archivo:
        tabla = json.load(archivo)
    return {entrada["archivo"]: entrada["lexema"] for entrada in tabla.get("simbolos", [])}


def cargar_referencias() -> dict[str, list["cv2.typing.MatLike"]]:
    referencias = {}
    if not os.path.isdir(CARPETA_REFERENCIAS):
        return referencias
    tabla = cargar_tabla_simbolos()
    for nombre_archivo in os.listdir(CARPETA_REFERENCIAS):
        ruta = os.path.join(CARPETA_REFERENCIAS, nombre_archivo)
        nombre, extension = os.path.splitext(nombre_archivo)
        if extension.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        imagen = cv2.imread(ruta, cv2.IMREAD_GRAYSCALE)
        if imagen is None:
            continue
        # Fotos que no están en la tabla usan su nombre de archivo como lexema.
        lexema = tabla.get(nombre, nombre)
        variantes = [normalizar(rotar(imagen, angulo)) for angulo in ANGULOS_GRADOS]
        variantes = [v for v in variantes if v is not None]
        if not variantes:
            print(f"[clasificador] {nombre_archivo}: sin trazo reconocible, se ignora")
            continue
        referencias[lexema] = variantes
    return referencias


_REFERENCIAS = cargar_referencias()


def hay_referencias() -> bool:
    return len(_REFERENCIAS) > 0


def simbolos_sin_referencia() -> list[str]:
    """Lexemas declarados en simbolos.json que todavía no tienen foto en referencias/."""
    return sorted(set(cargar_tabla_simbolos().values()) - set(_REFERENCIAS))


def puntuar(recorte) -> list[tuple[str, float]]:
    """Mejor puntaje por lexema, de mayor a menor. Vacío si no hay nada que comparar."""
    if not _REFERENCIAS or recorte is None or recorte.size == 0:
        return []

    gris = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY) if recorte.ndim == 3 else recorte
    canonico = normalizar(gris)
    if canonico is None:
        return []

    puntajes = {}
    for lexema, variantes in _REFERENCIAS.items():
        mejor = 0.0
        for variante in variantes:
            resultado = cv2.matchTemplate(canonico, variante, cv2.TM_CCOEFF_NORMED)
            mejor = max(mejor, float(resultado.max()))
        puntajes[lexema] = mejor
    return sorted(puntajes.items(), key=lambda par: par[1], reverse=True)


def reconocer_detallado(recorte) -> tuple[str | None, list[tuple[str, float]]]:
    """(lexema o None, candidatos ordenados).

    Una región cuenta como reconocida solo si el mejor candidato supera el
    umbral Y le saca MARGEN_MINIMO al siguiente: si dos plantillas distintas
    puntúan casi igual, la región se parece a ambas por azar, no a una.
    """
    candidatos = puntuar(recorte)
    if not candidatos:
        return None, candidatos
    mejor_lexema, mejor_puntaje = candidatos[0]
    segundo_puntaje = candidatos[1][1] if len(candidatos) > 1 else 0.0
    if mejor_puntaje < UMBRAL_COINCIDENCIA or mejor_puntaje - segundo_puntaje < MARGEN_MINIMO:
        return None, candidatos
    return mejor_lexema, candidatos


def reconocer(recorte) -> str | None:
    return reconocer_detallado(recorte)[0]
