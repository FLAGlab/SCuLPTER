"""Mide la localización y la lectura de caras contra las anotaciones, por grupo y sesión.

Cada vista con profundidad se evalúa con la referencia de mesa de su sesión y su cámara; una
vista RGB, con la ruta sin profundidad (`--ruta-rgb contornos` usa la ruta actual de las
webcams, para compararlas). Solo cuentan las vistas revisadas por una persona; `--borradores`
mide además los borradores en un apartado propio.

Si una anotación registra una zona de evaluación, se aplica igual a las caras anotadas y a los
candidatos. Precisión y recuperación solo se dan cuando todas las vistas del grupo están
anotadas por completo; si no, un candidato sin correspondencia puede ser una cara sin anotar.

    python3 herramientas/evaluar_localizacion.py
    python3 herramientas/evaluar_localizacion.py --borradores --guardar-vistas
"""

import argparse
import sys
import unicodedata
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from clasificador_simbolos import SIN_LEER, aceptar_candidatos
from plataforma import dataset
from plataforma.localizacion import localizar, localizar_rgb
from plataforma.sesiones import Dataset
from plataforma.vocabulario import Vocabulario
from reconstruir import analizar, reducir_resolucion

RAIZ = Path(__file__).resolve().parents[1]
POR_OMISION = RAIZ / 'datos_locales' / 'dataset'
UMBRALES = (0.25, 0.50)
CATEGORIAS = ('simbolo', dataset.SIN_LEER, dataset.PILA_POR_CONFIRMAR, dataset.SIN_INSCRIPCION)


def iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x0, y0 = max(ax, bx), max(ay, by)
    x1, y1 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    if x1 <= x0 or y1 <= y0:
        return 0.0
    corte = (x1 - x0) * (y1 - y0)
    return corte / float(aw * ah + bw * bh - corte)


def emparejar(caras, candidatos, minimo):
    """Pares uno a uno (cara, candidato) con IoU >= minimo.

    Se recorren todos los pares de mayor a menor solape y el empate se decide por las
    coordenadas, así que el resultado no depende del orden de las listas.
    """
    pares = sorted(((iou(c['caja'], k['caja']), tuple(c['caja']), tuple(k['caja']), n, m)
                    for n, c in enumerate(caras) for m, k in enumerate(candidatos)),
                   key=lambda p: (-p[0], p[1], p[2]))
    caras_usadas, candidatos_usados, salida = set(), set(), {}
    for valor, _, _, n, m in pares:
        if valor < minimo:
            break
        if n in caras_usadas or m in candidatos_usados:
            continue
        caras_usadas.add(n)
        candidatos_usados.add(m)
        salida[n] = m
    return salida


def categoria(simbolo):
    return simbolo if simbolo in dataset.MARCAS else 'simbolo'


def leer(color, caja, vocabulario):
    x, y, w, h = (int(v) for v in caja)
    recorte = color[max(0, y):y + h, max(0, x):x + w]
    if recorte.size == 0 or vocabulario is None:
        return SIN_LEER
    return aceptar_candidatos(vocabulario.puntuar(recorte)) or SIN_LEER


def lectura(anotado, leido, con_referencia):
    if categoria(anotado) != 'simbolo':
        return 'lectura falsa' if leido != SIN_LEER else 'no leída, correcto'
    if anotado not in con_referencia:
        return 'sin referencia'
    if leido == SIN_LEER:
        return 'no leída'
    return 'correcta' if leido == anotado else 'incorrecta'


def candidatos_por_contornos(color):
    imagen = reducir_resolucion(color)
    sx, sy = color.shape[1] / imagen.shape[1], color.shape[0] / imagen.shape[0]
    halladas, _ = analizar(imagen)
    return [{'caja': [int(round((x - r.shape[1] / 2) * sx)), int(round((y - r.shape[0] / 2) * sy)),
                      int(round(r.shape[1] * sx)), int(round(r.shape[0] * sy))]} for r, x, y in halladas[:80]]


def _texto(t):
    return unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()


