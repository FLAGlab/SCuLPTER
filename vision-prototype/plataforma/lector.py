import hashlib
import json
import os
import subprocess
import threading
import time
from collections import OrderedDict, deque

import numpy as np

from plataforma.medidas import CONFIGURACION_PASOS
from plataforma.fusion import Fusion, puede_ejecutar

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTERPRETE = os.path.join(RAIZ, 'simulador_3d', 'generado', 'interprete.js')
LIMITE_PASOS = 200
HISTORIA = 120
MUESTRAS = 256
CACHE_MAXIMA = 12
GUION = (
    "import {sculptEjecutar} from %s;"
    "const r = sculptEjecutar(process.argv[1] + '\\n', %d);"
    "process.stdout.write('@@' + JSON.stringify({valido: r.valido, etapa: r.etapa,"
    "decide: r.decide, mensaje: r.mensaje || '', completa: !!r.completa, limite: r.limite,"
    "error: r.error || null, ordenPilas: r.ordenPilas, pasos: r.pasos || [],"
    "traza: r.traza || []}) + '@@');"
)


def programa_de(resultado):
    return [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]


def version_de(resultado):
    piezas = sorted((p['lexema'], p['estado'], *np.round(p['posicion'], 0).tolist())
                    for p in resultado['piezas'])
    cuerpo = repr((programa_de(resultado), piezas, bool(puede_ejecutar(resultado))))
    return hashlib.blake2b(cuerpo.encode(), digest_size=8).hexdigest()


def en_scala(codigo):
    if not os.path.isfile(INTERPRETE):
        return {'etapa': 'sin interprete', 'error': 'falta generado/interprete.js'}
    guion = GUION % (json.dumps('file://' + INTERPRETE), LIMITE_PASOS)
    salida = subprocess.run(['node', '--input-type=module', '-e', guion, codigo],
                            capture_output=True, text=True, timeout=60)
    partes = salida.stdout.split('@@')
    if len(partes) < 3:
        return {'etapa': 'sin respuesta', 'error': salida.stderr[-200:]}
    return json.loads(partes[1])


