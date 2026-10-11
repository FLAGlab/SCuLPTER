"""Gestiona el conjunto de escenas físicas: sesiones, cámaras, revisión, CVAT, índice y reparto.

    python3 herramientas/dataset_fisico.py sesion-crear 2026-10-11-cenital --angulo cenital --distancia-mm 400
    python3 herramientas/dataset_fisico.py camara 2026-10-11-cenital rs0 --del-servicio D435i
    python3 herramientas/dataset_fisico.py activar 2026-10-11-cenital
    python3 herramientas/dataset_fisico.py estado

    python3 herramientas/dataset_fisico.py cvat-exportar lote-01 --sesion 2026-10-11-cenital
    python3 herramientas/dataset_fisico.py cvat-importar export.zip --lote lote-01 --revisor carla
    python3 herramientas/dataset_fisico.py revisar 2026-10-11-cenital t20261011-101530 rs0 \\
        --escena cadena --revisor carla
    python3 herramientas/dataset_fisico.py indexar
    python3 herramientas/dataset_fisico.py repartir --prueba 2026-10-11-cenital
    python3 herramientas/dataset_fisico.py referencias --lexema PUSH --lexema 3 --guardar

La captura y la referencia de mesa están en `guardar_muestra.py` y `referencia_mesa.py`.
Una vista cuenta como verdad cuando se revisan la escena (`revisar`) y las caras
(`cvat-importar`, o `revisar --sin-caras` en escenas negativas).
"""

import argparse
import base64
import csv
import json
import re
import shutil
import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plataforma import cvat, dataset
from plataforma.sesiones import Dataset, huella
from plataforma.vocabulario import OPERACIONES, Vocabulario

RAIZ = Path(__file__).resolve().parents[1]
POR_OMISION = RAIZ / 'datos_locales' / 'dataset'


def sesion_crear(ds, args):
    s = ds.crear_sesion(args.sesion, args.proposito, args.nota, args.angulo, args.distancia_mm)
    print(f'Sesión {s.id} creada ({s.proposito}).')
    print(f'Siguiente: añade cada cámara con  camara {s.id} <id> --del-servicio <nombre>')


def camara(ds, args):
    s = ds.sesion(args.sesion)
    tipo, fuente, nota = args.tipo, args.fuente, args.nota
    if args.del_servicio:
        montaje = RAIZ / 'datos_locales' / 'montaje.json' if args.montaje is None else Path(args.montaje)
        if not montaje.is_file():
            raise SystemExit(f'No encuentro la configuración del servicio en {montaje}')
        candidatas = [c for c in json.loads(montaje.read_text()).get('camaras', [])
                      if args.del_servicio in (c.get('nombre'), c.get('id'))]
        if len(candidatas) != 1:
            raise SystemExit(f'{args.del_servicio!r} casa con {len(candidatas)} cámaras del servicio')
        tipo, fuente = candidatas[0]['tipo'], candidatas[0].get('fuente', '')
        nota = nota or f'copiada del servicio: {candidatas[0].get("nombre", "")}'
    if not tipo:
        raise SystemExit('Indica --tipo o --del-servicio')
    s.agregar_camara(args.camara, tipo, fuente, args.rol,
                     False if args.sin_profundidad else None, nota)
    print(f'Cámara {args.camara} ({tipo}, fuente {fuente!r}) añadida a {s.id}.')
    print(f'Siguiente: su referencia de mesa, con la mesa despejada:')
    print(f'  python3 herramientas/referencia_mesa.py --tomar --sesion {s.id} --camara {args.camara}')


def activar(ds, args):
    sesion = None if args.ninguna else args.sesion
    if sesion is None and not args.ninguna:
        raise SystemExit('Indica la sesión o --ninguna')
    ds.activar(sesion)
    print(f'Sesión activa: {sesion or "(ninguna)"}')
    print('El servicio la carga al arrancar, o con POST /api/camaras/activar_sesion.')


