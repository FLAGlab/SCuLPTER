"""Esquema de anotación del conjunto de escenas físicas.

La unidad es la vista: lo que ve una cámara en una toma, anotado con lo que esa cámara ve.
Una ficha que no aparece en una vista no es evidencia de que falte. `pieza` relaciona la
misma ficha entre las vistas de una toma. Una vista cuenta como verdad cuando una persona
confirma la escena y las caras.
"""

import re
import time

VERSION = 2

ESCENAS = ('mesa_vacia', 'ficha_sola', 'cadena', 'union_te', 'ciclo', 'salto',
           'oclusion_mano', 'negativo_equipo', 'negativo_cables', 'negativo_objetos', 'libre')
NEGATIVAS = ('mesa_vacia', 'negativo_equipo', 'negativo_cables', 'negativo_objetos')
ILUMINACION = ('normal', 'tenue', 'fuerte', 'lateral', 'contraluz')
PROPOSITOS = ('medicion', 'verificacion', 'legado')
GRUPOS = ('entrenamiento', 'prueba')
SIN_LEER = '<sin leer>'
SIN_INSCRIPCION = '<sin inscripción>'
PILA_POR_CONFIRMAR = '<pila por confirmar>'
# Una cara sin inscripción no tiene nada que leer; una `<sin leer>` sí lo tiene, oculto o
# ilegible; un dibujo de pila se describe en `nota` hasta que alguien confirme qué pila es.
MARCAS = (SIN_LEER, SIN_INSCRIPCION, PILA_POR_CONFIRMAR)

ID_VALIDO = re.compile(r'^[a-z0-9][a-z0-9-]{0,63}$')


def validar_id(texto, que='identificador'):
    """Minúsculas, cifras y guiones. Sin `_`: los nombres de archivo para CVAT usan `__`."""
    if not isinstance(texto, str) or not ID_VALIDO.match(texto):
        raise ValueError(f'{que} inválido: {texto!r}. Usa minúsculas, cifras y guiones, '
                         f'por ejemplo 2026-10-11-cenital.')
    return texto


def ahora():
    return time.strftime('%Y-%m-%dT%H:%M:%S')


# Qué cuenta como cara: una superficie plana de una ficha —ficha de operación o cubo de
# parámetro— visible en la imagen, tenga o no inscripción, incluida una vista oblicua, si su lado
# corto proyectado es al menos un tercio del largo y mide 8 px o más. Cada cara de un mismo cubo
# es una cara aparte. No son caras los cuerpos de bloque, conectores, tuercas, uniones en T,
# soportes, manos, papel impreso ni los cuadros de un mantel.
PROPORCION_MINIMA_CARA = 1 / 3
LADO_MINIMO_CARA_PX = 8


def cara(caja, simbolo=SIN_LEER, pieza=None, oculta=False, nota=''):
    """Una cara visible: caja [x, y, w, h] en píxeles del cuadro original."""
    x, y, w, h = (int(round(float(v))) for v in caja)
    return {'caja': [x, y, w, h], 'simbolo': str(simbolo or SIN_LEER),
            'pieza': (str(pieza) if pieza not in (None, '', '-') else None),
            'oculta': bool(oculta), 'nota': nota}


def anotacion_nueva(sesion, toma, camara, montaje, escena):
    """Anotación vacía de una vista, sin revisar."""
    return {'version': VERSION, 'sesion': sesion, 'toma': toma, 'camara': camara,
            'montaje': montaje, 'escena': escena, 'escena_declarada': escena,
            'escena_revisada_por': '', 'caras': [], 'caras_revisadas_por': '',
            'caras_origen': '', 'completa': False, 'zona': None, 'cambios': []}


def en_zona(caja, zona):
    """¿El centro de la caja cae en la zona de evaluación? Sin zona, toda la imagen cuenta."""
    if not zona:
        return True
    x, y, w, h = caja
    zx, zy, zw, zh = zona
    return zx <= x + w / 2 <= zx + zw and zy <= y + h / 2 <= zy + zh


def revisada(anotacion):
    """Verdadera si una persona confirmó la escena y las caras."""
    return bool(anotacion.get('escena_revisada_por')) and bool(anotacion.get('caras_revisadas_por'))


def validar(anotacion):
    """Errores que harían inservible una anotación. Lista vacía si está bien."""
    fallos = []
    if anotacion.get('version') != VERSION:
        fallos.append(f'versión desconocida: {anotacion.get("version")}')
    if anotacion.get('escena') not in ESCENAS:
        fallos.append(f'escena desconocida: {anotacion.get("escena")}')
    for campo in ('sesion', 'toma', 'camara'):
        if not anotacion.get(campo):
            fallos.append(f'falta {campo}')
    for n, c in enumerate(anotacion.get('caras') or []):
        caja = c.get('caja')
        if not isinstance(caja, list) or len(caja) != 4 or any(not isinstance(v, int) for v in caja):
            fallos.append(f'cara {n}: caja inválida')
        elif caja[2] <= 0 or caja[3] <= 0:
            fallos.append(f'cara {n}: ancho o alto no positivo')
    zona = anotacion.get('zona')
    if zona is not None and (not isinstance(zona, list) or len(zona) != 4
                             or any(not isinstance(v, int) for v in zona) or zona[2] <= 0 or zona[3] <= 0):
        fallos.append('zona inválida: se espera [x, y, w, h] en píxeles')
    if zona is not None and not anotacion.get('zona_motivo'):
        fallos.append('una zona de evaluación necesita zona_motivo')
    piezas = [c.get('pieza') for c in anotacion.get('caras') or [] if c.get('pieza')]
    repetidas = sorted({p for p in piezas if piezas.count(p) > 1})
    if repetidas:
        fallos.append(f'la misma pieza aparece dos veces en una vista: {", ".join(repetidas)}')
    if anotacion.get('escena') in NEGATIVAS and anotacion.get('caras'):
        fallos.append(f'escena {anotacion["escena"]} es negativa y tiene '
                      f'{len(anotacion["caras"])} caras anotadas')
    return fallos


def conflictos_de_toma(anotaciones):
    """Desacuerdos entre vistas de una toma: escena distinta o la misma pieza
    leída distinto. Que una vista no vea una pieza no es un conflicto.
    """
    salida = []
    escenas = {a['camara']: a['escena'] for a in anotaciones if a.get('escena_revisada_por')}
    if len(set(escenas.values())) > 1:
        salida.append('escena distinta entre vistas: ' +
                      ', '.join(f'{c}={e}' for c, e in sorted(escenas.items())))
    simbolos = {}
    for a in anotaciones:
        for c in a.get('caras') or []:
            if c.get('pieza') and c.get('simbolo') not in MARCAS:
                simbolos.setdefault(c['pieza'], {})[a['camara']] = c['simbolo']
    for pieza, por_camara in sorted(simbolos.items()):
        if len(set(por_camara.values())) > 1:
            salida.append(f'pieza {pieza} leída distinto: ' +
                          ', '.join(f'{c}={s}' for c, s in sorted(por_camara.items())))
    return salida
