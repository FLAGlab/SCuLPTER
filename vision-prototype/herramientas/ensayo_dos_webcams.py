import argparse
import itertools
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

import reconstruir
from plataforma.escena_virtual import Camara, centro_de, cobertura, olvidar_vistas
from plataforma.fusion import puede_ejecutar
from plataforma.guiones import GUIONES
from plataforma.recorrido import recorrer, leido
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESCENAS = ['una_instruccion', 'completa']


RESOLUCION = (640, 480)


def ancho_de_trabajo(ancho, resolucion):
    """La lectura reduce todo cuadro a ANCHO_TRABAJO_PX antes de buscar regiones, así que una
    webcam de 1080p no da más px/mm que una de 480p mientras ese tope no suba. Subirlo es la
    palanca que el ensayo mide, y hay que subir también la resolución de la cámara."""
    reconstruir.ANCHO_TRABAJO_PX = int(ancho)
    olvidar_vistas()
    return (int(resolucion[0]), int(resolucion[1]))


def par(centro, separacion, retroceso, altura, fov, resolucion=RESOLUCION):
    """Dos webcams al mismo lado de la mesa: enfrentarlas haría que una lea PUSH y la otra POP.
    Ambas miran al centro del montaje; la paralaje sale solo de la separación entre ellas."""
    mira = [float(centro[0]), float(centro[1]), 30.]
    return [Camara('web1', 'Webcam izquierda', [centro[0] - separacion / 2, retroceso, altura],
                   mira, fov, resolucion),
            Camara('web2', 'Webcam derecha', [centro[0] + separacion / 2, retroceso, altura],
                   mira, fov, resolucion)]


def medir(nombre, voc, camaras, pasos):
    escena, guion = GUIONES[nombre][0](voc)
    escena.camaras = [Camara(c.id, c.nombre, c.centro, c.objetivo, c.fov, c.resolucion) for c in camaras]
    if any(c.modelo() is None for c in escena.camaras):
        return {'veredicto': 'pose inservible', 'codigo': [], 'avisos': [], 'px_por_mm': 0.0,
                'campo_mm': 0.0}
    resultado, _ = recorrer(escena, guion, voc, pasos)
    codigo = leido(resultado)
    real = list(escena.programa)
    habilita = puede_ejecutar(resultado)
    cob = cobertura(escena.camaras[0], 20.0, reconstruir.ANCHO_TRABAJO_PX)
    return {'veredicto': 'completo' if habilita and codigo == real else
            'CONFIRMA INCORRECTO' if habilita else 'pendiente',
            'codigo': codigo, 'real': real, 'avisos': resultado['avisos'],
            'estado': resultado['estado'],
            'px_por_mm': cob['px_por_mm'], 'campo_mm': cob['campo_mm']}


def centro_de_escena(nombre, voc):
    escena, _ = GUIONES[nombre][0](voc)
    return centro_de(escena.fichas)


def buscar(voc, args):
    print(f"{'escena':<18}{'sep':>5}{'retro':>7}{'alt':>5}{'fov':>5}{'px/mm':>7}{'campo':>7}  "
          f"{'veredicto':<20}{'programa':<34}motivo de quedar pendiente")
    hallados = {}
    for nombre in args.escenas:
        centro = centro_de_escena(nombre, voc)
        for separacion, retroceso, altura, fov in itertools.product(
                args.separacion, args.retroceso, args.altura, args.fov):
            camaras = par(centro, separacion, retroceso, altura, fov, args.resolucion)
            m = medir(nombre, voc, camaras, args.pasos)
            print(f"{nombre:<18}{separacion:>5.0f}{retroceso:>7.0f}{altura:>5.0f}{fov:>5.0f}"
                  f"{m['px_por_mm']:>7.2f}{m['campo_mm']:>7.0f}  {m['veredicto']:<20}"
                  f"{(' · '.join(m['codigo']) or '(nada)'):<34}{(m['avisos'] or [''])[0][:66]}")
            if m['veredicto'] == 'completo':
                hallados.setdefault(nombre, (separacion, retroceso, altura, fov))
    print()
    for nombre in args.escenas:
        if nombre in hallados:
            s, r, a, f = hallados[nombre]
            print(f'{nombre}: leído entero con separación {s:.0f} mm, retroceso {r:.0f} mm, '
                  f'altura {a:.0f} mm y campo {f:.0f}°')
        else:
            print(f'{nombre}: ninguna de las {len(args.separacion)*len(args.retroceso)*len(args.altura)*len(args.fov)} '
                  'configuraciones probadas lo lee entero')
    print('Ninguna configuración debe confirmar un programa que no esté sobre la mesa.')
    return hallados


