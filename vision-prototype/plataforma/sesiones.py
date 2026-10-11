"""Almacén en disco del conjunto de escenas físicas.

    <raiz>/
      activa.json                      sesión que usa el servicio en vivo
      reparto.json                     grupo de cada sesión completa
      indice/vistas.csv, caras.csv     generados desde las anotaciones
      sesiones/<sesion>/
        sesion.json
        camaras/<camara>/camara.json   tipo, fuente, si da profundidad
        camaras/<camara>/mesa/         referencia de mesa de esa cámara en esa sesión
        tomas/<toma>/toma.json         montaje, escena declarada, condiciones, vistas
        tomas/<toma>/<camara>.color.png / .depth.png / .json / .anot.json
        tomas/<toma>/historial/        versiones anteriores de cada anotación

Una sesión es una disposición fija de cámaras. Los originales no se sobrescriben; las
anotaciones sí, y cada versión anterior queda en `historial/`.
"""

import csv
import hashlib
import json
import shutil
import time
from pathlib import Path

import cv2
import numpy as np

from plataforma import dataset
from plataforma.dataset import validar_id

TIPOS_CAMARA = ('realsense', 'realsense_db3', 'webcam', 'kinect', 'archivo')


def _leer(ruta, por_omision=None):
    ruta = Path(ruta)
    if not ruta.is_file():
        return por_omision
    return json.loads(ruta.read_text())


def _escribir(ruta, datos):
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    temporal = ruta.with_name(ruta.name + '.tmp')
    temporal.write_text(json.dumps(datos, ensure_ascii=False, indent=2))
    temporal.replace(ruta)
    return ruta


def huella(ruta):
    """SHA-256 de un archivo."""
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        for bloque in iter(lambda: f.read(1 << 20), b''):
            h.update(bloque)
    return h.hexdigest()


