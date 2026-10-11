"""Captura referencias de una ficha eligiendo sola las vistas nítidas.

    # capturador en otra terminal, con la orden de docs/CONEXION_CAMARAS.md
    python3 herramientas/capturar_referencia_guiada.py --sesion 2026-10-11-cenital \\
        --camara rs0 --nombre ADD --tipo operacion

Con una sola ficha sobre la mesa despejada, localiza su cara, puntúa la nitidez y guarda las
vistas más nítidas que sean distintas entre sí. Si no localiza la ficha no guarda nada.
"""

import argparse
import base64
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plataforma.localizacion import localizar
from plataforma.puente_realsense import ruta_socket
from plataforma.sesiones import Dataset
from plataforma.vocabulario import Vocabulario

RAIZ = Path(__file__).resolve().parents[1]
MARGEN_PX = 3
DISTANCIA_MINIMA = 0.12


def nitidez(recorte):
    if recorte.size == 0:
        return 0.0
    return float(cv2.Laplacian(cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())


def distinta(recorte, guardadas, minimo=DISTANCIA_MINIMA):
    """Firma de la vista, o None si se parece demasiado a una ya elegida."""
    chica = cv2.resize(cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY), (32, 32)).astype(np.float32)
    chica = (chica - chica.mean()) / (chica.std() + 1e-6)
    for previa in guardadas:
        if float(np.abs(chica - previa).mean()) < minimo:
            return None
    return chica


def recortar(color, caja, margen=MARGEN_PX):
    x, y, w, h = caja
    alto, ancho = color.shape[:2]
    x0, y0 = max(0, x - margen), max(0, y - margen)
    x1, y1 = min(ancho, x + w + margen), min(alto, y + h + margen)
    return color[y0:y1, x0:x1]


def elegir(fuente, intrinsecos_por_omision, cuantas, segundos, minimo_nitidez, mesa=None,
           verboso=True):
    """Recorre cuadros en vivo y devuelve los mejores recortes de la única ficha en la mesa."""
    elegidos, firmas, vistos, descartes = [], [], 0, {}
    fin = time.monotonic() + segundos
    while time.monotonic() < fin and len(elegidos) < cuantas:
        try:
            cuadro = fuente.leer()
        except EOFError:
            break
        vistos += 1
        intr = cuadro.intrinsecos or intrinsecos_por_omision
        candidatos, _, diagnostico = localizar(cuadro.color, cuadro.profundidad, intr, mesa=mesa)
        if not candidatos:
            motivo = diagnostico['motivo'] or 'no se localiza ninguna cara'
            descartes[motivo] = descartes.get(motivo, 0) + 1
            continue
        if len(candidatos) > 1:
            descartes['hay más de una cara en la mesa'] = descartes.get('hay más de una cara en la mesa', 0) + 1
            continue
        recorte = recortar(cuadro.color, candidatos[0]['caja'])
        nitido = nitidez(recorte)
        if nitido < minimo_nitidez:
            descartes['imagen movida o borrosa'] = descartes.get('imagen movida o borrosa', 0) + 1
            continue
        firma = distinta(recorte, firmas)
        if firma is None:
            descartes['vista repetida'] = descartes.get('vista repetida', 0) + 1
            continue
        firmas.append(firma)
        elegidos.append({'recorte': recorte, 'nitidez': nitido,
                         'lado_mm': candidatos[0]['lado_mm'], 'origen': candidatos[0]['origen']})
        if verboso:
            print(f'  vista {len(elegidos)}/{cuantas}  nitidez {nitido:>7.1f}  '
                  f'lado {candidatos[0]["lado_mm"]:.0f} mm  ({candidatos[0]["origen"]})')
    return elegidos, vistos, descartes


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--nombre', required=True, help='Qué es la ficha: ADD, a, 3…')
    parser.add_argument('--tipo', default='operacion', choices=('operacion', 'pila', 'literal'))
    parser.add_argument('--cuantas', type=int, default=6)
    parser.add_argument('--segundos', type=float, default=40)
    parser.add_argument('--nitidez-minima', type=float, default=40.0)
    parser.add_argument('--datos', default=str(RAIZ / 'datos_locales'))
    parser.add_argument('--serial', default='')
    parser.add_argument('--raiz', default=str(RAIZ / 'datos_locales' / 'dataset'))
    parser.add_argument('--sesion', required=True, help='Sesión activa de la cámara')
    parser.add_argument('--camara', required=True, help='Cámara de la sesión, p. ej. rs0')
    parser.add_argument('--probar', action='store_true',
                        help='Elige las vistas y las muestra, pero no las guarda')
    args = parser.parse_args()
    if not 0 < args.cuantas <= 30:
        parser.error('--cuantas debe estar entre 1 y 30')

    if not ruta_socket().exists():
        parser.error('No hay capturador RealSense. Arranca primero:\n'
                     '  la orden sudo de docs/CONEXION_CAMARAS.md (servir_realsense.py)')
    try:
        mesa = Dataset(args.raiz).sesion(args.sesion).mesa(args.camara)
    except (FileNotFoundError, ValueError) as error:
        parser.error(str(error))
    if mesa is None:
        parser.error(f'La cámara {args.camara} no tiene referencia de mesa en {args.sesion}.\n'
                     f'Tómala con:  python3 herramientas/referencia_mesa.py --tomar '
                     f'--sesion {args.sesion} --camara {args.camara}')

    from plataforma.puente_realsense import RealSenseRemota
    fuente = RealSenseRemota(args.serial)
    print(f'Pon SOLO la ficha «{args.nombre}» sobre la mesa despejada y muévela despacio.')
    print(f'Tienes {args.segundos:.0f} s. Elijo yo las vistas nítidas.\n')
    try:
        elegidos, vistos, descartes = elegir(fuente, mesa.intrinsecos, args.cuantas,
                                             args.segundos, args.nitidez_minima, mesa=mesa)
    finally:
        fuente.cerrar()

    print(f'\n{len(elegidos)} vistas elegidas de {vistos} cuadros.')
    for motivo, cuantos in sorted(descartes.items(), key=lambda p: -p[1]):
        print(f'  descartados por {motivo}: {cuantos}')
    if not elegidos:
        print('\nNo guardo nada. Revisa que la ficha esté sola, iluminada y dentro del encuadre,')
        print('y comprueba la localización con:  python3 herramientas/evaluar_localizacion.py')
        return 1
    if args.probar:
        print('\n--probar: no se guardó nada.')
        return 0

    vocabulario = Vocabulario(RAIZ, args.datos)
    for n, elegido in enumerate(sorted(elegidos, key=lambda e: -e['nitidez']), 1):
        ok, png = cv2.imencode('.png', elegido['recorte'])
        if not ok:
            print(f'  vista {n}: no se pudo codificar, se omite')
            continue
        codificada = 'data:image/png;base64,' + base64.b64encode(png.tobytes()).decode()
        token = vocabulario.guardar({'nombre': args.nombre, 'tipo': args.tipo,
                                     'imagen': codificada})
        print(f'  guardada vista {n} como {token}')
    print(f'\nListo. Comprueba con:  python3 herramientas/auditar_vocabulario.py --programa todos')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
