import threading
import time

import cv2

# La C270 entrega como máximo 1280x720. En MJPG cuatro cámaras caben en USB 2.0;
# sin comprimir (YUYV) no.
ANCHO = 1280
ALTO = 720


class Camara:
    """Lee una webcam en su propio hilo y guarda solo el último cuadro.

    Así nunca se procesa un cuadro viejo que quedó en el búfer del driver.
    """

    def __init__(self, indice):
        self.indice = indice
        self.captura = cv2.VideoCapture(indice)
        if not self.captura.isOpened():
            raise RuntimeError(f"No se pudo abrir la cámara {indice}")
        self.captura.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        self.captura.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO)
        self.captura.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO)

        self.cuadro = None
        self.hora = 0.0
        self.candado = threading.Lock()
        self.activa = True
        self.hilo = threading.Thread(target=self._leer, daemon=True)
        self.hilo.start()

    def _leer(self):
        while self.activa:
            ok, cuadro = self.captura.read()
            if not ok:
                time.sleep(0.05)
                continue
            with self.candado:
                self.cuadro = cuadro
                self.hora = time.time()

    def ultimo(self):
        with self.candado:
            return self.cuadro, self.hora

    def cerrar(self):
        self.activa = False
        self.hilo.join(timeout=1)
        self.captura.release()


def abrir(indices):
    return [Camara(indice) for indice in indices]