def estado(ds, args):
    activa = ds.activa()
    sesiones = ds.sesiones()
    if not sesiones:
        print(f'No hay sesiones en {ds.raiz}. Empieza con  sesion-crear <id>')
        return
    for sid in sesiones:
        s = ds.sesion(sid)
        marca = '  <- activa' if sid == activa else ''
        print(f'\n{sid}  [{s.proposito}, {ds.grupo(sid)}]{marca}')
        for cid, c in s.camaras().items():
            mesa = 'con referencia de mesa' if s.mesa(cid) else 'SIN referencia de mesa'
            print(f'  cámara {cid}: {c["tipo"]} fuente={c.get("fuente", "")!r} '
                  f'profundidad={"sí" if c.get("profundidad") else "no"} · {mesa}')
        tomas = s.tomas()
        vistas = [(t, c) for t in tomas for c in s.vistas(t)]
        revisadas = sum(1 for t, c in vistas if dataset.revisada(s.anotacion(t, c)))
        print(f'  {len(tomas)} tomas, {len(vistas)} vistas, {revisadas} revisadas')
        for t in tomas:
            datos = s.toma(t)
            conflictos = dataset.conflictos_de_toma([s.anotacion(t, c) for c in s.vistas(t)])
            for c in s.vistas(t):
                a = s.anotacion(t, c)
                falta = []
                if not a.get('escena_revisada_por'):
                    falta.append('escena')
                if not a.get('caras_revisadas_por'):
                    falta.append('caras')
                print(f'    {t}/{c}  {datos.get("montaje") or "-":<14}{a["escena"]:<18}'
                      f'{len(a["caras"]):>2} caras  '
                      f'{"revisada" if not falta else "falta: " + ", ".join(falta)}')
            for conflicto in conflictos:
                print(f'    CONFLICTO en {t}: {conflicto}')


def importar_legado(ds, args):
    """Copia muestras del formato plano anterior como tomas; los originales no cambian."""
    from herramientas.guardar_muestra import cargar_plano
    s = ds.sesion(args.sesion)
    for ruta in args.muestras:
        color, profundidad, meta = cargar_plano(ruta)
        declarada = meta.get('etiqueta', 'libre')
        escena = declarada if declarada in dataset.ESCENAS else 'libre'
        toma = s.nueva_toma(args.montaje or 'legado', escena,
                            nota=f'importada de {Path(ruta).name}; etiqueta declarada {declarada!r}')
        info = s.guardar_vista(toma, args.camara, color, profundidad,
                               {'intrinsecos': meta.get('intrinsecos'), 'origen': str(ruta),
                                'etiqueta_declarada_original': declarada})
        print(f'  {Path(ruta).name} -> {toma}/{args.camara}  ({info["resolucion"][0]}x'
              f'{info["resolucion"][1]}, sin revisar)')


def importar_fotos(ds, args):
    """Importa las fotografías clasificadas como `foto`; los originales no cambian.

    Son imágenes RGB externas: la vista no lleva profundidad ni intrínsecos, y la cámara de la
    sesión es de tipo `archivo`. Se guarda además una copia exacta del archivo original.
    """
    carpeta = Path(args.carpeta)
    with open(args.clasificacion, encoding='utf-8') as f:
        filas = [r for r in csv.DictReader(f) if r['clase'] == 'foto']
    vistas_previas, nuevas, repetidas = {}, 0, 0
    for fila in filas:
        origen = carpeta / fila['archivo']
        sello = huella(origen)
        sid = fila['sesion']
        if sid not in ds.sesiones():
            ds.crear_sesion(sid, 'medicion', nota=args.nota)
        s = ds.sesion(sid)
        if 'foto' not in s.camaras():
            s.agregar_camara('foto', 'archivo', fuente=args.procedencia, rol='simbolos',
                             profundidad=False, nota='cámara desconocida; fotografía externa RGB')
        if sid not in vistas_previas:
            vistas_previas[sid] = {json.loads(Path(str(s.ruta_vista(t, c)) + '.json').read_text())
                                   .get('original_sha256') for t in s.tomas() for c in s.vistas(t)}
        if sello in vistas_previas[sid]:
            repetidas += 1
            continue
        color = cv2.imread(str(origen), cv2.IMREAD_COLOR)
        if color is None:
            raise SystemExit(f'No se pudo leer {origen}')
        fecha = re.search(r'img_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})', fila['archivo'])
        toma = s.nueva_toma(fila['montaje'], fila['escena'], {'plano': fila['plano']}, fila['motivo'])
        s.guardar_vista(toma, 'foto', color, None, {
            'intrinsecos': None, 'procedencia': args.procedencia, 'archivo_original': fila['archivo'],
            'ruta_original': str(origen), 'original_sha256': sello,
            'fecha_segun_nombre': '{}-{}-{}T{}:{}:{}'.format(*fecha.groups()) if fecha else None,
            'personas_visibles': fila['personas'] == 'si', 'lote_sugerido': fila['lote'] == 'si',
            'numero_en_carpeta': int(fila['n'])})
        shutil.copy2(origen, s.raiz / 'tomas' / toma / f'foto.original{origen.suffix.lower()}')
        vistas_previas[sid].add(sello)
        nuevas += 1
    print(f'{nuevas} fotografías importadas, {repetidas} ya estaban.')


