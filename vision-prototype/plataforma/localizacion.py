"""Etapa 1: localizar caras de ficha, sin leer su símbolo.

El tamaño de una cara se mide en milímetros con la profundidad de cada región, así que no
depende de la distancia de la cámara. Requiere la referencia de mesa de la cámara.
"""

import cv2
import numpy as np

from plataforma.mesa import ALTURA_MAXIMA_MM, ALTURA_MINIMA_MM, SIGMAS, Mesa, altura, valida
from plataforma.medidas import LADO_FICHA_MM, LADO_OPERACION_MM

# Ventana de una cara en mm: parámetro de 15 mm y operación de 20 mm, con margen para
# perspectiva, desenfoque y caras tapadas en parte.
LADO_MIN_MM = LADO_FICHA_MM * 0.6
LADO_MAX_MM = LADO_OPERACION_MM * 1.5
PROPORCION_CARA = 2.2
LADO_MINIMO_PX = 6
COBERTURA_REGION = 0.6
SOLAPE_DUPLICADO = 0.3
ALCANCE_TINTA = 4.5
RAYOS_MINIMOS = 11
CONSENSO_TAMANO = 2.2
# Pendiente máxima, en mm de altura por mm recorrido, para tomar una zona por horizontal.
PENDIENTE_HORIZONTAL = 0.25
DIRECCIONES = [(float(np.cos(a)), float(np.sin(a))) for a in np.linspace(0, 2 * np.pi, 16, endpoint=False)]
# Sin profundidad no hay escala física: la ventana de una cara es una fracción del lado corto.
TINTA_MINIMA = 0.02
LADO_MIN_RGB = 0.025
LADO_MAX_RGB = 0.6


def focal(intrinsecos):
    """Distancia focal en píxeles, o None si los intrínsecos no sirven."""
    if not intrinsecos:
        return None
    k = np.asarray(intrinsecos.get('camera_matrix'), float)
    if k.shape != (3, 3) or not np.isfinite(k).all() or k[0, 0] <= 0:
        return None
    return float(k[0, 0])


def mm_por_px(intrinsecos, z_mm):
    """Milímetros que cubre un píxel a esa distancia."""
    f = focal(intrinsecos)
    if f is None or z_mm is None or not np.isfinite(z_mm) or z_mm <= 0:
        return None
    return float(z_mm) / f


def _limpiar(mascara):
    nucleo = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cerrada = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, nucleo)
    return cv2.morphologyEx(cerrada, cv2.MORPH_OPEN, nucleo)


def mascara_objetos(profundidad, intrinsecos, mesa):
    """Píxeles que sobresalen de la mesa por encima del ruido, dentro de la región.

    La altura se toma con signo para que lo que queda por debajo del plano no cuente.
    """
    h = altura(profundidad, intrinsecos, mesa.plano)
    if h is None:
        return None, None
    z = np.asarray(profundidad, float)
    if mesa.ruido:
        umbral = np.maximum(ALTURA_MINIMA_MM, SIGMAS * (mesa.ruido['a'] + mesa.ruido['b'] * z))
    else:
        umbral = ALTURA_MINIMA_MM
    with np.errstate(invalid='ignore'):
        sobresale = (h > umbral) & (h < ALTURA_MAXIMA_MM)
    sobresale &= valida(profundidad)
    if mesa.region is not None and mesa.region.shape == sobresale.shape:
        sobresale &= mesa.region.astype(bool)
    return sobresale.astype(np.uint8), h


def _z_region(profundidad, caja):
    x, y, w, h = caja
    trozo = np.asarray(profundidad, float)[y:y + h, x:x + w]
    buenos = valida(trozo)
    if buenos is None or not buenos.any():
        return None
    return float(np.median(trozo[buenos]))


