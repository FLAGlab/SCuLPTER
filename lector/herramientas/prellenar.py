import argparse
import zipfile
from pathlib import Path

import cv2

from lector.detector import CLASES, Detector


def renglones(cajas, ancho, alto):
    lineas = []
    for caja in cajas:
        numero = CLASES.index(caja.clase)
        cx = (caja.x1 + caja.x2) / 2 / ancho
        cy = (caja.y1 + caja.y2) / 2 / alto
        w = (caja.x2 - caja.x1) / ancho
        h = (caja.y2 - caja.y1) / alto
        lineas.append(f"{numero} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    return "\n".join(lineas) + "\n"


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--fotos", required=True)
    parametros.add_argument("--modelo", default="lector/modelos/detector.pt")
    parametros.add_argument("--confianza", type=float, default=0.25)
    args = parametros.parse_args()

    carpeta = Path(args.fotos)
    detector = Detector(args.modelo, confianza_minima=args.confianza)
    destino = carpeta.with_name(carpeta.name + "-etiquetas.zip")
    nombres = []

    with zipfile.ZipFile(destino, "w") as archivo:
        for foto in sorted(carpeta.glob("*.jpg")):
            cuadro = cv2.imread(str(foto))
            alto, ancho = cuadro.shape[:2]
            cajas = detector.detectar(cuadro)
            archivo.writestr(f"obj_train_data/{foto.stem}.txt", renglones(cajas, ancho, alto))
            nombres.append(f"data/obj_train_data/{foto.name}")
        archivo.writestr("obj.names", "\n".join(CLASES) + "\n")
        archivo.writestr("obj.data", f"classes = {len(CLASES)}\ntrain = data/train.txt\nnames = data/obj.names\nbackup = backup/\n")
        archivo.writestr("train.txt", "\n".join(nombres) + "\n")

    print(f"{len(nombres)} fotos prellenadas en {destino}")


if __name__ == "__main__":
    main()
