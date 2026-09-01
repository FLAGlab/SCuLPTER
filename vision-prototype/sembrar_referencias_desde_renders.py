import os

import cv2
import numpy as np

RAIZ_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUTA_RENDER = os.path.join(RAIZ_REPO, "public", "imgs", "Renders", "Ops Front.png")
CARPETA_REFERENCIAS = os.path.join(os.path.dirname(__file__), "referencias")

ETIQUETAS_POR_POSICION = {
    (0, 0): "MOD",
    (0, 1): "PREGUNTA",
    (0, 2): "PUSH",
    (1, 0): "SUB",
    (1, 1): "CMP",
    (1, 2): "JMP",
    (2, 0): "MUL",
    (2, 1): "MOV",
    (2, 2): "DUP",
    (3, 0): "DIV",
    (3, 1): "ADD",
    (3, 2): "NEG",
}


def recortar_iconos(ruta_render):
    imagen = cv2.imread(ruta_render, cv2.IMREAD_UNCHANGED)
    alfa = imagen[:, :, 3]
    _, binaria = cv2.threshold(alfa, 10, 255, cv2.THRESH_BINARY)
    contornos, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cajas = sorted((cv2.boundingRect(c) for c in contornos), key=lambda b: (round(b[1] / 50), b[0]))

    fondo_blanco = np.ones((imagen.shape[0], imagen.shape[1], 3), dtype=np.uint8) * 255
    bgr = imagen[:, :, :3].astype(np.float32)
    a = imagen[:, :, 3:4].astype(np.float32) / 255.0
    compuesta = (bgr * a + fondo_blanco.astype(np.float32) * (1 - a)).astype(np.uint8)

    columnas = 3
    for i, (x, y, w, h) in enumerate(cajas):
        fila, columna = divmod(i, columnas)
        yield (fila, columna), compuesta[y : y + h, x : x + w]


def principal() -> None:
    os.makedirs(CARPETA_REFERENCIAS, exist_ok=True)
    sembrados = []
    for posicion, recorte in recortar_iconos(RUTA_RENDER):
        etiqueta = ETIQUETAS_POR_POSICION.get(posicion)
        if etiqueta is None:
            continue
        ruta_salida = os.path.join(CARPETA_REFERENCIAS, f"{etiqueta}.jpg")
        cv2.imwrite(ruta_salida, recorte)
        sembrados.append(etiqueta)
        print(f"generado {ruta_salida}")

    faltantes = set(ETIQUETAS_POR_POSICION.values()) - set(sembrados)
    if faltantes:
        print(f"\nno se sembraron: {faltantes}")

    print(
        "\nPOP no aparece en este render y a/b/c y los números todavía no tienen "
        "referencia hace falta una foto real o un render adicional para esos."
    )


if __name__ == "__main__":
    principal()
