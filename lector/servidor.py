import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from websockets.exceptions import ConnectionClosed
from websockets.sync.server import serve

from lector.votacion import HUECO

SIMULADOR = Path(__file__).parents[1] / "simulador"
PUERTO_WEB = 8000
PUERTO_SOCKET = 8765

SIN_LEER = "<sin leer>"


class Archivos(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SIMULADOR), **kwargs)

    def log_message(self, formato, *args):
        pass


class Servidor:
    def __init__(self):
        self.conexiones = set()
        self.candado = threading.Lock()
        self.ultimo = None

    def arrancar(self):
        web = ThreadingHTTPServer(("localhost", PUERTO_WEB), Archivos)
        threading.Thread(target=web.serve_forever, daemon=True).start()

        socket = serve(self._atender, "localhost", PUERTO_SOCKET)
        threading.Thread(target=socket.serve_forever, daemon=True).start()
        print(f"Simulador en http://localhost:{PUERTO_WEB} (activa «Leer desde las cámaras» en la Mesa)")

    def _atender(self, conexion):
        with self.candado:
            self.conexiones.add(conexion)
            ultimo = self.ultimo
        if ultimo is not None:
            conexion.send(ultimo)
        try:
            for _ in conexion:
                pass
        except ConnectionClosed:
            pass
        finally:
            with self.candado:
                self.conexiones.discard(conexion)

    def enviar(self, programa, veredicto, version):
        instrucciones = []
        for nombres in programa:
            nombres = [SIN_LEER if nombre == HUECO else nombre for nombre in nombres]
            instrucciones.append({"token": nombres[0], "operandos": nombres[1:]})
        mensaje = json.dumps({
            "tipo": "programa",
            "version": version,
            "instrucciones": instrucciones,
            "veredicto": veredicto,
        })
        with self.candado:
            self.ultimo = mensaje
            conexiones = list(self.conexiones)
        for conexion in conexiones:
            try:
                conexion.send(mensaje)
            except ConnectionClosed:
                pass
