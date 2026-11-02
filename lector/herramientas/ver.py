import argparse
from pathlib import Path

import cv2

from lector.detector import Detector
from lector.herramientas.capturar import mosaico
from lector.lectura import agrupar, encadenar, ordenar_parametros

COLORES = {"bloque": (230, 120, 40), "operacion": (60, 190, 60), "parametro": (30, 150, 255)}
TIPOS = {"operacion": "operaciones", "parametro": "parametros"}


def cargar_fichas(carpeta):
    if not Path(carpeta).exists():
        return None
    from lector.fichas import Fichas, Modelo

    return Fichas(carpeta, Modelo())


def rotulo(cuadro, texto, x, y, color):
    (ancho, alto), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
    cv2.rectangle(cuadro, (x, y - alto - 8), (x + ancho + 8, y), color, -1)
    cv2.putText(cuadro, texto, (x + 4, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)


def dibujar(cuadro, cajas, fichas):
    vista = cuadro.copy()
    bloques = agrupar(cajas)
    for bloque in bloques:
        ordenar_parametros(bloque)
    orden = {}
    for numero, bloque in enumerate(encadenar(bloques), 1):
        orden[id(bloque.caja)] = numero

    for caja in cajas:
        color = COLORES[caja.clase]
        x1, y1, x2, y2 = int(caja.x1), int(caja.y1), int(caja.x2), int(caja.y2)
        cv2.rectangle(vista, (x1, y1), (x2, y2), color, 2)
        if caja.clase == "bloque":
            texto = f"bloque {orden.get(id(caja), '?')}"
        else:
            texto = caja.clase
            if fichas is not None:
                candidatos = fichas.candidatos(caja.recortar(cuadro), TIPOS[caja.clase])
                if candidatos:
                    nombre, parecido = candidatos[0]
                    texto = f"{nombre} {parecido:.2f}"
        rotulo(vista, texto, x1, y1, color)
    return vista


def ver_fotos(carpeta, detector, fichas, salida):
    fotos = sorted(Path(carpeta).glob("*.jpg"))
    if salida:
        Path(salida).mkdir(parents=True, exist_ok=True)
    for foto in fotos:
        cuadro = cv2.imread(str(foto))
        vista = dibujar(cuadro, detector.detectar(cuadro), fichas)
        if salida:
            cv2.imwrite(str(Path(salida) / foto.name), vista)
            continue
        cv2.imshow("ver", vista)
        if cv2.waitKey(0) & 0xFF == ord("q"):
            break


def ver_camaras(indices, detector, fichas):
    from lector.camaras import abrir

    camaras = abrir(indices)
    while True:
        vistas = []
        for camara in camaras:
            cuadro, _ = camara.ultimo()
            if cuadro is None:
                vistas.append(None)
            else:
                vistas.append(dibujar(cuadro, detector.detectar(cuadro), fichas))
        cv2.imshow("ver", mosaico(vistas, indices))
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    for camara in camaras:
        camara.cerrar()


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--camaras", type=int, nargs="+", default=[0, 1, 2, 3])
    parametros.add_argument("--fotos", help="carpeta de fotos en vez de las cámaras")
    parametros.add_argument("--salida", help="guarda las fotos con recuadros en esta carpeta")
    parametros.add_argument("--modelo", default="lector/modelos/detector.pt")
    parametros.add_argument("--fichas", default="lector/datos/fichas")
    args = parametros.parse_args()

    detector = Detector(args.modelo)
    fichas = cargar_fichas(args.fichas)
    if args.fotos:
        ver_fotos(args.fotos, detector, fichas, args.salida)
    else:
        ver_camaras(args.camaras, detector, fichas)
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
