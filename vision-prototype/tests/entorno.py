import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from herramientas.preparar_gemelo import preparar
from plataforma.vocabulario import Vocabulario

DATOS = RAIZ / 'datos_locales' / 'virtual'
INTERPRETE = RAIZ / 'simulador_3d' / 'generado' / 'interprete.js'
SIN_SCALA = 'SCULPTER_SIN_SCALA'
_voc = None


def datos():
    """Deja el vocabulario virtual listo. Una copia limpia no depende de datos_locales/
    preexistentes: si falta, se siembra con el mismo comando que documenta el README."""
    if not (DATOS / 'simbolos.json').exists():
        preparar(str(DATOS))
    return DATOS


def vocabulario():
    global _voc
    if _voc is None:
        _voc = Vocabulario(RAIZ, datos())
    return _voc


def interprete():
    """Ruta del intérprete compilado. Si falta, se salta solo cuando se ha pedido saltarlo;
    en otro caso falla, para que una copia limpia no omita la comprobación en silencio."""
    if INTERPRETE.exists():
        return INTERPRETE
    if os.environ.get(SIN_SCALA):
        raise unittest.SkipTest(f'{SIN_SCALA} activo: comprobación con Scala omitida a propósito')
    raise AssertionError(
        'falta simulador_3d/generado/interprete.js: ejecuta `npm run build:simulator` '
        f'o pon {SIN_SCALA}=1 para omitir la comprobación con Scala a propósito')


def en_scala(codigo):
    """Pasa un programa candidato por el intérprete compilado y devuelve su veredicto."""
    guion = (
        "import {sculptEjecutar} from %s;"
        "const r = sculptEjecutar(process.argv[1] + '\\n', 2000);"
        "process.stdout.write('@@' + JSON.stringify({valido: r.valido, etapa: r.etapa, decide: r.decide,"
        "pasos: r.pasos ? r.pasos.length : 0, final: r.pasos ? r.pasos.at(-1) : null,"
        "traza: r.traza ? r.traza.length : 0}) + '@@');"
    ) % json.dumps(interprete().as_uri())
    salida = subprocess.run(['node', '--input-type=module', '-e', guion, codigo],
                            capture_output=True, text=True, timeout=180)
    partes = salida.stdout.split('@@')
    if len(partes) < 3:
        raise AssertionError(f'el intérprete no respondió: {salida.stdout[-300:]} {salida.stderr[-300:]}')
    return json.loads(partes[1])
