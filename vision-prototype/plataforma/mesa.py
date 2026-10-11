"""Referencia de mesa de una cámara: plano, región utilizable y ruido del sensor.

Se toma con la mesa despejada y deja de valer si la cámara se mueve.
"""

import json
from pathlib import Path

import cv2
import numpy as np

SIGMAS = 3.0
ALTURA_MINIMA_MM = 8.0
ALTURA_MAXIMA_MM = 160.0
MARGEN_PLANO_MM = 6.0
MUESTRAS_PLANO = 4000
ITERACIONES_PLANO = 120
Z_MIN_MM, Z_MAX_MM = 100.0, 4000.0
EROSION_BORDE_PX = 9


def valida(profundidad):
    """Píxeles con medida dentro del rango útil del sensor."""
    if profundidad is None:
        return None
    z = np.asarray(profundidad, float)
    return np.isfinite(z) & (z > Z_MIN_MM) & (z < Z_MAX_MM)


def nube_xyz(profundidad, intrinsecos):
    """Coordenadas de cámara en mm de cada píxel, con NaN donde no hay medida."""
    k = np.asarray(intrinsecos['camera_matrix'], float)
    z = np.asarray(profundidad, float).copy()
    buenos = valida(profundidad)
    z[~buenos] = np.nan
    alto, ancho = z.shape
    xx, yy = np.meshgrid(np.arange(ancho), np.arange(alto))
    return (xx - k[0, 2]) * z / k[0, 0], (yy - k[1, 2]) * z / k[1, 1], z


def ajustar_plano(profundidad, intrinsecos, semilla=0):
    """Plano dominante por RANSAC refinado por SVD, con la normal hacia la cámara."""
    buenos = valida(profundidad)
    if buenos is None or buenos.sum() < 200:
        return None
    x, y, z = nube_xyz(profundidad, intrinsecos)
    ys, xs = np.nonzero(buenos)
    azar = np.random.default_rng(semilla)
    if len(xs) > MUESTRAS_PLANO:
        elegidos = azar.choice(len(xs), MUESTRAS_PLANO, replace=False)
        xs, ys = xs[elegidos], ys[elegidos]
    puntos = np.c_[x[ys, xs], y[ys, xs], z[ys, xs]]
    puntos = puntos[np.isfinite(puntos).all(axis=1)]
    if len(puntos) < 50:
        return None

    mejor, mejores = None, 0
    for _ in range(ITERACIONES_PLANO):
        tres = puntos[azar.choice(len(puntos), 3, replace=False)]
        normal = np.cross(tres[1] - tres[0], tres[2] - tres[0])
        norma = np.linalg.norm(normal)
        if norma < 1e-6:
            continue
        normal = normal / norma
        d = -float(normal @ tres[0])
        dentro = int((np.abs(puntos @ normal + d) < MARGEN_PLANO_MM).sum())
        if dentro > mejores:
            mejor, mejores = (normal, d), dentro
    if mejor is None or mejores < len(puntos) * 0.2:
        return None
    normal, d = mejor
    cerca = np.abs(puntos @ normal + d) < MARGEN_PLANO_MM
    centro = puntos[cerca].mean(axis=0)
    _, _, vt = np.linalg.svd(puntos[cerca] - centro)
    normal = vt[2] / np.linalg.norm(vt[2])
    if normal[2] > 0:
        normal = -normal
    return normal, -float(normal @ centro)


def altura(profundidad, intrinsecos, plano):
    """Altura con signo sobre el plano, en mm. Positiva encima de la mesa, NaN sin medida."""
    if plano is None:
        return None
    x, y, z = nube_xyz(profundidad, intrinsecos)
    normal, d = plano
    return x * normal[0] + y * normal[1] + z * normal[2] + d


def medir_ruido(h, z, plano_mm=15.0):
    """Ruido del sensor sobre la mesa como recta `sigma = a + b·z`, en mm."""
    cerca = np.isfinite(h) & (np.abs(h) < plano_mm) & np.isfinite(z)
    if cerca.sum() < 1000:
        return None
    hz, zz = h[cerca], z[cerca]
    bordes = np.percentile(zz, [0, 20, 40, 60, 80, 100])
    centros, sigmas = [], []
    for lo, hi in zip(bordes[:-1], bordes[1:]):
        sel = (zz >= lo) & (zz < hi)
        if sel.sum() > 200:
            centros.append(float(np.median(zz[sel])))
            sigmas.append(float(np.std(hz[sel])))
    # Sin variación de distancia la recta no está determinada.
    if len(centros) < 2 or float(np.ptp(centros)) < 50.0:
        return {'a': float(np.std(hz)), 'b': 0.0, 'sigma_global': float(np.std(hz))}
    b, a = np.polyfit(centros, sigmas, 1)
    return {'a': float(a), 'b': float(b), 'sigma_global': float(np.std(hz)),
            'puntos': [[c, s] for c, s in zip(centros, sigmas)]}


