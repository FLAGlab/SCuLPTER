import argparse
import json
import time
from pathlib import Path

import cv2

RAIZ = Path(__file__).resolve().parents[1]


def seleccionar(config, fuente):
    opciones = [c for c in config['camaras'] if c['tipo'] == 'webcam' and c['fuente'] == str(fuente)]
    if len(opciones) != 1:
        raise ValueError(f'La webcam {fuente} debe aparecer una sola vez en el montaje guardado.')
    camara = opciones[0]
    id = camara['id']
    if not config['intrinsecos'].get(id) or not config['poses'].get(id):
        raise ValueError(f'Falta calibrar y registrar la webcam {fuente}.')
    return camara


def registrar(args):
    config = json.loads(Path(args.config).read_text())
    if not config.get('fusion', {}).get('medido'):
        raise ValueError('Mide y guarda el paso entre bloques antes de grabar.')
    camaras = [seleccionar(config, fuente) for fuente in (args.camara_a, args.camara_b)]
    if camaras[0]['id'] == camaras[1]['id']:
        raise ValueError('Selecciona dos webcams diferentes.')
    salida = Path(args.out)
    if salida.exists() and any(salida.iterdir()):
        raise ValueError('La carpeta de salida debe estar vacía para conservar la sesión completa.')
    salida.mkdir(parents=True, exist_ok=True)
    capturas = [cv2.VideoCapture(int(c['fuente'])) for c in camaras]
    if not all(c.isOpened() for c in capturas):
        for c in capturas:
            c.release()
        raise ValueError('No se pudieron abrir ambas webcams. Revisa índices, permisos y aplicaciones que las usan.')
    sesion = {'version': 1, 'camaras': camaras, 'intrinsecos': {c['id']: config['intrinsecos'][c['id']] for c in camaras},
              'poses': {c['id']: config['poses'][c['id']] for c in camaras}, 'fusion': config['fusion'],
              'esperado': args.esperado, 'escena': args.escena, 'debe_ejecutar': args.debe_ejecutar}
    (salida / 'sesion.json').write_text(json.dumps(sesion, ensure_ascii=False, indent=2))
    print(f"Escena: {args.escena} · programa: {args.esperado} · duración: {args.duracion} s")
    print('La grabación comienza en 3 segundos. Interrumpe con Ctrl+C para detenerla.')
    time.sleep(3)
    inicio = time.monotonic()
    siguiente = inicio
    n = 0
    try:
        with (salida / 'cuadros.jsonl').open('w') as manifiesto:
            while time.monotonic() - inicio < args.duracion:
                espera = siguiente - time.monotonic()
                if espera > 0:
                    time.sleep(espera)
                siguiente += 1 / args.fps
                marcas = []
                for captura in capturas:
                    if not captura.grab():
                        raise RuntimeError('Una webcam dejó de entregar cuadros.')
                    marcas.append(time.monotonic() - inicio)
                muestras = [c.retrieve() for c in capturas]
                instante = max(marcas)
                if not all(ok for ok, _ in muestras):
                    raise RuntimeError('No se pudo recuperar un cuadro de ambas webcams.')
                archivos = {}
                for camara, (_, imagen) in zip(camaras, muestras):
                    nombre = f"{camara['id']}_{n:05d}.png"
                    if not cv2.imwrite(str(salida / nombre), imagen):
                        raise RuntimeError('No se pudo guardar una imagen.')
                    archivos[camara['id']] = nombre
                manifiesto.write(json.dumps({'t': instante, 'instantes': {c['id']: t for c, t in zip(camaras, marcas)}, 'imagenes': archivos}) + '\n')
                manifiesto.flush()
                n += 1
                if n % max(1, args.fps) == 0:
                    print(f'{n} pares guardados')
    finally:
        for c in capturas:
            c.release()
    print(f'Sesión guardada en {salida}: {n} pares de imágenes.')


def principal():
    parser = argparse.ArgumentParser(description='Graba dos webcams calibradas para evaluar la lectura y la fusión.')
    parser.add_argument('--camara-a', required=True, type=int)
    parser.add_argument('--camara-b', required=True, type=int)
    parser.add_argument('--config', default=str(RAIZ / 'datos_locales' / 'montaje.json'))
    parser.add_argument('--out', required=True)
    parser.add_argument('--esperado', required=True, help='programa real, con una instrucción por línea o separadas por punto y coma')
    parser.add_argument('--escena', required=True, choices=('completa', 'oclusion', 'movimiento', 'repetidos', 'retirada'))
    parser.add_argument('--debe-ejecutar', action='store_true', help='marca una escena completa y quieta donde se admite ejecutar')
    parser.add_argument('--duracion', type=float, default=8)
    parser.add_argument('--fps', type=int, default=4)
    args = parser.parse_args()
    if args.duracion <= 0 or not 1 <= args.fps <= 30:
        parser.error('La duración debe ser positiva y los fps estar entre 1 y 30.')
    if args.debe_ejecutar and args.escena != 'completa':
        parser.error('Solo una escena completa y quieta puede marcarse como ejecutable.')
    try:
        registrar(args)
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f'{exc}\n')


if __name__ == '__main__':
    principal()
