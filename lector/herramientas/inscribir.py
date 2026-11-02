"""Guarda ejemplos de una ficha para reconocerla después.

    python3 -m lector.herramientas.inscribir --tipo operaciones --nombre PUSH
    python3 -m lector.herramientas.inscribir --tipo parametros --nombre triangulo
    python3 -m lector.herramientas.inscribir --tipo parametros --nombre -10

Espacio congela la imagen; luego se arrastra un recuadro ajustado a la cara de la ficha y
Enter lo guarda. Conviene guardar 3 a 5 ejemplos desde ángulos distintos. q sale.
"""

import argparse
from pathlib import Path

import cv2

from lector.camaras import Camara
from lector.fichas import TIPOS

CARPETA = Path("lector/datos/fichas")


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--tipo", choices=TIPOS, required=True)
    parametros.add_argument("--nombre", required=True)
    parametros.add_argument("--camara", type=int, default=0)
    args = parametros.parse_args()

    carpeta = CARPETA / args.tipo / args.nombre
    carpeta.mkdir(parents=True, exist_ok=True)
    numero = len(list(carpeta.glob("*.png")))
    camara = Camara(args.camara)

    while True:
        cuadro, _ = camara.ultimo()
        if cuadro is None:
            cv2.waitKey(30)
            continue
        cv2.imshow("inscribir", cuadro)
        tecla = cv2.waitKey(30) & 0xFF
        if tecla == ord("q"):
            break
        if tecla == ord(" "):
            x, y, ancho, alto = cv2.selectROI("inscribir", cuadro, showCrosshair=False)
            if ancho > 0 and alto > 0:
                cv2.imwrite(str(carpeta / f"{numero}.png"), cuadro[y:y + alto, x:x + ancho])
                print(f"{args.nombre}: {numero + 1} ejemplos")
                numero += 1

    camara.cerrar()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
