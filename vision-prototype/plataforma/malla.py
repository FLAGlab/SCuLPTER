import struct
from pathlib import Path

import numpy as np

MODELOS = Path(__file__).resolve().parents[1] / 'simulador_3d' / 'modelos'
LARGO_CONECTOR_MM = 42.5
LADO_OPERACION_MM = 20.0
FICHAS_LAMINA = {'POP': (0, -22), 'MOV': (25, 25), 'DUP': (0, 60), 'JMP': (0, 30),
                 'CMP': (25, 0), '?': (30, -25), 'MOD': (30, -50), 'MUL': (0, -69),
                 'ADD': (24, -75), 'SUB': (0, -45), 'NEG': (0, -95), 'DIV': (25, -100)}
MEDIA_VUELTA = {'MOV', 'JMP', 'NEG'}
_cache = {}


def leer_stl(ruta):
    datos = Path(ruta).read_bytes()
    if len(datos) < 84:
        raise ValueError(f'{ruta} no es un STL binario.')
    cuantos = struct.unpack('<I', datos[80:84])[0]
    if 84 + cuantos * 50 != len(datos):
        raise ValueError(f'{ruta} no es un STL binario de {cuantos} triángulos.')
    bruto = np.frombuffer(datos, dtype=np.uint8, count=cuantos * 50, offset=84).reshape(cuantos, 50)
    return bruto[:, 12:48].copy().view('<f4').reshape(cuantos, 3, 3).astype(np.float64)


def cargar(nombre):
    if nombre not in _cache:
        _cache[nombre] = leer_stl(MODELOS / f'{nombre}.stl')
    return _cache[nombre]


def transformar(triangulos, filas):
    m = np.asarray(filas, float)
    return triangulos @ m[:, :3].T + m[:, 3]


def girar_z(triangulos, radianes):
    c, s = np.cos(radianes), np.sin(radianes)
    return transformar(triangulos, [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0]])


def simplificar(triangulos, rejilla):
    if rejilla <= 0 or not len(triangulos):
        return triangulos
    ajustados = np.round(triangulos / rejilla) * rejilla
    a, b, c = ajustados[:, 0], ajustados[:, 1], ajustados[:, 2]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1)
    vivos = ajustados[area > 1e-9]
    if not len(vivos):
        return triangulos
    _, unicos = np.unique(vivos.reshape(len(vivos), 9), axis=0, return_index=True)
    return vivos[np.sort(unicos)]


def bloque(capacidad, rejilla=1.0):
    clave = ('bloque', 1 if capacidad == 1 else 2, rejilla)
    if clave not in _cache:
        corrimiento = 50.0 if clave[1] == 2 else 30.0
        crudo = transformar(cargar(f'bloque_{clave[1]}_param'),
                            [[0, 0, -1, corrimiento], [0, -1, 0, 25], [-1, 0, 0, 10]])
        _cache[clave] = simplificar(crudo, rejilla)
    return _cache[clave]


def _lamina_operaciones():
    if 'operaciones' in _cache:
        return _cache['operaciones']
    lamina = cargar('parametro')
    salida = {}
    for token, (x, y) in FICHAS_LAMINA.items():
        dentro = np.all((lamina[:, :, 0] >= x - .001) & (lamina[:, :, 0] <= x + 20.001)
                        & (lamina[:, :, 1] >= y - .001) & (lamina[:, :, 1] <= y + 20.001), axis=1)
        piezas = lamina[dentro]
        if not len(piezas):
            raise ValueError(f'No se encontró la ficha {token} en parametro.stl')
        hundido = np.all(piezas[:, :, 2] >= 3.999, axis=1) & np.any(piezas[:, :, 2] < 4.999, axis=1)
        movida = piezas - np.array([x + 10.0, y + 10.0, 0.0])
        cuerpo, grabado = movida[~hundido], movida[hundido]
        if not len(cuerpo) or not len(grabado):
            raise ValueError(f'La ficha {token} no tiene cuerpo y grabado separables.')
        if token in MEDIA_VUELTA:
            cuerpo, grabado = girar_z(cuerpo, np.pi), girar_z(grabado, np.pi)
        salida[token] = (cuerpo, grabado)
    salida['PUSH'] = (girar_z(salida['POP'][0], np.pi), girar_z(salida['POP'][1], np.pi))
    _cache['operaciones'] = salida
    return salida


def operacion(token, rejilla=1.2, rejilla_grabado=0.3):
    clave = ('op', token, rejilla, rejilla_grabado)
    if clave not in _cache:
        if token not in _lamina_operaciones():
            return None
        cuerpo, grabado = _lamina_operaciones()[token]
        _cache[clave] = (simplificar(cuerpo, rejilla), simplificar(grabado, rejilla_grabado))
    return _cache[clave]


def conector(rejilla=0.8):
    if ('conector', rejilla) not in _cache:
        lamina = cargar('conector')
        vastago = lamina[np.all((lamina[:, :, 0] >= -8) & (lamina[:, :, 1] >= -.5), axis=1)]
        if not len(vastago):
            raise ValueError('No se encontró el vástago en conector.stl')
        puesto = transformar(vastago, [[0, 1, 0, -LARGO_CONECTOR_MM / 2], [0, 0, 1, -6.1], [1, 0, 0, 0]])
        _cache[('conector', rejilla)] = simplificar(puesto, rejilla)
    return _cache[('conector', rejilla)]


def cuna(rejilla=1.0):
    if ('cuna', rejilla) not in _cache:
        puesto = transformar(cargar('cuna'), [[0, 0, 1, 1.25], [0, 1, 0, -10], [-1, 0, 0, 6.5]])
        _cache[('cuna', rejilla)] = simplificar(puesto, rejilla)
    return _cache[('cuna', rejilla)]


def tuerca(rejilla=1.0):
    if ('tuerca', rejilla) not in _cache:
        puesto = transformar(cargar('tuerca'), [[0, 0, 1, -23.75], [1, 0, 0, 36], [0, 1, 0, 0]])
        _cache[('tuerca', rejilla)] = simplificar(puesto, rejilla)
    return _cache[('tuerca', rejilla)]
