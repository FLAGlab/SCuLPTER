"""Captura fotos de referencia de los bloques reales para `referencias/`.

Recorre los símbolos de simbolos.json (por defecto solo los que aún no tienen
foto), muestra la cámara en vivo y, para cada uno:

  ESPACIO  congela el cuadro y abre la selección de recuadro
           (arrastra sobre la ficha, ENTER confirma, c cancela y vuelve al vivo)
  s        salta este símbolo
  q        termina

El recorte se guarda en escala de grises como referencias/<archivo>.jpg, que
es lo que carga clasificador_simbolos.py. Ejemplo:

  python3 vision-prototype/capturar_referencias.py --camara 1
  python3 vision-prototype/capturar_referencias.py --camara 1 --todos
  python3 vision-prototype/capturar_referencias.py --camara 1 --solo PUSH heart 3
"""
import argparse
import json
import os
import sys

import cv2

AQUI = os.path.dirname(os.path.abspath(__file__))
CARPETA_REFERENCIAS = os.path.join(AQUI, "referencias")
RUTA_TABLA_SIMBOLOS = os.path.join(AQUI, "simbolos.json")
MARGEN_PX = 4
VENTANA = "capturar referencias"


def cargar_simbolos() -> list[dict]:
    with open(RUTA_TABLA_SIMBOLOS, encoding="utf-8") as f:
        return json.load(f)["simbolos"]


def ruta_referencia(archivo: str) -> str:
    return os.path.join(CARPETA_REFERENCIAS, f"{archivo}.jpg")


def tiene_foto(archivo: str) -> bool:
    return any(os.path.isfile(os.path.join(CARPETA_REFERENCIAS, f"{archivo}{ext}")) for ext in (".jpg", ".jpeg", ".png"))


def resolver_fuente(valor: str):
    try:
        return int(valor)
    except ValueError:
        return valor


def etiqueta(simbolo: dict) -> str:
    escrito = simbolo.get("escrito")
    return f"{simbolo['lexema']} ({escrito})" if escrito else simbolo["lexema"]


def seleccionar_recorte(cuadro):
    """Devuelve el recorte elegido con el ratón, o None si se cancela."""
    x, y, w, h = cv2.selectROI(VENTANA, cuadro, showCrosshair=False, fromCenter=False)
    if w == 0 or h == 0:
        return None
    alto, ancho = cuadro.shape[:2]
    x0, y0 = max(0, x - MARGEN_PX), max(0, y - MARGEN_PX)
    x1, y1 = min(ancho, x + w + MARGEN_PX), min(alto, y + h + MARGEN_PX)
    return cuadro[y0:y1, x0:x1]


def capturar(captura, simbolo: dict) -> str:
    """Muestra la cámara hasta que se guarde el símbolo. Devuelve 'guardado', 'saltado' o 'salir'."""
    texto = f"{etiqueta(simbolo)}  --  ESPACIO congelar | s saltar | q salir"
    while True:
        ok, cuadro = captura.read()
        if not ok:
            continue
        vista = cuadro.copy()
        cv2.rectangle(vista, (0, 0), (vista.shape[1], 36), (0, 0, 0), -1)
        cv2.putText(vista, texto, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 220, 255), 2)
        cv2.imshow(VENTANA, vista)

        tecla = cv2.waitKey(1) & 0xFF
        if tecla == ord("q"):
            return "salir"
        if tecla == ord("s"):
            return "saltado"
        if tecla == ord(" "):
            recorte = seleccionar_recorte(cuadro)
            if recorte is None:
                continue
            gris = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
            cv2.imwrite(ruta_referencia(simbolo["archivo"]), gris)
            print(f"guardado {ruta_referencia(simbolo['archivo'])}  ({gris.shape[1]}x{gris.shape[0]} px)")
            return "guardado"


def principal() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--camara", default="0", help="índice o URL de la cámara")
    parser.add_argument("--todos", action="store_true", help="recorre también los símbolos que ya tienen foto (la reemplaza)")
    parser.add_argument("--solo", nargs="+", metavar="LEXEMA", help="solo estos lexemas")
    args = parser.parse_args()

    simbolos = cargar_simbolos()
    if args.solo:
        simbolos = [s for s in simbolos if s["lexema"] in args.solo or s["archivo"] in args.solo]
    elif not args.todos:
        simbolos = [s for s in simbolos if not tiene_foto(s["archivo"])]
    if not simbolos:
        sys.exit("nada que capturar: todos los símbolos de simbolos.json ya tienen foto (usa --todos para reemplazar)")

    os.makedirs(CARPETA_REFERENCIAS, exist_ok=True)
    captura = cv2.VideoCapture(resolver_fuente(args.camara))
    if not captura.isOpened():
        sys.exit(f"no se pudo abrir la cámara: {args.camara}")

    print(f"{len(simbolos)} símbolo(s) por capturar: {', '.join(etiqueta(s) for s in simbolos)}")
    guardados, saltados = [], []
    try:
        for simbolo in simbolos:
            resultado = capturar(captura, simbolo)
            if resultado == "salir":
                break
            (guardados if resultado == "guardado" else saltados).append(simbolo["lexema"])
    finally:
        captura.release()
        cv2.destroyAllWindows()

    print(f"\nguardados: {', '.join(guardados) or '-'}")
    if saltados:
        print(f"saltados:  {', '.join(saltados)}")
    pendientes = [s["lexema"] for s in cargar_simbolos() if not tiene_foto(s["archivo"])]
    if pendientes:
        print(f"sin foto todavía: {', '.join(pendientes)}")


if __name__ == "__main__":
    principal()
