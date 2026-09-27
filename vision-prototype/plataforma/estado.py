import json
import threading
import time
import uuid
from pathlib import Path

import cv2
import numpy as np
from reconstruir import regiones, instrucciones, reducir_resolucion
from plataforma.dispositivos import Camara, capacidades
from plataforma.calibracion import Calibracion
from plataforma.fusion import Fusion, CONFIGURACION
from plataforma.vocabulario import Vocabulario, OPERACIONES


class Estado:
    def __init__(self, raiz, datos):
        self.raiz, self.datos = Path(raiz), Path(datos)
        self.lock = threading.RLock()
        self.sesion = uuid.uuid4().hex
        self.vocabulario = Vocabulario(raiz, datos)
        ruta = self.datos / 'montaje.json'
        self.config = json.loads(ruta.read_text()) if ruta.exists() else {'camaras': [], 'principal': None, 'intrinsecos': {}, 'poses': {}}
        self.camaras = {c['id']: Camara(c, self.procesar) for c in self.config['camaras']}
        self.sesiones = {}
        self.fusion = Fusion()
        self.config.setdefault("fusion", dict(CONFIGURACION))
        self.stop_fusion = threading.Event()
        self.hilo_fusion = threading.Thread(target=self._fusionar, daemon=True)
        self.hilo_fusion.start()

    def _fusionar(self):
        while not self.stop_fusion.wait(.06):
            try:
                with self.lock:
                    fuentes = []
                    for camara in self.camaras.values():
                        with camara.lock:
                            id = camara.config['id']
                            fuentes.append({'id': id, 'nombre': camara.config['nombre'], 'estado': camara.estado,
                                            'historial': list(camara.historial), 'intrinsecos': self.config['intrinsecos'].get(id),
                                            'pose': self.config['poses'].get(id)})
                    self.fusion.actualizar(fuentes, self.config['fusion'], time.monotonic())
            except Exception:
                self.fusion.fallar()

    def guardar(self):
        self.datos.mkdir(parents=True, exist_ok=True)
        temporal = self.datos / 'montaje.tmp'
        temporal.write_text(json.dumps(self.config, ensure_ascii=False, allow_nan=False))
        temporal.replace(self.datos / 'montaje.json')

    def procesar(self, camara, cuadro):
        with camara.lock:
            if camara.cuadro is not None and cuadro.instante <= camara.cuadro.instante:
                return
        imagen = reducir_resolucion(cuadro.color)
        observaciones, detecciones = [], []
        vista = imagen.copy()
        if camara.config['rol'] != 'profundidad':
            for recorte, x, y in regiones(imagen)[:80]:
                candidatos = self.vocabulario.puntuar(recorte)
                aceptado = bool(candidatos and candidatos[0]['puntaje'] > .45 and (len(candidatos) < 2 or candidatos[0]['puntaje'] - candidatos[1]['puntaje'] >= .08))
                token = candidatos[0]['lexema'] if aceptado else '<sin leer>'
                h, w = recorte.shape[:2]
                detecciones.append((token, x, y))
                sx, sy = cuadro.color.shape[1]/imagen.shape[1], cuadro.color.shape[0]/imagen.shape[0]
                nitidez = float(cv2.Laplacian(cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())
                calidad = float(np.clip(min(w, h)/24, .2, 1)*np.clip(nitidez/100, .2, 1))
                observaciones.append({'calidad': calidad, 'lexema': token, 'x': x*sx, 'y': y*sy, 'caja': [(x-w/2)*sx, (y-h/2)*sy, w*sx, h*sy], 'candidatos': candidatos})
                color = (255, 97, 123) if token in {'PUSH', 'MOV'} else (141, 54, 240) if token in {'ADD', 'SUB', 'MUL', 'DIV', 'MOD'} else (0, 199, 255) if token in OPERACIONES else (117, 117, 117)
                if not aceptado:
                    color = (34, 72, 242)
                esquina = (int(x-w/2), int(y-h/2))
                cv2.rectangle(vista, esquina, (int(x+w/2), int(y+h/2)), color, 2)
                etiqueta = f"{token} {candidatos[0]['puntaje']:.2f}" if aceptado else 'Sin leer'
                cv2.putText(vista, etiqueta, (esquina[0], max(12, esquina[1]-4)), cv2.FONT_HERSHEY_SIMPLEX, .4, color, 1, cv2.LINE_AA)
        candidato = instrucciones(detecciones)
        avisos = []
        for n, instruccion in enumerate(candidato, 1):
            if instruccion['token'] not in OPERACIONES | {'<sin leer>'}:
                avisos.append(f"Fila {n}: la primera ficha no es una operación reconocida.")
            if len(instruccion['operandos']) > 2:
                avisos.append(f"Fila {n}: se ven más de dos parámetros; revisa la separación entre filas.")
        firma = json.dumps(candidato, sort_keys=True)
        posiciones = np.array([(x, y) for _, x, y in sorted(detecciones, key=lambda d: (d[0], d[1], d[2]))])
        with camara.lock:
            previo = camara.datos.get('firma')
            puntos = getattr(camara, 'puntos', np.array([]))
            quieto = posiciones.shape == puntos.shape and (not posiciones.size or float(np.max(np.abs(posiciones-puntos))) < 6)
            if previo != firma or not quieto:
                camara.desde = cuadro.instante
            camara.puntos = posiciones
            estable = bool(candidato) and cuadro.instante - getattr(camara, 'desde', cuadro.instante) >= .8
            camara.cuadro = cuadro
            camara.secuencia += 1
            camara.estado, camara.error = 'conectada', ''
            camara.observaciones = observaciones
            camara.jpeg = cv2.imencode('.jpg', vista, [cv2.IMWRITE_JPEG_QUALITY, 75])[1].tobytes()
            if cuadro.profundidad is not None:
                valido = np.isfinite(cuadro.profundidad) & (cuadro.profundidad > 0)
                mapa = np.clip(np.nan_to_num(cuadro.profundidad, nan=0, posinf=0) / 3000 * 255, 0, 255).astype(np.uint8)
                color = cv2.applyColorMap(mapa, cv2.COLORMAP_TURBO)
                color[~valido] = 0
                camara.jpeg_depth = cv2.imencode('.jpg', color)[1].tobytes()
            camara.historial.append({'secuencia': camara.secuencia, 'instante': cuadro.instante, 'resolucion': [cuadro.color.shape[1], cuadro.color.shape[0]], 'observaciones': observaciones, 'profundidad': cuadro.profundidad, 'intrinsecos': cuadro.intrinsecos})
            camara.datos = {'firma': firma, 'resolucion': [cuadro.color.shape[1], cuadro.color.shape[0]], 'estable': estable, 'instrucciones': candidato, 'profundidad': cuadro.profundidad is not None, 'avisos': avisos, 'compatible': not avisos}

    def resumen(self):
        with self.lock:
            dispositivos = []
            for camara in self.camaras.values():
                item = camara.resumen()
                with camara.lock:
                    reciente = camara.cuadro is not None and time.monotonic() - camara.cuadro.instante < 2
                    intr = self.config['intrinsecos'].get(item['id']) or (camara.cuadro.intrinsecos if camara.cuadro else None)
                item['estable'] = item.get('estable', False) and reciente and item['estado'] == 'conectada'
                item['intrinsecos'] = intr
                item['pose'] = self.config['poses'].get(item['id'])
                item['capturas'] = len(self.sesiones[item['id']].muestras) if item['id'] in self.sesiones else 0
                dispositivos.append(item)
            with self.vocabulario.lock:
                etiquetas = {s['lexema']: s['nombre'] for s in self.vocabulario.listar() if s['tipo'] == 'pila' and s['lexema'].startswith('sculpt_label_')}
            return {'sesion': self.sesion, 'camaras': dispositivos, 'principal': self.config['principal'], 'adaptadores': capacidades(), 'etiquetas': etiquetas, 'configuracion_fusion': dict(self.config['fusion']), 'fusion': self.fusion.resumen()}

    def cuadro(self, id):
        camara = self.camaras[id]
        with camara.lock:
            if not camara.cuadro or camara.estado != 'conectada' or time.monotonic() - camara.cuadro.instante > 2:
                raise ValueError('Conecta la cámara y espera una imagen reciente.')
            return camara.cuadro

    def accion(self, accion, datos):
        with self.lock:
            if accion == 'agregar':
                tipo = datos.get('tipo')
                if tipo not in {'webcam', 'realsense', 'kinect'}:
                    raise ValueError('Selecciona webcam, RealSense o Kinect v2. Identifica primero el modelo de Kinect.')
                fuente = str(datos.get('fuente', '')).strip()
                if tipo == 'webcam' and not fuente.isdigit():
                    raise ValueError('La webcam necesita un índice: 0, 1, 2…')
                if any(c.config['tipo'] == tipo and c.config['fuente'] == fuente for c in self.camaras.values()):
                    raise ValueError('Ese dispositivo ya está agregado.')
                nombre = str(datos.get('nombre', '')).strip()[:80] or tipo
                rol = datos.get('rol', 'simbolos')
                if rol not in {'simbolos', 'profundidad', 'ambos'} or (tipo == 'webcam' and rol != 'simbolos'):
                    raise ValueError('Una webcam aporta símbolos; la profundidad requiere un sensor RGB-D.')
                config = {'id': uuid.uuid4().hex[:12], 'tipo': tipo, 'fuente': fuente, 'nombre': nombre, 'rol': rol}
                self.camaras[config['id']] = Camara(config, self.procesar)
                self.config['camaras'].append(config)
                self.guardar()
                return config
            if accion == 'configurar_fusion':
                modo = datos.get('modo', 'fusion')
                paso = float(datos.get('paso_mm', self.config['fusion']['paso_mm']))
                if modo not in {'fusion', 'individual'} or not np.isfinite(paso) or not 20 <= paso <= 300:
                    raise ValueError('Elige un modo válido y un paso de 20 a 300 mm.')
                self.config['fusion'] = {'modo': modo, 'paso_mm': paso, 'medido': True}
                self.fusion.reiniciar()
                self.guardar()
                return self.resumen()
            if accion == 'reiniciar_fusion':
                self.fusion.reiniciar()
                for c in self.camaras.values():
                    with c.lock:
                        c.historial.clear()
                return self.resumen()
            id = datos['id']
            camara = self.camaras[id]
            if accion == 'iniciar':
                if not next(c for c in capacidades() if c['tipo'] == camara.config['tipo'])['disponible']:
                    raise ValueError('Falta instalar el controlador de este dispositivo. Consulta la guía de conexión.')
                camara.iniciar()
            elif accion == 'detener':
                camara.detener()
            elif accion == 'eliminar':
                camara.detener()
                if camara.hilo and camara.hilo.is_alive():
                    raise ValueError('La captura sigue cerrándose. Espera antes de eliminarla.')
                del self.camaras[id]
                self.config['camaras'] = [c for c in self.config['camaras'] if c['id'] != id]
                self.config['intrinsecos'].pop(id, None)
                self.config['poses'].pop(id, None)
                self.sesiones.pop(id, None)
                if self.config['principal'] == id:
                    self.config['principal'] = None
            elif accion == 'principal':
                if camara.config['rol'] == 'profundidad':
                    raise ValueError('Elige una cámara que lea símbolos.')
                self.config['principal'] = id
            elif accion == 'reiniciar_calibracion':
                self.sesiones[id] = Calibracion(int(datos['columnas']), int(datos['filas']), float(datos['mm']))
            elif accion == 'capturar':
                if id not in self.sesiones:
                    raise ValueError('Inicia una sesión con las medidas de tu tablero.')
                self.sesiones[id].capturar(self.cuadro(id).color)
            elif accion == 'calcular':
                if id not in self.sesiones:
                    raise ValueError('Inicia y captura el tablero antes de calcular.')
                intr = self.sesiones[id].calcular()
                if not np.isfinite(intr['rms']) or intr['rms'] >= 1:
                    raise ValueError('Error de reproyección igual o mayor a 1 px. Repite las capturas con más variedad y enfoque.')
                self.config['intrinsecos'][id] = intr
                self.config['poses'] = {}
                self.fusion.reiniciar()
            elif accion == 'registrar':
                tablero = Calibracion(int(datos['columnas']), int(datos['filas']), float(datos['mm']))
                activos = [c for c in self.camaras.values() if c.estado == 'conectada']
                if len(activos) < 2:
                    raise ValueError('Conecta al menos dos cámaras y muestra el mismo tablero inmóvil a todas.')
                cuadros = {c.config['id']: self.cuadro(c.config['id']) for c in activos}
                tiempos = [c.instante for c in cuadros.values()]
                if max(tiempos)-min(tiempos) > .5:
                    raise ValueError('Las imágenes están demasiado separadas en el tiempo. Intenta de nuevo.')
                poses = {}
                for cid, cuadro in cuadros.items():
                    intr = self.config['intrinsecos'].get(cid) or cuadro.intrinsecos
                    if not intr:
                        raise ValueError('Cada cámara necesita intrínsecos antes del registro conjunto.')
                    pose = tablero.pose(cuadro.color, intr)
                    if pose['rms'] >= 1:
                        raise ValueError('El tablero tiene un error de reproyección igual o mayor a 1 px.')
                    poses[cid] = {**pose, 'tablero': list(tablero.tablero), 'mm': tablero.mm}
                self.config['poses'] = poses
                self.fusion.reiniciar()
            else:
                raise ValueError('Acción desconocida.')
            self.guardar()
            return self.resumen()

    def cerrar(self):
        self.stop_fusion.set()
        self.hilo_fusion.join(timeout=3)
        for camara in self.camaras.values():
            camara.detener()
