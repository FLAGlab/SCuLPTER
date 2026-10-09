import argparse
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from plataforma.escena_virtual import CONFIGURACION_PASOS, escenario_de
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import GUIONES
from plataforma.lectura import leer_cuadro
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTERPRETE = os.path.join(RAIZ, 'simulador_3d', 'generado', 'interprete.js')
ETAPAS = ['mallas', 'rasterizado', 'reconocimiento', 'fusion']


def en_scala(codigo):
    if not codigo.strip() or not os.path.isfile(INTERPRETE):
        return 0.0
    guion = ("import {sculptEjecutar} from %r;"
             "sculptEjecutar(process.argv[1] + '\\n', 2000);") % ('file://' + INTERPRETE)
    inicio = time.perf_counter()
    subprocess.run(['node', '--input-type=module', '-e', guion, codigo],
                   capture_output=True, text=True, timeout=180)
    return time.perf_counter() - inicio


def medir(nombre, voc, pasos):
    escena, guion = GUIONES[nombre][0](voc)
    fusion = Fusion()
    marcas = {etapa: [] for etapa in ETAPAS}
    resultado = None
    for paso in range(pasos):
        guion(escena, paso)
        instante = 10.0 + paso * 0.1
        reloj = time.perf_counter()
        mundo = escenario_de(escena)
        marcas['mallas'].append(time.perf_counter() - reloj)
        marcos, rasterizado, reconocimiento = [], 0.0, 0.0
        for camara in escena.camaras:
            reloj = time.perf_counter()
            imagen = mundo.rasterizar(camara.modelo(), camara.resolucion)[0]
            rasterizado += time.perf_counter() - reloj
            reloj = time.perf_counter()
            _, lecturas = leer_cuadro(imagen, voc)
            reconocimiento += time.perf_counter() - reloj
            marcos.append({'id': camara.id, 'nombre': camara.nombre, 'estado': 'conectada',
                           'pose': camara.pose(), 'intrinsecos': camara.intrinsecos(),
                           'historial': [{'secuencia': paso + 1, 'instante': instante,
                                          'resolucion': list(camara.resolucion), 'profundidad': None,
                                          'observaciones': [l['observacion'] for l in lecturas]}]})
        marcas['rasterizado'].append(rasterizado)
        marcas['reconocimiento'].append(reconocimiento)
        reloj = time.perf_counter()
        resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        marcas['fusion'].append(time.perf_counter() - reloj)
    codigo = '\n'.join(' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones'])
    fila = {'escena': nombre, 'camaras': len(escena.camaras),
            'scala': en_scala(codigo) if puede_ejecutar(resultado) else 0.0,
            'triangulos': mundo.total()}
    for etapa in ETAPAS:
        fila[etapa] = float(np.median(marcas[etapa]))
    fila['captura'] = sum(fila[etapa] for etapa in ETAPAS)
    return fila


def main():
    p = argparse.ArgumentParser(description='Reparte el tiempo de una captura entre mallas, rasterizado, reconocimiento, fusión y Scala.')
    p.add_argument('--escenas', nargs='*', default=['una_instruccion', 'completa', 'ejecutable'])
    p.add_argument('--pasos', type=int, default=4)
    args = p.parse_args()
    voc = Vocabulario(RAIZ, os.path.join(RAIZ, 'datos_locales', 'virtual'))
    print(f"{'escena':<18}{'cám':>4}{'tri':>8}" + ''.join(f'{e:>15}' for e in ETAPAS)
          + f"{'captura s':>11}{'scala s':>9}")
    for nombre in args.escenas:
        f = medir(nombre, voc, args.pasos)
        print(f"{f['escena']:<18}{f['camaras']:>4}{f['triangulos']:>8}"
              + ''.join(f"{f[e]:>14.3f}s" for e in ETAPAS)
              + f"{f['captura']:>11.3f}{f['scala']:>9.3f}")
    print('Mediana por captura. El tiempo de Scala es por programa, no por captura.')


if __name__ == '__main__':
    main()
