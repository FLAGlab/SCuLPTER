import cv2
import numpy as np


class Calibracion:
    def __init__(self, columnas=9, filas=6, mm=25):
        if not 3 <= columnas <= 20 or not 3 <= filas <= 20 or not 1 <= mm <= 200:
            raise ValueError("Tablero fuera de rango.")
        self.tablero = (columnas, filas)
        self.mm = mm
        self.muestras = []
        self.tamano = None
        self.objeto = np.zeros((columnas * filas, 3), np.float32)
        self.objeto[:, :2] = np.mgrid[0:columnas, 0:filas].T.reshape(-1, 2) * mm

    def esquinas(self, imagen):
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        ok, puntos = cv2.findChessboardCorners(gris, self.tablero)
        if not ok:
            raise ValueError("No se ven todas las esquinas del tablero. Revisa luz, enfoque y tamaño configurado.")
        return cv2.cornerSubPix(gris, puntos, (11, 11), (-1, -1), (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .001))

    def capturar(self, imagen):
        tamano = (imagen.shape[1], imagen.shape[0])
        if self.tamano and self.tamano != tamano:
            raise ValueError("Cambió la resolución. Reinicia las capturas.")
        puntos = self.esquinas(imagen)
        if any(np.linalg.norm(puntos - previo, axis=2).mean() < 12 for previo in self.muestras):
            raise ValueError("Esta vista se parece a una ya guardada. Cambia el ángulo o la posición del tablero.")
        if len(self.muestras) >= 50:
            raise ValueError("Ya hay 50 capturas. Calcula la calibración o reinicia la sesión.")
        self.tamano = tamano
        self.muestras.append(puntos)
        return len(self.muestras)

    def calcular(self):
        if len(self.muestras) < 15:
            raise ValueError("Se necesitan al menos 15 capturas diferentes.")
        error, matriz, dist, rotaciones, traslaciones = cv2.calibrateCamera([self.objeto] * len(self.muestras), self.muestras, self.tamano, None, None)
        errores = []
        for puntos, r, t in zip(self.muestras, rotaciones, traslaciones):
            proy, _ = cv2.projectPoints(self.objeto, r, t, matriz, dist)
            errores.append(float(np.sqrt(np.mean(np.sum((puntos - proy) ** 2, axis=2)))))
        return {"camera_matrix": matriz.tolist(), "dist_coeffs": dist.ravel().tolist(), "image_size": list(self.tamano), "rms": float(error), "errores": errores, "capturas": len(self.muestras), "tablero": list(self.tablero), "mm": self.mm, "origen": "tablero"}

    def pose(self, imagen, intr):
        if list((imagen.shape[1], imagen.shape[0])) != intr["image_size"]:
            raise ValueError("La resolución no coincide con los intrínsecos guardados.")
        puntos = self.esquinas(imagen)
        k, d = np.array(intr["camera_matrix"]), np.array(intr["dist_coeffs"])
        ok, r, t = cv2.solvePnP(self.objeto, puntos, k, d)
        if not ok:
            raise ValueError("No se pudo calcular la pose de la cámara.")
        proyectados, _ = cv2.projectPoints(self.objeto, r, t, k, d)
        error = float(np.sqrt(np.mean(np.sum((puntos - proyectados) ** 2, axis=2))))
        rot, _ = cv2.Rodrigues(r)
        return {"rot": rot.tolist(), "tras": t.ravel().tolist(), "rms": error}
