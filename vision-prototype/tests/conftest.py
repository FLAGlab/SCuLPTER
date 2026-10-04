import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from herramientas.preparar_gemelo import preparar

DATOS = RAIZ / 'datos_locales' / 'virtual'


def pytest_configure(config):
    if not (DATOS / 'simbolos.json').exists():
        preparar(str(DATOS))