class Sesion:
    def __init__(self, raiz):
        self.raiz = Path(raiz)
        self.id = self.raiz.name
        self.datos = _leer(self.raiz / 'sesion.json')
        if self.datos is None:
            raise FileNotFoundError(f'No existe la sesión {self.id}')

    @property
    def proposito(self):
        return self.datos.get('proposito', 'medicion')


    def camaras(self):
        salida = {}
        for ruta in sorted((self.raiz / 'camaras').glob('*/camara.json')):
            salida[ruta.parent.name] = _leer(ruta)
        return salida

    def agregar_camara(self, camara, tipo, fuente='', rol='ambos', profundidad=None, nota=''):
        validar_id(camara, 'cámara')
        if tipo not in TIPOS_CAMARA:
            raise ValueError(f'tipo de cámara desconocido: {tipo}')
        ruta = self.raiz / 'camaras' / camara / 'camara.json'
        if ruta.exists():
            raise ValueError(f'La sesión {self.id} ya tiene la cámara {camara}')
        con_profundidad = tipo in ('realsense', 'realsense_db3', 'kinect') if profundidad is None else bool(profundidad)
        return _escribir(ruta, {'id': camara, 'tipo': tipo, 'fuente': str(fuente), 'rol': rol,
                                'profundidad': con_profundidad, 'nota': nota,
                                'creada': dataset.ahora()})

    def camara_para(self, tipo, fuente):
        """Cámara de la sesión que corresponde a un dispositivo del servicio, por tipo y fuente."""
        for camara, datos in self.camaras().items():
            if datos.get('tipo') == tipo and str(datos.get('fuente', '')) == str(fuente or ''):
                return camara
        return None

    def ruta_mesa(self, camara):
        return self.raiz / 'camaras' / camara / 'mesa' / 'referencia'

    def mesa(self, camara):
        """Referencia de mesa de esa cámara en esta sesión, o None si no se tomó."""
        from plataforma.mesa import Mesa
        base = self.ruta_mesa(camara)
        if not base.with_suffix('.json').is_file():
            return None
        return Mesa.cargar(base)


    def tomas(self):
        return sorted(p.parent.name for p in (self.raiz / 'tomas').glob('*/toma.json'))

    def toma(self, toma):
        datos = _leer(self.raiz / 'tomas' / toma / 'toma.json')
        if datos is None:
            raise FileNotFoundError(f'No existe la toma {toma} en {self.id}')
        return datos

    def nueva_toma(self, montaje, escena, condiciones=None, nota=''):
        """Abre una toma de un montaje, todavía sin vistas."""
        if escena not in dataset.ESCENAS:
            raise ValueError(f'escena desconocida: {escena}')
        if montaje:
            validar_id(montaje, 'montaje')
        elif escena not in dataset.NEGATIVAS:
            raise ValueError('El montaje es obligatorio salvo en escenas negativas.')
        base = 't' + time.strftime('%Y%m%d-%H%M%S')
        toma, n = base, 1
        while (self.raiz / 'tomas' / toma).exists():
            n += 1
            toma = f'{base}-{n}'
        _escribir(self.raiz / 'tomas' / toma / 'toma.json',
                  {'id': toma, 'sesion': self.id, 'montaje': montaje or '', 'escena': escena,
                   'condiciones': condiciones or {}, 'nota': nota, 'creada': dataset.ahora(),
                   'vistas': []})
        return toma

    def ruta_vista(self, toma, camara):
        return self.raiz / 'tomas' / toma / camara

    def vistas(self, toma):
        return list(self.toma(toma).get('vistas', []))

    def guardar_vista(self, toma, camara, color, profundidad=None, meta=None):
        """Escribe una vista original. Si ya existe, es un error."""
        camaras = self.camaras()
        if camara not in camaras:
            raise ValueError(f'La cámara {camara} no está en la sesión {self.id}')
        datos_toma = self.toma(toma)
        base = self.ruta_vista(toma, camara)
        color_png = Path(str(base) + '.color.png')
        if color_png.exists():
            raise FileExistsError(f'La vista {toma}/{camara} ya existe; los originales no se '
                                  'sobrescriben')
        color = np.asarray(color)
        if not cv2.imwrite(str(color_png), color):
            raise RuntimeError(f'No se pudo escribir {color_png}')
        cobertura = None
        if profundidad is not None:
            prof = np.clip(np.nan_to_num(np.asarray(profundidad, float)), 0, 65535).astype(np.uint16)
            if prof.shape[:2] != color.shape[:2]:
                color_png.unlink()
                raise ValueError('La profundidad no está alineada al color')
            if not cv2.imwrite(str(base) + '.depth.png', prof):
                color_png.unlink()
                raise RuntimeError('No se pudo escribir la profundidad')
            cobertura = round(float(np.count_nonzero(prof)) / prof.size, 4)
        elif camaras[camara].get('profundidad'):
            meta = {**(meta or {}), 'aviso': 'esta cámara debería dar profundidad y no la dio'}
        info = {'sesion': self.id, 'toma': toma, 'camara': camara,
                'resolucion': [int(color.shape[1]), int(color.shape[0])],
                'profundidad': profundidad is not None, 'cobertura_profundidad': cobertura,
                'unidad_profundidad': 'mm' if profundidad is not None else None,
                'instante_pared': time.time(), 'instante_monotono': time.monotonic(),
                'color_sha256': huella(color_png), **(meta or {})}
        _escribir(Path(str(base) + '.json'), info)
        datos_toma['vistas'] = sorted(set(datos_toma['vistas']) | {camara})
        _escribir(self.raiz / 'tomas' / toma / 'toma.json', datos_toma)
        return info

    def cargar_vista(self, toma, camara):
        """(color, profundidad_mm o None, metadatos)."""
        base = self.ruta_vista(toma, camara)
        color = cv2.imread(str(base) + '.color.png', cv2.IMREAD_COLOR)
        if color is None:
            raise FileNotFoundError(f'Falta {base}.color.png')
        prof = None
        if Path(str(base) + '.depth.png').is_file():
            prof = cv2.imread(str(base) + '.depth.png', cv2.IMREAD_UNCHANGED).astype(np.float32)
        return color, prof, _leer(Path(str(base) + '.json'), {})


    def anotacion(self, toma, camara):
        """La anotación vigente, o una nueva sin revisar si todavía no hay."""
        ruta = Path(str(self.ruta_vista(toma, camara)) + '.anot.json')
        actual = _leer(ruta)
        if actual is not None:
            return actual
        datos = self.toma(toma)
        return dataset.anotacion_nueva(self.id, toma, camara, datos.get('montaje', ''),
                                       datos.get('escena', 'libre'))

    def guardar_anotacion(self, toma, camara, anotacion, por, origen, resumen=''):
        """Guarda una anotación; la versión anterior pasa a `historial/`."""
        if not por:
            raise ValueError('Toda corrección necesita quién la hizo')
        fallos = dataset.validar(anotacion)
        if fallos:
            raise ValueError('Anotación inválida: ' + '; '.join(fallos))
        ruta = Path(str(self.ruta_vista(toma, camara)) + '.anot.json')
        if ruta.exists():
            historial = ruta.parent / 'historial'
            historial.mkdir(exist_ok=True)
            sello = time.strftime('%Y%m%d-%H%M%S')
            destino, n = historial / f'{camara}.{sello}.anot.json', 1
            while destino.exists():
                n += 1
                destino = historial / f'{camara}.{sello}-{n}.anot.json'
            shutil.copy2(ruta, destino)
        anotacion = dict(anotacion)
        anotacion['cambios'] = list(anotacion.get('cambios', [])) + [
            {'cuando': dataset.ahora(), 'por': por, 'origen': origen, 'resumen': resumen}]
        _escribir(ruta, anotacion)
        return anotacion

    def historial(self, toma, camara):
        return sorted((self.raiz / 'tomas' / toma / 'historial').glob(f'{camara}.*.anot.json'))