def pintar(destino, color, caras, candidatos, parejas, leidos, zona):
    vista = color.copy()
    if zona:
        x, y, w, h = zona
        cv2.rectangle(vista, (x, y), (x + w, y + h), (255, 0, 0), 2)
    emparejados = set(parejas.values())
    for m, c in enumerate(candidatos):
        x, y, w, h = c['caja']
        cv2.rectangle(vista, (x, y), (x + w, y + h), (0, 199, 255) if m in emparejados else (150, 150, 150), 1)
    for n, cara in enumerate(caras):
        x, y, w, h = cara['caja']
        hallada = n in parejas
        tono = (0, 190, 0) if hallada else (0, 0, 255)
        cv2.rectangle(vista, (x, y), (x + w, y + h), tono, 2)
        texto = _texto(cara['simbolo'] + (f' > {leidos.get(n, "")}' if hallada else ' (omitida)'))
        for grosor, t in ((3, (0, 0, 0)), (1, tono)):
            cv2.putText(vista, texto, (x, max(12, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, .42, t, grosor, cv2.LINE_AA)
    destino.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(destino), vista)


def evaluar_vista(ds, sesion, toma, camara, vocabulario=None, con_referencia=(), guardar_vista=False,
                  borradores=False, ruta_rgb='nueva'):
    """Resultado de una vista, o el motivo por el que no se pudo medir."""
    s = ds.sesion(sesion)
    a = s.anotacion(toma, camara)
    borrador = not dataset.revisada(a) and a.get('caras_origen') == 'borrador' and bool(a['caras'])
    fila = {'sesion': sesion, 'toma': toma, 'camara': camara, 'escena': a['escena'],
            'negativa': a['escena'] in dataset.NEGATIVAS, 'borrador': borrador,
            'completa': bool(a.get('completa')), 'zona': a.get('zona'),
            'precargada': bool(a.get('caras_precargadas_del_detector')), 'motivo': ''}
    if not dataset.revisada(a) and not (borradores and borrador):
        return {**fila, 'motivo': 'sin revisar'}
    color, profundidad, meta = s.cargar_vista(toma, camara)
    if profundidad is None:
        if ruta_rgb == 'contornos':
            candidatos, fila['ruta'] = candidatos_por_contornos(color), 'rgb-contornos'
        else:
            candidatos, fila['ruta'] = localizar_rgb(color)[0], 'rgb'
    else:
        mesa = s.mesa(camara)
        if mesa is None:
            return {**fila, 'motivo': f'la cámara {camara} no tiene referencia de mesa en {sesion}'}
        candidatos, _, _ = localizar(color, profundidad, meta.get('intrinsecos'), mesa=mesa)
        fila['ruta'] = 'profundidad'
    zona = a.get('zona')
    caras = [c for c in a['caras'] if dataset.en_zona(c['caja'], zona)]
    candidatos = [c for c in candidatos if dataset.en_zona(c['caja'], zona)]
    parejas = {u: emparejar(caras, candidatos, u) for u in UMBRALES}
    leidos_anotada = {n: leer(color, c['caja'], vocabulario) for n, c in enumerate(caras)}
    leidos_detector = {n: leer(color, candidatos[m]['caja'], vocabulario) for n, m in parejas[0.5].items()}
    detalle = []
    for n, c in enumerate(caras):
        detalle.append({'categoria': categoria(c['simbolo']), 'simbolo': c['simbolo'],
                        'hallada': n in parejas[0.25], 'hallada_50': n in parejas[0.5],
                        'lectura_anotada': lectura(c['simbolo'], leidos_anotada[n], con_referencia),
                        'leido_anotada': leidos_anotada[n],
                        'lectura_detector': (lectura(c['simbolo'], leidos_detector[n], con_referencia)
                                             if n in leidos_detector else None),
                        'leido_detector': leidos_detector.get(n)})
    if guardar_vista:
        pintar(ds.raiz / 'derivados' / 'evaluacion' / fila['ruta'] / sesion / f'{toma}__{camara}.jpg',
               color, caras, candidatos, parejas[0.25], leidos_detector, zona)
    propias = sum(1 for e in getattr(vocabulario, 'propios', [])
                  if (e.get('procedencia') or {}).get('sesion') == sesion)
    return {**fila, 'caras': detalle, 'candidatos': len(candidatos), 'referencias_propias': propias,
            'sin_pareja': {u: len(candidatos) - len(p) for u, p in parejas.items()}}


def _resumen_lectura(caras, clave):
    cuenta = {}
    for c in caras:
        if c[clave]:
            cuenta[c[clave]] = cuenta.get(c[clave], 0) + 1
    return cuenta


def informe(filas, titulo, aviso=''):
    print(f'\n== {titulo} ==')
    if aviso:
        print(f'   {aviso}')
    medidas = [f for f in filas if not f['motivo']]
    motivos = {}
    for f in filas:
        if f['motivo']:
            motivos[f['motivo']] = motivos.get(f['motivo'], 0) + 1
    for motivo, n in sorted(motivos.items()):
        print(f'   {n} vistas no medidas: {motivo}')
    if not medidas:
        print('   ninguna vista medida')
        return
    for f in medidas:
        zona = f' zona {f["zona"]}' if f['zona'] else ''
        print(f"   {f['sesion']}/{f['toma']} [{f['ruta']}] caras {sum(c['hallada'] for c in f['caras'])}/"
              f"{len(f['caras'])} (IoU .25)  {sum(c['hallada_50'] for c in f['caras'])}/{len(f['caras'])}"
              f" (IoU .50)  candidatos {f['candidatos']}{zona}"
              + ('' if f['completa'] else '  [anotación incompleta]'))
    caras = [c for f in medidas if not f['precargada'] for c in f['caras']]
    completas = all(f['completa'] for f in medidas)
    for umbral, clave in ((0.25, 'hallada'), (0.50, 'hallada_50')):
        print(f'   -- IoU >= {umbral:.2f} --')
        for cat in CATEGORIAS:
            grupo = [c for c in caras if c['categoria'] == cat]
            if grupo:
                h = sum(c[clave] for c in grupo)
                nombre = 'con símbolo identificado' if cat == 'simbolo' else cat
                print(f'     {nombre:<26} {h:>3}/{len(grupo):<3} localizadas')
        h = sum(c[clave] for c in caras)
        sin_pareja = sum(f['sin_pareja'][umbral] for f in medidas)
        total_cand = sum(f['candidatos'] for f in medidas)
        print(f'     {"total":<26} {h:>3}/{len(caras):<3} localizadas, {len(caras) - h} omitidas')
        print(f'     candidatos sin correspondencia: {sin_pareja} de {total_cand}')
        if completas and caras and total_cand:
            print(f'     recuperación {h / len(caras):.2f}   precisión {(total_cand - sin_pareja) / total_cand:.2f}')
        else:
            print('     precisión no calculable: hay vistas con anotación incompleta')
    propias = [f for f in medidas if f['referencias_propias']]
    if propias:
        print(f'   AVISO: {len(propias)} vistas se leen con referencias sacadas de su misma sesión; '
              'esa lectura no es independiente')
    for clave, titulo_l in (('lectura_anotada', 'con las cajas anotadas (solo la etapa de lectura)'),
                            ('lectura_detector', 'con las cajas del detector emparejadas a IoU .50')):
        cuenta = _resumen_lectura(caras, clave)
        print(f'   lectura {titulo_l}:')
        for k in ('correcta', 'incorrecta', 'no leída', 'sin referencia', 'lectura falsa', 'no leída, correcto'):
            if k in cuenta:
                print(f'     {k:<22} {cuenta[k]}')
        errores = sorted({(c['simbolo'], c[clave.replace('lectura', 'leido')]) for c in caras
                          if c[clave] in ('incorrecta', 'lectura falsa')})
        if errores:
            print('     confusiones: ' + ', '.join(f'{x} leído como {y}' for x, y in errores))


def referencias(vocabulario):
    """Cuántas referencias hay de cada símbolo y de qué origen."""
    salida = {}
    for s in vocabulario.listar():
        for r in s.get('referencias') or []:
            origen = r.get('origen') or 'desconocido'
            salida.setdefault(s['lexema'], {}).setdefault(origen, 0)
            salida[s['lexema']][origen] += 1
    return salida


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--raiz', default=str(POR_OMISION))
    parser.add_argument('--vocabulario', default=str(RAIZ / 'datos_locales'))
    parser.add_argument('--incluir-fuera', action='store_true',
                        help='Muestra también verificación, legado y sesiones sin asignar')
    parser.add_argument('--borradores', action='store_true',
                        help='Mide también los borradores sin revisar, en un apartado propio')
    parser.add_argument('--ruta-rgb', choices=('nueva', 'contornos'), default='nueva',
                        help='Ruta para vistas sin profundidad: la nueva o la actual de las webcams')
    parser.add_argument('--sesion', action='append', help='Limita a estas sesiones')
    parser.add_argument('--guardar-vistas', action='store_true')
    args = parser.parse_args()
    ds = Dataset(args.raiz)
    if not ds.sesiones():
        parser.error(f'No hay sesiones en {ds.raiz}')
    vocabulario = Vocabulario(RAIZ, Path(args.vocabulario))
    disponibles = referencias(vocabulario)
    con_referencia = set(disponibles)

    revisadas, borradores = {}, {}
    for sesion, toma, camara in ds.vistas():
        if args.sesion and sesion not in args.sesion:
            continue
        fila = evaluar_vista(ds, sesion, toma, camara, vocabulario, con_referencia,
                             args.guardar_vistas, args.borradores, args.ruta_rgb)
        destino = borradores if fila['borrador'] else revisadas
        destino.setdefault(ds.grupo(sesion), []).append(fila)

    for grupo in ('prueba', 'entrenamiento'):
        informe(revisadas.get(grupo, []), grupo.upper())
    if args.borradores:
        for grupo in ('prueba', 'entrenamiento'):
            informe(borradores.get(grupo, []), f'BORRADOR · {grupo.upper()}',
                    'anotaciones sin revisar por una persona: exploratorio, no es una evaluación validada')
    if args.incluir_fuera:
        informe(revisadas.get('sin_asignar', []), 'SIN ASIGNAR', 'no cuentan hasta repartirlas')
        informe(revisadas.get('fuera', []), 'FUERA DEL REPARTO',
                'verificación o legado: comprueban el recorrido, no miden el detector')
    origenes = {}
    for por_origen in disponibles.values():
        for origen, n in por_origen.items():
            origenes[origen] = origenes.get(origen, 0) + n
    print(f'\nReferencias disponibles: {len(disponibles)} símbolos, '
          + ', '.join(f'{n} de origen {o}' for o, n in sorted(origenes.items())) + '.')
    sin = sorted({c['simbolo'] for filas in list(revisadas.values()) + list(borradores.values())
                  for f in filas if not f['motivo'] for c in f['caras']
                  if c['categoria'] == 'simbolo' and c['simbolo'] not in con_referencia})
    if sin:
        print('Símbolos anotados sin ninguna referencia: ' + ', '.join(sin))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
