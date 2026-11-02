"""Toma fotos con todas las cámaras a la vez para armar el dataset del detector.

    python3 -m lector.herramientas.capturar --sesion mesa-limpia --camaras 0 1 2 3

Espacio guarda una foto por cámara. q sale. Cambia el montaje, la luz y los objetos
alrededor entre fotos: el detector solo aprende lo que ve aquí.
"""

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from lector.camaras import abrir

CARPETA = Path("lector/datos/fotos")


def mosaico(cuadros, indices):
    pequenos = []
    for cuadro, indice in zip(cuadros, indices):
        if cuadro is None:
            cuadro = np.zeros((720, 1280, 3), np.uint8)
        pequeno = cv2.resize(cuadro, (640, 360))
        cv2.putText(pequeno, f"camara {indice}", (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        pequenos.append(pequeno)
    while len(pequenos) % 2:
        pequenos.append(np.zeros_like(pequenos[0]))
    filas = []
    for i in range(0, len(pequenos), 2):
        filas.append(np.hstack(pequenos[i:i + 2]))
    return np.vstack(filas)


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--sesion", default=time.strftime("%Y-%m-%d-%H%M"))
    parametros.add_argument("--camaras", type=int, nargs="+", default=[0, 1, 2, 3])
    args = parametros.parse_args()

    carpeta = CARPETA / args.sesion
    carpeta.mkdir(parents=True, exist_ok=True)
    camaras = abrir(args.camaras)
    numero = len(list(carpeta.glob("*.jpg"))) // len(camaras)

    while True:
        cuadros = [camara.ultimo()[0] for camara in camaras]
        cv2.imshow("capturar", mosaico(cuadros, args.camaras))
        tecla = cv2.waitKey(30) & 0xFF
        if tecla == ord("q"):
            break
        if tecla == ord(" "):
            for cuadro, indice in zip(cuadros, args.camaras):
                if cuadro is not None:
                    cv2.imwrite(str(carpeta / f"{numero:04d}_cam{indice}.jpg"), cuadro)
            print(f"foto {numero} guardada en {carpeta}")
            numero += 1

    for camara in camaras:
        camara.cerrar()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
