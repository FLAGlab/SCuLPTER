"""Toma y revisa la referencia de mesa de una cámara en una sesión.

    # capturador en otra terminal, con la orden de docs/CONEXION_CAMARAS.md
    python3 herramientas/referencia_mesa.py --tomar --sesion 2026-10-11-cenital --camara rs0
    python3 herramientas/referencia_mesa.py --revisar --sesion 2026-10-11-cenital --camara rs0

Se toma con la mesa despejada y vale mientras la cámara no se mueva. Se guarda en
`sesiones/<sesion>/camaras/<camara>/mesa/`; la anterior pasa a `mesa/historial/`.
`--desde-vista TOMA` la construye desde una vista guardada de la mesa despejada.
`--recortar` y `--encoger` ajustan la región si entra equipo o el canto de la mesa.
"""

import argparse
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plataforma.mesa import Mesa, altura, valida
from plataforma.puente_realsense import ruta_socket
from plataforma.sesiones import Dataset

RAIZ = Path(__file__).resolve().parents[1]
POR_OMISION = RAIZ / 'datos_locales' / 'dataset'


def promediar(fuente, cuantas, cada=0.3):
    """Mediana de varias capturas, para que el ruido no decida la región."""
    pilas, color, intr = [], None, None
    for n in range(cuantas):
        cuadro = fuente.leer()
        if cuadro.profundidad is None:
            raise ValueError('La cámara no entrega profundidad; no se puede tomar la referencia.')
        pilas.append(np.asarray(cuadro.profundidad, float))
        color, intr = cuadro.color, cuadro.intrinsecos or intr
        print(f'  captura {n + 1}/{cuantas}')
        if n + 1 < cuantas:
            time.sleep(cada)
    apiladas = np.stack(pilas)
    buenas = apiladas > 0
    with np.errstate(invalid='ignore'):
        media = np.where(buenas.any(axis=0), np.nanmedian(np.where(buenas, apiladas, np.nan), 0), 0.0)
    return color, np.nan_to_num(media), intr


