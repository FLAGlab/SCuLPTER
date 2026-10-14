import importlib.util
import os
import queue
import sys
import threading
import time
from dataclasses import dataclass
from collections import OrderedDict, deque
from pathlib import Path

import cv2
import numpy as np


@dataclass
class Cuadro:
    color: np.ndarray
    instante: float
    profundidad: np.ndarray | None = None
    intrinsecos: dict | None = None


def capacidades():
    puente_activo = sys.platform == 'darwin' and (Path('/tmp') / f'sculpter-realsense-{os.getuid()}.sock').exists()
    realsense_disponible = puente_activo if sys.platform == 'darwin' and os.geteuid() != 0 else importlib.util.find_spec("pyrealsense2") is not None
    return [
        {"tipo": "webcam", "nombre": "Webcam USB o integrada", "disponible": True, "requisito": "Permiso de cámara para Python y un índice de dispositivo."},
        {"tipo": "realsense", "nombre": "RealSense RGB + profundidad", "disponible": realsense_disponible, "requisito": "En macOS, inicia antes herramientas/servir_realsense.py con sudo; en otros sistemas, instala pyrealsense2."},
        {"tipo": "realsense_db3", "nombre": "Grabación RealSense (.db3)", "disponible": importlib.util.find_spec("pyrealsense2") is not None, "requisito": "Archivo .db3 grabado con rs-record y pyrealsense2 compatible. Reproduce color y profundidad; no es imagen en vivo."},
        {"tipo": "kinect", "nombre": "Kinect v2", "disponible": importlib.util.find_spec("pylibfreenect2") is not None, "requisito": "Instalar libfreenect2 y pylibfreenect2. Conectar alimentación y USB 3; usar webcams para leer símbolos."},
    ]


class Webcam:
    def __init__(self, fuente):
        if not str(fuente).isdigit():
            raise ValueError("La webcam requiere un índice numérico, por ejemplo 0 o 1.")
        self.cap = cv2.VideoCapture(int(fuente))
        if not self.cap.isOpened():
            self.cap.release()
            raise ValueError("No se pudo abrir la webcam. Revisa su índice, permisos y si otra aplicación la está usando.")

    def leer(self):
        ok, color = self.cap.read()
        if not ok:
            raise RuntimeError("La webcam dejó de entregar imágenes.")
        return Cuadro(color, time.monotonic())

    def cerrar(self):
        self.cap.release()


class Grabacion:
    """Reproduce una grabación real (vídeo o carpeta de imágenes) por la misma tubería que una
    webcam. Es la vía para demostrar el ciclo con imágenes de cámaras de verdad sin tenerlas
    conectadas: la fuente es un archivo, el resto del camino es idéntico."""

    def __init__(self, fuente, fps=None, bucle=False):
        import glob
        import os
        self.ruta = str(fuente)
        self.bucle = bool(bucle)
        self.imagenes, self.cap, self.indice = [], None, 0
        if os.path.isdir(self.ruta):
            patrones = ('*.png', '*.jpg', '*.jpeg', '*.PNG', '*.JPG')
            self.imagenes = sorted(f for patron in patrones
                                   for f in glob.glob(os.path.join(self.ruta, patron)))
            if not self.imagenes:
                raise ValueError(f'No hay imágenes en {self.ruta}.')
            self.fps = float(fps or 10.0)
        else:
            if not os.path.isfile(self.ruta):
                raise ValueError(f'No existe la grabación {self.ruta}.')
            self.cap = cv2.VideoCapture(self.ruta)
            if not self.cap.isOpened():
                self.cap.release()
                raise ValueError(f'No se pudo abrir la grabación {self.ruta}.')
            leido = self.cap.get(cv2.CAP_PROP_FPS)
            self.fps = float(fps or (leido if leido and leido > 0 else 10.0))
        self.cuantos = len(self.imagenes) or int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    def leer(self):
        if self.imagenes:
            if self.indice >= len(self.imagenes):
                if not self.bucle:
                    raise EOFError('La grabación terminó.')
                self.indice = 0
            color = cv2.imread(self.imagenes[self.indice])
            if color is None:
                raise RuntimeError(f'No se pudo leer {self.imagenes[self.indice]}.')
        else:
            ok, color = self.cap.read()
            if not ok:
                if not self.bucle:
                    raise EOFError('La grabación terminó.')
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self.indice = 0
                ok, color = self.cap.read()
                if not ok:
                    raise RuntimeError('La grabación no se pudo rebobinar.')
        instante = self.indice / self.fps
        self.indice += 1
        return Cuadro(color, instante)

    def cerrar(self):
        if self.cap is not None:
            self.cap.release()


