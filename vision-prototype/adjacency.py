"""Turns triangulated 3D block positions into a SCuLPTER program.

- Each instruction is one code block. The operation tile sits on the raised
  left end of the block and the parameter tiles are attached after it, so
  program flow runs from the operation tile, past its parameters, and on into
  the next connected block.
- Consecutive blocks are one block pitch apart (BLOCK_PITCH_MM).
- A structural loop is a physical cycle of blocks closed with a T connector.
  SCuLPTER cannot write that loop, so it is emitted as a trailing `JMP -n`
  back to the block the loop re-enters.

Reading direction is not observable from the operation tiles alone, so every
plausible orientation of the chain is tried and the one under which the
parameter tiles fall right after their operation tile wins.
"""
import argparse
import itertools
import json
import os

import numpy as np

BLOCK_PITCH_MM = 60.0      # centre-to-centre distance between connected blocks -- measure on the real ones
PITCH_TOLERANCE_MM = 15.0
PARAM_MIN_T_MM = 5.0       # a parameter tile is never on top of the operation tile
PARAM_PERP_MM = 25.0       # how far off the block axis a tile may sit (side faces of a vertical build)
PARAM_ATTACH_MM = 45.0     # last resort: nearest block, only if closer than this
MAX_CANDIDATE_ORDERS = 16

RUTA_TABLA_SIMBOLOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "simbolos.json")


def load_symbol_types() -> dict[str, str]:
    """lexeme -> 'operacion' | 'pila' | 'literal', from simbolos.json."""
    if not os.path.isfile(RUTA_TABLA_SIMBOLOS):
        return {}
    with open(RUTA_TABLA_SIMBOLOS, encoding="utf-8") as f:
        tabla = json.load(f)
    return {entrada["lexema"]: entrada["tipo"] for entrada in tabla.get("simbolos", [])}


_SYMBOL_TYPES = load_symbol_types()


def symbol_type(lexeme: str) -> str:
    tipo = _SYMBOL_TYPES.get(lexeme)
    if tipo:
        return tipo
    try:
        float(lexeme)
        return "literal"
    except ValueError:
        pass
    return "operacion" if lexeme == "?" or lexeme.isupper() else "pila"


def split_points(points):
    ops = [(lexeme, np.asarray(xyz, dtype=float)) for lexeme, xyz in points if symbol_type(lexeme) == "operacion"]
    params = [(lexeme, np.asarray(xyz, dtype=float)) for lexeme, xyz in points if symbol_type(lexeme) != "operacion"]
    return ops, params


def build_candidate_graph(ops):
    graph = {i: [] for i in range(len(ops))}
    for i, j in itertools.combinations(range(len(ops)), 2):
        dist = np.linalg.norm(ops[i][1] - ops[j][1])
        if abs(dist - BLOCK_PITCH_MM) <= PITCH_TOLERANCE_MM:
            graph[i].append(j)
            graph[j].append(i)
    return graph


def enumerate_orders(graph):
    """Every walk through the block graph, as (order, loop_target) pairs.

    `loop_target` is the position in `order` that the last block connects
    back to, or None for a linear chain. Linear chains are also offered
    reversed, since nothing in the graph says which loose end is the start.
    """
    endpoints = [i for i, neighbors in graph.items() if len(neighbors) == 1]
    start = endpoints[0] if endpoints else 0
    results = []

    def walk(order, visited):
        if len(results) >= MAX_CANDIDATE_ORDERS:
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


def _block_axes(ops, order, loop_target):
    """Unit flow direction and length of each block in `order` (None if unknown)."""
    axes = []
    for pos, i in enumerate(order):
        here = ops[i][1]
        if pos + 1 < len(order):
            there = ops[order[pos + 1]][1]
        elif loop_target is not None:
            there = ops[order[loop_target]][1]
        elif pos > 0:
            there = here + (here - ops[order[pos - 1]][1])
        else:
            axes.append((None, 0.0))
            continue
        vector = there - here
        length = float(np.linalg.norm(vector))
        axes.append((vector / length, length) if length > 1e-6 else (None, 0.0))
    return axes


