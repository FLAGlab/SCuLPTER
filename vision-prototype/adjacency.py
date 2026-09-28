import argparse
import itertools
import json
import os

import numpy as np

import clasificador_simbolos as clasif

PASO_MM = 60.0
TOLERANCIA_MM = 15.0
TOLERANCIA_MEDIDA_MM = 8.0
PARAM_MIN_MM = 5.0
PARAM_PERP_MM = 25.0
PARAM_CERCA_MM = 45.0
MAX_ORDENES = 16

TABLA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "simbolos.json")


def tipos() -> dict[str, str]:
    if not os.path.isfile(TABLA):
        return {}
    with open(TABLA, encoding="utf-8") as f:
        tabla = json.load(f)
    return {entrada["lexema"]: entrada["tipo"] for entrada in tabla.get("simbolos", [])}


_TIPOS = tipos()


def tipo_de(lexema: str) -> str:
    if clasif.ilegible(lexema):
        return "desconocido"
    tipo = _TIPOS.get(lexema)
    if tipo:
        return tipo
    try:
        float(lexema)
        return "literal"
    except ValueError:
        pass
    return "operacion" if lexema == "?" or lexema.isupper() else "pila"


def separar(puntos):
    ops, params, sueltas = [], [], []
    for lexema, xyz in puntos:
        entrada = (lexema, np.asarray(xyz, dtype=float))
        tipo = tipo_de(lexema)
        if tipo == "desconocido":
            sueltas.append(entrada)
        elif tipo == "operacion":
            ops.append(entrada)
        else:
            params.append(entrada)
    return ops, params, sueltas


ARIDAD_BLOQUE = {"PUSH": 2, "MOV": 2, "POP": 1, "DUP": 1, "NEG": 1, "?": 1, "JMP": 1,
                 "CMP": None, "ADD": None, "SUB": None, "MUL": None, "DIV": None, "MOD": None}


def pasos_de(token, admisibles):
    n = ARIDAD_BLOQUE.get(token)
    if n is None or len(admisibles) < 2:
        return set(admisibles)
    return {admisibles[0]} if n == 1 else {admisibles[-1]}


def pasos_admisibles(paso_mm):
    if paso_mm is None:
        return (PASO_MM,)
    valores = [paso_mm] if isinstance(paso_mm, (int, float)) else list(paso_mm)
    limpios = sorted({float(v) for v in valores if v and float(v) > 0})
    return tuple(limpios) or (PASO_MM,)


def margen(admisibles):
    if admisibles == (PASO_MM,):
        return TOLERANCIA_MM
    if len(admisibles) == 1:
        return admisibles[0] * .2
    return min(TOLERANCIA_MEDIDA_MM, min(b - a for a, b in zip(admisibles, admisibles[1:])) / 2)


def candidatos_par(ops, i, j, admisibles):
    return pasos_de(ops[i][0], admisibles) | pasos_de(ops[j][0], admisibles)


def ciertos_par(ops, i, j, admisibles):
    return set().union(*(pasos_de(ops[k][0], admisibles) for k in (i, j)
                         if ARIDAD_BLOQUE.get(ops[k][0]) is not None), set())


def grafo(ops, paso_mm=PASO_MM, tolerancia=None):
    admisibles = pasos_admisibles(paso_mm)
    tol = margen(admisibles) if tolerancia is None else float(tolerancia)
    graph = {i: [] for i in range(len(ops))}
    for i, j in itertools.combinations(range(len(ops)), 2):
        dist = np.linalg.norm(ops[i][1] - ops[j][1])
        if any(abs(dist - p) <= tol for p in candidatos_par(ops, i, j, admisibles)):
            graph[i].append(j)
            graph[j].append(i)
    return graph


def pasos_del_recorrido(ops, orden, destino):
    tramos = list(zip(orden, orden[1:]))
    if destino is not None and orden:
        tramos.append((orden[-1], orden[destino]))
    return tramos


def recorrido_coherente(ops, orden, destino, admisibles, tol):
    for origen, siguiente in pasos_del_recorrido(ops, orden, destino):
        dist = np.linalg.norm(ops[origen][1] - ops[siguiente][1])
        if not any(abs(dist - p) <= tol for p in pasos_de(ops[origen][0], admisibles)):
            return False
    return True


