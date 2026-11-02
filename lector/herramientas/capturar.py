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


def guardar(carpeta, numero, cuadros, indices):
    for cuadro, indice in zip(cuadros, indices):
        if cuadro is not None:
            cv2.imwrite(str(carpeta / f"{numero:04d}_cam{indice}.jpg"), cuadro)


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--sesion", default=time.strftime("%Y-%m-%d-%H%M"))
    parametros.add_argument("--camaras", type=int, nargs="+", default=[0, 1, 2, 3])
    parametros.add_argument("--cada", type=float, default=1.5, help="segundos entre fotos en ráfaga")
    args = parametros.parse_args()

    carpeta = CARPETA / args.sesion
    carpeta.mkdir(parents=True, exist_ok=True)
    camaras = abrir(args.camaras)
    numero = len(list(carpeta.glob("*.jpg"))) // len(camaras)
    rafaga = False
    ultima = 0.0

    while True:
        cuadros = [camara.ultimo()[0] for camara in camaras]
        vista = mosaico(cuadros, args.camaras)
        estado = f"{numero} fotos"
        if rafaga:
            estado += "  RAFAGA (r para parar)"
        cv2.putText(vista, estado, (12, vista.shape[0] - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
        cv2.imshow("capturar", vista)

        tecla = cv2.waitKey(30) & 0xFF
        if tecla == ord("q"):
            break
        if tecla == ord("r"):
            rafaga = not rafaga

        ahora = time.time()
        if tecla == ord(" ") or (rafaga and ahora - ultima >= args.cada):
            guardar(carpeta, numero, cuadros, args.camaras)
            numero += 1
            ultima = ahora

    for camara in camaras:
        camara.cerrar()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
