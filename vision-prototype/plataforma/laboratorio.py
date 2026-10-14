"""Controles y pruebas del IDE sobre los cuadros del servicio, sin abrir otro capturador."""

import copy
import hashlib
import json
import re
import shlex
import subprocess
import sys
import threading
import time
import uuid
from collections import deque
from pathlib import Path

import cv2
import numpy as np

from plataforma.dataset import ESCENAS
from plataforma.lectura import leer_detallado, UMBRAL_CARAS
from clasificador_simbolos import UMBRAL, MARGEN


def json_seguro(valor):
    if isinstance(valor, np.ndarray):
        return valor.tolist()
    if isinstance(valor, np.generic):
        return valor.item()
    raise TypeError(type(valor).__name__)


def escribir_json(ruta, datos):
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2,
                               default=json_seguro, allow_nan=False))


class Laboratorio:
    def __init__(self, estado):
        self.estado = estado
        self.raiz = estado.datos / 'laboratorio'
        self.lock = threading.RLock()
        self.trabajo = None
        self.hilo = None
        self.parar = threading.Event()
        self.eventos = deque(maxlen=100)
        self.confirmadas = {}
        registro = self.raiz / 'acciones.jsonl'
        if registro.exists():
            with registro.open() as f:
                for linea in deque(f, maxlen=100):
                    try:
                        self.eventos.append(json.loads(linea))
                    except ValueError:
                        continue

    def registrar(self, accion, datos=None):
        datos = datos or {}
        # Solo operaciones conocidas; no se persisten imágenes ni secretos de peticiones.
        publico = {k: datos[k] for k in ('id', 'ruta', 'sesion', 'escena', 'nombre', 'tipo', 'fuente', 'rol',
                                                     'camaras', 'duracion', 'esperado', 'columnas', 'filas', 'mm',
                                                     'modo', 'paso_mm', 'paso_2_mm', 'x_min', 'x_max', 'y_min', 'y_max') if k in datos}
        cuerpo = json.dumps(publico, ensure_ascii=False)
        evento = {'fecha': time.strftime('%Y-%m-%d %H:%M:%S'), 'accion': accion, **publico,
                  'solicitud': {'ruta': accion, 'datos': publico},
                  'comando': ('curl -sS -H ' + shlex.quote('Content-Type: application/json') +
                              ' -d ' + shlex.quote(cuerpo) + ' ' +
                              shlex.quote('http://127.0.0.1:8766/api/' + accion))}
        with self.lock:
            self.raiz.mkdir(parents=True, exist_ok=True)
            with (self.raiz / 'acciones.jsonl').open('a') as f:
                f.write(json.dumps(evento, ensure_ascii=False) + '\n')
            self.eventos.append(evento)

    def resumen(self):
        e = self.estado
        with e.lock:
            camaras = []
            for cid, c in e.camaras.items():
                with c.lock:
                    cuadro = c.cuadro
                    edad = None if cuadro is None else max(0, time.monotonic() - cuadro.instante)
                    fuente = (c.config['tipo'], c.config['fuente'])
                    camaras.append({'id': cid, 'edad_s': edad,
                                    'identidad_confirmada': self.confirmadas.get(cid) == fuente,
                                    'nombre_sistema': None,
                                    'intrinsecos': bool(e.config['intrinsecos'].get(cid) or
                                                       (cuadro and cuadro.intrinsecos)),
                                    'pose': bool(e.config['poses'].get(cid)), 'mesa': cid in e.mesas,
                                    'motivo_mesa': e.motivos_mesa.get(cid, ''),
                                    'imagen_reciente': edad is not None and edad < 2 and c.estado == 'conectada'})
            with e.vocabulario.lock:
                referencias = [{'lexema': v['lexema'], 'fotos': v.get('fotografiadas', 0),
                                'utilizable': v['lexema'] in e.vocabulario.plantillas}
                               for v in e.vocabulario.listar()]
            with self.lock:
                return {'ruta_rgb': e.ruta_rgb, 'camaras': camaras, 'referencias': referencias,
                        'paso_medido': e.config['fusion'].get('medido', False),
                        'trabajo': copy.deepcopy(self.trabajo), 'eventos': list(self.eventos),
                        'carpeta': str(self.raiz), 'escenas': list(ESCENAS)}

    def _ocupado(self):
        return self.hilo is not None and self.hilo.is_alive()

    def _instantanea(self, ids):
        salida = []
        with self.estado.lock:
            for cid in ids:
                c = self.estado.camaras.get(cid)
                if c is None:
                    raise ValueError('Una cámara seleccionada ya no existe.')
                with c.lock:
                    q = c.cuadro
                    if q is None or c.estado != 'conectada' or time.monotonic() - q.instante > 2:
                        salida.append({'id': cid, 'error': c.error or 'Sin cuadro reciente'})
                        continue
                    salida.append({'id': cid, 'secuencia': c.secuencia, 'instante': q.instante,
                                   'color': q.color.copy(),
                                   'profundidad': None if q.profundidad is None else q.profundidad.copy(),
                                   'intrinsecos': copy.deepcopy(self.estado.config['intrinsecos'].get(cid) or q.intrinsecos),
                                   'observaciones': copy.deepcopy(c.observaciones),
                                   'diagnostico': copy.deepcopy(c.datos.get('localizacion', {})),
                                   'rendimiento': c.rendimiento()})
        return salida

    def accion(self, accion, datos):
        with self.estado.lock:
            if accion == 'confirmar':
                cid = datos['id']
                c = self.estado.camaras[cid]
                self.estado.cuadro(cid)
                self.confirmadas[cid] = (c.config['tipo'], c.config['fuente'])
            elif accion == 'detector':
                if datos.get('ruta') not in ('caras', 'contornos'):
                    raise ValueError('Selecciona caras o contornos.')
                if self._ocupado() or any(c.estado in ('conectada', 'conectando', 'deteniendo') or
                                           (c.hilo and c.hilo.is_alive()) for c in self.estado.camaras.values()):
                    raise ValueError('Detén la prueba y desconecta las cámaras antes de cambiar el detector.')
                self.estado.ruta_rgb = datos['ruta']
                self.estado.accion('reiniciar_fusion', {})
            elif accion == 'detener':
                self.parar.set()
            elif accion == 'identificar':
                if self._ocupado() or any(c.estado in ('conectada', 'conectando', 'deteniendo') or
                                           (c.hilo and c.hilo.is_alive()) for c in self.estado.camaras.values()):
                    raise ValueError('Desconecta las cámaras antes de buscar índices disponibles.')
                carpeta = self.raiz / ('dispositivos-' + uuid.uuid4().hex[:10])
                carpeta.mkdir(parents=True)
                with self.lock:
                    self.parar.clear()
                    self.trabajo = {'tipo': 'identificar', 'estado': 'en curso', 'carpeta': str(carpeta),
                                    'id': carpeta.name, 'grupos': 0, 'error': '', 'informe': None, 'dispositivos': []}
                    self.hilo = threading.Thread(target=self._ejecutar, args=('identificar', [], 0, carpeta), daemon=True)
                    self.hilo.start()
            elif accion in ('capturar', 'traza'):
                self._iniciar(accion, datos)
            else:
                raise ValueError('Control desconocido.')
        self.registrar('laboratorio/' + accion, datos)
        return self.resumen()

    def _iniciar(self, tipo, datos):
        with self.lock:
            if self._ocupado():
                raise ValueError('Ya hay una prueba o inspección en curso.')
            ids = datos.get('camaras', []) if tipo == 'capturar' else [datos.get('id')]
            if not isinstance(ids, list) or not 1 <= len(ids) <= 6 or len(set(ids)) != len(ids):
                raise ValueError('Selecciona entre una y seis cámaras distintas.')
            if any(cid not in self.estado.camaras for cid in ids):
                raise ValueError('Cámara desconocida.')
            if any('error' in s for s in self._instantanea(ids)):
                raise ValueError('Todas las cámaras seleccionadas necesitan una imagen reciente.')
            duracion = float(datos.get('duracion', 10))
            if not np.isfinite(duracion) or not 1 <= duracion <= 120:
                raise ValueError('La duración debe ser de 1 a 120 segundos.')
            sesion = str(datos.get('sesion', 'inspeccion'))
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,64}', sesion):
                raise ValueError('Sesión: usa letras, números, guiones; máximo 64 caracteres.')
            escena = datos.get('escena', 'libre')
            if escena not in ESCENAS:
                raise ValueError('Escena desconocida.')
            esperado = str(datos.get('esperado', ''))
            if len(esperado) > 10000:
                raise ValueError('El programa esperado es demasiado largo.')
            carpeta = self.raiz / (sesion + '-' + uuid.uuid4().hex[:10])
            carpeta.mkdir(parents=True)
            with self.estado.vocabulario.lock:
                referencias = copy.deepcopy(self.estado.vocabulario.listar())
                for simbolo in referencias:
                    for ref in simbolo.get('referencias', []):
                        path = self.estado.vocabulario.ruta_foto(ref['foto'])
                        ref['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
            manifiesto = {'tipo': tipo, 'sesion': sesion, 'escena': escena, 'esperado': esperado,
                          'esperado_uso': 'solo evaluación; nunca entrada del detector',
                          'ruta_rgb': self.estado.ruta_rgb, 'duracion_s': duracion,
                          'muestreo_hz_objetivo': 2, 'revisada': False,
                          'reloj': 'recepción en el equipo; no exposición ni sincronía por hardware',
                          'configuracion': copy.deepcopy(self.estado.config), 'referencias': referencias,
                          'camaras': ids, 'codigo': {str(p.relative_to(self.estado.raiz)): hashlib.sha256(p.read_bytes()).hexdigest()
                                                   for p in [self.estado.raiz / 'plataforma' / (n + '.py')
                                                             for n in ('lectura', 'localizacion', 'estado', 'fusion')]}}
            escribir_json(carpeta / 'sesion.json', manifiesto)
            self.parar.clear()
            self.trabajo = {'tipo': tipo, 'estado': 'en curso', 'carpeta': str(carpeta),
                            'id': carpeta.name, 'grupos': 0, 'error': '', 'informe': None}
            self.hilo = threading.Thread(target=self._ejecutar,
                                         args=(tipo, ids, duracion, carpeta), daemon=True)
            self.hilo.start()

    def _ejecutar(self, tipo, ids, duracion, carpeta):
        try:
            if tipo == 'identificar':
                self._identificar(carpeta)
            elif tipo == 'traza':
                self._traza(ids[0], carpeta)
            else:
                self._capturar(ids, duracion, carpeta)
            with self.lock:
                self.trabajo['estado'] = 'detenida' if self.parar.is_set() else 'terminada'
        except Exception as error:
            with self.lock:
                self.trabajo.update(estado='error', error=str(error)[:300])
        finally:
            with self.lock:
                escribir_json(carpeta / 'resultado.json', self.trabajo)

    def _identificar(self, carpeta):
        guion = """
import cv2, json, sys, time
c = cv2.VideoCapture(int(sys.argv[1]))
ok, f = False, None
try:
    limite = time.monotonic() + 3
    while c.isOpened() and time.monotonic() < limite:
        ok, f = c.read()
        if ok:
            break
    if ok:
        cv2.imwrite(sys.argv[2], f)
    print(json.dumps({'disponible': bool(ok), 'resolucion': [f.shape[1], f.shape[0]] if ok else None}))
finally:
    c.release()
"""
        for indice in range(6):
            if self.parar.is_set():
                break
            try:
                r = subprocess.run([sys.executable, '-c', guion, str(indice),
                                    str(carpeta / f'{indice}.png')], capture_output=True, text=True, timeout=8)
                dato = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {'disponible': False}
            except (subprocess.TimeoutExpired, ValueError, IndexError):
                dato = {'disponible': False, 'motivo': 'No respondió en el plazo de búsqueda'}
            dato.update(indice=indice, imagen=f'{carpeta.name}/{indice}.png' if dato['disponible'] else None)
            with self.lock:
                self.trabajo['dispositivos'].append(dato)
                self.trabajo['grupos'] += 1

    def _capturar(self, ids, duracion, carpeta):
        inicio = time.monotonic()
        vistos, bytes_guardados = {}, 0
        with (carpeta / 'cuadros.jsonl').open('w') as f:
            while not self.parar.is_set() and time.monotonic() - inicio < duracion:
                comienzo = time.monotonic()
                grupo = {'instante_muestreo': comienzo, 'vistas': [],
                         'estado_servicio': self.estado.resumen(),
                         'relacion': 'estado al muestrear; la fusión puede usar secuencias anteriores'}
                for vista in self._instantanea(ids):
                    cid = vista['id']
                    color, depth = vista.pop('color', None), vista.pop('profundidad', None)
                    if color is not None:
                        sello = (vista['secuencia'], vista['instante'])
                        vista['repetida'] = vistos.get(cid) == sello
                        if not vista['repetida']:
                            base = f'{self.trabajo["grupos"]:04d}-{cid}'
                            for sufijo, matriz in [('color', color), ('depth', depth)]:
                                if matriz is None:
                                    continue
                                if sufijo == 'depth':
                                    matriz = np.clip(np.nan_to_num(matriz), 0, 65535).astype(np.uint16)
                                ok, imagen = cv2.imencode('.png', matriz)
                                if not ok:
                                    raise ValueError('No se pudo guardar una imagen.')
                                bytes_guardados += imagen.nbytes
                                if bytes_guardados > 512 * 1024 * 1024:
                                    raise ValueError('Se alcanzó el límite de 512 MB de esta prueba.')
                                nombre = base + '.' + sufijo + '.png'
                                (carpeta / nombre).write_bytes(imagen.tobytes())
                                vista[sufijo] = nombre
                                vista[sufijo + '_sha256'] = hashlib.sha256(imagen).hexdigest()
                            vistos[cid] = sello
                    grupo['vistas'].append(vista)
                tiempos = [v['instante'] for v in grupo['vistas'] if 'instante' in v]
                grupo['desfase_ms'] = 1000 * (max(tiempos) - min(tiempos)) if len(tiempos) > 1 else None
                f.write(json.dumps(grupo, ensure_ascii=False, default=json_seguro, allow_nan=False) + '\n')
                f.flush()
                with self.lock:
                    self.trabajo['grupos'] += 1
                self.parar.wait(max(0, .5 - (time.monotonic() - comienzo)))

    def _traza(self, cid, carpeta):
        vista = self._instantanea([cid])[0]
        if 'error' in vista:
            raise ValueError(vista['error'])
        color = vista.pop('color')
        depth = vista.pop('profundidad')
        pasos = []

        def imagen(titulo, matriz):
            if matriz is None or not matriz.size or len(pasos) >= 32:
                return
            nombre = f'paso-{len(pasos):02d}.png'
            if matriz.dtype == bool:
                matriz = matriz.astype(np.uint8) * 255
            if not cv2.imwrite(str(carpeta / nombre), matriz):
                raise ValueError('No se pudo guardar la transformación.')
            pasos.append({'titulo': titulo, 'archivo': nombre})

        imagen('Original del cuadro seleccionado', color)
        # Perfil solo de este hilo: captura resultados reales, no una aproximación gráfica.
        capturadas = set()
        def observar(frame, evento, retorno):
            if evento != 'return' or not frame.f_code.co_filename.endswith('/plataforma/localizacion.py'):
                return
            nombre = frame.f_code.co_name
            if nombre == '_caras_por_semilla' and nombre not in capturadas:
                capturadas.add(nombre)
                for clave, titulo in [('suave', 'Gris suavizado'), ('tinta', 'Tinta candidata'),
                                       ('borde', 'Aristas de la búsqueda por semillas')]:
                    imagen(titulo, frame.f_locals.get(clave))
            if nombre == 'mascara_objetos' and nombre not in capturadas:
                capturadas.add(nombre)
                if retorno and retorno[0] is not None:
                    imagen('Máscara de objetos sobre la mesa', retorno[0] * 255)

        with self.estado.lock:
            mesa = self.estado.mesas.get(cid)
            ruta = self.estado.ruta_rgb
        if mesa is not None:
            imagen('Región de mesa calibrada', None if mesa.region is None else mesa.region.astype(np.uint8) * 255)
        anterior = sys.getprofile()
        sys.setprofile(observar)
        try:
            with self.estado.vocabulario.lock:
                _, lecturas, tinta, diag = leer_detallado(color, self.estado.vocabulario, depth,
                                                       vista['intrinsecos'], mesa=mesa, ruta_rgb=ruta)
        finally:
            sys.setprofile(anterior)
        cajas = color.copy()
        for n, lectura in enumerate(lecturas):
            x, y, w, h = map(int, lectura['observacion']['caja'])
            cv2.rectangle(cajas, (x, y), (x + w, y + h), (0, 180, 255), 2)
            cv2.putText(cajas, str(n + 1), (x, max(15, y)), cv2.FONT_HERSHEY_SIMPLEX, .5, (0, 0, 255), 1)
        imagen('Caras localizadas (números de lectura)', cajas)
        for n, lectura in enumerate(lecturas[:20]):
            imagen(f'Entrada al clasificador, cara {n + 1}', lectura['recorte'])
        informe = {'vista': vista, 'ruta_rgb': ruta, 'pasos': pasos, 'diagnostico': diag,
                   'lecturas': [{**l['observacion'], 'motivo': self._motivo_lectura(l, diag.get('etapa'))} for l in lecturas], 'tinta_sin_resolver': tinta,
                   'estado_servicio': self.estado.resumen(),
                   'nota': 'Reprocesamiento del cuadro seleccionado. Fusión y Scala son el estado al finalizar, '
                           'no una validación de este cuadro aislado. No se inventan descartes individuales no registrados.'}
        escribir_json(carpeta / 'traza.json', informe)
        with self.lock:
            self.trabajo['informe'] = carpeta.name + '/traza.json'

    @staticmethod
    def _motivo_lectura(lectura, etapa):
        candidatos = lectura['candidatos']
        if not candidatos:
            return 'No hay referencias comparables para el recorte.'
        primero = candidatos[0]['puntaje']
        segundo = candidatos[1]['puntaje'] if len(candidatos) > 1 else 0
        umbral = UMBRAL_CARAS if etapa == 'caras' else UMBRAL
        if primero < umbral:
            return f'Similitud {primero:.3f} inferior al umbral {umbral:.2f}.'
        if primero - segundo < MARGEN:
            return f'Diferencia entre candidatos inferior a {MARGEN:.2f}.'
        return 'Aceptado por el clasificador.' if lectura['token'] != '<sin leer>' else 'Sin lectura aceptada; revisar candidatos y referencias.'

    def archivo(self, nombre):
        ruta = (self.raiz / nombre).resolve()
        if not ruta.is_relative_to(self.raiz.resolve()) or not ruta.is_file():
            raise ValueError('Archivo no disponible.')
        if ruta.suffix not in ('.json', '.jsonl', '.png'):
            raise ValueError('Formato no disponible.')
        return ruta

    def cerrar(self):
        self.parar.set()
        if self.hilo:
            self.hilo.join(timeout=5)