def recorridos_coherentes(ops, candidatos, paso_mm=PASO_MM, tolerancia=None):
    admisibles = pasos_admisibles(paso_mm)
    if len(admisibles) < 2:
        return list(candidatos)
    tol = margen(admisibles) if tolerancia is None else float(tolerancia)
    return [(orden, destino) for orden, destino in candidatos
            if recorrido_coherente(ops, orden, destino, admisibles, tol)]


def tamano_observado(token, parametros):
    fijo = ARIDAD_BLOQUE.get(token)
    if fijo is not None:
        return fijo
    return parametros if parametros in (1, 2) else None


def coherencia_con_parametros(ops, orden, destino, conteos, paso_mm=PASO_MM, tolerancia=None):
    admisibles = pasos_admisibles(paso_mm)
    if len(admisibles) < 2:
        return True, []
    tol = margen(admisibles) if tolerancia is None else float(tolerancia)
    ambiguos = []
    for origen, siguiente in pasos_del_recorrido(ops, orden, destino):
        dist = np.linalg.norm(ops[origen][1] - ops[siguiente][1])
        tamano = tamano_observado(ops[origen][0], conteos.get(origen))
        if tamano is None:
            if not any(abs(dist - p) <= tol for p in admisibles):
                return False, ambiguos
            ambiguos.append((origen, siguiente))
            continue
        esperado = admisibles[0] if tamano == 1 else admisibles[-1]
        if abs(dist - esperado) > tol:
            return False, ambiguos
    return True, ambiguos


def recorrido_ambiguo(ops, orden, destino, paso_mm=PASO_MM, tolerancia=None):
    admisibles = pasos_admisibles(paso_mm)
    if len(admisibles) < 2:
        return []
    tol = margen(admisibles) if tolerancia is None else float(tolerancia)
    return [(origen, siguiente) for origen, siguiente in pasos_del_recorrido(ops, orden, destino)
            if ARIDAD_BLOQUE.get(ops[origen][0]) is None]


def uniones_ambiguas(ops, paso_mm=PASO_MM, tolerancia=None):
    admisibles = pasos_admisibles(paso_mm)
    if len(admisibles) < 2:
        return []
    tol = margen(admisibles) if tolerancia is None else float(tolerancia)
    pares = []
    for i, j in itertools.combinations(range(len(ops)), 2):
        dist = np.linalg.norm(ops[i][1] - ops[j][1])
        if not any(abs(dist - p) <= tol for p in candidatos_par(ops, i, j, admisibles)):
            continue
        if not any(abs(dist - p) <= tol for p in ciertos_par(ops, i, j, admisibles)):
            pares.append((i, j))
    return pares


def recorridos(graph):
    extremos = [i for i, vecinos in graph.items() if len(vecinos) == 1]
    start = extremos[0] if extremos else 0
    results = []

    def walk(order, visited):
        if len(results) >= MAX_ORDENES:
            return
        current = order[-1]
        unvisited = [n for n in graph[current] if n not in visited]
        if not unvisited:
            previous = order[-2] if len(order) > 1 else None
            back_edges = [n for n in graph[current] if n != previous]
            results.append((order, order.index(back_edges[0]) if back_edges else None))
            return
        for n in unvisited:
            walk(order + [n], visited | {n})

    walk([start], {start})
    results.extend((order[::-1], None) for order, target in list(results) if target is None and len(order) > 1)
    return results


def _block_axes(ops, order, destino):
    axes = []
    for pos, i in enumerate(order):
        here = ops[i][1]
        if pos + 1 < len(order):
            there = ops[order[pos + 1]][1]
        elif destino is not None:
            there = ops[order[destino]][1]
        elif pos > 0:
            there = here + (here - ops[order[pos - 1]][1])
        else:
            axes.append((None, 0.0))
            continue
        vector = there - here
        length = float(np.linalg.norm(vector))
        axes.append((vector / length, length) if length > 1e-6 else (None, 0.0))
    return axes


def repartir(ops, order, destino, params):
    axes = _block_axes(ops, order, destino)
    grupos = [[] for _ in ops]
    sueltos = []
    fallbacks = 0
    total_offset = 0.0

    for lexema, point in params:
        best = None
        for pos, i in enumerate(order):
            axis, length = axes[pos]
            if axis is None:
                continue
            rel = point - ops[i][1]
            t = float(np.dot(rel, axis))
            perp = float(np.linalg.norm(rel - t * axis))
            if PARAM_MIN_MM <= t < length and perp <= PARAM_PERP_MM and (best is None or t < best[0]):
                best = (t, i)

        if best is None and ops:
            dists = [np.linalg.norm(point - op_point) for _, op_point in ops]
            nearest = int(np.argmin(dists))
            if dists[nearest] <= PARAM_CERCA_MM:
                best = (float(dists[nearest]), nearest)
                fallbacks += 1

        if best is None:
            sueltos.append((lexema, point))
            continue
        grupos[best[1]].append((best[0], lexema, point))
        total_offset += best[0]

    grupos = [sorted(group, key=lambda g: g[0]) for group in grupos]
    return grupos, (len(sueltos), fallbacks, total_offset), sueltos