def pintar(color, mesa, destino):
    vista = color.copy()
    capa = vista.copy()
    capa[mesa.region.astype(bool)] = (0, 180, 0)
    vista = cv2.addWeighted(vista, 0.72, capa, 0.28, 0)
    contornos, _ = cv2.findContours(mesa.region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(vista, contornos, -1, (0, 255, 0), 2)
    resumen = mesa.resumen()
    texto = [f'region {resumen["region_pct_cuadro"]}% del cuadro',
             f'sigma {resumen["sigma_global_mm"]} mm',
             f'umbral 800mm: {resumen["umbral_800mm"]} mm',
             f'umbral 1200mm: {resumen["umbral_1200mm"]} mm']
    for n, linea in enumerate(texto):
        cv2.putText(vista, linea, (12, 26 + 22 * n), cv2.FONT_HERSHEY_SIMPLEX, .6,
                    (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(vista, linea, (12, 26 + 22 * n), cv2.FONT_HERSHEY_SIMPLEX, .6,
                    (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(destino), vista)
    return destino


def avisos(mesa, profundidad, intrinsecos):
    """Lo que debería hacerte dudar de esta referencia."""
    salida = []
    fraccion = float(mesa.region.mean())
    if fraccion < 0.10:
        salida.append(f'La región ocupa solo el {fraccion * 100:.1f}% del cuadro: puede que el '
                      'plano ajustado no sea la mesa.')
    if fraccion > 0.85:
        salida.append(f'La región ocupa el {fraccion * 100:.1f}% del cuadro: puede que haya '
                      'tomado el suelo como mesa.')
    if mesa.ruido and mesa.ruido['sigma_global'] > 8:
        salida.append(f'El ruido del sensor es alto ({mesa.ruido["sigma_global"]:.1f} mm): '
                      'acerca la cámara o mejora la luz.')
    h = altura(profundidad, intrinsecos, mesa.plano)
    dentro = mesa.region.astype(bool) & np.isfinite(h)
    if dentro.any() and float(np.nanmax(np.abs(h[dentro]))) > 60:
        salida.append('Dentro de la región hay puntos a más de 60 mm del plano: la mesa no '
                      'estaba despejada del todo.')
    cobertura = float(valida(profundidad).mean())
    if cobertura < 0.6:
        salida.append(f'Solo el {cobertura * 100:.0f}% del cuadro tiene profundidad.')
    return salida


def guardar(sesion, camara, mesa, color, profundidad):
    """Escribe la referencia; la que hubiera antes pasa a `historial/`."""
    base = sesion.ruta_mesa(camara)
    carpeta = base.parent
    if base.with_suffix('.json').is_file():
        destino = carpeta / 'historial' / time.strftime('%Y%m%d-%H%M%S')
        destino.mkdir(parents=True, exist_ok=True)
        for archivo in carpeta.glob('referencia.*'):
            archivo.rename(destino / archivo.name)
        print(f'La referencia anterior pasa a {destino}')
    mesa.guardar(base)
    cv2.imwrite(str(base.with_suffix('.color.png')), color)
    cv2.imwrite(str(base.with_suffix('.depth.png')),
                np.clip(np.nan_to_num(profundidad), 0, 65535).astype(np.uint16))
    return base


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--raiz', default=str(POR_OMISION))
    parser.add_argument('--sesion', required=True)
    parser.add_argument('--camara', required=True)
    parser.add_argument('--tomar', action='store_true', help='Captura una referencia nueva')
    parser.add_argument('--desde-vista', metavar='TOMA',
                        help='Construye la referencia desde una vista ya guardada')
    parser.add_argument('--revisar', action='store_true', help='Pinta la región de la guardada')
    parser.add_argument('--cuantas', type=int, default=8)
    parser.add_argument('--encoger', type=int, default=0, help='Píxeles a encoger la región')
    parser.add_argument('--recortar', nargs=4, type=int, metavar=('X0', 'Y0', 'X1', 'Y1'),
                        help='Recorta la región a este rectángulo de píxeles')
    parser.add_argument('--nota', default='')
    parser.add_argument('--serial', default='')
    parser.add_argument('--sin-preguntar', action='store_true')
    args = parser.parse_args()
    if sum(map(bool, (args.tomar, args.desde_vista, args.revisar))) != 1:
        parser.error('Elige una: --tomar, --desde-vista o --revisar')
    try:
        sesion = Dataset(args.raiz).sesion(args.sesion)
    except (FileNotFoundError, ValueError) as error:
        parser.error(str(error))
    if args.camara not in sesion.camaras():
        parser.error(f'La sesión {args.sesion} no tiene la cámara {args.camara}')
    base = sesion.ruta_mesa(args.camara)

    if args.revisar:
        mesa = sesion.mesa(args.camara)
        if mesa is None:
            parser.error(f'La cámara {args.camara} no tiene referencia en {args.sesion}')
        color = cv2.imread(str(base.with_suffix('.color.png')), cv2.IMREAD_COLOR)
        if color is None:
            parser.error(f'Falta {base.with_suffix(".color.png")}')
        destino = pintar(color, mesa, base.with_suffix('.revision.png'))
        for clave, valor in mesa.resumen().items():
            print(f'  {clave}: {valor}')
        print(f'\nRevisión en {destino}')
        return 0

    if args.desde_vista:
        color, profundidad, meta = sesion.cargar_vista(args.desde_vista, args.camara)
        if profundidad is None:
            parser.error('Esa vista no tiene profundidad; no sirve para la referencia de mesa')
        intr = meta.get('intrinsecos')
        nota = args.nota or f'construida desde la vista {args.desde_vista}'
    else:
        if not ruta_socket().exists():
            parser.error('No hay capturador RealSense. Arranca primero:\n'
                         '  la orden sudo de docs/CONEXION_CAMARAS.md (servir_realsense.py)')
        print('Deja la mesa COMPLETAMENTE despejada: sin fichas, sin bloques, sin cables,')
        print('sin manos y sin equipo encima. Lo que esté ahí se tomará como parte de la mesa.')
        print('Después de esto, NO muevas la cámara durante toda la sesión.\n')
        if not args.sin_preguntar and input('¿Está despejada? [s/N] ').strip().lower() not in ('s', 'si', 'sí'):
            print('Cancelado.')
            return 1
        from plataforma.puente_realsense import RealSenseRemota
        fuente = RealSenseRemota(args.serial or sesion.camaras()[args.camara].get('fuente', ''))
        try:
            color, profundidad, intr = promediar(fuente, args.cuantas)
        finally:
            fuente.cerrar()
        nota = args.nota or f'{args.sesion}/{args.camara}'

    mesa = Mesa.desde_captura(profundidad, intr, nota=nota)
    if args.recortar:
        x0, y0, x1, y1 = args.recortar
        recorte = np.zeros_like(mesa.region)
        recorte[y0:y1, x0:x1] = 1
        mesa.region = mesa.region * recorte
    if args.encoger > 0:
        n = args.encoger | 1
        mesa.region = cv2.erode(mesa.region, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n)))
    guardar(sesion, args.camara, mesa, color, profundidad)
    destino = pintar(color, mesa, base.with_suffix('.revision.png'))
    print(f'\nReferencia de {args.sesion}/{args.camara} en {base}.json')
    for clave, valor in mesa.resumen().items():
        print(f'  {clave}: {valor}')
    problemas = avisos(mesa, profundidad, intr)
    if problemas:
        print('\nAVISOS:')
        for problema in problemas:
            print(f'  - {problema}')
    print(f'\nMira {destino} antes de fiarte de esta referencia.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
