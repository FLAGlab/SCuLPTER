from pathlib import Path

import cv2
import numpy as np

# Las operaciones se inscriben una vez. Los parámetros se inscriben al empezar cada
# sesión, porque cada persona dibuja sus propias etiquetas.
#
#   datos/fichas/operaciones/PUSH/1.png
#   datos/fichas/parametros/triangulo/1.png
#   datos/fichas/parametros/-10/1.png
TIPOS = ["operaciones", "parametros"]


class Modelo:
    """DINOv2 pequeño: convierte un recorte en un vector de 384 números.

    No se entrena. Dos recortes de la misma ficha quedan cerca, aunque cambie la luz
    o el ángulo.
    """

    def __init__(self):
        import torch

        self.torch = torch
        self.red = torch.hub.load("facebookresearch/dinov2", "dinov2_vits14")
        self.red.eval()
        self.media = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.desviacion = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __call__(self, recorte):
        imagen = cv2.cvtColor(cv2.resize(recorte, (224, 224)), cv2.COLOR_BGR2RGB)
        imagen = (imagen.astype(np.float32) / 255 - self.media) / self.desviacion
        tensor = self.torch.from_numpy(imagen.transpose(2, 0, 1)).unsqueeze(0)
        with self.torch.no_grad():
            vector = self.red(tensor)[0].numpy()
        return vector / np.linalg.norm(vector)


class Fichas:
    def __init__(self, carpeta, modelo):
        self.modelo = modelo
        self.ejemplos = {}
        for tipo in TIPOS:
            self.ejemplos[tipo] = []
            for archivo in sorted(Path(carpeta, tipo).glob("*/*.png")):
                nombre = archivo.parent.name
                vector = self.modelo(cv2.imread(str(archivo)))
                self.ejemplos[tipo].append((nombre, vector))

    def candidatos(self, recorte, tipo, cuantos=3):
        """Las fichas inscritas más parecidas al recorte, de la más a la menos parecida."""
        if recorte.size == 0 or not self.ejemplos[tipo]:
            return []
        vector = self.modelo(recorte)
        mejor = {}
        for nombre, ejemplo in self.ejemplos[tipo]:
            parecido = float(vector @ ejemplo)
            if parecido > mejor.get(nombre, -1):
                mejor[nombre] = parecido
        ordenados = sorted(mejor.items(), key=lambda par: par[1], reverse=True)
        return ordenados[:cuantos]
