import cv2
import numpy as np

from clasificador_simbolos import SIN_LEER, aceptar_candidatos
from plataforma.localizacion import localizar, localizar_rgb
from reconstruir import analizar, reducir_resolucion

# Provisional, medido el 2026-10-13 con webcams: las lecturas ciertas dieron 0.87 o más y las
# falsas, sobre vistas sin ninguna cara, hasta 0.73. Con tan pocas referencias, ante la duda
# la cara queda sin leer.
UMBRAL_CARAS = 0.80


def leer_cuadro(cuadro, vocabulario):
    return leer(cuadro, vocabulario)[:2]


def _observar(recorte, x, y, w, h, vocabulario, extra=None):
    """Etapa 2: símbolo de una cara ya localizada; si no se reconoce, queda `<sin leer>`."""
    candidatos = vocabulario.puntuar(recorte) if recorte.size else []
    token = aceptar_candidatos(candidatos) or SIN_LEER
    nitidez = (float(cv2.Laplacian(cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())
               if recorte.size else 0.0)
    calidad = float(np.clip(min(w, h) / 24, .2, 1) * np.clip(nitidez / 100, .2, 1))
    observacion = {'calidad': calidad, 'lexema': token, 'x': float(x), 'y': float(y),
                   'caja': [float(x - w / 2), float(y - h / 2), float(w), float(h)],
                   'candidatos': candidatos, **(extra or {})}
    return {'recorte': recorte, 'x': x, 'y': y, 'w': w, 'h': h, 'token': token,
            'candidatos': candidatos, 'observacion': observacion}


def _por_contornos(cuadro, vocabulario):
    """Detector por contornos sobre la imagen reducida, para cámaras sin profundidad."""
    imagen = reducir_resolucion(cuadro)
    sx, sy = cuadro.shape[1] / imagen.shape[1], cuadro.shape[0] / imagen.shape[0]
    halladas, tinta = analizar(imagen)
    lecturas = []
    for recorte, x, y in halladas[:80]:
        if not vocabulario.puntuar(recorte):
            continue
        h, w = recorte.shape[:2]
        lecturas.append(_observar(recorte, x * sx, y * sy, w * sx, h * sy, vocabulario))
        lecturas[-1].update({'x': x, 'y': y, 'w': w, 'h': h})
    return imagen, lecturas, [[x * sx, y * sy, w * sx, h * sy] for x, y, w, h in tinta]


def tinta_de(cuadro, trazos):
    """Solo la tinta de una cara, sobre blanco y con margen: lo que la etapa 2 debe comparar.

    Se copian los píxeles originales con dos de holgura alrededor de cada trazo, para que el
    borde suavizado no dependa de dónde cortó la máscara: la normalización decide qué es tinta.
    """
    if not trazos:
        return None
    contornos = [np.int32(t) for t in trazos]
    x, y, w, h = cv2.boundingRect(np.vstack(contornos))
    mascara = np.zeros(cuadro.shape[:2], np.uint8)
    cv2.fillPoly(mascara, contornos, 255)
    mascara = cv2.dilate(mascara, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    salida = np.full_like(cuadro, 255)
    salida[mascara > 0] = cuadro[mascara > 0]
    m = max(w, h)
    return cv2.copyMakeBorder(salida[y:y + h, x:x + w], m, m, m, m, cv2.BORDER_CONSTANT,
                              value=(255, 255, 255))


def _por_caras(cuadro, vocabulario):
    """Ruta sin profundidad por caras: cada cara se lee solo con su propia tinta."""
    imagen = reducir_resolucion(cuadro)
    candidatos, _, diagnostico = localizar_rgb(cuadro)
    lecturas = []
    for candidato in candidatos[:80]:
        x, y, w, h = candidato['caja']
        tinta = tinta_de(cuadro, candidato.get('trazos'))
        centro = np.float32(candidato['esquinas']).mean(0) if candidato.get('esquinas') else (x + w / 2, y + h / 2)
        recorte = tinta if tinta is not None else cuadro[max(0, y):y + h, max(0, x):x + w]
        lectura = _observar(recorte, centro[0], centro[1], w, h, vocabulario,
                            extra={'origen': 'rgb', 'esquinas': candidato.get('esquinas')})
        if lectura['token'] != SIN_LEER and lectura['candidatos'][0]['puntaje'] < UMBRAL_CARAS:
            lectura['token'] = lectura['observacion']['lexema'] = SIN_LEER
        lectura['observacion']['caja'] = [float(x), float(y), float(w), float(h)]
        lectura.update({'x': x + w / 2, 'y': y + h / 2, 'w': w, 'h': h})
        lecturas.append(lectura)
    return imagen, lecturas, [], {**diagnostico, 'etapa': 'caras'}


def leer(cuadro, vocabulario, profundidad=None, intrinsecos=None, mesa=None):
    """Imagen reducida, lecturas y la tinta sin resolver, las tres en coordenadas del original."""
    return leer_detallado(cuadro, vocabulario, profundidad, intrinsecos, mesa)[:3]


def leer_detallado(cuadro, vocabulario, profundidad=None, intrinsecos=None, mesa=None,
                   ruta_rgb='contornos'):
    """Como `leer`, y además el diagnóstico de la localización.

    Sin profundidad, `ruta_rgb` elige entre la ruta por contornos de siempre y la ruta por caras;
    la segunda solo se usa si se pide.
    """
    if profundidad is None and ruta_rgb == 'caras':
        return _por_caras(cuadro, vocabulario)
    imagen = reducir_resolucion(cuadro)
    candidatos, objetos, diagnostico = localizar(cuadro, profundidad, intrinsecos, mesa=mesa)
    if profundidad is None:
        imagen, lecturas, tinta = _por_contornos(cuadro, vocabulario)
        return imagen, lecturas, tinta, {**diagnostico, 'etapa': 'contornos'}

    # Un cuadro RGB-D sin referencia de mesa (o sin candidatos) no debe volver al
    # detector antiguo: ese camino inventaba recuadros sobre el fondo.
    if not candidatos and not objetos:
        return imagen, [], [], {**diagnostico, 'etapa': 'profundidad'}

    lecturas = []
    for candidato in candidatos[:80]:
        x, y, w, h = candidato['caja']
        lectura = _observar(cuadro[y:y + h, x:x + w], x + w / 2, y + h / 2, w, h, vocabulario,
                            extra={'z_mm': candidato['z_mm'], 'lado_mm': candidato['lado_mm'],
                                   'origen': candidato['origen']})
        lectura.update({'x': x + w / 2, 'y': y + h / 2, 'w': w, 'h': h})
        lecturas.append(lectura)
    cubiertas = [c['caja'] for c in candidatos]
    tinta = [list(o['caja']) for o in objetos
             if not any(o['caja'][0] <= c[0] <= o['caja'][0] + o['caja'][2] for c in cubiertas)]
    return imagen, lecturas, tinta, {**diagnostico, 'etapa': 'profundidad'}
