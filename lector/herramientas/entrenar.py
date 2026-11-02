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
