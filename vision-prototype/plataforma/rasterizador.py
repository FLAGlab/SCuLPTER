import hashlib

import cv2
import numpy as np

LUZ = np.array([0.30, -0.55, 0.78])
AMBIENTE = 0.58
CERCA = 1.0


def _unitario(v):
    return v / max(float(np.linalg.norm(v)), 1e-9)


class Escenario:
    def __init__(self):
        self.lotes = []
        self.texturas = []
        self._unido = None
        self._firma = None

    def agregar_textura(self, esquinas, imagen):
        esquinas = np.asarray(esquinas, float)
        if imagen is None or esquinas.shape != (4, 3):
            return
        marca = len(self.texturas)
        self.texturas.append((esquinas, imagen))
        caras = np.array([[esquinas[0], esquinas[1], esquinas[2]], [esquinas[0], esquinas[2], esquinas[3]]])
        self.agregar(caras, (255, 255, 255), marca)

    def agregar(self, triangulos, color, marca=None):
        if triangulos is None or not len(triangulos):
            return
        self.lotes.append((np.asarray(triangulos, float), np.asarray(color, float), marca))
        self._unido = None
        self._firma = None

    def total(self):
        return int(sum(len(t) for t, _, _ in self.lotes))

    def _juntar(self):
        if self._unido is None:
            tris = np.concatenate([t for t, _, _ in self.lotes])
            colores = np.concatenate([np.repeat(c[None, :], len(t), axis=0) for t, c, _ in self.lotes])
            marcas = np.concatenate([np.full(len(t), -1 if m is None else m) for t, _, m in self.lotes])
            self._unido = (tris, colores, marcas)
        return self._unido

    def firma(self):
        if self._firma is None:
            resumen = hashlib.blake2b(digest_size=16)
            for arreglo in self._juntar() if self.lotes else ():
                resumen.update(np.ascontiguousarray(arreglo).tobytes())
            for esquinas, imagen in self.texturas:
                resumen.update(np.ascontiguousarray(esquinas, float).tobytes())
                resumen.update(np.ascontiguousarray(imagen).tobytes())
            self._firma = resumen.hexdigest()
        return self._firma

    def rasterizar(self, modelo, resolucion, fondo=(208, 208, 208)):
        ancho, alto = int(resolucion[0]), int(resolucion[1])
        lienzo = np.full((alto, ancho, 3), fondo, np.uint8)
        profundidad = np.full((alto, ancho), np.inf)
        etiquetas = np.full((alto, ancho), -1, np.int32)
        if not self.lotes:
            return lienzo, profundidad, etiquetas
        tris, colores, marcas = self._juntar()
        rot = np.asarray(modelo['r'], float)
        tras = np.asarray(modelo['t'], float).reshape(3)
        k = np.asarray(modelo['k'], float)
        vista = tris @ rot.T + tras
        z = vista[:, :, 2]
        vivos = np.all(z > CERCA, axis=1)
        if not vivos.any():
            return lienzo, profundidad, etiquetas
        vista, colores, marcas, z = vista[vivos], colores[vivos], marcas[vivos], z[vivos]
        uv = np.empty((len(vista), 3, 2))
        uv[:, :, 0] = k[0, 0] * vista[:, :, 0] / z + k[0, 2]
        uv[:, :, 1] = k[1, 1] * vista[:, :, 1] / z + k[1, 2]
        area = ((uv[:, 1, 0] - uv[:, 0, 0]) * (uv[:, 2, 1] - uv[:, 0, 1])
                - (uv[:, 2, 0] - uv[:, 0, 0]) * (uv[:, 1, 1] - uv[:, 0, 1]))
        caras = np.abs(area) > 1e-9
        vista, colores, marcas, z, uv, area = (vista[caras], colores[caras], marcas[caras],
                                               z[caras], uv[caras], area[caras])
        if not len(uv):
            return lienzo, profundidad, etiquetas
        bordes = np.cross(vista[:, 1] - vista[:, 0], vista[:, 2] - vista[:, 0])
        normas = np.linalg.norm(bordes, axis=1, keepdims=True)
        normales = bordes / np.maximum(normas, 1e-12)
        hacia = np.sign(np.sum(normales * vista[:, 0], axis=1))
        normales = normales * np.where(hacia > 0, -1.0, 1.0)[:, None]
        luz = rot @ _unitario(LUZ)
        brillo = AMBIENTE + (1 - AMBIENTE) * np.clip(normales @ luz, 0, 1)
        tono = np.clip(colores * brillo[:, None], 0, 255)
        minimo = np.floor(uv.min(axis=1)).astype(np.int32)
        maximo = np.ceil(uv.max(axis=1)).astype(np.int32)
        dentro = (maximo[:, 0] >= 0) & (maximo[:, 1] >= 0) & (minimo[:, 0] < ancho) & (minimo[:, 1] < alto)
        cercano = z.min(axis=1)
        orden = np.argsort(cercano)
        orden = orden[dentro[orden]]
        x0 = np.clip(minimo[:, 0], 0, ancho - 1)
        y0 = np.clip(minimo[:, 1], 0, alto - 1)
        x1 = np.clip(maximo[:, 0] + 1, 1, ancho)
        y1 = np.clip(maximo[:, 1] + 1, 1, alto)
        inversa = 1.0 / z
        for i in orden:
            trozo = profundidad[y0[i]:y1[i], x0[i]:x1[i]]
            if trozo.size and trozo.max() <= cercano[i]:
                continue
            ax, ay = uv[i, 0]
            bx, by = uv[i, 1]
            cx, cy = uv[i, 2]
            xs = np.arange(x0[i], x1[i]) + 0.5
            ys = np.arange(y0[i], y1[i]) + 0.5
            if not len(xs) or not len(ys):
                continue
            px = xs[None, :]
            py = ys[:, None]
            w0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / area[i]
            w1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) / area[i]
            w2 = 1.0 - w0 - w1
            cubre = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
            if not cubre.any():
                continue
            iz = w1 * inversa[i, 0] + w2 * inversa[i, 1] + w0 * inversa[i, 2]
            with np.errstate(divide='ignore', invalid='ignore'):
                prof = np.where(iz > 1e-12, 1.0 / iz, np.inf)
            gana = cubre & (prof < trozo)
            if not gana.any():
                continue
            trozo[gana] = prof[gana]
            lienzo[y0[i]:y1[i], x0[i]:x1[i]][gana] = tono[i]
            etiquetas[y0[i]:y1[i], x0[i]:x1[i]][gana] = marcas[i]
        self._estampar(lienzo, etiquetas, rot, tras, k, ancho, alto)
        return lienzo, profundidad, etiquetas

    def _estampar(self, lienzo, etiquetas, rot, tras, k, ancho, alto):
        luz = rot @ _unitario(LUZ)
        for marca, (esquinas, imagen) in enumerate(self.texturas):
            mascara = etiquetas == marca
            if not mascara.any():
                continue
            vista = esquinas @ rot.T + tras
            if np.any(vista[:, 2] <= CERCA):
                continue
            uv = np.empty((4, 2))
            uv[:, 0] = k[0, 0] * vista[:, 0] / vista[:, 2] + k[0, 2]
            uv[:, 1] = k[1, 1] * vista[:, 1] / vista[:, 2] + k[1, 2]
            normal = np.cross(vista[1] - vista[0], vista[3] - vista[0])
            norma = float(np.linalg.norm(normal))
            if norma < 1e-9:
                continue
            normal = normal / norma
            if float(normal @ vista[0]) > 0:
                normal = -normal
            brillo = AMBIENTE + (1 - AMBIENTE) * float(np.clip(normal @ luz, 0, 1))
            lados = [float(np.linalg.norm(uv[i] - uv[(i + 1) % 4])) for i in range(4)]
            objetivo = max(8, int(round(max(lados))))
            fuente = imagen
            if objetivo < max(fuente.shape[:2]):
                factor = objetivo / max(fuente.shape[:2])
                fuente = cv2.resize(fuente, (max(8, int(round(fuente.shape[1] * factor))),
                                             max(8, int(round(fuente.shape[0] * factor)))),
                                    interpolation=cv2.INTER_AREA)
            ao, an = fuente.shape[0], fuente.shape[1]
            matriz = cv2.getPerspectiveTransform(
                np.float32([[0, 0], [an - 1, 0], [an - 1, ao - 1], [0, ao - 1]]), np.float32(uv))
            pintada = cv2.warpPerspective(fuente, matriz, (ancho, alto), flags=cv2.INTER_LINEAR,
                                          borderMode=cv2.BORDER_REPLICATE)
            lienzo[mascara] = np.clip(pintada[mascara] * brillo, 0, 255).astype(np.uint8)
