import sys

import cv2


def principal() -> None:
    maximo = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    for indice in range(maximo):
        captura = cv2.VideoCapture(indice)
        if not captura.isOpened():
            captura.release()
            print(f"índice {indice}: no disponible")
            continue
        ok, cuadro = captura.read()
        ancho = int(captura.get(cv2.CAP_PROP_FRAME_WIDTH))
        alto = int(captura.get(cv2.CAP_PROP_FRAME_HEIGHT))
        captura.release()
        if ok:
            ruta = f"vision-prototype/camara_{indice}.jpg"
            cv2.imwrite(ruta, cuadro)
            print(f"índice {indice}: {ancho}x{alto} -- captura guardada en {ruta}")
        else:
            print(f"índice {indice}: se abrió pero no entregó imagen")


if __name__ == "__main__":
    principal()
