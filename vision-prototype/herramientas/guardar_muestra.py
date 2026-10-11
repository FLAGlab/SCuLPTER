"""Captura tomas originales de una cámara dentro de una sesión del conjunto físico.

    # capturador en otra terminal, con la orden de docs/CONEXION_CAMARAS.md
    python3 herramientas/guardar_muestra.py --sesion 2026-10-11-cenital --camara rs0 \\
        --escena cadena --montaje push-a-3 --cuantas 2 --nota "PUSH a 3, vista cenital"

El color se guarda en PNG sin pérdida y la profundidad, si la hay, en PNG de 16 bits en mm.
Antes de guardar se escribe una vista previa con la instrucción de la escena y se pide
confirmación. Guardar no marca nada como revisado. Cada toma tiene hoy una sola vista; la
captura simultánea de varias cámaras irá por el servicio, que las tiene abiertas a la vez.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plataforma import dataset
from plataforma.sesiones import Dataset

RAIZ = Path(__file__).resolve().parents[1]
POR_OMISION = RAIZ / 'datos_locales' / 'dataset'

INSTRUCCIONES = {
    'mesa_vacia': 'La mesa COMPLETAMENTE despejada: sin fichas, bloques, cables, manos ni equipo.',
    'ficha_sola': 'UNA sola ficha sobre la mesa despejada. Nada más encima.',
    'cadena': 'Una cadena de bloques unidos. Sin manos encima.',
    'union_te': 'Un montaje con un conector en T.',
    'ciclo': 'Un montaje que se cierra sobre sí mismo.',
    'salto': 'Un montaje con una instrucción de salto.',
    'oclusion_mano': 'El montaje con una mano tapando al menos una ficha.',
    'negativo_equipo': 'Equipo sobre la mesa pero NINGUNA ficha: robot, cajas, herramientas.',
    'negativo_cables': 'Cables sobre la mesa pero NINGUNA ficha.',
    'negativo_objetos': 'Objetos ajenos sobre la mesa pero NINGUNA ficha.',
    'libre': 'Escena libre: describe en --nota qué hay exactamente.',
}


def cargar_plano(base):
    """Lee una muestra del formato plano anterior, para `importar-legado`."""
    base = Path(base)
    if base.suffix:
        base = base.with_suffix('') if base.suffix == '.json' else Path(str(base).split('.color')[0])
    color = cv2.imread(str(base.with_suffix('.color.png')), cv2.IMREAD_COLOR)
    profundidad = cv2.imread(str(base.with_suffix('.depth.png')), cv2.IMREAD_UNCHANGED)
    if color is None:
        raise FileNotFoundError(f'Falta {base.with_suffix(".color.png")}')
    meta = json.loads(base.with_suffix('.json').read_text()) if base.with_suffix('.json').is_file() else {}
    return color, None if profundidad is None else profundidad.astype(np.float32), meta


class _Webcam:
    def __init__(self, fuente):
        from plataforma.dispositivos import Webcam
        self.dispositivo = Webcam(fuente)

    def leer(self):
        return self.dispositivo.leer()

    def cerrar(self):
        self.dispositivo.cerrar()


def abrir(camara, serial=''):
    """Abre la fuente que corresponde al tipo de la cámara de la sesión."""
    tipo = camara['tipo']
    if tipo == 'realsense':
        from plataforma.puente_realsense import RealSenseRemota, ruta_socket
        if not ruta_socket().exists():
            raise SystemExit(f'No hay capturador en {ruta_socket()}. Arranca primero:\n'
                             '  la orden sudo de docs/CONEXION_CAMARAS.md (servir_realsense.py)')
        return RealSenseRemota(serial or camara.get('fuente', ''))
    if tipo == 'webcam':
        return _Webcam(camara.get('fuente', '0'))
    raise SystemExit(f'La captura desde {tipo} todavía no está implementada aquí')


def previa(cuadro, escena, destino):
    vista = np.asarray(cuadro.color).copy()
    prof = None if cuadro.profundidad is None else np.asarray(cuadro.profundidad, float)
    cobertura = None if prof is None else float(np.count_nonzero(prof > 0) / prof.size)
    lineas = [f'ESCENA: {escena}', INSTRUCCIONES.get(escena, ''),
              'sin profundidad (camara RGB)' if cobertura is None
              else f'profundidad util: {cobertura * 100:.0f}%']
    for n, linea in enumerate(lineas):
        cv2.putText(vista, linea, (12, 28 + 26 * n), cv2.FONT_HERSHEY_SIMPLEX, .65,
                    (0, 0, 0), 4, cv2.LINE_AA)
        cv2.putText(vista, linea, (12, 28 + 26 * n), cv2.FONT_HERSHEY_SIMPLEX, .65,
                    (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(destino), vista)
    return destino, cobertura


def capturar(sesion, camara, fuente, escena, montaje, cuantas=1, cada=1.0, nota='',
             condiciones=None):
    """Toma `cuantas` vistas de una cámara, cada una en su propia toma. Devuelve las tomas."""
    tomas = []
    for n in range(cuantas):
        cuadro = fuente.leer()
        toma = sesion.nueva_toma(montaje, escena, condiciones, nota)
        sesion.guardar_vista(toma, camara, cuadro.color, cuadro.profundidad,
                             {'intrinsecos': cuadro.intrinsecos,
                              'instante_cuadro': float(cuadro.instante)})
        tomas.append(toma)
        if n + 1 < cuantas:
            time.sleep(cada)
    return tomas


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--raiz', default=str(POR_OMISION))
    parser.add_argument('--sesion', required=True)
    parser.add_argument('--camara', required=True, help='Cámara de la sesión, p. ej. rs0')
    parser.add_argument('--escena', required=True, choices=dataset.ESCENAS,
                        help='Qué pretendes capturar. No marca nada como correcto')
    parser.add_argument('--montaje', default='',
                        help='Qué montaje físico; obligatorio salvo en escenas negativas')
    parser.add_argument('--cuantas', type=int, default=1)
    parser.add_argument('--cada', type=float, default=1.0, help='Segundos entre tomas')
    parser.add_argument('--nota', default='', help='Qué hay en la mesa, en tus palabras')
    parser.add_argument('--iluminacion', default='normal', choices=dataset.ILUMINACION)
    parser.add_argument('--orientacion-grados', type=float)
    parser.add_argument('--sin-preguntar', action='store_true')
    parser.add_argument('--sin-referencia', action='store_true',
                        help='Capturar aunque la cámara no tenga referencia de mesa')
    parser.add_argument('--serial', default='')
    args = parser.parse_args()
    if not 0 < args.cuantas <= 50:
        parser.error('--cuantas debe estar entre 1 y 50; no hacen falta ráfagas casi iguales')
    if args.escena in dataset.NEGATIVAS and args.escena != 'mesa_vacia' and not args.nota:
        parser.error(f'--escena {args.escena} necesita --nota diciendo qué hay sobre la mesa')

    ds = Dataset(args.raiz)
    try:
        sesion = ds.sesion(args.sesion)
    except (FileNotFoundError, ValueError) as error:
        parser.error(f'{error}. Créala con  dataset_fisico.py sesion-crear {args.sesion}')
    camaras = sesion.camaras()
    if args.camara not in camaras:
        parser.error(f'La sesión {args.sesion} no tiene la cámara {args.camara}; tiene '
                     f'{", ".join(camaras) or "ninguna"}')
    camara = camaras[args.camara]
    if camara.get('profundidad') and sesion.mesa(args.camara) is None and not args.sin_referencia:
        parser.error(f'La cámara {args.camara} no tiene referencia de mesa en esta sesión. '
                     'Tómala primero, con la mesa despejada y sin mover la cámara después:\n'
                     f'  python3 herramientas/referencia_mesa.py --tomar --sesion {args.sesion} '
                     f'--camara {args.camara}')
    condiciones = {'iluminacion': args.iluminacion, 'orientacion_grados': args.orientacion_grados}

    fuente = abrir(camara, args.serial)
    try:
        if not args.sin_preguntar:
            cuadro = fuente.leer()
            destino, cobertura = previa(cuadro, args.escena, sesion.raiz / '_previa.png')
            print(f'\nSESIÓN {args.sesion} · CÁMARA {args.camara}')
            print(f'ESCENA: {args.escena}')
            print(f'  {INSTRUCCIONES.get(args.escena, "")}')
            if cobertura is not None:
                print(f'  profundidad útil: {cobertura * 100:.0f}%')
            print(f'\nMira {destino} y comprueba que la mesa tiene EXACTAMENTE eso.')
            if input('\n¿Coincide con lo que ves? [s/N] ').strip().lower() not in ('s', 'si', 'sí'):
                print('Cancelado. No se guardó nada.')
                return 1
        tomas = capturar(sesion, args.camara, fuente, args.escena, args.montaje, args.cuantas,
                         args.cada, args.nota, condiciones)
    finally:
        fuente.cerrar()
    for toma in tomas:
        print(f'  {toma}/{args.camara}')
    print(f'\n{len(tomas)} tomas en {sesion.raiz / "tomas"}, todas SIN REVISAR.')
    print('Siguiente: exportarlas a CVAT con  dataset_fisico.py cvat-exportar <lote> '
          f'--sesion {args.sesion}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