class Dataset:
    def __init__(self, raiz):
        self.raiz = Path(raiz)

    def ruta_sesion(self, sesion):
        return self.raiz / 'sesiones' / validar_id(sesion, 'sesión')

    def sesiones(self):
        return sorted(p.parent.name for p in (self.raiz / 'sesiones').glob('*/sesion.json'))

    def sesion(self, sesion):
        return Sesion(self.ruta_sesion(sesion))

    def crear_sesion(self, sesion, proposito='medicion', nota='', angulo='', distancia_mm=None):
        if proposito not in dataset.PROPOSITOS:
            raise ValueError(f'propósito desconocido: {proposito}')
        ruta = self.ruta_sesion(sesion) / 'sesion.json'
        if ruta.exists():
            raise ValueError(f'La sesión {sesion} ya existe')
        _escribir(ruta, {'id': sesion, 'proposito': proposito, 'nota': nota, 'angulo': angulo,
                         'distancia_mm': distancia_mm, 'creada': dataset.ahora()})
        return self.sesion(sesion)


    def activa(self):
        datos = _leer(self.raiz / 'activa.json', {})
        sesion = datos.get('sesion')
        if sesion and (self.ruta_sesion(sesion) / 'sesion.json').is_file():
            return sesion
        return None

    def activar(self, sesion):
        if sesion is not None:
            self.sesion(sesion)
        _escribir(self.raiz / 'activa.json', {'sesion': sesion, 'cuando': dataset.ahora()})
        return sesion


    def reparto(self):
        return _leer(self.raiz / 'reparto.json', {})

    def grupo(self, sesion):
        """entrenamiento, prueba, sin_asignar o fuera (verificación y legado nunca cuentan)."""
        if self.sesion(sesion).proposito != 'medicion':
            return 'fuera'
        return self.reparto().get(sesion, 'sin_asignar')

    def asignar(self, sesion, grupo, forzar=False):
        """Asigna una sesión completa a un grupo.

        Una sesión de prueba no pasa a entrenamiento sin `forzar`: invalidaría lo medido con ella.
        """
        if grupo not in dataset.GRUPOS:
            raise ValueError(f'grupo desconocido: {grupo}')
        if self.sesion(sesion).proposito != 'medicion':
            raise ValueError(f'La sesión {sesion} es de {self.sesion(sesion).proposito}: '
                             'no entra en el reparto')
        actual = self.reparto()
        if actual.get(sesion) == 'prueba' and grupo == 'entrenamiento' and not forzar:
            raise ValueError(f'{sesion} ya es de prueba; pasarla a entrenamiento invalida lo '
                             'medido con ella. Usa forzar si de verdad quieres hacerlo.')
        actual[sesion] = grupo
        _escribir(self.raiz / 'reparto.json', actual)
        return actual


    def vistas(self, grupos=None):
        """Todas las vistas como (sesion, toma, camara), filtradas por grupo si se pide."""
        for sesion in self.sesiones():
            if grupos is not None and self.grupo(sesion) not in grupos:
                continue
            s = self.sesion(sesion)
            for toma in s.tomas():
                for camara in s.vistas(toma):
                    yield sesion, toma, camara

    def indexar(self):
        """Regenera `indice/vistas.csv` y `indice/caras.csv` desde las anotaciones."""
        carpeta = self.raiz / 'indice'
        carpeta.mkdir(parents=True, exist_ok=True)
        filas_vistas, filas_caras = [], []
        por_toma = {}
        for sesion, toma, camara in self.vistas():
            s = self.sesion(sesion)
            a = s.anotacion(toma, camara)
            por_toma.setdefault((sesion, toma), []).append(a)
        for (sesion, toma), anotaciones in sorted(por_toma.items()):
            s = self.sesion(sesion)
            conflictos = dataset.conflictos_de_toma(anotaciones)
            for a in anotaciones:
                meta = _leer(Path(str(s.ruta_vista(toma, a['camara'])) + '.json'), {})
                ancho, alto = (meta.get('resolucion') or [None, None])[:2]
                filas_vistas.append({
                    'sesion': sesion, 'proposito': s.proposito, 'grupo': self.grupo(sesion),
                    'toma': toma, 'camara': a['camara'], 'montaje': a.get('montaje', ''),
                    'escena': a['escena'], 'escena_declarada': a.get('escena_declarada', ''),
                    'ancho': ancho, 'alto': alto, 'profundidad': meta.get('profundidad'),
                    'cobertura_profundidad': meta.get('cobertura_profundidad'),
                    'instante_pared': meta.get('instante_pared'),
                    'revisada': dataset.revisada(a), 'escena_revisada_por': a.get('escena_revisada_por', ''),
                    'caras_revisadas_por': a.get('caras_revisadas_por', ''),
                    'caras_origen': a.get('caras_origen', ''), 'caras': len(a.get('caras', [])),
                    'cambios': len(a.get('cambios', [])), 'conflictos_toma': ' | '.join(conflictos)})
                for n, c in enumerate(a.get('caras', [])):
                    x, y, w, h = c['caja']
                    filas_caras.append({'sesion': sesion, 'grupo': self.grupo(sesion),
                                        'toma': toma, 'camara': a['camara'], 'indice': n,
                                        'x': x, 'y': y, 'w': w, 'h': h, 'simbolo': c['simbolo'],
                                        'pieza': c.get('pieza') or '', 'oculta': c.get('oculta', False),
                                        'revisada': dataset.revisada(a)})
        for nombre, filas, campos in (
                ('vistas.csv', filas_vistas, ['sesion', 'proposito', 'grupo', 'toma', 'camara',
                                              'montaje', 'escena', 'escena_declarada', 'ancho',
                                              'alto', 'profundidad', 'cobertura_profundidad',
                                              'instante_pared', 'revisada', 'escena_revisada_por',
                                              'caras_revisadas_por', 'caras_origen', 'caras',
                                              'cambios', 'conflictos_toma']),
                ('caras.csv', filas_caras, ['sesion', 'grupo', 'toma', 'camara', 'indice', 'x',
                                            'y', 'w', 'h', 'simbolo', 'pieza', 'oculta',
                                            'revisada'])):
            with open(carpeta / nombre, 'w', newline='', encoding='utf-8') as f:
                escritor = csv.DictWriter(f, fieldnames=campos)
                escritor.writeheader()
                escritor.writerows(filas)
        return len(filas_vistas), len(filas_caras)
