import argparse
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from herramientas.evaluar_dataset import normalizar_programa
from plataforma.fusion import Fusion
from plataforma.lectura import leer_cuadro
from plataforma.vocabulario import Vocabulario

RAIZ = Path(__file__).resolve().parents[1]


def percentiles(valores):
    if not valores:
        return {'mediana_ms': 0, 'p95_ms': 0}
    return {'mediana_ms': round(float(np.median(valores)), 2), 'p95_ms': round(float(np.quantile(valores, .95)), 2)}


def evaluar(carpeta, datos=None):
    carpeta = Path(carpeta)
    sesion = json.loads((carpeta / 'sesion.json').read_text())
    vocabulario = Vocabulario(RAIZ, datos or RAIZ / 'datos_locales')
    if not vocabulario.plantillas:
        raise ValueError('No hay referencias de símbolos para analizar la sesión.')
    fusion = Fusion()
    esperado = normalizar_programa(sesion['esperado'])
    duraciones = {'lectura': [], 'fusion': [], 'total': []}
    escenas = []
    correctas = erroneas = pendientes = 0
    with (carpeta / 'cuadros.jsonl').open() as archivo:
        for n, linea in enumerate(archivo):
            fila = json.loads(linea)
            inicio = time.perf_counter()
            fuentes = []
            for camara in sesion['camaras']:
                id = camara['id']
                imagen = cv2.imread(str(carpeta / fila['imagenes'][id]))
                if imagen is None:
                    raise ValueError(f'Falta la imagen {fila["imagenes"][id]}.')
                _, lecturas = leer_cuadro(imagen, vocabulario)
                cuadro = {'secuencia': n + 1, 'instante': 10 + fila.get('instantes', {}).get(id, fila['t']), 'resolucion': [imagen.shape[1], imagen.shape[0]],
                          'observaciones': [lectura['observacion'] for lectura in lecturas], 'profundidad': None}
                fuentes.append({'id': id, 'nombre': camara['nombre'], 'estado': 'conectada', 'historial': [cuadro],
                                'intrinsecos': sesion['intrinsecos'][id], 'pose': sesion['poses'][id]})
            despues_lectura = time.perf_counter()
            resultado = fusion.actualizar(fuentes, sesion['fusion'], 10 + fila['t'])
            despues_fusion = time.perf_counter()
            duraciones['lectura'].append((despues_lectura - inicio) * 1000)
            duraciones['fusion'].append((despues_fusion - despues_lectura) * 1000)
            duraciones['total'].append((despues_fusion - inicio) * 1000)
            reconstruido = [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
            estable = bool(resultado['estable'])
            incorrecta = estable and (not sesion['debe_ejecutar'] or reconstruido != esperado)
            correcta = estable and sesion['debe_ejecutar'] and reconstruido == esperado
            correctas += correcta
            erroneas += incorrecta
            pendientes += not estable
            escenas.append({'t': round(fila['t'], 3), 'estado': resultado['estado'], 'programa': reconstruido,
                            'piezas': len(resultado['piezas']), 'sin_localizar': resultado['sin_localizar'],
                            'confirmacion_incorrecta': incorrecta, 'avisos': resultado['avisos']})
    return {'escena': sesion['escena'], 'esperado': esperado, 'debe_ejecutar': sesion['debe_ejecutar'],
            'cuadros': len(escenas), 'confirmaciones_correctas': correctas, 'confirmaciones_incorrectas': erroneas,
            'pendientes': pendientes, 'tiempos': {k: percentiles(v) for k, v in duraciones.items()}, 'detalle': escenas}


def principal():
    parser = argparse.ArgumentParser(description='Reproduce una sesión de dos webcams y mide lectura, fusión y decisiones.')
    parser.add_argument('--sesion', required=True)
    parser.add_argument('--datos', default=str(RAIZ / 'datos_locales'), help='carpeta local de referencias usada por el servicio')
    parser.add_argument('--json', help='guarda el informe completo')
    args = parser.parse_args()
    try:
        informe = evaluar(args.sesion, args.datos)
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as exc:
        parser.exit(1, f'{exc}\n')
    print(f"{informe['cuadros']} pares · {informe['escena']}")
    print(f"Correctas: {informe['confirmaciones_correctas']} · incorrectas: {informe['confirmaciones_incorrectas']} · pendientes: {informe['pendientes']}")
    for etapa, tiempos in informe['tiempos'].items():
        print(f"{etapa}: mediana {tiempos['mediana_ms']} ms · p95 {tiempos['p95_ms']} ms")
    if args.json:
        Path(args.json).write_text(json.dumps(informe, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    principal()
