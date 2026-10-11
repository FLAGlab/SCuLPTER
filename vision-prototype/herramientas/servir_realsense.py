"""Abre la D435i con sudo y entrega sus cuadros al servicio local sin sudo."""

import argparse
import os
import socket
import stat
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plataforma.dispositivos import RealSense
from plataforma.puente_realsense import empaquetar, ruta_socket


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serial', default='', help='Serial de la cámara conectada')
    args = parser.parse_args()
    uid = int(os.environ.get('SUDO_UID', '0'))
    if os.geteuid() != 0 or uid == 0:
        parser.error('La captura USB en este Mac requiere sudo desde la cuenta de usuario.')

    ruta = ruta_socket(uid)
    if ruta.exists():
        if not stat.S_ISSOCK(ruta.stat().st_mode):
            parser.error(f'{ruta} existe y no es un socket; revísalo antes de continuar.')
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as prueba:
            try:
                prueba.connect(str(ruta))
            except OSError:
                ruta.unlink()
            else:
                parser.error('Ya hay un capturador RealSense en ejecución.')

    dispositivo = RealSense(args.serial)
    servidor = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        servidor.bind(str(ruta))
        if os.geteuid() == 0:
            os.chown(ruta, uid, -1)
        os.chmod(ruta, 0o600)
        servidor.listen(1)
        print(f'RealSense lista en {ruta}. Abre SCuLPTER y pulsa Conectar.', flush=True)
        while True:
            conexion, _ = servidor.accept()
            with conexion:
                try:
                    while conexion.recv(1):
                        cuadro = dispositivo.leer()
                        conexion.sendall(empaquetar(cuadro, args.serial))
                except (BrokenPipeError, ConnectionResetError):
                    pass
    except KeyboardInterrupt:
        pass
    finally:
        servidor.close()
        dispositivo.cerrar()
        if ruta.exists() and stat.S_ISSOCK(ruta.stat().st_mode):
            ruta.unlink()


if __name__ == '__main__':
    main()
