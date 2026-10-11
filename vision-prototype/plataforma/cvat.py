"""Intercambio con CVAT en formato COCO 1.0.

Cada imagen se llama `<sesion>__<toma>__<camara>.png`. Se usa una etiqueta `cara` con los
atributos de texto `simbolo` y `pieza`; si la categoría tiene otro nombre, ese nombre es el
símbolo. El indicador `occluded` de CVAT se guarda como `oculta`.
"""

import io
import json
import shutil
import zipfile
from pathlib import Path

from plataforma import dataset
from plataforma.sesiones import huella

ETIQUETA = 'cara'
SIN_PIEZA = ('', '-', None)

ETIQUETAS_CVAT = [{
    'name': ETIQUETA, 'color': '#fa8c16', 'type': 'rectangle',
    'attributes': [
        {'name': 'simbolo', 'input_type': 'text', 'mutable': False,
         'values': [dataset.SIN_LEER], 'default_value': dataset.SIN_LEER},
        {'name': 'pieza', 'input_type': 'text', 'mutable': False,
         'values': ['-'], 'default_value': '-'},
        {'name': 'nota', 'input_type': 'text', 'mutable': False,
         'values': ['-'], 'default_value': '-'},
    ],
}]


def nombre_imagen(sesion, toma, camara):
    return f'{sesion}__{toma}__{camara}.png'


def separar_nombre(nombre):
    """(sesion, toma, camara) desde el nombre de archivo, o None si no tiene esa forma."""
    base = Path(str(nombre).replace('\\', '/')).name
    if base.lower().endswith('.png'):
        base = base[:-4]
    partes = base.split('__')
    if len(partes) != 3:
        return None
    try:
        return tuple(dataset.validar_id(p) for p in partes)
    except ValueError:
        return None


def coco(imagenes):
    """COCO 1.0 con la estructura que exporta CVAT; `imagenes` es una lista de
    (file_name, ancho, alto, caras).
    """
    salida = {'licenses': [{'name': '', 'id': 0, 'url': ''}],
              'info': {'contributor': '', 'date_created': '', 'description': 'SCuLPTER',
                       'url': '', 'version': '', 'year': ''},
              'categories': [{'id': 1, 'name': ETIQUETA, 'supercategory': ''}],
              'images': [], 'annotations': []}
    siguiente = 1
    for n, (nombre, ancho, alto, caras) in enumerate(imagenes, 1):
        salida['images'].append({'id': n, 'width': int(ancho), 'height': int(alto),
                                 'file_name': nombre, 'license': 0, 'flickr_url': '',
                                 'coco_url': '', 'date_captured': 0})
        for c in caras:
            x, y, w, h = c['caja']
            salida['annotations'].append({
                'id': siguiente, 'image_id': n, 'category_id': 1, 'segmentation': [],
                'area': float(w * h), 'bbox': [float(x), float(y), float(w), float(h)],
                'iscrowd': 0,
                'attributes': {'occluded': bool(c.get('oculta')), 'rotation': 0.0,
                               'simbolo': c.get('simbolo', dataset.SIN_LEER),
                               'pieza': c.get('pieza') or '-', 'nota': c.get('nota') or '-'}})
            siguiente += 1
    return salida


def exportar(ds, vistas, destino, precargar=False):
    """Prepara un lote: imágenes, etiquetas y manifiesto con huellas.

    `precargar='detector'` añade los candidatos de la etapa 1; esas vistas quedan marcadas porque
    medir el detector con sus propias cajas sesga el resultado. `precargar='borrador'` añade las
    caras ya anotadas, para corregirlas en vez de dibujarlas de nuevo.
    """
    destino = Path(destino)
    imagenes = destino / 'imagenes'
    if imagenes.exists() and any(imagenes.iterdir()):
        raise FileExistsError(f'El lote {destino} ya tiene imágenes; usa otro nombre')
    imagenes.mkdir(parents=True, exist_ok=True)
    precargar = 'detector' if precargar is True else (precargar or '')
    manifiesto = {'version': 1, 'creado': dataset.ahora(), 'precargado': precargar,
                  'imagenes': {}}
    previas = []
    for sesion, toma, camara in vistas:
        s = ds.sesion(sesion)
        origen = Path(str(s.ruta_vista(toma, camara)) + '.color.png')
        nombre = nombre_imagen(sesion, toma, camara)
        shutil.copy2(origen, imagenes / nombre)
        color, profundidad, meta = s.cargar_vista(toma, camara)
        alto, ancho = color.shape[:2]
        manifiesto['imagenes'][nombre] = {'sesion': sesion, 'toma': toma, 'camara': camara,
                                          'ancho': ancho, 'alto': alto,
                                          'sha256': huella(origen)}
        if precargar == 'detector':
            from plataforma.localizacion import localizar, localizar_rgb
            if profundidad is None:
                candidatos, _, _ = localizar_rgb(color)
            else:
                candidatos, _, _ = localizar(color, profundidad, meta.get('intrinsecos'),
                                             mesa=s.mesa(camara))
            previas.append((nombre, ancho, alto, [dataset.cara(c['caja']) for c in candidatos]))
        elif precargar == 'borrador':
            previas.append((nombre, ancho, alto, s.anotacion(toma, camara)['caras']))
    (destino / 'lote.json').write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2))
    (destino / 'cvat_etiquetas.json').write_text(json.dumps(ETIQUETAS_CVAT, ensure_ascii=False,
                                                            indent=2))
    if precargar:
        (destino / 'anotaciones_previas.json').write_text(json.dumps(coco(previas), indent=2))
    return manifiesto