def assign_parameters(ops, order, loop_target, params):
    """Attaches parameter tiles to blocks under one orientation.

    Returns (groups, score, unattached). `groups[i]` lists (offset, lexeme,
    point) for op i, ordered along the flow. Lower score is better: fewer
    unattached tiles, fewer tiles that only matched by proximity, and tiles
    closer to their operation tile.
    """
    axes = _block_axes(ops, order, loop_target)
    groups = [[] for _ in ops]
    unattached = []
    fallbacks = 0
    total_offset = 0.0

    for lexeme, point in params:
        best = None
        for pos, i in enumerate(order):
            axis, length = axes[pos]
            if axis is None:
                continue
            rel = point - ops[i][1]
            t = float(np.dot(rel, axis))
            perp = float(np.linalg.norm(rel - t * axis))
            if PARAM_MIN_T_MM <= t < length and perp <= PARAM_PERP_MM and (best is None or t < best[0]):
                best = (t, i)

        if best is None and ops:
            dists = [np.linalg.norm(point - op_point) for _, op_point in ops]
            nearest = int(np.argmin(dists))
            if dists[nearest] <= PARAM_ATTACH_MM:
                best = (float(dists[nearest]), nearest)
                fallbacks += 1

        if best is None:
            unattached.append(lexeme)
            continue
        groups[best[1]].append((best[0], lexeme, point))
        total_offset += best[0]

    groups = [sorted(group, key=lambda g: g[0]) for group in groups]
    return groups, (len(unattached), fallbacks, total_offset), unattached


def build_instructions(points):
    """(lexeme, xyz) points -> (instructions, warnings).

    Each instruction is a dict with `token`, `operandos`, and where it sits:
    `posicion` (mm) of the operation tile, `direccion` (unit vector of the
    flow along the block) and `posiciones_operandos`. The `JMP` that closes a
    physical loop has no block of its own, so it carries `posicion: None`
    and `virtual: True`; `destino` is the index it jumps back to.
    """
    ops, params = split_points(points)
    if not ops:
        return [], [f"{lexeme}: parameter tile with no operation block to attach to" for lexeme, _ in params]

    graph = build_candidate_graph(ops)
    warnings = [
        f"{ops[i][0]}: {len(neighbors)} candidate neighbors -- ambiguous, chain order may be wrong"
        for i, neighbors in graph.items() if len(neighbors) > 3
    ]

    candidates = []
    for order, loop_target in enumerate_orders(graph):
        groups, score, unattached = assign_parameters(ops, order, loop_target, params)
        candidates.append((score, order, loop_target, groups, unattached))
    candidates.sort(key=lambda c: c[0])
    score, order, loop_target, groups, unattached = candidates[0]

    if len(candidates) > 1 and candidates[1][0] == score and candidates[1][1] != order:
        warnings.append(
            "reading direction unconfirmed -- no parameter tile distinguishes the orientations"
            if not params else
            "reading direction ambiguous -- parameter tiles fit more than one orientation equally well"
        )
    warnings.extend(f"{lexeme}: too far from every block -- not attached" for lexeme in unattached)
    warnings.extend(
        f"{ops[i][0]}: not reachable from the main chain -- isolated or disconnected"
        for i in sorted(set(range(len(ops))) - set(order))
    )

    axes = _block_axes(ops, order, loop_target)
    instructions = []
    for pos, i in enumerate(order):
        axis, _ = axes[pos]
        instructions.append({
            "token": ops[i][0],
            "operandos": [lexeme for _, lexeme, _ in groups[i]],
            "posicion": ops[i][1].tolist(),
            "direccion": axis.tolist() if axis is not None else None,
            "posiciones_operandos": [point.tolist() for _, _, point in groups[i]],
            "virtual": False,
        })
    if loop_target is not None:
        # JMP at position len(instructions) must land on position loop_target:
        # the interpreter does pc = pc + offset, so offset = target - position.
        instructions.append({
            "token": "JMP",
            "operandos": [str(loop_target - len(instructions))],
            "posicion": None,
            "direccion": None,
            "posiciones_operandos": [],
            "virtual": True,
            "destino": loop_target,
        })
    return instructions, warnings


def build_program(points):
    """(lexeme, xyz) points -> (SCuLPTER source lines, warnings)."""
    instructions, warnings = build_instructions(points)
    return [" ".join([i["token"], *i["operandos"]]) for i in instructions], warnings


def build_chain(points):
    """Backwards-compatible view: just the operation lexemes in order."""
    lines, warnings = build_program(points)
    return [line.split()[0] for line in lines], warnings


def load_points(path: str):
    with open(path) as f:
        data = json.load(f)
    return [(item["lexeme"], np.array([item["x"], item["y"], item["z"]])) for item in data]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a SCuLPTER program from triangulated 3D points (testing helper)")
    parser.add_argument("--points", required=True, help="JSON file: list of {lexeme, x, y, z}")
    args = parser.parse_args()

    lines, warnings = build_program(load_points(args.points))

    print("\n".join(lines) if lines else "(no points)")
    for warning in warnings:
        print(f"  ! {warning}")


if __name__ == "__main__":
    main()
