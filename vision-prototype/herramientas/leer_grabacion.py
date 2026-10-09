import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from plataforma.dispositivos import Grabacion
from plataforma.lectura import leer
from plataforma.lector import Lector
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENTANA_S = 0.12


def exigir_calibracion(montaje, ids):
    if not os.path.isfile(montaje):
        raise SystemExit(
            f'Falta {montaje}. Hace falta la calibración real:\n'
            '  - intrínsecos por cámara (matriz y distorsión), con RMS < 1 px\n'
            '  - una pose por cámara en el mismo sistema, del registro conjunto con el tablero\n'
            'Se generan desde la página de cámaras del servicio, o con calibrate_cameras.py.')
    datos = json.loads(open(montaje, encoding='utf-8').read())
    faltan = [i for i in ids if not datos.get('intrinsecos', {}).get(i)]
    sin_pose = [i for i in ids if not datos.get('poses', {}).get(i)]
    if faltan or sin_pose:
        raise SystemExit(f'Calibración incompleta. Sin intrínsecos: {faltan or "—"}. '
                         f'Sin pose: {sin_pose or "—"}.')
    return datos


def medidas(args):
    """Las medidas del montaje FÍSICO, nunca las de la escena virtual. Lo que falte se informa:
    sin ellas el resultado no puede presentarse como aceptación física."""
    faltan = []
    if args.paso_2_mm is None and not args.paso_unico:
        faltan.append('--paso-2-mm medido (o --paso-unico si toda la cadena usa el mismo bloque)')
    for campo in ('plano_min_mm', 'plano_max_mm'):
        if getattr(args, campo) is None:
            faltan.append(f"--{campo.replace('_', '-')} medido sobre las fichas impresas")
    area = None
    if args.area:
        valores = [float(v) for v in args.area.split(',')]
        if len(valores) != 4 or valores[0] >= valores[1] or valores[2] >= valores[3]:
            raise SystemExit('--area necesita x_min,x_max,y_min,y_max en mm, en ese orden.')
        area = dict(zip(('x_min', 'x_max', 'y_min', 'y_max'), valores))
    else:
        faltan.append('--area x_min,x_max,y_min,y_max de la mesa real en mm')
    config = {'modo': 'fusion', 'paso_mm': args.paso_mm, 'paso_2_mm': args.paso_2_mm,
              'medido': True, 'plano_min_mm': args.plano_min_mm,
              'plano_max_mm': args.plano_max_mm, 'area_trabajo': area}
    return config, faltan