def leer_coco(ruta):
    """El JSON de COCO, tanto si es el archivo suelto como el .zip que exporta CVAT."""
    ruta = Path(ruta)
    if zipfile.is_zipfile(ruta):
        with zipfile.ZipFile(ruta) as z:
            nombres = [n for n in z.namelist() if n.endswith('.json') and 'instances' in Path(n).name]
            if not nombres:
                nombres = [n for n in z.namelist() if n.endswith('.json')]
            if len(nombres) != 1:
                raise ValueError(f'El zip debería traer un solo JSON de anotaciones y trae '
                                 f'{len(nombres)}: {nombres}')
            return json.load(io.TextIOWrapper(z.open(nombres[0]), encoding='utf-8'))
    return json.loads(ruta.read_text())


def _caras_de(por_imagen, categorias, imagen_id):
    caras = []
    for a in por_imagen.get(imagen_id, []):
        atributos = a.get('attributes') or {}
        categoria = categorias.get(a.get('category_id'), ETIQUETA)
        simbolo = atributos.get('simbolo') if categoria == ETIQUETA else categoria
        pieza = atributos.get('pieza')
        nota = atributos.get('nota')
        caras.append(dataset.cara(a['bbox'], simbolo or dataset.SIN_LEER,
                                  None if pieza in SIN_PIEZA else pieza,
                                  bool(atributos.get('occluded', False)),
                                  '' if nota in SIN_PIEZA else nota))
    return caras


def importar(ds, coco_datos, revisor, manifiesto=None):
    """Incorpora las cajas de CVAT como caras revisadas, sin tocar la escena.

    COCO no lleva si la anotación está completa ni la zona de evaluación: se reinician y se
    fijan después con `revisar --completa` y `--zona`, para que no hereden las del borrador.

    Una imagen sin cajas solo se da por revisada si su escena es negativa, porque CVAT exporta
    también las que nadie anotó. Tamaño y huella deben coincidir con la vista exportada.
    """
    if not revisor:
        raise ValueError('Importar desde CVAT necesita --revisor: es quien dibujó las cajas')
    informe = {'importadas': [], 'sin_cajas': [], 'desconocidas': [], 'rechazadas': []}
    categorias = {c['id']: c['name'] for c in coco_datos.get('categories', [])}
    por_imagen = {}
    for a in coco_datos.get('annotations', []):
        por_imagen.setdefault(a['image_id'], []).append(a)
    precargado = (manifiesto or {}).get('precargado') or ''
    if precargado is True:
        precargado = 'detector'

    for imagen in coco_datos.get('images', []):
        nombre = Path(str(imagen['file_name']).replace('\\', '/')).name
        clave = separar_nombre(nombre)
        if clave is None:
            informe['desconocidas'].append(nombre)
            continue
        sesion, toma, camara = clave
        try:
            s = ds.sesion(sesion)
            meta = s.cargar_vista(toma, camara)[2]
        except (FileNotFoundError, ValueError):
            informe['desconocidas'].append(nombre)
            continue
        ancho, alto = meta.get('resolucion', [None, None])
        if (int(imagen.get('width', -1)), int(imagen.get('height', -1))) != (ancho, alto):
            informe['rechazadas'].append((nombre, f'tamaño {imagen.get("width")}x'
                                                  f'{imagen.get("height")} y la vista es {ancho}x{alto}'))
            continue
        if manifiesto is not None:
            esperado = (manifiesto.get('imagenes') or {}).get(nombre)
            if esperado is None:
                informe['rechazadas'].append((nombre, 'no está en el manifiesto de este lote'))
                continue
            if esperado.get('sha256') != meta.get('color_sha256'):
                informe['rechazadas'].append((nombre, 'la imagen de la sesión no es la que se '
                                                      'exportó en este lote'))
                continue

        caras = _caras_de(por_imagen, categorias, imagen['id'])
        anotacion = s.anotacion(toma, camara)
        if not caras and anotacion['escena'] not in dataset.NEGATIVAS:
            informe['sin_cajas'].append(nombre)
            continue
        anotacion = {**anotacion, 'caras': caras, 'caras_revisadas_por': revisor,
                     'caras_origen': 'cvat', 'caras_precargadas': precargado,
                     'caras_precargadas_del_detector': precargado == 'detector',
                     'completa': False, 'zona': None}
        anotacion.pop('zona_motivo', None)
        try:
            s.guardar_anotacion(toma, camara, anotacion, revisor, 'cvat',
                                f'{len(caras)} caras desde CVAT')
        except ValueError as error:
            informe['rechazadas'].append((nombre, str(error)))
            continue
        informe['importadas'].append((nombre, len(caras)))
    return informe
