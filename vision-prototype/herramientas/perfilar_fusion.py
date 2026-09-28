import argparse
import cProfile
import io
import os
import pstats
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from plataforma.fusion import Fusion, CONFIGURACION
from tests.test_fusion import fuente

CONFIG = {**CONFIGURACION, 'medido': True, 'paso_mm': 80.}
TOKENS = ['PUSH', 'a', '2']


def escena(camaras, fichas, t, secuencia, profundidad):
    puntos = [(TOKENS[i % 3], [-40 + (i % 10) * 20, (i // 10) * 20, 20]) for i in range(fichas)]
    return [fuente(f'c{k}', [-100 - 40 * k, -70 + 30 * k, 600], puntos, t,
                   profundidad=profundidad and k == 0, secuencia=secuencia)
            for k in range(camaras)]


def medir(camaras, fichas, profundidad, ticks, calientes=3):
    fusion = Fusion()
    for n in range(calientes):
        fusion.actualizar(escena(camaras, fichas, 10. + n * .1, n + 1, profundidad), CONFIG, 10. + n * .1)
    tiempos = []
    for n in range(calientes, calientes + ticks):
        t = 10. + n * .1
        cuadros = escena(camaras, fichas, t, n + 1, profundidad)
        inicio = time.perf_counter()
        fusion.actualizar(cuadros, CONFIG, t)
        tiempos.append((time.perf_counter() - inicio) * 1000)
    return tiempos


def main():
    p = argparse.ArgumentParser(description='Mide el coste de un tick de fusión con escenas sintéticas.')
    p.add_argument('--camaras', type=int, nargs='+', default=[2, 5])
    p.add_argument('--fichas', type=int, nargs='+', default=[9, 15, 30])
    p.add_argument('--ticks', type=int, default=20)
    p.add_argument('--perfil', action='store_true', help='desglosa el caso más caro por función')
    args = p.parse_args()
    print(f"{'cámaras':>8} {'fichas':>7} {'profundidad':>12} {'ms/tick':>9} {'p95 ms':>8}")
    for camaras in args.camaras:
        for fichas in args.fichas:
            for profundidad in (False, True):
                t = medir(camaras, fichas, profundidad, args.ticks)
                print(f"{camaras:>8} {fichas:>7} {'sí' if profundidad else 'no':>12} "
                      f"{np.mean(t):>9.1f} {np.percentile(t, 95):>8.1f}")
    print('\nEscenas sintéticas, sin cámaras reales. Sirven para comparar cambios de código,')
    print('no para predecir el rendimiento del montaje físico.')
    if args.perfil:
        camaras, fichas = max(args.camaras), max(args.fichas)
        print(f'\nDesglose de {camaras} cámaras y {fichas} fichas con profundidad:')
        pr = cProfile.Profile()
        pr.enable()
        medir(camaras, fichas, True, args.ticks)
        pr.disable()
        s = io.StringIO()
        pstats.Stats(pr, stream=s).sort_stats('cumulative').print_stats(8)
        for linea in s.getvalue().splitlines()[4:16]:
            print(linea)


if __name__ == '__main__':
    main()
