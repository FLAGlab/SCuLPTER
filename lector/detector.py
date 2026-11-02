from dataclasses import dataclass

CLASES = ["bloque", "operacion", "parametro"]


@dataclass
class Caja:
    clase: str
    x1: float
    y1: float
    x2: float
    y2: float
    confianza: float = 1.0

    @property
    def centro(self):
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)

    def contiene(self, punto):
        x, y = punto
        return self.x1 <= x <= self.x2 and self.y1 <= y <= self.y2

    def recortar(self, cuadro):
        return cuadro[int(self.y1):int(self.y2), int(self.x1):int(self.x2)]


class Detector:
    def __init__(self, ruta_modelo, confianza_minima=0.4):
        from ultralytics import YOLO

        self.modelo = YOLO(ruta_modelo)
        self.confianza_minima = confianza_minima

    def detectar(self, cuadro):
        resultado = self.modelo.predict(cuadro, conf=self.confianza_minima, verbose=False)[0]
        cajas = []
        for caja in resultado.boxes:
            x1, y1, x2, y2 = caja.xyxy[0].tolist()
            clase = resultado.names[int(caja.cls[0])]
            cajas.append(Caja(clase, x1, y1, x2, y2, float(caja.conf[0])))
        return cajas