def instrucciones(puntos, paso_mm=PASO_MM):
    ops, params, sueltas = separar(puntos)
    for entrada in sueltas:
        cerca = any(np.linalg.norm(entrada[1] - p) <= PARAM_CERCA_MM for _, p in ops)
        (params if cerca else ops).append(entrada)
    if not ops:
        return [], [f"{lexema}: parameter tile with no operation block to attach to" for lexema, _ in params]

    graph = grafo(ops, paso_mm)
    avisos = [
        f"{ops[i][0]}: {len(vecinos)} candidate vecinos -- ambiguous, chain order may be wrong"
        for i, vecinos in graph.items() if len(vecinos) > 3
    ]

    coherentes = recorridos_coherentes(ops, recorridos(graph), paso_mm)
    if not coherentes:
        return [], avisos + ["chain step does not match the block sizes in any reading direction"]
    candidates = []
    for order, destino in coherentes:
        grupos, score, sueltos = repartir(ops, order, destino, params)
        candidates.append((score, order, destino, grupos, sueltos))
    candidates.sort(key=lambda c: c[0])
    score, order, destino, grupos, sueltos = candidates[0]

    if len(candidates) > 1 and candidates[1][0] == score and candidates[1][1] != order:
        avisos.append(
            "reading direction unconfirmed -- no parameter tile distinguishes the orientations"
            if not params else
            "reading direction ambiguous -- parameter tiles fit more than one orientation equally well"
        )
    avisos.extend(f"{lexema}: too far from every block -- not attached" for lexema, _ in sueltos)
    avisos.extend(
        f"{ops[i][0]}: not reachable from the main chain -- isolated or disconnected"
        for i in sorted(set(range(len(ops))) - set(order))
    )

    axes = _block_axes(ops, order, destino)
    instrs = []
    for pos, i in enumerate(order):
        axis, _ = axes[pos]
        instrs.append({
            "token": ops[i][0],
            "operandos": [lexema for _, lexema, _ in grupos[i]],
            "posicion": ops[i][1].tolist(),
            "direccion": axis.tolist() if axis is not None else None,
            "posiciones_operandos": [point.tolist() for _, _, point in grupos[i]],
            "virtual": False,
            "pendiente": clasif.ilegible(ops[i][0]) or any(
                clasif.ilegible(lexema) for _, lexema, _ in grupos[i]
            ),
        })
    if destino is not None:


        instrs.append({
            "token": "JMP",
            "operandos": [str(destino - len(instrs))],
            "posicion": None,
            "direccion": None,
            "posiciones_operandos": [],
            "virtual": True,
            "pendiente": False,
            "destino": destino,
        })
    return instrs, avisos


def pendientes(instrs) -> list[str]:
    pendientes = []
    for numero, instruccion in enumerate(instrs, start=1):
        if clasif.ilegible(instruccion["token"]):
            pendientes.append(f"instrucción {numero}: la operación está sin leer")
        for posicion, operando in enumerate(instruccion["operandos"], start=1):
            if clasif.ilegible(operando):
                pendientes.append(f"instrucción {numero}: el parámetro {posicion} está sin leer")
    return pendientes


def programa(puntos):
    instrs, avisos = instrucciones(puntos)
    return [" ".join([i["token"], *i["operandos"]]) for i in instrs], avisos


def cadena(puntos):
    lineas, avisos = programa(puntos)
    return [line.split()[0] for line in lineas], avisos


def puntos(path: str):
    with open(path) as f:
        data = json.load(f)
    return [(item["lexema"], np.array([item["x"], item["y"], item["z"]])) for item in data]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a SCuLPTER program from triangulated 3D puntos (testing helper)")
    parser.add_argument("--puntos", required=True, help="JSON file: list of {lexema, x, y, z}")
    args = parser.parse_args()

    lineas, avisos = programa(puntos(args.puntos))

    print("\n".join(lineas) if lineas else "(no puntos)")
    for warning in avisos:
        print(f"  ! {warning}")


if __name__ == "__main__":
    main()
