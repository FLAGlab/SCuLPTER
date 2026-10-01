import argparse
import json
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np

from plataforma.escena_virtual import CONFIGURACION_PASOS, cobertura, fuentes
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import GUIONES
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def percentiles(valores):
    if not valores:
        return {'mediana_ms': 0.0, 'p95_ms': 0.0}
    return {'mediana_ms': round(float(np.median(valores)), 2), 'p95_ms': round(float(np.quantile(valores, .95)), 2)}


def correr(nombre, vocabulario, pasos=12, guardar=None):
    constructor, debe_ejecutar, descripcion = GUIONES[nombre]
    escena, guion = constructor(vocabulario)
    fusion = Fusion()
    duraciones = {'lectura': [], 'fusion': []}
    correctas = incorrectas = pendientes = 0
    detalle, resultado = [], None
    for paso in range(pasos):
        guion(escena, paso)
        instante = 10.0 + paso * 0.1
        inicio = time.perf_counter()
        marcos, imagenes = fuentes(escena, vocabulario, instante, paso + 1)
        medio = time.perf_counter()
        resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        fin = time.perf_counter()
        duraciones['lectura'].append((medio - inicio) * 1000)
        duraciones['fusion'].append((fin - medio) * 1000)
        verdad = sorted(escena.verdad())
        leido = sorted(p['lexema'] for p in resultado['piezas'])
        habilita = puede_ejecutar(resultado)
        acierta = habilita and debe_ejecutar and leido == verdad
        falla = habilita and (not debe_ejecutar or leido != verdad)
        correctas += acierta
        incorrectas += falla
        pendientes += not habilita
        detalle.append({'paso': paso, 'estado': resultado['estado'], 'habilita_ejecucion': habilita,
                        'confirmacion_incorrecta': bool(falla), 'verdad': verdad, 'leido': leido,
                        'programa': [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']],
                        'avisos': resultado['avisos']})
        if guardar:
            os.makedirs(guardar, exist_ok=True)
            for id, imagen in imagenes.items():
                cv2.imwrite(os.path.join(guardar, f'{nombre}_{paso:02d}_{id}.png'), imagen)
    return {'escena': nombre, 'descripcion': descripcion, 'sintetica': True, 'debe_ejecutar': debe_ejecutar,
            'programa': escena.programa, 'pasos': pasos,
            'camaras': [{**c.resumen(), 'cobertura': cobertura(c)} for c in escena.camaras],
            'confirmaciones_correctas': correctas, 'confirmaciones_incorrectas': incorrectas,
            'pendientes': pendientes, 'tiempos': {k: percentiles(v) for k, v in duraciones.items()},
            'lecturas': dict(Counter(p for d in detalle for p in d['leido'])), 'detalle': detalle}


def imprimir(informe):
    print(f"== {informe['escena']} ==  {informe['descripcion']}")
    print(f"programa: {' · '.join(informe['programa'])}")
    for camara in informe['camaras']:
        c = camara['cobertura']
        print(f"  {camara['nombre']:<18} campo {c['campo_mm']:.0f} mm · {c['px_por_mm']:.2f} px/mm · "
              f"ficha {c['ficha_px']:.0f} px {'' if c['suficiente'] else '(por debajo del mínimo utilizable)'}")
    print(f"correctas: {informe['confirmaciones_correctas']} · incorrectas: {informe['confirmaciones_incorrectas']} · "
          f"pendientes: {informe['pendientes']} de {informe['pasos']}")
    for etapa, t in informe['tiempos'].items():
        print(f"  {etapa}: mediana {t['mediana_ms']} ms · p95 {t['p95_ms']} ms")
    ultimo = informe['detalle'][-1]
    print(f"último paso: verdad={ultimo['verdad']}")
    print(f"             leido ={ultimo['leido']}")
    if ultimo['avisos']:
        print('  avisos: ' + ' | '.join(ultimo['avisos']))
    print('Imágenes sintéticas: no equivalen a una prueba con fichas impresas y cámaras reales.\n')


def main():
    p = argparse.ArgumentParser(description='Ejecuta una escena del gemelo digital por el reconocimiento y la fusión reales.')
    p.add_argument('--escena', choices=sorted(GUIONES) + ['todas'], default='completa')
    p.add_argument('--pasos', type=int, default=12)
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    p.add_argument('--guardar-imagenes', metavar='CARPETA')
    p.add_argument('--json', metavar='SALIDA')
    args = p.parse_args()
    vocabulario = Vocabulario(RAIZ, args.datos)
    if not vocabulario.plantillas:
        p.exit(1, 'No hay plantillas. Ejecuta herramientas/sembrar_vocabulario_virtual.py primero.\n')
    nombres = sorted(GUIONES) if args.escena == 'todas' else [args.escena]
    informes = [correr(n, vocabulario, args.pasos, args.guardar_imagenes) for n in nombres]
    for informe in informes:
        imprimir(informe)
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w', encoding='utf-8') as archivo:
            json.dump(informes if len(informes) > 1 else informes[0], archivo, ensure_ascii=False, indent=2)
        print(f'informe guardado en {args.json}')


if __name__ == '__main__':
    main()
