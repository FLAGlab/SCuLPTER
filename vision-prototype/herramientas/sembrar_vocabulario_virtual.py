import argparse
import json
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np

from plataforma.vocabulario import clase, lexema

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LADO = 180
MARGEN = 30
RADIO = 46
MARCO = 16
GROSOR = 16


FORMAS = ('circulo', 'triangulo', 'cuadrado', 'rombo', 'cruz', 'chevron', 'barras', 'gota')


def _forma(lienzo, nombre, centro, radio, color, grosor):
    x, y = centro
    r = radio
    relleno = grosor < 0
    if nombre == 'circulo':
        cv2.circle(lienzo, (x, y), r, color, grosor, cv2.LINE_AA)
    elif nombre == 'triangulo':
        pts = [np.array([[x, y - r], [x + r, y + r], [x - r, y + r]])]
        cv2.fillPoly(lienzo, pts, color, cv2.LINE_AA) if relleno else cv2.polylines(lienzo, pts, True, color, grosor, cv2.LINE_AA)
    elif nombre == 'cuadrado':
        cv2.rectangle(lienzo, (x - r, y - r), (x + r, y + r), color, grosor, cv2.LINE_AA)
    elif nombre == 'rombo':
        pts = [np.array([[x, y - r], [x + r, y], [x, y + r], [x - r, y]])]
        cv2.fillPoly(lienzo, pts, color, cv2.LINE_AA) if relleno else cv2.polylines(lienzo, pts, True, color, grosor, cv2.LINE_AA)
    elif nombre == 'cruz':
        cv2.line(lienzo, (x - r, y - r), (x + r, y + r), color, max(grosor, 6), cv2.LINE_AA)
        cv2.line(lienzo, (x + r, y - r), (x - r, y + r), color, max(grosor, 6), cv2.LINE_AA)
    elif nombre == 'chevron':
        cv2.polylines(lienzo, [np.array([[x - r, y - r], [x + r, y], [x - r, y + r]])], False, color, max(grosor, 6), cv2.LINE_AA)
    elif nombre == 'barras':
        for d in (-r * 2 // 3, 0, r * 2 // 3):
            cv2.line(lienzo, (x + d, y - r), (x + d, y + r), color, max(grosor, 6), cv2.LINE_AA)
    else:
        cv2.circle(lienzo, (x, y), r, color, -1, cv2.LINE_AA)
        cv2.circle(lienzo, (x, y), r // 2, (250, 250, 250), -1, cv2.LINE_AA)


ADORNOS = ('', 'punto', 'raya')


def dibujos_posibles():
    return [(f, a) for a in ADORNOS for f in FORMAS]


def ficha(texto, tipo='pila', dibujo=None):
    imagen = np.full((LADO, LADO, 3), 250, np.uint8)
    tinta = (52, 52, 52)
    cv2.rectangle(imagen, (MARCO, MARCO), (LADO - MARCO, LADO - MARCO), (120, 120, 120), 14, cv2.LINE_AA)
    if tipo == 'pila':
        forma, adorno = dibujo or dibujos_posibles()[0]
        _forma(imagen, forma, (LADO // 2, LADO // 2), RADIO, tinta, GROSOR)
        if adorno == 'punto':
            cv2.circle(imagen, (LADO // 2, LADO // 2), 13, tinta, -1, cv2.LINE_AA)
        elif adorno == 'raya':
            cv2.rectangle(imagen, (LADO // 2 - 26, LADO // 2 - 7), (LADO // 2 + 26, LADO // 2 + 7), tinta, -1, cv2.LINE_AA)
    else:
        escala, grosor = (2.8, 12) if len(texto) <= 2 else (1.7, 9)
        (ancho, alto), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, escala, grosor)
        cv2.putText(imagen, texto, ((LADO - ancho) // 2, (LADO + alto) // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, escala, tinta, grosor, cv2.LINE_AA)
    return imagen


def recortar_a_tinta(imagen, holgura=0.0):
    gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
    _, tinta = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    ys, xs = np.where(tinta > 0)
    if not len(ys):
        return imagen
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    my, mx = int((y1 - y0) * holgura) + 1, int((x1 - x0) * holgura) + 1
    alto, ancho = imagen.shape[:2]
    return imagen[max(0, y0 - my):min(alto, y1 + my), max(0, x0 - mx):min(ancho, x1 + mx)]


def sembrar(nombres, datos):
    carpeta = os.path.join(datos, 'referencias')
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(datos, 'simbolos.json')
    propios = json.loads(open(ruta, encoding='utf-8').read()) if os.path.exists(ruta) else []
    existentes = {p['lexema'] for p in propios if p.get('origen') == 'sintetico'}
    usados = {tuple(p['dibujo']) for p in propios if p.get('dibujo')}
    disponibles = [d for d in dibujos_posibles() if d not in usados]
    nuevos = []
    for nombre in nombres:
        tipo = clase(nombre)
        token = lexema(nombre, tipo)
        if token in existentes:
            continue
        dibujo = None
        if tipo == 'pila':
            if not disponibles:
                raise ValueError('No quedan dibujos distintos disponibles para más etiquetas de pila.')
            dibujo = disponibles.pop(0)
        archivo = 'ref_' + uuid.uuid4().hex + '.png'
        if not cv2.imwrite(os.path.join(carpeta, archivo), recortar_a_tinta(ficha(nombre, tipo, dibujo))):
            raise ValueError(f'No se pudo escribir la ficha de {nombre}.')
        entrada = {'lexema': token, 'nombre': nombre, 'tipo': tipo, 'foto': archivo,
                   'confirmado': False, 'origen': 'sintetico', 'dibujo': list(dibujo) if dibujo else None}
        propios.append(entrada)
        nuevos.append(entrada)
    temporal = ruta + '.tmp'
    with open(temporal, 'w', encoding='utf-8') as archivo:
        json.dump(propios, archivo, ensure_ascii=False, indent=1)
    os.replace(temporal, ruta)
    return nuevos


def main():
    p = argparse.ArgumentParser(description='Crea fichas sintéticas para que el gemelo digital tenga vocabulario. No son fotos de fichas reales.')
    p.add_argument('nombres', nargs='+', help='etiquetas de pila o literales, por ejemplo a b n 0 1 3 5')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    args = p.parse_args()
    nuevos = sembrar(args.nombres, args.datos)
    print(f'{len(nuevos)} fichas sintéticas escritas en {args.datos}')
    for entrada in nuevos:
        print(f"  {entrada['lexema']:<10} {entrada['tipo']:<10} {entrada['foto']}")
    print('\nProcedencia "sintetico": sirven para el gemelo digital, no acreditan nada sobre fichas impresas.')


if __name__ == '__main__':
    main()