def main():
    p = argparse.ArgumentParser(description='Pasa grabaciones de cámaras REALES por el ciclo continuo de lectura.')
    p.add_argument('--camara', action='append', default=[], metavar='ID=RUTA',
                   help='una por cámara: vídeo o carpeta de imágenes')
    p.add_argument('--montaje', default=os.path.join(RAIZ, 'datos_locales', 'montaje.json'))
    p.add_argument('--datos', required=True,
                   help='carpeta con las referencias de las fichas FÍSICAS fotografiadas')
    p.add_argument('--paso-mm', type=float, required=True,
                   help='paso medido entre bloques de un parámetro del montaje físico')
    p.add_argument('--paso-2-mm', type=float,
                   help='paso medido entre bloques de dos parámetros del montaje físico')
    p.add_argument('--paso-unico', action='store_true',
                   help='declara que toda la cadena física usa el mismo bloque')
    p.add_argument('--plano-min-mm', type=float)
    p.add_argument('--plano-max-mm', type=float)
    p.add_argument('--area', metavar='X0,X1,Y0,Y1')
    p.add_argument('--fps', type=float)
    p.add_argument('--maximo', type=int, default=0, help='corta tras N cuadros por cámara')
    p.add_argument('--json', metavar='SALIDA')
    args = p.parse_args()
    if len(args.camara) < 2:
        raise SystemExit('Hacen falta al menos dos cámaras: --camara web1=RUTA --camara web2=RUTA')
    pares = []
    for item in args.camara:
        if '=' not in item:
            raise SystemExit(f'Usa ID=RUTA, no {item!r}.')
        cid, ruta = item.split('=', 1)
        pares.append((cid, ruta))
    montaje = exigir_calibracion(args.montaje, [c for c, _ in pares])
    voc = Vocabulario(RAIZ, args.datos)
    if not voc.plantillas:
        raise SystemExit('El vocabulario está vacío. Siembra las referencias de las fichas reales.')
    config, faltan = medidas(args)
    sinteticas = sum(v.get('render', 0) + v.get('sintetico', 0) for v in voc.procedencia.values())
    if sinteticas:
        faltan.append(f'referencias de ficha real: {sinteticas} plantillas de {args.datos} son renders')
    if faltan:
        print('MEDIDAS Y REFERENCIAS DEL MONTAJE FÍSICO INCOMPLETAS. Faltan:')
        for item in faltan:
            print(f'  - {item}')
        print('El resultado de abajo NO es una aceptación física.\n')
    fuentes = {cid: Grabacion(ruta, fps=args.fps) for cid, ruta in pares}
    lector = Lector(voc, config=config)
    print(f"{'cuadro':>7}{'t s':>7}  {'estado':<11}{'lect s':>7}{'scala s':>8}  programa / motivo")
    cuadro = 0
    historia = []
    try:
        while not args.maximo or cuadro < args.maximo:
            marcos, instante = [], None
            for cid, fuente in fuentes.items():
                try:
                    captura = fuente.leer()
                except EOFError:
                    raise StopIteration
                imagen, lecturas, tinta = leer(captura.color, voc)
                instante = captura.instante if instante is None else max(instante, captura.instante)
                marcos.append({'id': cid, 'nombre': cid, 'estado': 'conectada',
                               'intrinsecos': montaje['intrinsecos'][cid],
                               'pose': montaje['poses'][cid],
                               'historial': [{'secuencia': cuadro + 1, 'instante': captura.instante,
                                              'resolucion': [captura.color.shape[1], captura.color.shape[0]],
                                              'observaciones': [l['observacion'] for l in lecturas],
                                              'tinta': tinta, 'profundidad': None,
                                              'intrinsecos': montaje['intrinsecos'][cid]}]})
            lector.actualizar(marcos, instante)
            estado = lector.estado()
            lectura, veredicto = estado['lectura'], estado['veredicto']
            detalle = ' · '.join(lectura['programa']) or '(nada)'
            if lectura['estado'] == 'pendiente':
                detalle = (lectura['motivo'] or '')[:62]
            lat = lectura['latencia_lectura']
            sca = (veredicto or {}).get('latencia_scala')
            print(f"{cuadro + 1:>7}{instante:>7.2f}  {lectura['estado']:<11}"
                  f"{(f'{lat:.2f}' if lat is not None else '—'):>7}"
                  f"{(f'{sca:.2f}' if sca is not None else '—'):>8}  {detalle}")
            historia.append({'cuadro': cuadro + 1, **lectura, 'veredicto': veredicto})
            cuadro += 1
    except StopIteration:
        pass
    finally:
        for fuente in fuentes.values():
            fuente.cerrar()
    lector.esperar()
    m = lector.metricas()
    print(f"\ncuadros {m['capturas']} · versiones {m['versiones']} · lecturas completas "
          f"{m['lecturas_completas']} · capturas pendientes {m['pendientes']} · "
          f"ejecuciones de Scala {m['ejecuciones']}")
    print(f"latencia de lectura: mediana {m['lectura_mediana_s']} s · p95 {m['lectura_p95_s']} s")
    print(f"latencia de Scala:   mediana {m['scala_mediana_s']} s · p95 {m['scala_p95_s']} s")
    if faltan:
        print('RESULTADOS SOBRE LAS IMÁGENES DADAS, CON MEDIDAS O REFERENCIAS FÍSICAS INCOMPLETAS: '
              'no acreditan uso físico.')
        for item in faltan:
            print(f'  falta {item}')
    else:
        print('RESULTADOS CON IMÁGENES Y MEDIDAS REALES.')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w', encoding='utf-8') as archivo:
            json.dump({'metricas': m, 'historia': historia, 'configuracion': config,
                       'faltan_medidas_fisicas': faltan,
                       'aceptacion_fisica': not faltan}, archivo, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
