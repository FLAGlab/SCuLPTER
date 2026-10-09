import numpy as np

from plataforma.escena_virtual import Mano, centro_de, fuentes, marco_desde_avance
from plataforma.guiones import _preparar
from plataforma.lector import Lector

QUIETO = 12


def dos_webcams(escena, altura=380., fov=40., separacion=60.):
    from plataforma.escena_virtual import Camara
    centro = centro_de(escena.fichas)
    mira = [float(centro[0]), float(centro[1]), 30.]
    return [Camara('web1', 'Webcam izquierda', [centro[0] - separacion / 2, -45., altura], mira, fov),
            Camara('web2', 'Webcam derecha', [centro[0] + separacion / 2, -45., altura], mira, fov)]


def girar(ficha, grados):
    avance, lateral, normal = marco_desde_avance(
        np.array([np.cos(np.radians(grados)), np.sin(np.radians(grados)), 0.]))
    ficha.avance, ficha.lateral, ficha.normal = avance, lateral, normal


class Mesa:

    def __init__(self, vocabulario, programa, camaras=None):
        self.vocabulario = vocabulario
        self.escena = _preparar(programa, vocabulario)
        if camaras is not None:
            self.escena.camaras = camaras(self.escena)
        self.instante = 10.0
        self.secuencia = 0
        self.bloques, corte = [], 0
        for linea in programa:
            cuantas = len(linea.split())
            self.bloques.append(self.escena.fichas[corte:corte + cuantas])
            corte += cuantas
        self.guardado = None

    def programa_real(self):
        lineas = []
        for bloque in self.bloques:
            vivas = [f for f in bloque if f.id not in self.escena.retiradas]
            if vivas:
                lineas.append(' '.join(f.lexema for f in vivas))
        return lineas

    def ficha(self, lexema, orden=0):
        return [f for f in self.escena.fichas if f.lexema == lexema][orden]

    def retirar(self, *cuales):
        for cual in cuales:
            lexema, orden = cual if isinstance(cual, tuple) else (cual, 0)
            self.escena.retirar(self.ficha(lexema, orden).id)

    def devolver(self, *lexemas):
        self.escena.retiradas = set()
        if self.guardado is not None:
            self.escena.cuerpos, self.escena.conexiones = self.guardado
            self.guardado = None

    def retirar_bloque(self, n):
        """Quita el bloque entero: su cuerpo, su ficha de operación y sus parámetros."""
        if self.guardado is None:
            self.guardado = (list(self.escena.cuerpos), list(self.escena.conexiones))
        for ficha in self.bloques[n]:
            self.escena.retirar(ficha.id)
        self.escena.cuerpos = [c for k, c in enumerate(self.escena.cuerpos) if k != n]
        self.escena.conexiones = [c for c in self.escena.conexiones
                                  if n not in (c.get('desde'), c.get('hacia'))]

    def cambiar(self, lexema, nuevo, orden=0):
        self.ficha(lexema, orden).lexema = nuevo

    def mano(self, sobre=None, radio=30., alto=120.):
        if sobre is None:
            self.escena.manos = []
            return
        centro = self.ficha(sobre).centro
        self.escena.manos = [Mano((centro[0], centro[1], 0.), radio, alto)]

    def quitar_camara(self, id):
        self.escena.camaras = [c for c in self.escena.camaras if c.id != id]

    def capturas(self, lector, cuantas=1, bitacora=None):
        salida = None
        for _ in range(cuantas):
            self.secuencia += 1
            self.instante += 0.1
            marcos, _ = fuentes(self.escena, self.vocabulario, self.instante, self.secuencia)
            salida = lector.actualizar(marcos, self.instante)
            if bitacora is not None:
                bitacora.append({'real': self.programa_real(), **salida['lectura']})
        return salida


def ensayar(vocabulario, programa, acciones, camaras=None, validar=None):
    mesa = Mesa(vocabulario, programa, camaras)
    lector = Lector(vocabulario, validar=validar) if validar else Lector(vocabulario)
    registro, bitacora = [], []
    for accion in acciones:
        nombre, aplicar, espera = accion[:3]
        quietas = accion[3] if len(accion) > 3 else QUIETO
        antes = len(lector.episodios)
        aplicar(mesa)
        mesa.capturas(lector, quietas, bitacora)
        lector.esperar()
        nuevas = list(lector.episodios)[antes:]
        registro.append({'accion': nombre, 'espera': espera,
                         'real': mesa.programa_real(),
                         'latencia_lectura': nuevas[-1] if nuevas else None,
                         **lector.estado()})
    return mesa, lector, registro, bitacora
