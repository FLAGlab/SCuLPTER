import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs

from plataforma.estado import Estado
from plataforma.gemelo import Gemelo
from plataforma.vocabulario import PROGRAMAS

RAIZ = Path(__file__).resolve().parent


def crear_handler(estado):
    perezoso = {}

    def gemelo():
        if 'gemelo' not in perezoso:
            perezoso['gemelo'] = Gemelo(estado.raiz, estado.datos / 'virtual')
        return perezoso['gemelo']

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(RAIZ / 'simulador_3d'), **kwargs)

        def origen_valido(self):
            origen = self.headers.get('Origin')
            if not origen:
                return True
            url = urlparse(origen)
            return url.scheme == 'http' and url.hostname in {'localhost', '127.0.0.1', '[::1]', '::1'}

        def end_headers(self):
            if self.origen_valido() and self.headers.get('Origin'):
                self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
                self.send_header('Vary', 'Origin')
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def enviar(self, datos, status=200, tipo='application/json'):
            contenido = json.dumps(datos, ensure_ascii=False, allow_nan=False).encode() if tipo == 'application/json' else datos
            self.send_response(status)
            self.send_header('Content-Type', tipo)
            self.send_header('Content-Length', str(len(contenido)))
            self.end_headers()
            self.wfile.write(contenido)

        def do_OPTIONS(self):
            if not self.origen_valido():
                self.enviar({'error': 'Origen no permitido.'}, 403)
                return
            self.send_response(204)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

        def do_GET(self):
            if not self.origen_valido():
                self.enviar({'error': 'Origen no permitido.'}, 403)
                return
            ruta = unquote(urlparse(self.path).path)
            try:
                if ruta == '/api/estado':
                    self.enviar(estado.resumen())
                elif ruta == '/api/simbolos':
                    with estado.vocabulario.lock:
                        self.enviar(estado.vocabulario.listar())
                elif ruta == '/api/gemelo':
                    self.enviar(gemelo().estado())
                elif ruta == '/api/simbolos/ensayo':
                    nombre = parse_qs(urlparse(self.path).query).get('programa', ['minimo'])[0]
                    if nombre not in PROGRAMAS:
                        raise ValueError('Programa desconocido.')
                    with estado.vocabulario.lock:
                        self.enviar({'programa': nombre, 'codigo': PROGRAMAS[nombre],
                                     'disponibles': sorted(PROGRAMAS), **estado.vocabulario.ensayo(PROGRAMAS[nombre])})
                elif ruta.startswith('/api/foto/'):
                    foto = estado.vocabulario.ruta_foto(ruta.rsplit('/', 1)[-1])
                    self.enviar(foto.read_bytes(), tipo='image/png' if foto.suffix == '.png' else 'image/jpeg')
                elif ruta.startswith('/api/imagen/'):
                    partes = ruta.split('/')
                    pedida = parse_qs(urlparse(self.path).query).get('secuencia', [None])[0]
                    with estado.lock:
                        cam = estado.camaras[partes[3]]
                    cual = partes[4] if len(partes) > 4 else ''
                    # La página pide el cuadro cuyas cajas muestra. Se sirve ese y no otro:
                    # devolver una imagen distinta dejaría dibujar las cajas de una captura
                    # sobre la imagen de otra.
                    exacta = pedida if pedida is not None and pedida.isdigit() else None
                    with cam.lock:
                        if cual == 'depth':
                            jpg, sello = cam.jpeg_depth, None
                        elif cual == 'limpio' and exacta is not None:
                            jpg, sello = getattr(cam, 'limpios', {}).get(int(exacta)), int(exacta)
                        elif cual == 'limpio':
                            jpg, sello = getattr(cam, 'jpeg_limpio', None), getattr(cam, 'jpeg_secuencia', None)
                        else:
                            jpg, sello = cam.jpeg, cam.secuencia
                        ultima = getattr(cam, 'jpeg_secuencia', None)
                    if not jpg and pedida is not None:
                        self.enviar({'error': 'El cuadro pedido ya no está disponible.',
                                     'secuencia': ultima}, 409)
                        return
                    if not jpg:
                        raise ValueError('Todavía no hay imagen.')
                    if pedida is not None and sello is not None and str(sello) != str(pedida):
                        self.enviar({'error': 'El cuadro pedido ya no está disponible.',
                                     'secuencia': sello}, 409)
                        return
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', str(len(jpg)))
                    if sello is not None:
                        self.send_header('X-Secuencia', str(sello))
                    self.end_headers()
                    self.wfile.write(jpg)
                elif ruta.startswith('/api/'):
                    self.enviar({'error': 'Ruta desconocida.'}, 404)
                else:
                    super().do_GET()
            except (ValueError, KeyError, FileNotFoundError):
                self.enviar({'error': 'Recurso no disponible.'}, 404)

        def do_POST(self):
            if not self.origen_valido() or self.headers.get_content_type() != 'application/json':
                self.enviar({'error': 'Solicitud no permitida.'}, 403)
                return
            try:
                largo = int(self.headers.get('Content-Length', 0))
                if not 0 < largo <= 8_100_000:
                    raise ValueError('Solicitud demasiado grande o vacía.')
                datos = json.loads(self.rfile.read(largo))
                if not isinstance(datos, dict):
                    raise ValueError('Se esperaba un objeto.')
                ruta = urlparse(self.path).path
                if ruta == '/api/simbolos/guardar':
                    resultado = {'lexema': estado.vocabulario.guardar(datos)}
                elif ruta == '/api/simbolos/probar':
                    resultado = {'candidatos': estado.vocabulario.puntuar(estado.vocabulario.imagen(datos['imagen']))}
                elif ruta.startswith('/api/gemelo/'):
                    accion = ruta.rsplit('/', 1)[-1]
                    g = gemelo()
                    if accion == 'cargar':
                        resultado = g.cargar(datos.get('escena', 'completa'))
                    elif accion == 'paso':
                        resultado = g.avanzar(int(datos.get('incremento', 1)))
                    elif accion == 'reiniciar':
                        resultado = g.reiniciar()
                    elif accion == 'mover':
                        resultado = g.mover(datos['id'], datos.get('centro'), datos.get('objetivo'), datos.get('fov'))
                    elif accion == 'anadir':
                        resultado = g.anadir(str(datos['id'])[:40], datos.get('nombre'))
                    elif accion == 'quitar':
                        resultado = g.quitar(datos['id'])
                    elif accion == 'guardar':
                        resultado = g.guardar(estado.datos / 'camaras_virtuales.json')
                    else:
                        raise ValueError('Acción desconocida.')
                elif ruta.startswith('/api/camaras/'):
                    resultado = estado.accion(ruta.rsplit('/', 1)[-1], datos)
                else:
                    raise ValueError('Acción desconocida.')
                self.enviar(resultado)
            except (ValueError, KeyError, TypeError) as exc:
                self.enviar({'error': str(exc)}, 400)
            except Exception:
                self.enviar({'error': 'No se pudo completar la operación. Revisa la captura y los controladores.'}, 500)

        def log_message(self, formato, *args):
            if args and str(args[1]) not in {'200', '204'}:
                super().log_message(formato, *args)
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--puerto', type=int, default=8766)
    parser.add_argument('--datos', type=Path, default=RAIZ / 'datos_locales')
    args = parser.parse_args()
    estado = Estado(RAIZ, args.datos)
    servidor = ThreadingHTTPServer(('127.0.0.1', args.puerto), crear_handler(estado))
    print(f'SCuLPTER: http://127.0.0.1:{args.puerto}', flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()
        estado.cerrar()


if __name__ == '__main__':
    main()