def revisar(ds, args):
    s = ds.sesion(args.sesion)
    a = s.anotacion(args.toma, args.camara)
    cambios = []
    if args.escena:
        a['escena'] = args.escena
        cambios.append(f'escena={args.escena}')
    a['escena_revisada_por'] = args.revisor
    if args.sin_caras:
        if a['escena'] not in dataset.NEGATIVAS:
            raise SystemExit(f'--sin-caras es para escenas negativas, y esta es {a["escena"]}')
        a['caras'], a['caras_revisadas_por'], a['caras_origen'] = [], args.revisor, 'cli'
        cambios.append('sin caras')
    if args.completa:
        a['completa'] = True
        cambios.append('completa')
    if args.zona:
        a['zona'], a['zona_motivo'] = args.zona, args.zona_motivo
        cambios.append(f'zona={args.zona}')
    if args.nota:
        a['nota_revision'] = args.nota
    a = s.guardar_anotacion(args.toma, args.camara, a, args.revisor, 'cli',
                            ', '.join(cambios) or 'escena confirmada')
    estado_final = 'revisada' if dataset.revisada(a) else 'faltan las caras (impórtalas de CVAT)'
    print(f'{args.sesion}/{args.toma}/{args.camara}: escena {a["escena"]} confirmada · {estado_final}')


def cvat_exportar(ds, args):
    sesiones = args.sesion or ds.sesiones()
    vistas = []
    for pedida in args.vista or []:
        partes = pedida.split('/')
        if len(partes) not in (2, 3):
            raise SystemExit(f'--vista {pedida}: se espera sesion/toma o sesion/toma/camara')
        s = ds.sesion(partes[0])
        camaras = partes[2:] or s.vistas(partes[1])
        vistas += [(partes[0], partes[1], c) for c in camaras]
    for sid in ([] if args.vista else sesiones):
        s = ds.sesion(sid)
        for t in s.tomas():
            if args.toma and t not in args.toma:
                continue
            for c in s.vistas(t):
                a = s.anotacion(t, c)
                if args.solo_sin_caras and a.get('caras_revisadas_por'):
                    continue
                vistas.append((sid, t, c))
    if not vistas:
        raise SystemExit('No hay vistas que exportar con esos filtros')
    destino = ds.raiz / 'cvat' / dataset.validar_id(args.lote, 'lote')
    cvat.exportar(ds, vistas, destino, precargar='borrador' if args.precargar_borrador
                  else ('detector' if args.precargar else ''))
    print(f'Lote {args.lote}: {len(vistas)} imágenes en {destino / "imagenes"}')
    print('\nEn CVAT:')
    print('  1. Crear tarea. En «Labels», pestaña Raw, pega el contenido de')
    print(f'     {destino / "cvat_etiquetas.json"}')
    print(f'  2. Sube las imágenes de {destino / "imagenes"}')
    paso = 3
    if args.precargar or args.precargar_borrador:
        print(f'  3. Upload annotations, formato COCO 1.0: {destino / "anotaciones_previas.json"}')
        if args.precargar:
            print('     AVISO: precargar con el detector sesga la medida del detector.')
        else:
            print('     Son borradores: corrígelos, borra lo que no sea una cara y añade las que falten.')
        paso = 4
    print(f'  {paso}. Una caja «cara» por cada cara que cumpla el criterio (docs/DATASET_FISICO.md).')
    print('     simbolo: lo que lees; <sin leer> si tampoco tú lo lees. pieza: el mismo nombre')
    print('     (p1, p2…) para la misma ficha en distintas cámaras. occluded si está tapada en parte.')
    print(f'  {paso + 1}. Export task dataset, formato COCO 1.0, y luego:')
    print(f'     python3 herramientas/dataset_fisico.py cvat-importar <zip> --lote {args.lote} --revisor <tú>')
    print(f'  {paso + 2}. Por cada vista: dataset_fisico.py revisar <sesion> <toma> <camara> --revisor <tú>')
    print('     y --completa si anotaste todas las caras, o --zona X Y ANCHO ALTO --zona-motivo "…".')