class RealSense:
    def __init__(self, fuente):
        import pyrealsense2 as rs
        self.rs = rs
        self.pipe = rs.pipeline()
        self.cuadros = queue.Queue(maxsize=2)
        config = rs.config()
        if fuente:
            config.enable_device(str(fuente))
        # La configuración predeterminada y el callback son los que entregaron RGB y
        # profundidad en el diagnóstico de esta D435i. No pedir BGR8 por USB: llega RGB8.
        self.callback = self._recibir
        perfil = self.pipe.start(config, self.callback)
        self.escala = perfil.get_device().first_depth_sensor().get_depth_scale() * 1000
        self.alinear = rs.align(rs.stream.color)

    def _recibir(self, frame):
        if not frame.is_frameset():
            return
        cuadro = frame.as_frameset()
        try:
            self.cuadros.put_nowait(cuadro)
        except queue.Full:
            try:
                self.cuadros.get_nowait()
            except queue.Empty:
                pass
            try:
                self.cuadros.put_nowait(cuadro)
            except queue.Full:
                pass

    def _esperar_frames(self):
        try:
            return self.cuadros.get(timeout=2)
        except queue.Empty:
            raise RuntimeError('RealSense no entregó imágenes en dos segundos.') from None

    def leer(self):
        frames = self.alinear.process(self._esperar_frames())
        color, depth = frames.get_color_frame(), frames.get_depth_frame()
        if not color or not depth:
            raise RuntimeError("RealSense no entregó RGB y profundidad alineados.")
        intr = color.profile.as_video_stream_profile().intrinsics
        k = [[intr.fx, 0, intr.ppx], [0, intr.fy, intr.ppy], [0, 0, 1]]
        imagen = np.asanyarray(color.get_data())
        if color.profile.format() == self.rs.format.rgb8:
            imagen = cv2.cvtColor(imagen, cv2.COLOR_RGB2BGR)
        elif color.profile.format() != self.rs.format.bgr8:
            raise RuntimeError("La grabación RealSense no tiene color RGB8 o BGR8.")
        return Cuadro(imagen.copy(), time.monotonic(), np.asanyarray(depth.get_data()).astype(np.float32) * self.escala,
                      {"camera_matrix": k, "dist_coeffs": list(intr.coeffs), "image_size": [intr.width, intr.height], "origen": "fabrica"})

    def cerrar(self):
        self.pipe.stop()


class RealSenseGrabacion(RealSense):
    def __init__(self, fuente):
        import pyrealsense2 as rs
        ruta = Path(fuente).expanduser().resolve()
        if ruta.suffix.lower() != '.db3' or not ruta.is_file():
            raise ValueError('Selecciona la ruta completa de una grabación .db3 existente.')
        self.rs = rs
        self.pipe = rs.pipeline()
        config = rs.config()
        config.enable_device_from_file(str(ruta), repeat_playback=True)
        perfil = self.pipe.start(config)
        self.escala = perfil.get_device().first_depth_sensor().get_depth_scale() * 1000
        self.alinear = rs.align(rs.stream.color)

    def _esperar_frames(self):
        return self.pipe.wait_for_frames(1500)


def abrir_realsense(fuente):
    if sys.platform == 'darwin' and os.geteuid() != 0:
        from plataforma.puente_realsense import RealSenseRemota
        return RealSenseRemota(fuente)
    return RealSense(fuente)


class Kinect:
    def __init__(self, fuente):
        from pylibfreenect2 import Freenect2, SyncMultiFrameListener, FrameType, Registration, Frame, CpuPacketPipeline
        self.contexto = Freenect2()
        if not self.contexto.enumerateDevices():
            raise ValueError("No se encontró un Kinect v2 conectado.")
        serial = str(fuente) if fuente else self.contexto.getDeviceSerialNumber(0)
        self.device = self.contexto.openDevice(serial, pipeline=CpuPacketPipeline())
        self.listener = SyncMultiFrameListener(FrameType.Color | FrameType.Ir | FrameType.Depth)
        self.device.setColorFrameListener(self.listener)
        self.device.setIrAndDepthFrameListener(self.listener)
        self.device.start()
        ir = self.device.getIrCameraParams()
        self.registro = Registration(ir, self.device.getColorCameraParams())
        self.depth = Frame(512, 424, 4)
        self.color = Frame(512, 424, 4)
        self.intr = {"camera_matrix": [[ir.fx, 0, ir.cx], [0, ir.fy, ir.cy], [0, 0, 1]], "dist_coeffs": [0, 0, 0, 0, 0], "image_size": [512, 424], "origen": "fabrica"}

    def leer(self):
        frames = self.listener.waitForNewFrame(milliseconds=1500)
        if not frames:
            raise RuntimeError("Kinect no entregó un cuadro a tiempo.")
        try:
            self.registro.apply(frames["color"], frames["depth"], self.depth, self.color)
            color = self.color.asarray(np.uint8)[:, :, :3].copy()
            depth = self.depth.asarray(np.float32).copy()
            return Cuadro(color, time.monotonic(), depth, self.intr)
        finally:
            self.listener.release(frames)

    def cerrar(self):
        self.device.stop()
        self.device.close()


