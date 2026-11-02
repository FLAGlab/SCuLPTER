from collections import Counter
from itertools import product

HUECO = "_"
SALTO = -1


def primero(ranura):
    if not ranura:
        return HUECO
    return ranura[0][0]


def parecido(a, b):
    if primero(a[0]) == HUECO or primero(b[0]) == HUECO:
        puntos = 0
    elif primero(a[0]) == primero(b[0]):
        puntos = 2
    else:
        puntos = -1
    for ranura_a, ranura_b in zip(a[1:], b[1:]):
        if primero(ranura_a) != HUECO and primero(ranura_a) == primero(ranura_b):
            puntos += 1
    return puntos


def alinear(referencia, otra):
    n, m = len(referencia), len(otra)
    tabla = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        tabla[i][0] = i * SALTO
    for j in range(1, m + 1):
        tabla[0][j] = j * SALTO
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            tabla[i][j] = max(
                tabla[i - 1][j - 1] + parecido(referencia[i - 1], otra[j - 1]),
                tabla[i - 1][j] + SALTO,
                tabla[i][j - 1] + SALTO,
            )

    pareja = [None] * n
    i, j = n, m
    while i > 0 and j > 0:
        if tabla[i][j] == tabla[i - 1][j - 1] + parecido(referencia[i - 1], otra[j - 1]):
            pareja[i - 1] = otra[j - 1]
            i -= 1
            j -= 1
        elif tabla[i][j] == tabla[i - 1][j] + SALTO:
            i -= 1
        else:
            j -= 1
    return pareja


def votar_ranura(ranuras):
    puntaje = Counter()
    apoyo = Counter()
    for ranura in ranuras:
        for nombre, valor in ranura:
            puntaje[nombre] += valor
        if ranura:
            apoyo[ranura[0][0]] += 1
    votos = [(nombre, puntaje[nombre], apoyo[nombre]) for nombre in puntaje]
    votos.sort(key=lambda voto: voto[1], reverse=True)
    return votos


def votar(lecturas):
    lecturas = [lectura for lectura in lecturas if lectura]
    if not lecturas:
        return []
    referencia = max(lecturas, key=len)
    columnas = [[instruccion] for instruccion in referencia]
    for lectura in lecturas:
        if lectura is referencia:
            continue
        for columna, pareja in zip(columnas, alinear(referencia, lectura)):
            if pareja is not None:
                columna.append(pareja)

    programa = []
    for columna in columnas:
        largos = Counter(len(instruccion) for instruccion in columna)
        largo = max(largos, key=lambda n: (largos[n], n))
        votada = []
        for posicion in range(largo):
            ranuras = [instruccion[posicion] for instruccion in columna if posicion < len(instruccion)]
            votada.append(votar_ranura(ranuras))
        programa.append(votada)
    return programa


def elegir(votada, es_valida, minimo):
    incompleta = False
    for ranura in votada:
        if not ranura or ranura[0][2] < minimo:
            incompleta = True

    if incompleta:
        nombres = []
        for ranura in votada:
            if ranura and ranura[0][2] >= minimo:
                nombres.append(ranura[0][0])
            else:
                nombres.append(HUECO)
        return nombres

    opciones = [ranura[:3] for ranura in votada]
    combinaciones = sorted(product(*opciones), key=lambda c: sum(voto[1] for voto in c), reverse=True)
    for combinacion in combinaciones:
        nombres = [voto[0] for voto in combinacion]
        if es_valida(nombres):
            return nombres
    return [ranura[0][0] for ranura in votada]