def cvat_importar(ds, args):
    lote = ds.raiz / 'cvat' / dataset.validar_id(args.lote, 'lote') / 'lote.json'
    manifiesto = json.loads(lote.read_text()) if lote.is_file() else None
    if manifiesto is None and not args.sin_lote:
        raise SystemExit(f'No encuentro {lote}. Sin el manifiesto no se comprueba que las '
                         'imágenes sean las exportadas; usa --sin-lote solo si lo perdiste.')
    coco = cvat.leer_coco(args.archivo)
    if args.solo:
        nombres = {Path(str(i['file_name']).replace('\\', '/')).name: i['id'] for i in coco.get('images', [])}
        faltan = sorted(set(args.solo) - set(nombres))
        if faltan:
            raise SystemExit(f'No están en el zip: {", ".join(faltan)}')
        ids = {nombres[n] for n in args.solo}
        coco = {**coco, 'images': [i for i in coco['images'] if i['id'] in ids],
                'annotations': [a for a in coco.get('annotations', []) if a['image_id'] in ids]}
    informe = cvat.importar(ds, coco, args.revisor, manifiesto)
    copia = ds.raiz / 'cvat' / args.lote / 'importaciones'
    copia.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.archivo, copia / f'{dataset.ahora().replace(":", "")}-{Path(args.archivo).name}')
    print(f'Importadas {len(informe["importadas"])} vistas:')
    for nombre, n in informe['importadas']:
        print(f'  {nombre}: {n} caras')
    if informe['sin_cajas']:
        print(f'\nSin ninguna caja y la escena no es negativa ({len(informe["sin_cajas"])}): '
              'no se marcan como revisadas, puede que nadie las anotara.')
        for nombre in informe['sin_cajas']:
            print(f'  {nombre}')
    for clave, titulo in (('rechazadas', 'Rechazadas'), ('desconocidas', 'No están en el dataset')):
        if informe[clave]:
            print(f'\n{titulo} ({len(informe[clave])}):')
            for item in informe[clave]:
                print(f'  {item[0]}: {item[1]}' if isinstance(item, tuple) else f'  {item}')
    if any('es negativa y tiene' in motivo for _, motivo in informe['rechazadas']):
        print('\nUna escena declarada negativa trae cajas: o la etiqueta de la captura era falsa o '
              'las cajas sobran. Si la mesa tenía fichas, corrige la escena con')
        print('  revisar <sesion> <toma> <camara> --escena <la real> --revisor <tú>')
        print('y vuelve a importar el mismo zip.')
    print('\nLa escena se confirma aparte, con  revisar <sesion> <toma> <camara> --revisor <tú>')
    vistas, caras = ds.indexar()
    print(f'Índice regenerado: {vistas} vistas, {caras} caras.')


def indexar(ds, args):
    vistas, caras = ds.indexar()
    print(f'{ds.raiz / "indice" / "vistas.csv"}: {vistas} filas')
    print(f'{ds.raiz / "indice" / "caras.csv"}: {caras} filas')


