import argparse
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from plataforma.escena_virtual import CONFIGURACION_PASOS, cobertura, fuentes
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.guiones import GUIONES
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTERPRETE = os.path.join(RAIZ, 'simulador_3d', 'generado', 'interprete.js')
CASOS = ['una_instruccion', 'completa', 'ejecutable', 'dos_pilas', 'repetidos', 'fondo',
         'desacuerdo', 'contradiccion', 'dos_webcams', 'cobertura_parcial', 'oclusion',
         'retirada', 'retirar_una', 'reaparece', 'movimiento', 'bloque_tapa', 'fondo_dificil']


def en_scala(codigo):
    if not codigo.strip() or not os.path.isfile(INTERPRETE):
        return {'etapa': '—', 'final': None}
    guion = (
        "import {sculptEjecutar} from %s;"
        "const r = sculptEjecutar(process.argv[1] + '\\n', 2000);"
        "process.stdout.write('@@' + JSON.stringify({valido: r.valido, etapa: r.etapa,"
        "pasos: r.pasos ? r.pasos.length : 0, final: r.pasos ? r.pasos.at(-1) : null,"
        "traza: r.traza ? r.traza.length : 0}) + '@@');"
    ) % json.dumps('file://' + INTERPRETE)
    salida = subprocess.run(['node', '--input-type=module', '-e', guion, codigo],
                            capture_output=True, text=True, timeout=180)
    partes = salida.stdout.split('@@')
    return json.loads(partes[1]) if len(partes) >= 3 else {'etapa': 'sin respuesta', 'final': None}


def correr(nombre, voc, pasos):
    escena, guion = GUIONES[nombre][0](voc)
    fusion = Fusion()
    resultado, tiempos = None, []
    for paso in range(pasos):
        guion(escena, paso)
        instante = 10.0 + paso * 0.1
        inicio = time.perf_counter()
        marcos, _ = fuentes(escena, voc, instante, paso + 1)
        resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        tiempos.append(time.perf_counter() - inicio)
    codigo = [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
    real = list(escena.programa)
    habilita = puede_ejecutar(resultado)
    cob = cobertura(escena.camaras[0], 20.0, 640) if escena.camaras else {}
    veredicto = en_scala('\n'.join(codigo)) if habilita else {'etapa': '—', 'final': None}
    return {
        'escena': nombre, 'programa_real': real, 'programa_leido': codigo,
        'camaras': len(escena.camaras),
        'posiciones': [[round(float(v)) for v in c.centro] for c in escena.camaras],
        'px_por_mm': cob.get('px_por_mm'),
        'habilita': habilita, 'correcto': codigo == real,
        'estado': resultado['estado'],
        'scala': veredicto,
        'segundos_por_captura': round(float(np.median(tiempos)), 2),
        'hardware': resultado.get('hardware', 0), 'ilegibles': resultado.get('sin_lectura', 0),
        'avisos': resultado['avisos'][:1],
    }


def main():
    p = argparse.ArgumentParser(description='Matriz del gemelo: cada programa, su configuración de cámaras y su veredicto.')
    p.add_argument('--pasos', type=int, default=12)
    p.add_argument('--casos', nargs='*', default=CASOS)
    p.add_argument('--json', metavar='SALIDA')
    args = p.parse_args()
    voc = Vocabulario(RAIZ, os.path.join(RAIZ, 'datos_locales', 'virtual'))
    filas = [correr(n, voc, args.pasos) for n in args.casos]
    print(f"{'escena':<18}{'cám':>4}{'px/mm':>7}  {'estado visual':<16}{'scala':<10}{'s/captura':>10}  programa reconstruido")
    for f in filas:
        estado = 'confirma correcto' if f['habilita'] and f['correcto'] else (
            'CONFIRMA INCORRECTO' if f['habilita'] else 'pendiente')
        final = f['scala'].get('final')
        scala = f['scala'].get('etapa', '—') + (f' {final}' if final else '')
        print(f"{f['escena']:<18}{f['camaras']:>4}{f['px_por_mm'] or 0:>7.1f}  {estado:<16}{scala:<10}"
              f"{f['segundos_por_captura']:>10.2f}  {' · '.join(f['programa_leido']) or '(nada)'}")
        if not f['correcto']:
            print(f"{'':<18}{'':>4}{'':>7}  real: {' · '.join(f['programa_real'])}"
                  + (f" | {f['avisos'][0][:60]}" if f['avisos'] else ''))
    malas = sum(1 for f in filas if f['habilita'] and not f['correcto'])
    print(f"\nconfirmado correcto: {sum(1 for f in filas if f['habilita'] and f['correcto'])} · "
          f"confirmado incorrecto: {malas} · pendiente: {sum(1 for f in filas if not f['habilita'])}")
    print('Imágenes rasterizadas desde los STL disponibles. Parámetros y conector en T son geometría provisional.')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w', encoding='utf-8') as archivo:
            json.dump(filas, archivo, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