class Lector:
    """Ciclo continuo: observaciones por cámara, acuerdo entre vistas, una versión por montaje
    leído y un veredicto de Scala por versión nueva. Los detalles medidos están en
    docs/LECTURA_CONTINUA.md."""

    def __init__(self, vocabulario, config=None, validar=en_scala):
        self.vocabulario = vocabulario
        self.config = dict(config or CONFIGURACION_PASOS)
        self.validar = validar
        self.fusion = Fusion()
        self.lock = threading.RLock()
        self.orden = 0
        self.version = None
        self.confirmada = None
        self.cambio = None
        self.lectura = None
        self.veredicto = None
        self.cache = OrderedDict()
        self.enviados = set()
        self.historial = deque(maxlen=HISTORIA)
        self.episodios = deque(maxlen=MUESTRAS)
        self.ejecuciones = deque(maxlen=MUESTRAS)
        self.hilos = []
        self.capturas = self.completas = self.validaciones = self.lecturas_completas = 0

    def reiniciar(self, config=None):
        with self.lock:
            if config is not None:
                self.config = dict(config)
            self.fusion.reiniciar()
            self.version = self.confirmada = self.cambio = None
            self.lectura = self.veredicto = None
            self.enviados.clear()
            self.cache.clear()

    def actualizar(self, fuentes, ahora=None):
        ahora = time.monotonic() if ahora is None else ahora
        reloj = time.monotonic()
        try:
            resultado = self.fusion.actualizar(fuentes, self.config, ahora)
            version = version_de(resultado)
        except Exception as error:
            return self.fallar(f'No se pudo fusionar esta captura: {error}'[:200], ahora)
        coste_fusion = time.monotonic() - reloj
        with self.lock:
            if version != self.version:
                self.orden += 1
                self.version = version
                self.veredicto = None
            orden = self.orden
            completa = puede_ejecutar(resultado)
            if not completa or version != self.confirmada:
                if self.cambio is None:
                    self.cambio = ahora
            latencia = None
            if completa and self.cambio is not None:
                latencia = round(ahora - self.cambio, 3)
                self.episodios.append(latencia)
                self.lecturas_completas += 1
                self.cambio = None
            if completa:
                self.confirmada = version
            if completa:
                estado = 'confirmada'
            elif resultado['estado'] == 'estabilizando':
                estado = 'estabilizando'
            else:
                estado = 'pendiente'
            self.lectura = {
                'version': version, 'orden': orden, 'instante': ahora,
                'estado': estado, 'confirmada': completa,
                'programa': programa_de(resultado),
                'motivo': None if completa else (resultado['avisos'][0] if resultado['avisos']
                                                 else f"el montaje no se queda quieto ({resultado['estado']})"),
                'latencia_lectura': latencia, 'espera_s': round(ahora - (self.cambio or ahora), 3),
                'coste_fusion_s': round(coste_fusion, 4),
                'piezas': len(resultado['piezas']), 'avisos': list(resultado['avisos']),
                'camaras': list(resultado.get('camaras') or []),
            }
            if completa and self.veredicto is None:
                self._pedir(orden, version, '\n'.join(self.lectura['programa']))
            self.capturas += 1
            self.completas += bool(completa)
            self.historial.append({**self.lectura, 'veredicto': self.veredicto})
            return self.estado()

    def fallar(self, motivo, ahora=None):
        """Un fallo del ciclo no deja en pie la lectura anterior: publica pendiente con motivo y
        estrena orden, para que ni el veredicto vigente ni una respuesta tardía de Scala sigan
        habilitando la ejecución física."""
        ahora = time.monotonic() if ahora is None else ahora
        with self.lock:
            self.fusion.fallar()
            self.orden += 1
            self.version = self.confirmada = self.veredicto = None
            if self.cambio is None:
                self.cambio = ahora
            self.lectura = {'version': None, 'orden': self.orden, 'instante': ahora,
                            'estado': 'pendiente', 'confirmada': False, 'programa': [],
                            'motivo': motivo, 'latencia_lectura': None, 'espera_s': 0.0,
                            'coste_fusion_s': None, 'piezas': 0, 'avisos': [motivo],
                            'camaras': []}
            self.capturas += 1
            self.historial.append({**self.lectura, 'veredicto': None})
            return self.estado()

    def _pedir(self, orden, version, codigo):
        if codigo in self.cache:
            self.cache.move_to_end(codigo)
            self._aceptar(orden, version, self.cache[codigo], 0.0)
            return
        if codigo in self.enviados:
            return
        self.enviados.add(codigo)
        hilo = threading.Thread(target=self._trabajar, args=(orden, version, codigo), daemon=True)
        self.hilos = [h for h in self.hilos if h.is_alive()] + [hilo]
        hilo.start()

    def _trabajar(self, orden, version, codigo):
        reloj = time.monotonic()
        try:
            veredicto = self.validar(codigo)
        except Exception as error:
            veredicto = {'etapa': 'sin respuesta', 'error': str(error)[:200]}
        tardanza = time.monotonic() - reloj
        with self.lock:
            self.cache[codigo] = veredicto
            self.cache.move_to_end(codigo)
            while len(self.cache) > CACHE_MAXIMA:
                self.cache.popitem(last=False)
            self.enviados.discard(codigo)
            self.ejecuciones.append(tardanza)
            self.validaciones += 1
        self._aceptar(orden, version, veredicto, tardanza)

    def _aceptar(self, orden, version, veredicto, tardanza):
        with self.lock:
            if orden < self.orden or version != self.version:
                return False
            self.veredicto = {**veredicto, 'version': version, 'orden': orden,
                              'latencia_scala': round(tardanza, 3)}
            return True

    def esperar(self, limite=30.0):
        with self.lock:
            pendientes = list(self.hilos)
        for hilo in pendientes:
            hilo.join(timeout=limite)
        with self.lock:
            self.hilos = [h for h in self.hilos if h.is_alive()]

    def estado(self):
        with self.lock:
            return {'lectura': dict(self.lectura) if self.lectura else None,
                    'veredicto': dict(self.veredicto) if self.veredicto else None}

    def metricas(self):
        def resumen(valores, etiqueta):
            if not valores:
                return {f'{etiqueta}_mediana_s': None, f'{etiqueta}_p95_s': None}
            return {f'{etiqueta}_mediana_s': round(float(np.median(valores)), 3),
                    f'{etiqueta}_p95_s': round(float(np.percentile(valores, 95)), 3)}

        with self.lock:
            return {'capturas': self.capturas, 'versiones': self.orden,
                    'lecturas_completas': self.lecturas_completas,
                    'capturas_completas': self.completas,
                    'pendientes': self.capturas - self.completas,
                    'ejecuciones': self.validaciones,
                    'capturas_sin_reejecutar': self.completas - self.validaciones,
                    **resumen(self.episodios, 'lectura'),
                    **resumen(self.ejecuciones, 'scala')}
