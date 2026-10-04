import base64
import threading

import cv2
import numpy as np

from plataforma.escena_virtual import (CONFIGURACION_PASOS, HUECO_CONECTOR_MM, Camara, Ficha, camaras_por_omision, centro_de,
                                       cobertura, cuadro, escenario_de, guardar_camaras, marco_desde_avance)
from clasificador_simbolos import SIN_LEER
from plataforma.fusion import Fusion, puede_ejecutar
from plataforma.geometria_fusion import proyectar
from plataforma.guiones import EJEMPLOS, EJEMPLOS_SIN_ESCENA, GUIONES
from plataforma.vocabulario import Vocabulario


def codificar(imagen):
    ok, buffer = cv2.imencode('.jpg', imagen, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    if not ok:
        raise ValueError('No se pudo codificar la vista virtual.')
    return 'data:image/jpeg;base64,' + base64.b64encode(buffer.tobytes()).decode()


def _mas_cerca(observaciones, uv, alcance=None):
    if uv is None or not observaciones:
        return None
    elegida = min(observaciones, key=lambda o: np.hypot(o['x'] - uv[0], o['y'] - uv[1]))
    if alcance is not None and np.hypot(elegida['x'] - uv[0], elegida['y'] - uv[1]) > alcance:
        return None
    return elegida


def procedencia(pieza, verdad):
    camaras = pieza.get('lectores') or []
    if pieza['estado'] != 'confirmada':
        return 'sin_informacion' if pieza['estado'] == 'no_observada' else pieza['estado']
    if len(camaras) > 1:
        return 'coincidencia_independiente'
    if pieza.get('metodo') == 'nube':
        return 'inferencia_geometrica'
    return 'observacion_unica'


class Gemelo:
    def __init__(self, raiz, datos):
        self.lock = threading.RLock()
        self.vocabulario = Vocabulario(raiz, datos)
        self.fusion = Fusion()
        self.paso = 0
        self.captura = 0
        self.reproduciendo = False
        self.escena_nombre = 'completa'
        self.escena, self.guion = GUIONES['completa'][0](self.vocabulario)
        self.ultimo = None

    def cargar(self, nombre):
        if nombre not in GUIONES:
            raise ValueError('Escena desconocida.')
        with self.lock:
            self.escena_nombre = nombre
            self.escena, self.guion = GUIONES[nombre][0](self.vocabulario)
            self.fusion = Fusion()
            self.paso = 0
            self.captura = 0
            self.ultimo = None
        return self.avanzar(0)

    def reiniciar(self):
        return self.cargar(self.escena_nombre)

    def mover(self, id, centro=None, objetivo=None, fov=None):
        with self.lock:
            camara = next((c for c in self.escena.camaras if c.id == id), None)
            if camara is None:
                raise ValueError('Esa cámara no existe en la escena.')
            if centro is not None:
                camara.centro = np.asarray([float(v) for v in centro], float)
            if objetivo is not None:
                camara.objetivo = np.asarray([float(v) for v in objetivo], float)
            if fov is not None:
                if not 10 <= float(fov) <= 120:
                    raise ValueError('El campo de visión debe ir de 10 a 120 grados.')
                camara.fov = float(fov)
            if camara.modelo() is None:
                raise ValueError('Esa pose no produce una cámara utilizable.')
        return self.avanzar(0)

    def anadir(self, id, nombre=None):
        with self.lock:
            if any(c.id == id for c in self.escena.camaras):
                raise ValueError('Ya hay una cámara con ese identificador.')
            centro = centro_de(self.escena.fichas)
            angulo = len(self.escena.camaras) * 1.1
            posicion = centro + [120 * np.cos(angulo), 120 * np.sin(angulo), 250.]
            self.escena.camaras.append(Camara(id, nombre or id, posicion, centro, 50.))
        return self.avanzar(0)

    def quitar(self, id):
        with self.lock:
            if len(self.escena.camaras) <= 1:
                raise ValueError('Debe quedar al menos una cámara.')
            self.escena.camaras = [c for c in self.escena.camaras if c.id != id]
        return self.avanzar(0)

    def guardar(self, ruta):
        with self.lock:
            guardar_camaras(self.escena.camaras, ruta)
        return {'guardado': str(ruta), 'camaras': len(self.escena.camaras)}

    def avanzar(self, incremento=1):
        with self.lock:
            self.paso = max(0, self.paso + incremento)
            self.guion(self.escena, self.paso)
            self.captura += 1
            instante = 10.0 + self.captura * 0.1
            vistas, marcos, modelos = {}, [], {}
            mundo = escenario_de(self.escena)
            for camara in self.escena.camaras:
                imagen, marco = cuadro(self.escena, camara, self.vocabulario, instante, self.captura, mundo=mundo)
                modelos[camara.id] = camara.modelo()
                vistas[camara.id] = {'imagen': codificar(imagen), 'cobertura': cobertura(camara),
                                     'proyeccion': {},
                                     'observaciones': [{'lexema': o['lexema'], 'x': float(o['x']), 'y': float(o['y']),
                                                        'caja': [float(v) for v in o['caja']],
                                                        'calidad': round(float(o['calidad']), 3),
                                                        'candidatos': [{'lexema': c['lexema'], 'nombre': c['nombre'],
                                                                        'puntaje': round(float(c['puntaje']), 3)}
                                                                       for c in o['candidatos'][:3]]}
                                                       for o in marco['observaciones']],
                                     'sin_leer': int(sum(1 for o in marco['observaciones'] if o['lexema'] == '<sin leer>'))}
                marcos.append({'id': camara.id, 'nombre': camara.nombre, 'estado': 'conectada', 'virtual': True,
                               'pose': camara.pose(), 'intrinsecos': camara.intrinsecos(), 'historial': [marco]})
            resultado = self.fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
            for camara in self.escena.camaras:
                modelo_camara = modelos[camara.id]
                if modelo_camara is None:
                    continue
                proyeccion = vistas[camara.id]['proyeccion']
                for p in resultado['piezas']:
                    uv, z = proyectar(modelo_camara, [p['posicion']])
                    if z[0] > 0 and 0 <= uv[0][0] < camara.resolucion[0] and 0 <= uv[0][1] < camara.resolucion[1]:
                        proyeccion[p['id']] = [float(uv[0][0]), float(uv[0][1])]
            verdad = sorted(self.escena.verdad())
            piezas = []
            for p in resultado['piezas']:
                detalle = []
                lectores = set(p.get('lectores') or [])
                aportan = set(p.get('camaras') or [])
                for camara in self.escena.camaras:
                    vista = vistas[camara.id]
                    uv = vista['proyeccion'].get(p['id'])
                    fila = {'camara': camara.id, 'nombre': camara.nombre, 'propone': None, 'candidatos': []}
                    if camara.id in lectores:
                        elegida = _mas_cerca(vista['observaciones'], uv)
                        detalle.append({**fila, 'clase': 'asociada', 've': True, 'propone': p['lexema'],
                                        'candidatos': elegida['candidatos'][:3] if elegida else [],
                                        'motivo': 'la fusión usó esta lectura para aceptar la ficha'})
                        continue
                    if uv is None:
                        detalle.append({**fila, 'clase': 'fuera', 've': False,
                                        'motivo': 'la ficha cae fuera de su encuadre'})
                        continue
                    elegida = _mas_cerca(vista['observaciones'], uv, 45.0)
                    if elegida is None:
                        detalle.append({**fila, 'clase': 'sin_deteccion', 've': False,
                                        'motivo': 'la encuadra pero no detectó nada ahí'})
                        continue
                    ilegible = elegida['lexema'] == SIN_LEER
                    detalle.append({**fila, 'clase': 'ilegible' if ilegible else 'contradice', 've': True,
                                    'propone': None if ilegible else elegida['lexema'],
                                    'candidatos': elegida['candidatos'][:3],
                                    'motivo': 'la detectó pero no pudo identificarla' if ilegible
                                    else 'propone otro símbolo y la fusión no la usó',
                                    'aporta': camara.id in aportan})
                piezas.append({**p, 'procedencia': procedencia(p, verdad), 'vistas': detalle,
                               'respaldo': len(lectores),
                               'provisional': bool(p.get('edad_ms', 0) > 400)})
            def marco(pieza):
                return {'avance': pieza.avance.tolist(), 'lateral': pieza.lateral.tolist(),
                        'normal': pieza.normal.tolist()}
            geometria = {
                'bloques': [{'centro': c.centro.tolist(), 'largo': c.largo, 'ancho': c.ancho,
                             'alto': c.alto, 'color': list(c.color), **marco(c)} for c in self.escena.cuerpos],
                'fichas': [{'id': f.id, 'lexema': f.lexema, 'centro': f.centro.tolist(), 'lado': f.lado,
                            'retirada': f.id in self.escena.retiradas, **marco(f)}
                           for f in self.escena.fichas],
                'conectores': [{'centro': c['centro'], 'avance': c['avance'], 'largo': HUECO_CONECTOR_MM,
                                'normal': marco_desde_avance(c['avance'])[2].tolist(),
                                'desde': c.get('desde'), 'hacia': c.get('hacia'),
                                'estado': 'estimada'} for c in self.escena.conexiones if c['tipo'] == 'conector'],
                'tes': [{'id': f'te{n}', 'centro': t.centro.tolist(), 'avance': t.avance.tolist(),
                         'rama': t.rama.tolist(), 'largo': t.largo,
                         'puertos': {k: v.tolist() for k, v in t.puertos().items()},
                         'estado': 'sin_resolver'} for n, t in enumerate(self.escena.tes)],
                'soportes': [{'centro': s.centro.tolist(), 'lado': s.lado, 'alto': s.alto}
                             for s in self.escena.soportes],
                'fondos': [{'centro': f.centro.tolist(), 'ancho': f.ancho, 'alto': f.alto}
                           for f in self.escena.fondos],
                'manos': [{'centro': m.centro.tolist(), 'radio': m.radio, 'alto': m.alto}
                          for m in self.escena.manos],
                'centro': centro_de(self.escena.fichas).tolist(),
            }
            self.ultimo = {
                'geometria': geometria,
                'escena': self.escena_nombre, 'descripcion': GUIONES[self.escena_nombre][2],
                'debe_ejecutar': GUIONES[self.escena_nombre][1], 'sintetica': True,
                'paso': self.paso, 'reproduciendo': self.reproduciendo,
                'escenas': sorted(GUIONES), 'ejemplos': dict(EJEMPLOS), 'ejemplos_pendientes': dict(EJEMPLOS_SIN_ESCENA),
                'escenas_programa': self.catalogo(),
                'programa': self.escena.programa, 'verdad': verdad,
                'camaras': [{**c.resumen(), **vistas[c.id]} for c in self.escena.camaras],
                'fusion': {'estado': resultado['estado'], 'estable': bool(resultado['estable']),
                           'compatible': bool(resultado['compatible']), 'revision': resultado['revision'],
                           'habilita_ejecucion': bool(puede_ejecutar(resultado)),
                           'instrucciones': resultado['instrucciones'], 'piezas': piezas,
                           'avisos': resultado['avisos'], 'sin_localizar': resultado['sin_localizar']},
                'codigo': '\n'.join(' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']),
                'estructura': {
                    'tes': [{'centro': t.centro.tolist(), 'puertos': {k: v.tolist() for k, v in t.puertos().items()}}
                            for t in self.escena.tes],
                    'conexiones': [dict(c) for c in self.escena.conexiones],
                    'soportes': len(self.escena.soportes), 'fondos': len(self.escena.fondos),
                    'uniones_confirmadas': bool(resultado.get('conexiones_confirmadas')),
                },
            }
            return self.ultimo

    def catalogo(self):
        if not hasattr(self, '_catalogo'):
            self._catalogo = {}
            for nombre, (constructor, _, _) in GUIONES.items():
                try:
                    escena, _ = constructor(self.vocabulario)
                    self._catalogo[nombre] = list(escena.programa)
                except Exception:
                    continue
        return dict(self._catalogo)

    def estado(self):
        return self.ultimo or self.avanzar(0)
