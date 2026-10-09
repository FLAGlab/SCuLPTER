import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plataforma.ensayo import Mesa, dos_webcams, ensayar, girar
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def guion_corto():
    return ['PUSH a 3'], dos_webcams, [
        ('construir el programa', lambda m: None, 'confirmada'),
        ('cambiar la ficha 3 por un 5', lambda m: m.cambiar('3', '5'), 'confirmada'),
        ('cruzar la mano sobre el literal', lambda m: m.mano('5'), 'pendiente'),
        ('retirar la mano', lambda m: m.mano(None), 'confirmada'),
        ('girar la ficha de operación 90°', lambda m: girar(m.ficha('PUSH'), 90), 'cualquiera'),
        ('devolverla a su sitio', lambda m: girar(m.ficha('PUSH'), 0), 'confirmada'),
        ('quitar una de las dos webcams', lambda m: m.quitar_camara('web2'), 'pendiente'),
    ]


def guion_dos_bloques():
    return ['PUSH a 3', 'ADD a'], None, [
        ('construir el programa', lambda m: None, 'confirmada'),
        ('cambiar la ficha 3 por un 5', lambda m: m.cambiar('3', '5'), 'confirmada'),
        ('cruzar la mano sobre el literal', lambda m: m.mano('5'), 'pendiente'),
        ('retirar la mano', lambda m: m.mano(None), 'confirmada'),
        ('girar la ficha ADD 90°', lambda m: girar(m.ficha('ADD'), 90), 'cualquiera'),
        ('devolverlo a su sitio', lambda m: girar(m.ficha('ADD'), 0), 'confirmada'),
        ('retirar el segundo bloque y esperar', lambda m: m.retirar_bloque(1), 'confirmada', 30),
        ('devolver el segundo bloque', lambda m: m.devolver(), 'confirmada', 30),
        ('quitar una cámara', lambda m: m.quitar_camara('c1'), 'confirmada'),
    ]


GUIONES = {'corto': guion_corto, 'dos_bloques': guion_dos_bloques}


def imprimir(nombre, programa, registro, lector):
    print(f"\n== {nombre}: {' · '.join(programa)} ==")
    print(f"{'acción':<36}{'espera':<11}{'estado':<11}{'lect s':>7}{'scala s':>8}  programa / motivo")
    malas = []
    for fila in registro:
        lectura, veredicto = fila['lectura'], fila['veredicto']
        detalle = ' · '.join(lectura['programa']) or '(nada)'
        if lectura['estado'] == 'pendiente':
            detalle = (lectura['motivo'] or '')[:58]
        lat = fila.get('latencia_lectura')
        sca = (veredicto or {}).get('latencia_scala')
        print(f"{fila['accion']:<36}{fila['espera']:<11}{lectura['estado']:<11}"
              f"{(f'{lat:.2f}' if lat is not None else '—'):>7}"
              f"{(f'{sca:.2f}' if sca is not None else '—'):>8}  {detalle}")
        if fila['espera'] != 'cualquiera' and lectura['estado'] != fila['espera']:
            malas.append(fila['accion'])
            print(f"{'':<36}INCUMPLE: se esperaba {fila['espera']}")
    m = lector.metricas()
    print(f"\ncapturas {m['capturas']} · versiones {m['versiones']} · "
          f"lecturas completas {m['lecturas_completas']} · capturas pendientes {m['pendientes']} · "
          f"ejecuciones de Scala {m['ejecuciones']} (capturas sin reejecutar {m['capturas_sin_reejecutar']})")
    print(f"latencia de lectura: mediana {m['lectura_mediana_s']} s · p95 {m['lectura_p95_s']} s")
    print(f"latencia de Scala:   mediana {m['scala_mediana_s']} s · p95 {m['scala_p95_s']} s")
    print(f"acciones que incumplen lo esperado: {len(malas)}" + (f" ({', '.join(malas)})" if malas else ''))
    return malas


def main():
    p = argparse.ArgumentParser(description='Ensayo del ciclo continuo: construir y modificar el montaje paso a paso. Imágenes VIRTUALES.')
    p.add_argument('--guion', choices=sorted(GUIONES) + ['todos'], default='todos')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    args = p.parse_args()
    voc = Vocabulario(RAIZ, args.datos)
    nombres = sorted(GUIONES) if args.guion == 'todos' else [args.guion]
    malas = 0
    for nombre in nombres:
        programa, camaras, acciones = GUIONES[nombre]()
        mesa, lector, registro = ensayar(voc, programa, acciones, camaras)
        malas += len(imprimir(nombre, programa, registro, lector))
    print(f'\nTotal de acciones que incumplen: {malas}')
    print('RESULTADOS VIRTUALES: imágenes rasterizadas desde los STL, no capturas de cámaras reales.')


if __name__ == '__main__':
    main()