def repartir(ds, args):
    for sid in args.prueba or []:
        ds.asignar(sid, 'prueba', args.forzar)
    for sid in args.entrenamiento or []:
        ds.asignar(sid, 'entrenamiento', args.forzar)
    for sid in ds.sesiones():
        print(f'  {sid}: {ds.grupo(sid)}')


def referencias(ds, args):
    vocabulario = Vocabulario(RAIZ, Path(args.vocabulario))
    ya = [e.get('procedencia') for e in vocabulario.propios]
    halladas = {x: [] for x in args.lexema}
    for sesion, toma, camara in ds.vistas(('entrenamiento',)):
        s = ds.sesion(sesion)
        a = s.anotacion(toma, camara)
        if not dataset.revisada(a):
            continue
        for c in a['caras']:
            if c['simbolo'] in halladas and not c['oculta']:
                halladas[c['simbolo']].append((s, toma, camara, a, c))
    for nombre, caras in halladas.items():
        tipo = ('operacion' if nombre in OPERACIONES
                else 'literal' if re.fullmatch(r'-?\d+(\.\d+)?|nil', nombre) else 'pila')
        nuevas = 0
        for s, toma, camara, a, c in caras:
            color, _, meta = s.cargar_vista(toma, camara)
            procedencia = {'sesion': s.id, 'toma': toma, 'camara': camara, 'caja': c['caja'],
                           'color_sha256': meta.get('color_sha256'), 'revisor': a['caras_revisadas_por']}
            print(f'  {nombre:<6} {s.id}/{toma}/{camara} {c["caja"]} revisada por {procedencia["revisor"]}'
                  + ('  (ya es referencia)' if procedencia in ya else ''))
            if not args.guardar or procedencia in ya:
                continue
            x, y, w, h = c['caja']
            recorte = cv2.imencode('.png', color[y:y + h, x:x + w])[1].tobytes()
            try:
                vocabulario.guardar({'nombre': nombre, 'tipo': tipo, 'procedencia': procedencia,
                                     'imagen': 'data:image/png;base64,' + base64.b64encode(recorte).decode()})
                nuevas += 1
            except ValueError as error:
                print(f'         no se guardó: {error}')
        falta = max(0, args.minimo - len(caras))
        print(f'{nombre}: {len(caras)} caras revisadas de entrenamiento'
              + (f', {nuevas} guardadas' if args.guardar else '')
              + (f'; faltan {falta}: fotografía la ficha' if falta else ''))


