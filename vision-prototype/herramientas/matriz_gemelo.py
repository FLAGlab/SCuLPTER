import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from plataforma.escena_virtual import cobertura
from plataforma.fusion import puede_ejecutar
from plataforma.guiones import EXPECTATIVAS, GUIONES, RAPIDAS
from plataforma.recorrido import leido, recorrer
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTERPRETE = os.path.join(RAIZ, 'simulador_3d', 'generado', 'interprete.js')
SIN_INTERPRETE = {'etapa': 'sin interprete', 'final': None}


def en_scala(programas):
    """Un solo proceso de node para todos los programas: el arranque del intérprete y la carga
    del módulo compilado se pagan una vez, no una por escena."""
    utiles = [c for c in dict.fromkeys(programas) if c.strip()]
    vacio = {'etapa': '—', 'final': None}
    if not utiles or not os.path.isfile(INTERPRETE):
        return {c: (vacio if not c.strip() else SIN_INTERPRETE) for c in programas}
    guion = (
        "import {sculptEjecutar} from %s;"
        "const salida = JSON.parse(process.argv[1]).map(codigo => {"
        "const r = sculptEjecutar(codigo + '\\n', 2000);"
        "return {valido: r.valido, etapa: r.etapa, pasos: r.pasos ? r.pasos.length : 0,"
        "final: r.pasos ? r.pasos.at(-1) : null, traza: r.traza ? r.traza.length : 0};});"
        "process.stdout.write('@@' + JSON.stringify(salida) + '@@');"
    ) % json.dumps('file://' + INTERPRETE)
    salida = subprocess.run(['node', '--input-type=module', '-e', guion, json.dumps(utiles)],
                            capture_output=True, text=True, timeout=600)
    partes = salida.stdout.split('@@')
    if len(partes) < 3:
        return {c: {'etapa': 'sin respuesta', 'final': None} for c in programas}
    veredictos = dict(zip(utiles, json.loads(partes[1])))
    return {c: veredictos.get(c, vacio) for c in programas}


def correr(nombre, voc, pasos):
    escena, guion = GUIONES[nombre][0](voc)
    resultado, tiempos = recorrer(escena, guion, voc, pasos)
    codigo = leido(resultado)
    real = list(escena.programa)
    habilita = puede_ejecutar(resultado)
    cob = cobertura(escena.camaras[0], 20.0, 640) if escena.camaras else {}
    motivo = EXPECTATIVAS[nombre]
    return {
        'escena': nombre, 'programa_real': real, 'programa_leido': codigo,
        'camaras': len(escena.camaras),
        'posiciones': [[round(float(v)) for v in c.centro] for c in escena.camaras],
        'px_por_mm': cob.get('px_por_mm'),
        'habilita': habilita, 'correcto': codigo == real,
        'estado': resultado['estado'],
        'espera': 'reconstruir' if motivo is None else 'pendiente',
        'motivo_esperado': motivo,
        'segundos_primera': round(float(tiempos[0]), 2),
        'segundos_por_captura': round(float(np.median(tiempos)), 2),
        'hardware': resultado.get('hardware', 0), 'ilegibles': resultado.get('sin_lectura', 0),
        'avisos': resultado['avisos'][:1],
    }


def juzgar(fila):
    if fila['espera'] == 'reconstruir':
        return 'ok' if fila['habilita'] and fila['correcto'] else 'INCUMPLE'
    return 'ok' if not fila['habilita'] else 'INCUMPLE'


def main():
    p = argparse.ArgumentParser(description='Matriz del gemelo: cada escena, su configuración de cámaras, lo que se espera de ella y su veredicto.')
    p.add_argument('--pasos', type=int, default=12)
    p.add_argument('--casos', nargs='*', help='escenas concretas; por omisión, el juego rápido')
    p.add_argument('--completa', action='store_true', help='todas las escenas, incluidas las de catorce cámaras')
    p.add_argument('--json', metavar='SALIDA')
    args = p.parse_args()
    casos = args.casos or (sorted(GUIONES) if args.completa else RAPIDAS)
    desconocidas = [n for n in casos if n not in GUIONES]
    if desconocidas:
        p.error('escenas desconocidas: ' + ', '.join(desconocidas))
    voc = Vocabulario(RAIZ, os.path.join(RAIZ, 'datos_locales', 'virtual'))
    filas = [correr(n, voc, args.pasos) for n in casos]
    veredictos = en_scala(['\n'.join(f['programa_leido']) if f['habilita'] else '' for f in filas])
    for f in filas:
        f['scala'] = veredictos['\n'.join(f['programa_leido']) if f['habilita'] else '']
    print(f"{'escena':<18}{'cám':>4}{'px/mm':>7}  {'espera':<12}{'estado visual':<20}{'scala':<16}"
          f"{'1ª s':>7}{'s/capt':>8}  programa reconstruido")
    for f in filas:
        estado = 'confirma correcto' if f['habilita'] and f['correcto'] else (
            'CONFIRMA INCORRECTO' if f['habilita'] else 'pendiente')
        final = f['scala'].get('final')
        scala = f['scala'].get('etapa', '—') + (f' {final}' if final else '')
        print(f"{f['escena']:<18}{f['camaras']:>4}{f['px_por_mm'] or 0:>7.1f}  {f['espera']:<12}{estado:<20}"
              f"{scala[:15]:<16}{f['segundos_primera']:>7.2f}{f['segundos_por_captura']:>8.2f}  "
              f"{' · '.join(f['programa_leido']) or '(nada)'}")
        if juzgar(f) != 'ok':
            print(f"{'':<18}  INCUMPLE lo esperado: {f['motivo_esperado'] or 'debía reconstruir el programa entero'}")
        if not f['correcto']:
            print(f"{'':<18}  real: {' · '.join(f['programa_real'])}"
                  + (f" | {f['avisos'][0][:70]}" if f['avisos'] else ''))
    malas = [f for f in filas if f['habilita'] and not f['correcto']]
    buenas = [f for f in filas if f['habilita'] and f['correcto']]
    incumplen = [f for f in filas if juzgar(f) != 'ok']
    distintos = {tuple(f['programa_real']) for f in buenas}
    print(f"\nconfirmado correcto: {len(buenas)} · confirmado incorrecto: {len(malas)} · "
          f"pendiente: {len(filas) - len(buenas) - len(malas)}")
    print(f"escenas confirmadas: {len(buenas)} sobre {len(distintos)} programas distintos "
          f"({' / '.join(' · '.join(p) for p in sorted(distintos))})")
    print(f"expectativas incumplidas: {len(incumplen)}"
          + (' (' + ', '.join(f['escena'] for f in incumplen) + ')' if incumplen else ''))
    print('«1ª s» es la primera captura, con las cachés frías; «s/capt» la mediana del resto.')
    print('Imágenes rasterizadas desde los STL disponibles. Parámetros y conector en T son geometría provisional.')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w', encoding='utf-8') as archivo:
            json.dump(filas, archivo, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
