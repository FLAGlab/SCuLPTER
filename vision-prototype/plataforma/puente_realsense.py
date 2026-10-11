"""Cuadros RGB-D entre el capturador USB con sudo y el servicio local sin sudo."""

import json
import os
import socket
import struct
import time
from pathlib import Path

import cv2
import numpy as np

from plataforma.dispositivos import Cuadro


LIMITE_PAQUETE = 8_000_000


def ruta_socket(uid=None):
    return Path('/tmp') / f'sculpter-realsense-{os.getuid() if uid is None else uid}.sock'


def empaquetar(cuadro, serial):
    color = np.ascontiguousarray(cuadro.color, dtype=np.uint8)
    profundidad = np.clip(np.nan_to_num(cuadro.profundidad), 0, 65535).astype(np.uint16)
    ok, png = cv2.imencode('.png', profundidad, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    if not ok:
        raise RuntimeError('No se pudo codificar la profundidad RealSense.')
    cabecera = json.dumps({'serial': serial, 'alto': color.shape[0], 'ancho': color.shape[1],
                           'intrinsecos': cuadro.intrinsecos}, ensure_ascii=False).encode()
    cuerpo = struct.pack('!I', len(cabecera)) + cabecera + color.tobytes() + png.tobytes()
    if len(cuerpo) > LIMITE_PAQUETE:
        raise RuntimeError('El cuadro RealSense supera el tamaño permitido.')
    return struct.pack('!I', len(cuerpo)) + cuerpo


def _recibir_exacto(conexion, cantidad):
    partes = []
    while cantidad:
        bloque = conexion.recv(cantidad)
        if not bloque:
            raise ConnectionError('Se cerró el capturador RealSense.')
        partes.append(bloque)
        cantidad -= len(bloque)
    return b''.join(partes)


def decodificar(cuerpo, serial):
    if len(cuerpo) < 4:
        raise ValueError('Cuadro RealSense incompleto.')
    largo = struct.unpack('!I', cuerpo[:4])[0]
    datos = json.loads(cuerpo[4:4 + largo])
    if serial and datos['serial'] != serial:
        raise ValueError('El capturador conectado corresponde a otra RealSense.')
    alto, ancho = int(datos['alto']), int(datos['ancho'])
    if not 0 < alto <= 2160 or not 0 < ancho <= 3840:
        raise ValueError('Resolución RealSense inválida.')
    inicio = 4 + largo
    fin = inicio + alto * ancho * 3
    color = np.frombuffer(cuerpo[inicio:fin], np.uint8).reshape(alto, ancho, 3).copy()
    profundidad = cv2.imdecode(np.frombuffer(cuerpo[fin:], np.uint8), cv2.IMREAD_UNCHANGED)
    if profundidad is None or profundidad.shape != (alto, ancho) or profundidad.dtype != np.uint16:
        raise ValueError('La profundidad RealSense está incompleta.')
    return Cuadro(color, time.monotonic(), profundidad.astype(np.float32), datos['intrinsecos'])


class RealSenseRemota:
    def __init__(self, fuente):
        self.serial = str(fuente or '')
        self.conexion = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.conexion.settimeout(3)
        try:
            self.conexion.connect(str(ruta_socket()))
        except OSError as error:
            self.conexion.close()
            raise ValueError('Inicia el capturador RealSense antes de conectar la cámara en SCuLPTER.') from error

    def leer(self):
        self.conexion.sendall(b'F')
        largo = struct.unpack('!I', _recibir_exacto(self.conexion, 4))[0]
        if not 0 < largo <= LIMITE_PAQUETE:
            raise ValueError('Tamaño de cuadro RealSense inválido.')
        return decodificar(_recibir_exacto(self.conexion, largo), self.serial)

    def cerrar(self):
        self.conexion.close()
