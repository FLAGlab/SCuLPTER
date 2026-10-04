import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from herramientas.sembrar_operaciones_stl import sembrar as sembrar_operaciones
from herramientas.sembrar_operaciones_stl import OPERACIONES
from herramientas.sembrar_vocabulario_virtual import sembrar as sembrar_parametros

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARAMETROS = ['a', 'b', 'c', 'n', 'tmp', 'fib', 'suma', '0', '1', '2', '3', '5', '7', '99', '-1', '-3']


def preparar(datos):
    nuevos = sembrar_parametros(PARAMETROS, datos)
    nuevas = sembrar_operaciones(datos, OPERACIONES)
    return nuevos, nuevas


def main():
    p = argparse.ArgumentParser(description='Deja el vocabulario virtual listo y reproducible: parámetros rendirizados y operaciones desde parametro.stl.')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    args = p.parse_args()
    nuevos, nuevas = preparar(args.datos)
    print(f'{len(nuevos)} parámetros y {len(nuevas)} operaciones escritos en {args.datos}')
    print('Las referencias son renders de la geometría disponible. No acreditan reconocimiento de fichas impresas.')


if __name__ == '__main__':
    main()
