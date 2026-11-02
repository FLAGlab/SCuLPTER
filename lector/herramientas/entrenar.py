"""Entrena el detector con las fotos etiquetadas en formato YOLO.

    python3 -m lector.herramientas.entrenar --datos lector/datos/dataset

La carpeta del dataset debe tener esta forma (en CVAT, exportar como «Ultralytics YOLO
Detection»):

    dataset/
      images/train/*.jpg   labels/train/*.txt
      images/val/*.jpg     labels/val/*.txt

Las fotos de validación deben ser de otra sesión que las de entrenamiento; si no, el
resultado sale inflado. El modelo final queda en lector/modelos/detector.pt.
"""

import argparse
import shutil
from pathlib import Path

from lector.detector import CLASES


def escribir_yaml(carpeta):
    ruta = carpeta / "dataset.yaml"
    lineas = [
        f"path: {carpeta.resolve()}",
        "train: images/train",
        "val: images/val",
        "names:",
    ]
    for numero, clase in enumerate(CLASES):
        lineas.append(f"  {numero}: {clase}")
    ruta.write_text("\n".join(lineas) + "\n")
    return ruta


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--datos", default="lector/datos/dataset")
    parametros.add_argument("--epocas", type=int, default=80)
    # Las caras miden unos 45 px en una foto de 1280; a menos resolución se pierden.
    parametros.add_argument("--tamano", type=int, default=1280)
    parametros.add_argument("--dispositivo", default="mps", help="mps en Mac, 0 con GPU, cpu si no")
    args = parametros.parse_args()

    from ultralytics import YOLO

    yaml = escribir_yaml(Path(args.datos))
    modelo = YOLO("yolo11n.pt")
    resultado = modelo.train(
        data=str(yaml),
        epochs=args.epocas,
        imgsz=args.tamano,
        device=args.dispositivo,
        project="runs",
        name="detector",
    )

    destino = Path("lector/modelos/detector.pt")
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(Path(resultado.save_dir) / "weights" / "best.pt", destino)
    print(f"Modelo guardado en {destino}")


if __name__ == "__main__":
    main()