def _iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x0, y0, x1, y1 = max(ax, bx), max(ay, by), min(ax + aw, bx + bw), min(ay + ah, by + bh)
    if x1 <= x0 or y1 <= y0:
        return 0.0
    corte = (x1 - x0) * (y1 - y0)
    return corte / float(aw * ah + bw * bh - corte)


def _nms(cajas, umbral=SOLAPE_DUPLICADO):
    """Una caja por cara: entre las que se solapan, la mayor."""
    salida = []
    for c in sorted(cajas, key=lambda c: -c[2] * c[3]):
        if all(_iou(c, s) < umbral for s in salida):
            salida.append(c)
    return salida


def _dentro(interior, exterior, minimo=.7):
    ix, iy, iw, ih = interior
    ex, ey, ew, eh = exterior
    ancho = max(0, min(ix + iw, ex + ew) - max(ix, ex))
    alto = max(0, min(iy + ih, ey + eh) - max(iy, ey))
    return ancho * alto >= minimo * iw * ih


def _forma(contorno, lado_min, lado_max, rect=.72, solidez=.88):
    """Caja de un contorno casi cuadrado, rectangular y convexo, o None."""
    area = cv2.contourArea(contorno)
    if area <= 0:
        return None
    _, (rw, rh), _ = cv2.minAreaRect(contorno)
    largo, corto = max(rw, rh), min(rw, rh)
    if not lado_min <= largo <= lado_max or corto < .45 * largo:
        return None
    if area / max(1., rw * rh) < rect:
        return None
    if area / max(1., cv2.contourArea(cv2.convexHull(contorno))) < solidez:
        return None
    return cv2.boundingRect(contorno)


def _aristas(suave, bajo, alto):
    """Canny con umbrales relativos al brillo mediano de la imagen."""
    m = float(np.median(suave))
    return cv2.Canny(suave, int(max(5, bajo * m)), int(max(10, alto * m)))


def _caras_por_tinta(gris, lado_min, lado_max):
    """Contornos de tinta oscura del tamaño de una cara. Solo encuentra caras con inscripción."""
    bloque = max(3, int(lado_min) | 1)
    binaria = cv2.adaptiveThreshold(cv2.GaussianBlur(gris, (3, 3), 0), 255,
                                    cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
                                    bloque, 5)
    contornos, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    caras = []
    for contorno in contornos:
        cx, cy, cw, ch = cv2.boundingRect(contorno)
        if not lado_min <= max(cw, ch) <= lado_max or min(cw, ch) < LADO_MINIMO_PX:
            continue
        if max(cw, ch) / max(1, min(cw, ch)) > PROPORCION_CARA:
            continue
        caras.append((cx, cy, cw, ch))
    return caras


