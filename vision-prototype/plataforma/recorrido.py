import time

from plataforma.escena_virtual import CONFIGURACION_PASOS, fuentes
from plataforma.fusion import Fusion

PASOS = 12


def recorrer(escena, guion, vocabulario, pasos=PASOS, imagenes=None):
    """Avanza el guion paso a paso por el reconocimiento y la fusión reales y devuelve el último
    resultado con el tiempo de cada captura. La fusión exige 0.8 s de quietud y cada paso avanza
    0.1 s, así que por debajo de nueve pasos no llega a confirmar nada."""
    fusion = Fusion()
    resultado, tiempos = None, []
    for paso in range(pasos):
        guion(escena, paso)
        instante = 10.0 + paso * 0.1
        inicio = time.perf_counter()
        marcos, vistas = fuentes(escena, vocabulario, instante, paso + 1)
        resultado = fusion.actualizar(marcos, CONFIGURACION_PASOS, instante)
        tiempos.append(time.perf_counter() - inicio)
        if imagenes is not None:
            imagenes.append(vistas)
    return resultado, tiempos


def leido(resultado):
    return [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
