"""Lectura de una sola cámara: de las cajas del detector a una secuencia de instrucciones.

Una instrucción leída es una lista de ranuras. La primera ranura es la operación y las
demás son los parámetros. Cada ranura guarda sus candidatos: [(nombre, parecido), ...].
"""

from dataclasses import dataclass, field

import numpy as np


@dataclass
class Bloque:
    caja: object
    operacion: object = None
    parametros: list = field(default_factory=list)

    @property
    def centro(self):
        return np.array(self.caja.centro)


def agrupar(cajas):
    """Asigna cada cara (operación o parámetro) al bloque que contiene su centro."""
    bloques = [Bloque(caja) for caja in cajas if caja.clase == "bloque"]
    for cara in cajas:
        if cara.clase == "bloque":
            continue
        dueno = None
        for bloque in bloques:
            if bloque.caja.contiene(cara.centro):
                dueno = bloque
                break
        if dueno is None:
            continue
        if cara.clase == "operacion":
            if dueno.operacion is None or cara.confianza > dueno.operacion.confianza:
                dueno.operacion = cara
        else:
            dueno.parametros.append(cara)
    return bloques


def ordenar_parametros(bloque):
    """En un bloque se lee la operación y luego los parámetros, del más cercano al más lejano."""
    if bloque.operacion is None:
        return
    inicio = np.array(bloque.operacion.centro)
    bloque.parametros.sort(key=lambda cara: np.linalg.norm(np.array(cara.centro) - inicio))


def direccion(bloque):
    """Hacia dónde se lee el bloque: de la operación hacia sus parámetros."""
    if bloque.operacion is None or not bloque.parametros:
        return None
    inicio = np.array(bloque.operacion.centro)
    fin = np.mean([cara.centro for cara in bloque.parametros], axis=0)
    vector = fin - inicio
    largo = np.linalg.norm(vector)
    if largo == 0:
        return None
    return vector / largo


def encadenar(bloques):
    """Ordena los bloques de una cadena.

    Se parte del bloque más alejado del centro (es un extremo) y se va al vecino más cercano
    que no se ha visitado. Al final se revisa el sentido: el recorrido debe ir en la misma
    dirección en que se lee cada bloque; si no, se invierte.
    """
    if len(bloques) < 2:
        return list(bloques)

    centro = np.mean([b.centro for b in bloques], axis=0)
    actual = max(bloques, key=lambda b: np.linalg.norm(b.centro - centro))
    cadena = [actual]
    pendientes = [b for b in bloques if b is not actual]
    while pendientes:
        actual = min(pendientes, key=lambda b: np.linalg.norm(b.centro - cadena[-1].centro))
        cadena.append(actual)
        pendientes.remove(actual)

    acuerdo = 0.0
    for anterior, siguiente in zip(cadena, cadena[1:]):
        sentido = direccion(anterior)
        if sentido is not None:
            acuerdo += float(sentido @ (siguiente.centro - anterior.centro))
    if acuerdo < 0:
        cadena.reverse()
    return cadena


def leer(cajas, cuadro, fichas):
    bloques = agrupar(cajas)
    for bloque in bloques:
        ordenar_parametros(bloque)

    instrucciones = []
    for bloque in encadenar(bloques):
        ranuras = []
        if bloque.operacion is None:
            ranuras.append([])
        else:
            ranuras.append(fichas.candidatos(bloque.operacion.recortar(cuadro), "operaciones"))
        for cara in bloque.parametros:
            ranuras.append(fichas.candidatos(cara.recortar(cuadro), "parametros"))
        instrucciones.append(ranuras)
    return instrucciones