def _caras_entre_aristas(gris, lado_min, lado_max):
    """Regiones cerradas por aristas con forma de cara, tengan o no inscripción."""
    suave = cv2.GaussianBlur(gris, (5, 5), 0)
    borde = cv2.dilate(_aristas(suave, .55, 1.3), np.ones((3, 3), np.uint8))
    region = cv2.bitwise_not(borde)
    cuantos, etiquetas, estadisticas, _ = cv2.connectedComponentsWithStats(region, 4)
    cajas, lado = [], lado_min
    while lado <= lado_max:
        for n in range(1, cuantos):
            x, y, w, h, area = estadisticas[n]
            if not lado / 1.6 <= max(w, h) <= lado * 1.6 or area < (lado / 2) ** 2:
                continue
            componente = (etiquetas[y:y + h, x:x + w] == n).astype(np.uint8)
            contornos, _ = cv2.findContours(componente, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contornos:
                continue
            caja = _forma(max(contornos, key=cv2.contourArea), lado / 1.6, lado * 1.6)
            if caja:
                cajas.append((x + caja[0], y + caja[1], caja[2], caja[3]))
        lado *= 1.4
    return cajas


def _semillas_de_tinta(suave, lado_min, lado_max):
    """Agujeros oscuros dentro de una región clara: la tinta, no el fondo junto a los objetos."""
    claro = cv2.adaptiveThreshold(suave, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY,
                                  max(3, int(min(suave.shape) * .25) | 1), -5)
    contornos, jerarquia = cv2.findContours(claro, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    tinta, semillas = np.zeros_like(suave), []
    if jerarquia is None:
        return semillas, tinta
    for n, contorno in enumerate(contornos):
        if jerarquia[0][n][3] < 0:
            continue
        _, _, w, h = cv2.boundingRect(contorno)
        largo = max(w, h)
        if not lado_min * .15 <= largo <= lado_max * .8:
            continue
        momentos = cv2.moments(contorno)
        if momentos['m00'] <= 0:
            continue
        semillas.append((momentos['m10'] / momentos['m00'], momentos['m01'] / momentos['m00'],
                         largo / 2))
        cv2.drawContours(tinta, [contorno], -1, 255, cv2.FILLED)
    return semillas, tinta


def _rayos(borde, cx, cy, desde, hasta):
    """Primer punto de arista en cada una de las direcciones, desde el centro de la tinta."""
    alto, ancho = borde.shape
    puntos = []
    for dx, dy in DIRECCIONES:
        r = desde
        while r <= hasta:
            x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
            if not (0 <= x < ancho and 0 <= y < alto):
                break
            if borde[y, x]:
                puntos.append((x, y))
                break
            r += 1
    return puntos


def _caras_por_semilla(gris, lado_min, lado_max, tinta_minima=0.):
    """La cara que rodea cada mancha de tinta, hasta la primera arista en cada dirección.

    Un hueco en la arista entre una cara blanca y un bloque blanco solo desvía un rayo, en vez
    de derramar la región entera. La cara no puede medir más que `ALCANCE_TINTA` veces la tinta,
    y con `tinta_minima` se descarta la que apenas tiene tinta: un punto suelto, no un símbolo.
    """
    suave = cv2.GaussianBlur(gris, (3, 3), 0)
    semillas, tinta = _semillas_de_tinta(suave, lado_min, lado_max)
    borde = _aristas(suave, .33, .66)
    borde[cv2.dilate(tinta, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0] = 0
    cajas = []
    for cx, cy, radio in semillas:
        puntos = _rayos(borde, cx, cy, radio + 2, min(lado_max * .8, radio * ALCANCE_TINTA))
        if len(puntos) < RAYOS_MINIMOS:
            continue
        (rcx, rcy), (rw, rh), angulo = cv2.minAreaRect(np.array(puntos, np.float32))
        largo, corto = max(rw, rh), min(rw, rh)
        if not lado_min <= largo <= min(lado_max, 2 * radio * ALCANCE_TINTA) or corto < .5 * largo:
            continue
        if np.hypot(rcx - cx, rcy - cy) > .35 * largo:
            continue
        esquinas = cv2.boxPoints(((rcx, rcy), (rw, rh), angulo)).astype(np.int32)
        x, y, w, h = cv2.boundingRect(esquinas)
        if tinta_minima and (tinta[max(0, y):y + h, max(0, x):x + w] > 0).mean() < tinta_minima:
            continue
        cajas.append((x, y, w, h))
    return cajas


def _caras_planas(altura_mm, lado_min, lado_max, mmpp):
    """Zonas horizontales por encima de la mesa: la cara superior de un cubo, sin mirar el color.

    Se exige pendiente casi nula y no solo poca variación local: una cara vertical vista en
    oblicuo también varía poco de un píxel al siguiente, pero su altura crece de abajo arriba.
    """
    buenos = np.isfinite(altura_mm)
    h = cv2.medianBlur(np.where(buenos, altura_mm, 0.0).astype(np.float32), 5)
    pendiente = np.hypot(cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3),
                         cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)) / (8 * mmpp)
    plana = (buenos & (pendiente < PENDIENTE_HORIZONTAL) & (h > ALTURA_MINIMA_MM)).astype(np.uint8)
    contornos, _ = cv2.findContours(plana, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [c for c in (_forma(contorno, lado_min, lado_max, .7, .85) for contorno in contornos) if c]


def _consenso(cajas, base, factor=CONSENSO_TAMANO):
    """Todas las fichas miden lo mismo: en una imagen sus caras tienen tamaños parecidos."""
    lados = sorted(max(w, h) for _, _, w, h in (base or cajas))
    if len(lados) < 3:
        return cajas
    referencia = lados[len(lados) // 2]
    return [c for c in cajas if referencia / factor <= max(c[2], c[3]) <= referencia * factor]


def _sin_fusiones(cajas):
    """Quita la caja que abarca dos caras vecinas ya halladas por separado."""
    salida = []
    for c in cajas:
        dentro = [o for o in cajas if o is not c and .2 * c[2] * c[3] <= o[2] * o[3] < c[2] * c[3]
                  and _dentro(o, c)]
        if not any(_iou(a, b) < .1 for n, a in enumerate(dentro) for b in dentro[n + 1:]):
            salida.append(c)
    return salida


def _sin_contenidas(cajas):
    """Quita la caja que cae dentro de otra mayor: un detalle de tinta dentro de la cara."""
    return [c for c in cajas
            if not any(o is not c and o[2] * o[3] > c[2] * c[3] and _dentro(c, o) for o in cajas)]


def caras_en_imagen(gris, lado_min, lado_max, consenso=True):
    """Caras de ficha en una imagen en gris, con la ventana de tamaño en píxeles.

    Con `consenso`, la ruta sin escala física: tamaños parecidos, sin puntos de tinta sueltos,
    sin cajas que abarquen dos caras ni cajas dentro de otra.
    """
    por_semilla = _nms(_caras_por_semilla(gris, lado_min, lado_max, TINTA_MINIMA if consenso else 0.))
    cajas = por_semilla + _caras_entre_aristas(gris, lado_min, lado_max)
    if consenso:
        cajas = _sin_contenidas(_sin_fusiones(_nms(_consenso(cajas, por_semilla), .7)))
    return _nms(cajas)


def caras_en_region(color, caja, mmpp, altura_mm=None):
    """Caras dentro de un objeto, con la ventana de tamaño en milímetros."""
    x, y, w, h = caja
    recorte = color[y:y + h, x:x + w]
    if recorte.size == 0 or mmpp is None or mmpp <= 0:
        return []
    lado_min = max(LADO_MINIMO_PX, int(LADO_MIN_MM / mmpp))
    lado_max = int(LADO_MAX_MM / mmpp)
    if lado_max <= lado_min:
        return []
    gris = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    caras = caras_en_imagen(gris, lado_min, lado_max, consenso=False)
    if altura_mm is not None:
        caras = _nms(caras + _caras_planas(altura_mm[y:y + h, x:x + w], lado_min, lado_max, mmpp))
    tinta = [c for c in _caras_por_tinta(gris, lado_min, lado_max)
             if not any(_dentro(c, cara) for cara in caras)]
    return [(x + cx, y + cy, cw, ch) for cx, cy, cw, ch in _nms(caras + tinta)]


def _dentro_de_la_region(region, caja, minimo=COBERTURA_REGION):
    """Descarta las cajas que quedan a caballo del borde de la mesa."""
    if region is None:
        return True
    x, y, w, h = caja
    trozo = region[y:y + h, x:x + w]
    return trozo.size > 0 and float(trozo.mean()) >= minimo


def _regiones_sin_medida(profundidad, intrinsecos, mesa):
    """Huecos de profundidad dentro de la mesa, con la escala que da el plano."""
    buenos = valida(profundidad)
    if buenos is None or mesa.region is None:
        return []
    k = np.asarray(intrinsecos['camera_matrix'], float)
    alto, ancho = np.asarray(profundidad).shape[:2]
    xx, yy = np.meshgrid(np.arange(ancho), np.arange(alto))
    normal, d = mesa.plano
    denominador = ((xx - k[0, 2]) / k[0, 0]) * normal[0] + ((yy - k[1, 2]) / k[1, 1]) * normal[1] + normal[2]
    with np.errstate(divide='ignore', invalid='ignore'):
        z_plano = np.where(np.abs(denominador) > 1e-9, -d / denominador, np.nan)
    huecos = _limpiar((~buenos & np.isfinite(z_plano) & mesa.region.astype(bool)).astype(np.uint8))
    cuantos, _, estadisticas, _ = cv2.connectedComponentsWithStats(huecos, 8)
    regiones = []
    for n in range(1, cuantos):
        x, y, w, h, _ = estadisticas[n]
        trozo = z_plano[y:y + h, x:x + w]
        if not np.isfinite(trozo).any():
            continue
        mmpp = mm_por_px(intrinsecos, float(np.nanmedian(trozo)))
        if mmpp is None or max(w, h) * mmpp < LADO_MIN_MM:
            continue
        regiones.append(((int(x), int(y), int(w), int(h)), mmpp))
    return regiones


def localizar(color, profundidad=None, intrinsecos=None, mesa=None, plano=None, fondo=None):
    """Candidatos a cara en coordenadas del cuadro original.

    Sin referencia de mesa no localiza nada: no hay forma de saber dónde acaba la zona de
    trabajo. Devuelve (candidatos, objetos, diagnostico).
    """
    diagnostico = {'mesa': mesa is not None, 'objetos': 0, 'con_profundidad': 0,
                   'sin_profundidad': 0, 'fuera_de_region': 0, 'motivo': ''}
    if color is None or color.size == 0:
        diagnostico['motivo'] = 'sin imagen'
        return [], [], diagnostico
    if focal(intrinsecos) is None:
        diagnostico['motivo'] = 'faltan intrínsecos: no se puede medir en milímetros'
        return [], [], diagnostico
    if profundidad is None or np.asarray(profundidad).shape[:2] != color.shape[:2]:
        diagnostico['motivo'] = 'sin profundidad alineada al color'
        return [], [], diagnostico
    if mesa is None:
        if fondo is not None or plano is not None:
            try:
                mesa = Mesa.desde_captura(fondo if fondo is not None else profundidad, intrinsecos)
            except ValueError as error:
                diagnostico['motivo'] = str(error)
                return [], [], diagnostico
        else:
            diagnostico['motivo'] = ('falta la referencia de mesa: captúrala con la mesa '
                                     'despejada (herramientas/referencia_mesa.py)')
            return [], [], diagnostico
    if mesa.region is not None and tuple(mesa.resolucion) != (color.shape[1], color.shape[0]):
        diagnostico['motivo'] = ('la referencia de mesa se tomó a otra resolución; vuelve a '
                                 'capturarla con la configuración actual')
        return [], [], diagnostico
    diagnostico['mesa'] = True

    mascara, alturas = mascara_objetos(profundidad, intrinsecos, mesa)
    if mascara is None:
        diagnostico['motivo'] = 'no se pudo medir la altura sobre la mesa'
        return [], [], diagnostico

    cuantos, _, estadisticas, _ = cv2.connectedComponentsWithStats(_limpiar(mascara), 8)
    objetos, candidatos, vistas = [], [], set()
    for n in range(1, cuantos):
        x, y, w, h, area = estadisticas[n]
        z = _z_region(profundidad, (x, y, w, h))
        mmpp = mm_por_px(intrinsecos, z)
        if mmpp is None:
            continue
        if max(w, h) * mmpp < LADO_MIN_MM or area * mmpp * mmpp < (LADO_MIN_MM ** 2) / 2:
            continue
        objetos.append({'caja': (int(x), int(y), int(w), int(h)), 'z_mm': z,
                        'mm_por_px': mmpp, 'ancho_mm': w * mmpp, 'alto_mm': h * mmpp})
        for caja in caras_en_region(color, (x, y, w, h), mmpp, alturas):
            cx, cy, cw, ch = caja
            if not _dentro_de_la_region(mesa.region, caja):
                diagnostico['fuera_de_region'] += 1
                continue
            z_cara = _z_region(profundidad, caja)
            mmpp_cara = mm_por_px(intrinsecos, z_cara) or mmpp
            lado = max(cw, ch) * mmpp_cara
            if not LADO_MIN_MM <= lado <= LADO_MAX_MM or (cx, cy, cw, ch) in vistas:
                continue
            vistas.add((cx, cy, cw, ch))
            diagnostico['con_profundidad' if z_cara is not None else 'sin_profundidad'] += 1
            candidatos.append({'caja': [int(cx), int(cy), int(cw), int(ch)],
                               'centro': [cx + cw / 2, cy + ch / 2],
                               'z_mm': z_cara if z_cara is not None else z,
                               'lado_mm': float(lado),
                               'origen': 'profundidad' if z_cara is not None else 'color'})

    for caja, mmpp in _regiones_sin_medida(profundidad, intrinsecos, mesa):
        for cara in caras_en_region(color, caja, mmpp):
            cx, cy, cw, ch = cara
            lado = max(cw, ch) * mmpp
            if not LADO_MIN_MM <= lado <= LADO_MAX_MM or (cx, cy, cw, ch) in vistas:
                continue
            if not _dentro_de_la_region(mesa.region, cara):
                diagnostico['fuera_de_region'] += 1
                continue
            vistas.add((cx, cy, cw, ch))
            diagnostico['sin_profundidad'] += 1
            candidatos.append({'caja': [int(cx), int(cy), int(cw), int(ch)],
                               'centro': [cx + cw / 2, cy + ch / 2], 'z_mm': None,
                               'lado_mm': float(lado), 'origen': 'color'})

    diagnostico['objetos'] = len(objetos)
    if candidatos:
        diagnostico['motivo'] = ''
    elif objetos:
        diagnostico['motivo'] = ('se ven objetos sobre la mesa pero ninguna cara del tamaño de '
                                 'una ficha')
    else:
        diagnostico['motivo'] = 'no hay nada sobre la mesa a la altura de una ficha'
    return candidatos, objetos, diagnostico


def localizar_rgb(color):
    """Candidatos a cara en una imagen sin profundidad: webcams y fotografías externas.

    No hay mesa ni escala física, así que se busca en toda la imagen con una ventana de tamaño
    relativa al lado corto y se exige que las caras de una misma imagen midan parecido. Un
    dibujo impreso con forma de ficha puede salir como candidato. Devuelve
    (candidatos, objetos, diagnostico) como `localizar`.
    """
    diagnostico = {'mesa': False, 'objetos': 0, 'con_profundidad': 0, 'sin_profundidad': 0,
                   'fuera_de_region': 0, 'motivo': '', 'escala': 'relativa a la imagen'}
    if color is None or color.size == 0:
        diagnostico['motivo'] = 'sin imagen'
        return [], [], diagnostico
    gris = cv2.cvtColor(color, cv2.COLOR_BGR2GRAY)
    corto = min(gris.shape)
    candidatos = [{'caja': [int(x), int(y), int(w), int(h)], 'centro': [x + w / 2, y + h / 2],
                   'z_mm': None, 'lado_mm': None, 'origen': 'rgb'}
                  for x, y, w, h in caras_en_imagen(gris, LADO_MIN_RGB * corto, LADO_MAX_RGB * corto)]
    diagnostico['sin_profundidad'] = len(candidatos)
    if not candidatos:
        diagnostico['motivo'] = 'ninguna región con forma de cara'
    return candidatos, [], diagnostico
