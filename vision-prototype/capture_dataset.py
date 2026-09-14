"""Captura imágenes etiquetadas de los bloques reales para evaluar el reconocimiento.

Cada captura se guarda como PNG y se anota en `manifest.jsonl` (una línea JSON
por imagen) con lo que la cámara debería leer. El formato de `expected` es el
programa SCuLPTER que hay en la mesa, instrucciones separadas por `;`:

    "PUSH heart 3; PUSH heart 10; ADD heart"

Para una imagen con una sola ficha basta el lexema: `"PUSH"`, `"heart"`.
`evaluar_dataset.py` lee este manifiesto y calcula precisión/recall por
símbolo y aciertos de programa completo.

  python3 vision-prototype/capture_dataset.py --camara 1 --out dataset/sesion1 \\
      --expected "PUSH heart 3; PUSH heart 10; ADD heart" --split test --writer carla

  ESPACIO guarda una imagen con la etiqueta dada | q termina
"""
import argparse
import json
import sys
import time
from pathlib import Path

import cv2

SPLITS = ("train", "validation", "test")
KINDS = ("programa", "operation", "parameter")


def resolver_fuente(valor: str):
    try:
        return int(valor)
    except ValueError:
        return valor


def principal() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--camara", default="0", help="índice o URL de la cámara")
    parser.add_argument("--out", required=True, help="carpeta del dataset (se crea si no existe)")
    parser.add_argument("--expected", required=True, help="programa esperado, instrucciones separadas por ';'")
    parser.add_argument("--writer", default="", help="quién escribió/armó los bloques")
    parser.add_argument("--session", default=time.strftime("%Y-%m-%d"), help="identificador de la sesión")
    parser.add_argument("--split", default="test", choices=SPLITS)
    parser.add_argument("--kind", default="programa", choices=KINDS)
    args = parser.parse_args()

    salida = Path(args.out)
    salida.mkdir(parents=True, exist_ok=True)
    manifiesto = salida / "manifest.jsonl"

    captura = cv2.VideoCapture(resolver_fuente(args.camara))
    if not captura.isOpened():
        sys.exit(f"no se pudo abrir la cámara: {args.camara}")

    print(f"etiqueta: {args.expected!r}  --  ESPACIO guarda | q termina")
    guardadas = 0
    try:
        while True:
            ok, cuadro = captura.read()
            if not ok:
                continue
            vista = cuadro.copy()
            cv2.putText(vista, f"{args.expected}  [{guardadas} guardadas]", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 255), 2)
            cv2.imshow("SCuLPTER dataset", vista)

            tecla = cv2.waitKey(1) & 0xFF
            if tecla == ord("q"):
                break
            if tecla == ord(" "):
                nombre = f"{time.time_ns()}.png"
                cv2.imwrite(str(salida / nombre), cuadro)
                fila = {
                    "image": nombre,
                    "expected": args.expected,
                    "writer": args.writer,
                    "session": args.session,
                    "split": args.split,
                    "kind": args.kind,
                }
                with manifiesto.open("a", encoding="utf-8") as archivo:
                    archivo.write(json.dumps(fila, ensure_ascii=False) + "\n")
                guardadas += 1
                print(f"guardada {salida / nombre}")
    finally:
        captura.release()
        cv2.destroyAllWindows()
    print(f"{guardadas} imagen(es) anotadas en {manifiesto}")


if __name__ == "__main__":
    principal()
