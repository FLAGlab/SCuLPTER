"""Comprueba si la D435i entrega cuadros en vivo mediante el callback de librealsense.

Usa la configuración predeterminada de rs-record, sin guardar ningún archivo.
También acepta --archivo para comprobar el diagnóstico con una grabación .db3.
"""

import argparse
import sys
import time
from pathlib import Path

import pyrealsense2 as rs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archivo', help='Grabación .db3 para comprobar el diagnóstico sin USB')
    parser.add_argument('--segundos', type=float, default=8)
    parser.add_argument('--adaptador', action='store_true', help='Comprueba la lectura que usa el servicio')
    parser.add_argument('--serial', default='', help='Serial de la RealSense en vivo')
    args = parser.parse_args()
    if not 0 < args.segundos <= 30:
        parser.error('--segundos debe estar entre 0 y 30')

    if args.adaptador:
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from plataforma.dispositivos import RealSense, RealSenseGrabacion
        dispositivo = RealSenseGrabacion(args.archivo) if args.archivo else RealSense(args.serial)
        try:
            for numero in range(1, 4):
                cuadro = dispositivo.leer()
                print(f'Cuadro {numero}: RGB {cuadro.color.shape}, profundidad {cuadro.profundidad.shape}', flush=True)
        finally:
            dispositivo.cerrar()
        return

    config = rs.config()
    if args.archivo:
        config.enable_device_from_file(args.archivo, repeat_playback=True)

    conteos = {'callbacks': 0, 'conjuntos': 0, 'rgb': 0, 'profundidad': 0, 'otros': 0}

    def recibir(frame):
        conteos['callbacks'] += 1
        if frame.is_frameset():
            conjunto = frame.as_frameset()
            conteos['conjuntos'] += 1
            conteos['rgb'] += bool(conjunto.get_color_frame())
            conteos['profundidad'] += bool(conjunto.get_depth_frame())
            return
        tipo = frame.profile.stream_type()
        if tipo == rs.stream.color:
            conteos['rgb'] += 1
        elif tipo == rs.stream.depth:
            conteos['profundidad'] += 1
        else:
            conteos['otros'] += 1

    rs.log_to_console(rs.log_severity.error)
    print('SDK:', rs.__version__, rs.__file__, flush=True)
    pipe = rs.pipeline()
    iniciado = False
    try:
        perfil = pipe.start(config, recibir)
        iniciado = True
        equipo = perfil.get_device()
        print('Dispositivo:', equipo.get_info(rs.camera_info.name), flush=True)
        for dato in (rs.camera_info.serial_number, rs.camera_info.firmware_version,
                     rs.camera_info.usb_type_descriptor):
            if equipo.supports(dato):
                print(str(dato) + ':', equipo.get_info(dato), flush=True)
        for flujo in perfil.get_streams():
            print('Flujo:', flujo.stream_type(), flujo.format(), flujo.fps(), 'fps', flush=True)
        time.sleep(args.segundos)
    finally:
        if iniciado:
            pipe.stop()
    print('Cuadros recibidos:', conteos, flush=True)
    if not conteos['rgb'] or not conteos['profundidad']:
        raise SystemExit('No llegaron ambos flujos al callback.')


if __name__ == '__main__':
    main()