def historial(ds, args):
    s = ds.sesion(args.sesion)
    a = s.anotacion(args.toma, args.camara)
    for cambio in a.get('cambios', []):
        print(f'  {cambio["cuando"]}  {cambio["por"]:<14} {cambio["origen"]:<5} {cambio["resumen"]}')
    anteriores = s.historial(args.toma, args.camara)
    print(f'{len(anteriores)} versiones anteriores guardadas en historial/')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--raiz', default=str(POR_OMISION))
    sub = parser.add_subparsers(dest='orden', required=True)

    p = sub.add_parser('sesion-crear')
    p.add_argument('sesion')
    p.add_argument('--proposito', default='medicion', choices=dataset.PROPOSITOS)
    p.add_argument('--nota', default='')
    p.add_argument('--angulo', default='', help='cenital, oblicua-60…')
    p.add_argument('--distancia-mm', type=float)
    p.set_defaults(fn=sesion_crear)

    p = sub.add_parser('camara')
    p.add_argument('sesion')
    p.add_argument('camara')
    p.add_argument('--tipo', choices=('realsense', 'realsense_db3', 'webcam', 'kinect', 'archivo'))
    p.add_argument('--fuente', default='')
    p.add_argument('--rol', default='ambos')
    p.add_argument('--sin-profundidad', action='store_true')
    p.add_argument('--del-servicio', help='Nombre o id de la cámara en datos_locales/montaje.json')
    p.add_argument('--montaje', help='Otra configuración del servicio')
    p.add_argument('--nota', default='')
    p.set_defaults(fn=camara)

    p = sub.add_parser('activar')
    p.add_argument('sesion', nargs='?')
    p.add_argument('--ninguna', action='store_true')
    p.set_defaults(fn=activar)

    p = sub.add_parser('estado')
    p.set_defaults(fn=estado)

    p = sub.add_parser('importar-legado')
    p.add_argument('sesion')
    p.add_argument('camara')
    p.add_argument('muestras', nargs='+')
    p.add_argument('--montaje', default='')
    p.set_defaults(fn=importar_legado)

    p = sub.add_parser('importar-fotos')
    p.add_argument('clasificacion', help='CSV con archivo, clase, sesion, montaje, escena…')
    p.add_argument('--carpeta', required=True)
    p.add_argument('--procedencia', default='flickr')
    p.add_argument('--nota', default='fotografías externas RGB: sin profundidad, calibración ni '
                                     'sincronía; no son capturas de la D435i')
    p.set_defaults(fn=importar_fotos)

    p = sub.add_parser('revisar')
    p.add_argument('sesion')
    p.add_argument('toma')
    p.add_argument('camara')
    p.add_argument('--revisor', required=True)
    p.add_argument('--escena', choices=dataset.ESCENAS)
    p.add_argument('--sin-caras', action='store_true')
    p.add_argument('--completa', action='store_true',
                   help='Todas las caras que cumplen el criterio están anotadas')
    p.add_argument('--zona', nargs=4, type=int, metavar=('X', 'Y', 'ANCHO', 'ALTO'),
                   help='Solo se evalúa esta zona, en caras y candidatos')
    p.add_argument('--zona-motivo', default='')
    p.add_argument('--nota', default='')
    p.set_defaults(fn=revisar)

    p = sub.add_parser('cvat-exportar')
    p.add_argument('lote')
    p.add_argument('--sesion', action='append')
    p.add_argument('--toma', action='append')
    p.add_argument('--vista', action='append', help='sesion/toma[/camara]; los ids de toma se '
                                                    'repiten entre sesiones')
    p.add_argument('--solo-sin-caras', action='store_true')
    p.add_argument('--precargar', action='store_true', help='Candidatos del detector')
    p.add_argument('--precargar-borrador', action='store_true', help='Caras del borrador')
    p.set_defaults(fn=cvat_exportar)

    p = sub.add_parser('cvat-importar')
    p.add_argument('archivo')
    p.add_argument('--lote', required=True)
    p.add_argument('--revisor', required=True)
    p.add_argument('--sin-lote', action='store_true')
    p.add_argument('--solo', action='append', metavar='IMAGEN',
                   help='Importa solo estas imágenes del zip; las demás quedan como estaban')
    p.set_defaults(fn=cvat_importar)

    p = sub.add_parser('indexar')
    p.set_defaults(fn=indexar)

    p = sub.add_parser('repartir')
    p.add_argument('--prueba', action='append')
    p.add_argument('--entrenamiento', action='append')
    p.add_argument('--forzar', action='store_true')
    p.set_defaults(fn=repartir)

    p = sub.add_parser('referencias', help='Referencias de símbolo desde caras revisadas de entrenamiento')
    p.add_argument('--lexema', action='append', help='Por omisión, los de PUSH a 3')
    p.add_argument('--vocabulario', default=str(RAIZ / 'datos_locales'))
    p.add_argument('--minimo', type=int, default=3)
    p.add_argument('--guardar', action='store_true', help='Sin esto solo lista lo que hay')
    p.set_defaults(fn=referencias)

    p = sub.add_parser('historial')
    p.add_argument('sesion')
    p.add_argument('toma')
    p.add_argument('camara')
    p.set_defaults(fn=historial)

    args = parser.parse_args(argv)
    if args.orden == 'referencias' and not args.lexema:
        args.lexema = ['PUSH', 'a', '3']
    try:
        args.fn(Dataset(args.raiz), args)
    except (ValueError, FileNotFoundError, FileExistsError) as error:
        raise SystemExit(f'Error: {error}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
