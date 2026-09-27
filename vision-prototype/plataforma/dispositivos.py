import importlib.util
import threading
import time
from dataclasses import dataclass
from collections import deque

import cv2
import numpy as np


@dataclass
class Cuadro:
    color: np.ndarray
    instante: float
    profundidad: np.ndarray | None = None
    intrinsecos: dict | None = None


def capacidades():
    return [
        {"tipo": "webcam", "nombre": "Webcam USB o integrada", "disponible": True, "requisito": "Permiso de cámara para Python y un índice de dispositivo."},
        {"tipo": "realsense", "nombre": "RealSense RGB + profundidad", "disponible": importlib.util.find_spec("pyrealsense2") is not None, "requisito": "Instalar librealsense y pyrealsense2 compatibles con este equipo."},
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


class RealSense:
    def __init__(self, fuente):
        import pyrealsense2 as rs
        self.rs = rs
        self.pipe = rs.pipeline()
        config = rs.config()
        if fuente:
            config.enable_device(str(fuente))
        config.enable_stream(rs.stream.depth)
        config.enable_stream(rs.stream.color, rs.format.bgr8)
        perfil = self.pipe.start(config)
        self.escala = perfil.get_device().first_depth_sensor().get_depth_scale() * 1000
        self.alinear = rs.align(rs.stream.color)

    def leer(self):
        frames = self.alinear.process(self.pipe.wait_for_frames(1500))
        color, depth = frames.get_color_frame(), frames.get_depth_frame()
        if not color or not depth:
            raise RuntimeError("RealSense no entregó RGB y profundidad alineados.")
        intr = color.profile.as_video_stream_profile().intrinsics
        k = [[intr.fx, 0, intr.ppx], [0, intr.fy, intr.ppy], [0, 0, 1]]
        return Cuadro(np.asanyarray(color.get_data()).copy(), time.monotonic(), np.asanyarray(depth.get_data()).astype(np.float32) * self.escala,
                      {"camera_matrix": k, "dist_coeffs": list(intr.coeffs), "image_size": [intr.width, intr.height], "origen": "fabrica"})

    def cerrar(self):
        self.pipe.stop()


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

    def iniciar(self):
        if self.hilo and self.hilo.is_alive():
            raise ValueError("La cámara ya está activa o se está desconectando.")
        self.stop.clear()
        with self.lock:
            self.datos = {}
            self.historial.clear()
            self.cuadro = None
            self.jpeg = None
            self.jpeg_depth = None
            self.observaciones = []
        self.estado, self.error = "conectando", ""
        self.hilo = threading.Thread(target=self._capturar, daemon=True)
        self.hilo.start()

    def _capturar(self):
        dispositivo = None
        try:
            dispositivo = {"webcam": Webcam, "realsense": RealSense, "kinect": Kinect}[self.config["tipo"]](self.config["fuente"])
            ultimo = 0
            while not self.stop.is_set():
                cuadro = dispositivo.leer()
                if cuadro.instante - ultimo < .1:
                    continue
                ultimo = cuadro.instante
                self.al_cuadro(self, cuadro)
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

    def detener(self):
        self.stop.set()
        if self.hilo:
            self.hilo.join(timeout=3)
        self.estado = "deteniendo" if self.hilo and self.hilo.is_alive() else "desconectada"

    def resumen(self):
        with self.lock:
            return {**self.config, "estado": self.estado, "error": self.error, "secuencia": self.secuencia, **self.datos, "observaciones": list(self.observaciones)}