def sacudir(voc, args, configuracion):
    """Variaciones sistemáticas de cada cámara por separado, y la retirada de una vista."""
    nombre, (separacion, retroceso, altura, fov) = configuracion
    centro = centro_de_escena(nombre, voc)
    base = par(centro, separacion, retroceso, altura, fov, args.resolucion)
    print(f"\n== {nombre} con separación {separacion:.0f} mm, altura {altura:.0f} mm y campo {fov:.0f}°")
    print(f"{'variación':<34}{'veredicto':<20}programa")
    casos = [('sin variación', base)]
    for n, camara in enumerate(base):
        etiqueta = camara.id
        for eje, nombre_eje in enumerate('xyz'):
            for delta in (-args.desvio, args.desvio):
                movidas = [Camara(c.id, c.nombre, c.centro.copy(), c.objetivo.copy(), c.fov,
                                  c.resolucion) for c in base]
                movidas[n].centro[eje] += delta
                casos.append((f'{etiqueta} {nombre_eje} {delta:+.0f} mm', movidas))
        for grados in (-args.giro, args.giro):
            giradas = [Camara(c.id, c.nombre, c.centro.copy(), c.objetivo.copy(), c.fov,
                              c.resolucion) for c in base]
            alcance = float(np.linalg.norm(giradas[n].objetivo - giradas[n].centro))
            giradas[n].objetivo = giradas[n].objetivo + [alcance * np.tan(np.radians(grados)), 0., 0.]
            casos.append((f'{etiqueta} apunta {grados:+.0f}°', giradas))
    casos.append(('sin web2 (una sola vista)', base[:1]))
    malas = []
    for etiqueta, camaras in casos:
        m = medir(nombre, voc, camaras, args.pasos)
        print(f"{etiqueta:<34}{m['veredicto']:<20}{' · '.join(m['codigo']) or '(nada)'}")
        if m['veredicto'] == 'pendiente':
            print(f"{'':<34}motivo: {(m['avisos'] or ['el montaje no se estabiliza: ' + m['estado']])[0][:90]}")
        if m['veredicto'] == 'CONFIRMA INCORRECTO':
            malas.append(etiqueta)
    print(f'\nconfirmaciones incorrectas: {len(malas)}' + (' (' + ', '.join(malas) + ')' if malas else ''))


def main():
    p = argparse.ArgumentParser(description='Busca una disposición plausible de dos webcams y mide su sensibilidad a la pose.')
    p.add_argument('--escenas', nargs='*', default=ESCENAS)
    p.add_argument('--separacion', nargs='*', type=float, default=[60., 90., 120., 160., 200.])
    p.add_argument('--retroceso', nargs='*', type=float, default=[-45., -80.])
    p.add_argument('--altura', nargs='*', type=float, default=[240., 280., 320., 380.])
    p.add_argument('--fov', nargs='*', type=float, default=[30., 35., 40., 45., 52.])
    p.add_argument('--pasos', type=int, default=12)
    p.add_argument('--desvio', type=float, default=15., help='milímetros de desplazamiento al sacudir')
    p.add_argument('--giro', type=float, default=5., help='grados de desvío de puntería al sacudir')
    p.add_argument('--solo-sacudir', nargs=4, type=float, metavar=('SEP', 'RETRO', 'ALT', 'FOV'))
    p.add_argument('--ancho-trabajo', type=int, default=reconstruir.ANCHO_TRABAJO_PX,
                   help='tope al que la lectura reduce cada cuadro antes de buscar regiones')
    p.add_argument('--resolucion', nargs=2, type=int, default=list(RESOLUCION))
    args = p.parse_args()
    args.resolucion = ancho_de_trabajo(args.ancho_trabajo, args.resolucion)
    print(f'ancho de trabajo {args.ancho_trabajo} px · cámaras de {args.resolucion[0]}x{args.resolucion[1]}')
    voc = Vocabulario(RAIZ, os.path.join(RAIZ, 'datos_locales', 'virtual'))
    if args.solo_sacudir:
        for nombre in args.escenas:
            sacudir(voc, args, (nombre, tuple(args.solo_sacudir)))
        return
    hallados = buscar(voc, args)
    for nombre in args.escenas:
        if nombre in hallados:
            sacudir(voc, args, (nombre, hallados[nombre]))


if __name__ == '__main__':
    main()
