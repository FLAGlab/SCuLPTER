import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np

from herramientas.sembrar_vocabulario_virtual import nombre_referencia, recortar_como_detector
from plataforma import malla
from plataforma.escena_virtual import COLOR_GRABADO, COLOR_MESA, COLOR_OPERACION, Camara, _colocar
from plataforma.rasterizador import Escenario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPERACIONES = ['PUSH', 'POP', 'MOV', 'DUP', 'NEG', '?', 'JMP', 'CMP', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD']
ALTURA_MM = 150.0
RESOLUCION = (420, 420)


def rendir(token):
    piezas = malla.operacion(token, rejilla=0.0, rejilla_grabado=0.0)
    if piezas is None:
        raise ValueError(f'{token} no está en parametro.stl')
    cuerpo, grabado = piezas
    ejes = (np.array([1., 0., 0.]), np.array([0., 1., 0.]), np.array([0., 0., 1.]))
    mundo = Escenario()
    mundo.agregar(_colocar(cuerpo, np.zeros(3), *ejes), COLOR_OPERACION)
    mundo.agregar(_colocar(grabado, np.zeros(3), *ejes), COLOR_GRABADO)
    camara = Camara('ref', 'ref', [0., 0., ALTURA_MM], [0., 0., 0.], 16.0, RESOLUCION)
    imagen, _, _ = mundo.rasterizar(camara.modelo(), RESOLUCION, COLOR_MESA)
    return recortar_como_detector(imagen)


def sembrar(datos, tokens):
    carpeta = os.path.join(datos, 'referencias')
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(datos, 'simbolos.json')
    propios = []
    if os.path.exists(ruta):
        with open(ruta, encoding='utf-8') as archivo:
            propios = json.load(archivo)
    nuevos = []
    for token in tokens:
        if any(e['lexema'] == token and e.get('origen') == 'render' for e in propios):
            continue
        archivo = nombre_referencia('operacion', token)
        if not cv2.imwrite(os.path.join(carpeta, archivo), rendir(token)):
            raise ValueError(f'No se pudo escribir la referencia de {token}.')
        entrada = {'lexema': token, 'nombre': token, 'tipo': 'operacion', 'foto': archivo,
                   'confirmado': False, 'origen': 'render', 'modelo': 'parametro.stl'}
        propios.append(entrada)
        nuevos.append(entrada)
    temporal = ruta + '.tmp'
    with open(temporal, 'w', encoding='utf-8') as archivo:
        json.dump(propios, archivo, ensure_ascii=False, indent=1)
    os.replace(temporal, ruta)
    return nuevos


def main():
    p = argparse.ArgumentParser(description='Rinde las fichas de operación desde parametro.stl con el mismo rasterizador que las cámaras virtuales.')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    p.add_argument('--operaciones', nargs='*', default=OPERACIONES)
    args = p.parse_args()
    nuevos = sembrar(args.datos, args.operaciones)
    print(f'{len(nuevos)} referencias rendirizadas desde parametro.stl en {args.datos}')
    for entrada in nuevos:
        print(f"  {entrada['lexema']:<6} {entrada['foto']}")
    print('\nProcedencia "render": geometría real del STL, iluminación y materiales simulados.')


if __name__ == '__main__':
    main()
