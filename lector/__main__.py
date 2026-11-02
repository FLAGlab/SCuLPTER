"""Lectura en vivo de programas SCuLPT con varias cámaras.

    python3 -m lector --camaras 0 1 2 3

Grafo de dependencias:

    camara 0 ─┐
    camara 1 ─┤
    camara 2 ─┼─► votacion ─► programa (estable) ─► veredicto (Scala) ─► simulador
    camara 3 ─┘
"""

import argparse
import threading
import time

from lector.camaras import abrir
from lector.detector import Detector
from lector.fichas import Fichas, Modelo
from lector.grafo import Estable, Grafo
from lector.lectura import leer
from lector.lenguaje import Lenguaje, codigo
from lector.servidor import Servidor
from lector.votacion import HUECO, elegir, votar

# Lecturas separadas por más que esto no se mezclan en una misma votación.
VENTANA = 0.3


def observar(camara, fuente, detector, fichas, grafo, pausa):
    ultima = 0.0
    while True:
        cuadro, hora = camara.ultimo()
        if cuadro is None or hora == ultima:
            time.sleep(0.01)
            continue
        ultima = hora
        cajas = detector.detectar(cuadro)
        grafo.publicar(fuente, (hora, leer(cajas, cuadro, fichas)))
        time.sleep(pausa)


def main():
    parametros = argparse.ArgumentParser()
    parametros.add_argument("--camaras", type=int, nargs="+", default=[0, 1, 2, 3])
    parametros.add_argument("--modelo", default="lector/modelos/detector.pt")
    parametros.add_argument("--fichas", default="lector/datos/fichas")
    parametros.add_argument("--minimo", type=int, default=2, help="cámaras que deben coincidir")
    parametros.add_argument("--cps", type=float, default=5, help="cuadros por segundo por cámara")
    args = parametros.parse_args()

    lenguaje = Lenguaje()
    fichas = Fichas(args.fichas, Modelo())
    servidor = Servidor()
    servidor.arrancar()

    def votar_ventana(*lecturas):
        recientes = [lectura for lectura in lecturas if lectura is not None]
        if not recientes:
            return None
        ahora = max(hora for hora, _ in recientes)
        vigentes = [instrucciones for hora, instrucciones in recientes if ahora - hora <= VENTANA]
        minimo = min(args.minimo, len(vigentes))
        programa = []
        for votada in votar(vigentes):
            programa.append(elegir(votada, lenguaje.es_valida, minimo))
        return ahora, programa

    def validar(programa):
        if programa is None:
            return None
        for nombres in programa:
            if HUECO in nombres:
                return {"programa": programa, "valido": False, "etapa": "incompleto", "mensaje": ""}
        resultado = lenguaje.analizar(codigo(programa))
        resultado["programa"] = programa
        return resultado

    grafo = Grafo()
    lecturas = [grafo.fuente(f"camara {indice}") for indice in args.camaras]
    votado = grafo.derivado("votacion", votar_ventana, *lecturas)
    programa = grafo.derivado("programa", Estable(), votado)
    veredicto = grafo.derivado("veredicto", validar, programa)

    def mostrar(valor, version):
        if valor["valido"]:
            estado = "válido"
        else:
            estado = valor["etapa"]
        print(f"v{version} {estado}")
        print(codigo(valor["programa"]))
        servidor.enviar(valor["programa"], valor, version)

    grafo.escuchar(veredicto, mostrar)
    grafo.arrancar()

    camaras = abrir(args.camaras)
    for camara, fuente in zip(camaras, lecturas):
        detector = Detector(args.modelo)
        hilo = threading.Thread(
            target=observar,
            args=(camara, fuente, detector, fichas, grafo, 1 / args.cps),
            daemon=True,
        )
        hilo.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        for camara in camaras:
            camara.cerrar()
        lenguaje.cerrar()


if __name__ == "__main__":
    main()