class Camara:
    def __init__(self, config, al_cuadro):
        self.config = config
        self.al_cuadro = al_cuadro
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.hilo = None
        self.cuadro = None
        self.estado = "desconectada"
        self.error = ""
        self.secuencia = 0
        self.observaciones = []
        self.jpeg = None
        self.jpeg_depth = None
        self.datos = {}
        self.historial = deque(maxlen=6)
        self.limpios = OrderedDict()
        self.pendiente = None
        self.hay_cuadro = threading.Event()
        self.metricas = self._metricas_nuevas()

    @staticmethod
    def _metricas_nuevas():
        return {'leidos': 0, 'procesados': 0, 'descartados': 0, 'errores_proceso': 0,
                'leido_en': deque(maxlen=60), 'procesado_en': deque(maxlen=60),
                'proceso_s': deque(maxlen=60), 'edad_proceso_s': deque(maxlen=60),
                'edad_fusion_s': deque(maxlen=60)}

    def iniciar(self):
        if self.hilo and self.hilo.is_alive():
            raise ValueError("La cámara ya está activa o se está desconectando.")
        self.stop.clear()
        with self.lock:
            self.datos = {}
            self.historial.clear()
            self.limpios.clear()
            self.cuadro = None
            self.jpeg = None
            self.jpeg_depth = None
            self.observaciones = []
            self.pendiente = None
            self.metricas = self._metricas_nuevas()
        self.estado, self.error = "conectando", ""
        self.hilo = threading.Thread(target=self._capturar, daemon=True)
        self.hilo.start()

    def _capturar(self):
        """Adquisición: lee sin esperar al reconocimiento y deja solo el último cuadro.

        Un cuadro que llega antes de que se procese el anterior lo sustituye y se cuenta como
        descartado: la cola nunca pasa de uno, así que un detector lento no acumula imágenes
        viejas. El instante es el de recepción en el equipo, no el de exposición del sensor.
        """
        dispositivo = None
        procesador = threading.Thread(target=self._procesar, daemon=True)
        try:
            dispositivo = {"webcam": Webcam, "realsense": abrir_realsense, "realsense_db3": RealSenseGrabacion, "kinect": Kinect}[self.config["tipo"]](self.config["fuente"])
            procesador.start()
            while not self.stop.is_set():
                cuadro = dispositivo.leer()
                with self.lock:
                    if self.pendiente is not None:
                        self.metricas['descartados'] += 1
                    self.pendiente = cuadro
                    self.metricas['leidos'] += 1
                    self.metricas['leido_en'].append(cuadro.instante)
                self.hay_cuadro.set()
        except Exception as exc:
            with self.lock:
                self.estado, self.error = "error", str(exc)
        finally:
            if dispositivo:
                try:
                    dispositivo.cerrar()
                except Exception as exc:
                    with self.lock:
                        self.error = str(exc)
            if self.stop.is_set():
                self.estado = "desconectada"
            self.hay_cuadro.set()
            if procesador.is_alive():
                procesador.join(timeout=3)

    def _procesar(self):
        """Procesamiento: siempre el cuadro más reciente; un fallo aquí no detiene la captura."""
        while not self.stop.is_set():
            if not self.hay_cuadro.wait(.5):
                continue
            with self.lock:
                cuadro, self.pendiente = self.pendiente, None
                self.hay_cuadro.clear()
            if cuadro is None:
                continue
            inicio = time.monotonic()
            try:
                self.al_cuadro(self, cuadro)
            except Exception as exc:
                with self.lock:
                    self.metricas['errores_proceso'] += 1
                    self.error = f'No se pudo procesar un cuadro: {exc}'[:200]
                continue
            fin = time.monotonic()
            with self.lock:
                self.metricas['procesados'] += 1
                self.metricas['procesado_en'].append(fin)
                self.metricas['proceso_s'].append(fin - inicio)
                self.metricas['edad_proceso_s'].append(inicio - cuadro.instante)

    def rendimiento(self):
        """Ritmos, tiempos y descartes de esta cámara, medidos en vivo en el equipo."""
        def ritmo(instantes):
            return round((len(instantes) - 1) / (instantes[-1] - instantes[0]), 2) \
                if len(instantes) > 1 and instantes[-1] > instantes[0] else None

        def resumen(valores):
            return {'mediana': round(float(np.median(valores)), 3), 'p95': round(float(np.percentile(valores, 95)), 3)} \
                if valores else None

        with self.lock:
            m = self.metricas
            return {'captura_hz': ritmo(list(m['leido_en'])), 'proceso_hz': ritmo(list(m['procesado_en'])),
                    'proceso_s': resumen(list(m['proceso_s'])), 'edad_al_procesar_s': resumen(list(m['edad_proceso_s'])),
                    'edad_en_fusion_s': resumen(list(m['edad_fusion_s'])), 'leidos': m['leidos'],
                    'procesados': m['procesados'], 'descartados': m['descartados'],
                    'errores_proceso': m['errores_proceso'], 'cola': int(self.pendiente is not None),
                    'reloj': 'recepción en el equipo (time.monotonic), no exposición del sensor'}

    def detener(self):
        self.stop.set()
        if self.hilo:
            self.hilo.join(timeout=3)
        self.estado = "deteniendo" if self.hilo and self.hilo.is_alive() else "desconectada"

    def resumen(self):
        with self.lock:
            datos = {**self.config, "estado": self.estado, "error": self.error, "secuencia": self.secuencia, **self.datos, "observaciones": list(self.observaciones)}
        return {**datos, "rendimiento": self.rendimiento()}