def sigma_a(ruido, z):
    """Ruido esperado a esa distancia, en mm."""
    if not ruido:
        return 0.0
    return float(max(0.5, ruido['a'] + ruido['b'] * np.asarray(z, float)))


def region_de_la_mesa(h, buenos, plano_mm=15.0):
    """Mayor región conexa sobre el plano, con los huecos interiores rellenos.

    La mesa continúa bajo lo que tuviera encima al tomar la referencia. El borde se erosiona
    para excluir el canto y el suelo inmediato.
    """
    sobre = (np.isfinite(h) & (np.abs(h) < plano_mm) & buenos).astype(np.uint8)
    nucleo = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    sobre = cv2.morphologyEx(sobre, cv2.MORPH_CLOSE, nucleo)
    cuantos, etiquetas, estadisticas, _ = cv2.connectedComponentsWithStats(sobre, 8)
    if cuantos < 2:
        return None
    mayor = 1 + int(np.argmax(estadisticas[1:, cv2.CC_STAT_AREA]))
    mascara = (etiquetas == mayor).astype(np.uint8)
    # Se replica el borde para que el cierre no absorba suelo junto al marco ni recorte la mesa.
    margen = 16
    ampliada = cv2.copyMakeBorder(mascara, margen, margen, margen, margen, cv2.BORDER_REPLICATE)
    relleno = cv2.morphologyEx(ampliada, cv2.MORPH_CLOSE,
                               cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)),
                               borderType=cv2.BORDER_CONSTANT, borderValue=0)
    relleno = relleno[margen:-margen, margen:-margen].copy()
    contornos, _ = cv2.findContours(relleno, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    relleno = np.zeros_like(relleno)
    cv2.drawContours(relleno, contornos, -1, 1, thickness=cv2.FILLED)
    erosionada = cv2.erode(relleno, cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (EROSION_BORDE_PX, EROSION_BORDE_PX)))
    return erosionada if erosionada.any() else relleno


class Mesa:
    """Plano, región y ruido de una cámara, tomados con la mesa despejada."""

    def __init__(self, plano, region, ruido, resolucion, intrinsecos=None, nota=''):
        self.plano = plano
        self.region = region
        self.ruido = ruido
        self.resolucion = tuple(resolucion)
        self.intrinsecos = intrinsecos
        self.nota = nota

    @classmethod
    def desde_captura(cls, profundidad, intrinsecos, nota=''):
        plano = ajustar_plano(profundidad, intrinsecos)
        if plano is None:
            raise ValueError('No se encontró un plano dominante: encuadra la mesa y repite.')
        h = altura(profundidad, intrinsecos, plano)
        buenos = valida(profundidad)
        ruido = medir_ruido(h, np.asarray(profundidad, float))
        region = region_de_la_mesa(h, buenos)
        if region is None:
            raise ValueError('No se pudo delimitar la superficie de la mesa.')
        alto, ancho = np.asarray(profundidad).shape[:2]
        return cls(plano, region, ruido, (ancho, alto), intrinsecos, nota)

    def umbral(self, z):
        """Altura mínima en mm para distinguir un objeto del ruido a esa distancia."""
        return max(ALTURA_MINIMA_MM, SIGMAS * sigma_a(self.ruido, z))

    def resumen(self):
        normal, d = self.plano
        area = float(self.region.mean())
        return {'normal': [round(float(v), 4) for v in normal], 'd_mm': round(float(d), 1),
                'region_pct_cuadro': round(area * 100, 1),
                'sigma_global_mm': round(self.ruido['sigma_global'], 2) if self.ruido else None,
                'umbral_800mm': round(self.umbral(800.0), 1),
                'umbral_1200mm': round(self.umbral(1200.0), 1),
                'resolucion': list(self.resolucion), 'nota': self.nota}

    def guardar(self, base):
        base = Path(base)
        base.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(base.with_suffix('.region.png')), self.region * 255)
        normal, d = self.plano
        base.with_suffix('.json').write_text(json.dumps(
            {'plano': {'normal': [float(v) for v in normal], 'd': float(d)},
             'ruido': self.ruido, 'resolucion': list(self.resolucion),
             'intrinsecos': self.intrinsecos, 'nota': self.nota,
             'resumen': self.resumen()}, ensure_ascii=False, indent=2))
        return base

    @classmethod
    def cargar(cls, base):
        base = Path(str(base).replace('.json', ''))
        datos = json.loads(base.with_suffix('.json').read_text())
        region = cv2.imread(str(base.with_suffix('.region.png')), cv2.IMREAD_GRAYSCALE)
        if region is None:
            raise FileNotFoundError(f'Falta la región de {base}')
        plano = (np.asarray(datos['plano']['normal'], float), float(datos['plano']['d']))
        return cls(plano, (region > 127).astype(np.uint8), datos.get('ruido'),
                   datos['resolucion'], datos.get('intrinsecos'), datos.get('nota', ''))
