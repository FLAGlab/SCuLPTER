import argparse
import itertools
import json

import numpy as np

BLOCK_PITCH_MM = 60.0
PITCH_TOLERANCE_MM = 15.0


def build_candidate_graph(points):
    graph = {i: [] for i in range(len(points))}
    for i, j in itertools.combinations(range(len(points)), 2):
        dist = np.linalg.norm(points[i][1] - points[j][1])
        if abs(dist - BLOCK_PITCH_MM) <= PITCH_TOLERANCE_MM:
            graph[i].append(j)
            graph[j].append(i)
    return graph


def build_chain(points):
    if not points:
        return [], []
    if len(points) == 1:
        return [points[0][0]], []

    graph = build_candidate_graph(points)
    warnings = [
        f"{points[i][0]}: {len(neighbors)} candidate neighbors -- ambiguous, chain order may be wrong"
        for i, neighbors in graph.items() if len(neighbors) > 2
    ]

    endpoints = [i for i, neighbors in graph.items() if len(neighbors) == 1]
    start = endpoints[0] if endpoints else 0
    if len(endpoints) > 1:
        warnings.append(
            f"chain has {len(endpoints)} loose ends -- starting from {points[start][0]}, direction unconfirmed"
        )

    order = [start]
    visited = {start}
    current = start
    while True:
        candidates = [n for n in graph[current] if n not in visited]
        if not candidates:
            break
        current = candidates[0]
        order.append(current)
        visited.add(current)

    for i in set(range(len(points))) - visited:
        warnings.append(f"{points[i][0]}: not reachable from the main chain -- isolated or disconnected")

    return [points[i][0] for i in order], warnings


def load_points(path: str):
    with open(path) as f:
        data = json.load(f)
    return [(item["lexeme"], np.array([item["x"], item["y"], item["z"]])) for item in data]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a block chain from triangulated 3D points (testing helper)")
    parser.add_argument("--points", required=True, help="JSON file: list of {lexeme, x, y, z}")
    args = parser.parse_args()

    points = load_points(args.points)
    order, warnings = build_chain(points)

    print(" -> ".join(order) if order else "(no points)")
    for warning in warnings:
        print(f"  ! {warning}")


if __name__ == "__main__":
    main()
