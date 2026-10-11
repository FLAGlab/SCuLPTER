import cv2
import numpy as np

from clasificador_simbolos import SIN_LEER, aceptar_candidatos
from plataforma.localizacion import localizar
from reconstruir import analizar, reducir_resolucion


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


def leer(cuadro, vocabulario, profundidad=None, intrinsecos=None, mesa=None):
    """Imagen reducida, lecturas y la tinta sin resolver, las tres en coordenadas del original."""
    return leer_detallado(cuadro, vocabulario, profundidad, intrinsecos, mesa)[:3]


def leer_detallado(cuadro, vocabulario, profundidad=None, intrinsecos=None, mesa=None):
    """Como `leer`, y además el diagnóstico de la localización."""
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
