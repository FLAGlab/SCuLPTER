import argparse
import asyncio
import itertools
import json
import sys
import time
from collections import defaultdict

import cv2
import numpy as np
import websockets

from calibrate_cameras import load_intrinsics
from adjacency import instrucciones, pendientes
import reconstruir

INTERVAL_S = 0.5
TOLERANCIA_PX = 15.0
PESO_PROFUNDIDAD = 0.05
MAX_FUERZA_BRUTA = 7


def extrinsecos(path: str):
    with open(path) as f:
        data = json.load(f)
    mesa = data.get("mesa")
    if mesa is not None:
        mesa = (np.array(mesa["rot"]), np.array(mesa["tras"]).reshape(3))
    return np.array(data["rot"]), np.array(data["tras"]), mesa


def a_mesa(puntos, mesa):
    if not puntos:
        return puntos
    xyz = np.array([p for _, p in puntos], dtype=float)
    if mesa is not None:
        rot, tras = mesa
        local = (xyz - tras) @ rot
    else:
        centre = xyz.mean(axis=0)
        if len(puntos) < 3:
            local = xyz - centre
        else:
            _, _, vt = np.linalg.svd(xyz - centre)
            x_axis, y_axis, normal = vt
            if np.dot(normal, -centre) < 0:
                normal = -normal
                y_axis = -y_axis
            local = (xyz - centre) @ np.stack([x_axis, y_axis, normal]).T
    return [(lexema, q) for (lexema, _), q in zip(puntos, local)]


def proyecciones(mtx_a, mtx_b, rot, tras):
    proj_a = mtx_a @ np.hstack([np.eye(3), np.zeros((3, 1))])
    proj_b = mtx_b @ np.hstack([rot, tras])
    return proj_a, proj_b


def fundamental(mtx_a, mtx_b, rot, tras):
    t = tras.reshape(3)
    t_cross = np.array([[0, -t[2], t[1]], [t[2], 0, -t[0]], [-t[1], t[0], 0]])
    essential = t_cross @ rot
    return np.linalg.inv(mtx_b).T @ essential @ np.linalg.inv(mtx_a)


def sin_distorsion(dets, mtx, dist):
    if not dets:
        return []
    raw = np.array([[x, y] for _, x, y in dets], dtype=np.float64).reshape(-1, 1, 2)
    und = cv2.undistortPoints(raw, mtx, dist, P=mtx).reshape(-1, 2)
    return [(lexema, float(x), float(y)) for (lexema, _, _), (x, y) in zip(dets, und)]


def dist_epipolar(fund, pt_a, pt_b) -> float:
    line = fund @ np.array([pt_a[0], pt_a[1], 1.0])
    norm = np.hypot(line[0], line[1])
    if norm < 1e-9:
        return float("inf")
    return abs(line @ np.array([pt_b[0], pt_b[1], 1.0])) / norm


def asignar(coste):
    rows, cols = coste.shape
    if rows == 0 or cols == 0:
        return [None] * rows
    if max(rows, cols) <= MAX_FUERZA_BRUTA:
        best, best_total = None, float("inf")
        for perm in itertools.permutations(range(cols), min(rows, cols)):
            total = sum(coste[r, c] for r, c in enumerate(perm))
            if total < best_total:
                best, best_total = perm, total
        assignment = [None] * rows
        for r, c in enumerate(best):
            assignment[r] = c
        return assignment
    assignment = [None] * rows
    used = set()
    for r, c in sorted(((r, c) for r in range(rows) for c in range(cols)), key=lambda rc: coste[rc]):
        if assignment[r] is None and c not in used:
            assignment[r] = c
            used.add(c)
    return assignment


def profundidad(proj_a, proj_b, pt_a, pt_b) -> float:
    point = cv2.triangulatePoints(
        proj_a, proj_b, np.array(pt_a, dtype=np.float64).reshape(2, 1), np.array(pt_b, dtype=np.float64).reshape(2, 1)
    )
    return float(point[2, 0] / point[3, 0])


def emparejar(dets_a, dets_b, fund, proj_a, proj_b):
    by_lexeme_a = defaultdict(list)
    by_lexeme_b = defaultdict(list)
    for lexema, x, y in dets_a:
        by_lexeme_a[lexema].append((x, y))
    for lexema, x, y in dets_b:
        by_lexeme_b[lexema].append((x, y))



    depths = [
        profundidad(proj_a, proj_b, pts_a[0], by_lexeme_b[lexema][0])
        for lexema, pts_a in by_lexeme_a.items()
        if len(pts_a) == 1 and len(by_lexeme_b.get(lexema, [])) == 1
        and dist_epipolar(fund, pts_a[0], by_lexeme_b[lexema][0]) <= TOLERANCIA_PX
    ]
    if not depths:
        depths = [
            profundidad(proj_a, proj_b, pa, pb)
            for lexema, pts_a in by_lexeme_a.items()
            for pa in pts_a for pb in by_lexeme_b.get(lexema, [])
            if dist_epipolar(fund, pa, pb) <= TOLERANCIA_PX
        ]
    depth_ref = float(np.median(depths)) if depths else None

    parejas, avisos, sueltas = [], [], []
    for lexema, pts_a in by_lexeme_a.items():
        pts_b = by_lexeme_b.get(lexema, [])
        if not pts_b:
            sueltas.append((lexema, "a", len(pts_a)))
            continue
        epi = np.array([[dist_epipolar(fund, pa, pb) for pb in pts_b] for pa in pts_a])
        coste = epi.copy()
        if depth_ref is not None and (len(pts_a) > 1 or len(pts_b) > 1):
            for r, pa in enumerate(pts_a):
                for c, pb in enumerate(pts_b):
                    coste[r, c] += PESO_PROFUNDIDAD * abs(profundidad(proj_a, proj_b, pa, pb) - depth_ref)
        casadas = 0
        for r, c in enumerate(asignar(coste)):
            if c is None or epi[r, c] > TOLERANCIA_PX:
                continue
            parejas.append((lexema, pts_a[r], pts_b[c]))
            casadas += 1
        if casadas < len(pts_a) or casadas < len(pts_b):
            avisos.append(
                f"{lexema}: {len(pts_a)} in a, {len(pts_b)} in b, {casadas} casadas within "
                f"{TOLERANCIA_PX:.0f}px of the epipolar line"
            )
            sueltas.append((lexema, "both", max(len(pts_a), len(pts_b)) - casadas))
    for lexema in set(by_lexeme_b) - set(by_lexeme_a):
        sueltas.append((lexema, "b", len(by_lexeme_b[lexema])))
    return parejas, avisos, sueltas


def triangular(parejas, proj_a, proj_b):
    if not parejas:
        return []
    lexemes = [lexema for lexema, _, _ in parejas]
    pts_a = np.array([pt_a for _, pt_a, _ in parejas], dtype=np.float64).T
    pts_b = np.array([pt_b for _, _, pt_b in parejas], dtype=np.float64).T
    points_4d = cv2.triangulatePoints(proj_a, proj_b, pts_a, pts_b)
    points_3d = (points_4d[:3] / points_4d[3]).T
    return list(zip(lexemes, points_3d))


class Par:
    def __init__(self, intrinsics_a: str, intrinsics_b: str, extrinsics: str):
        self.mtx_a, self.dist_a = load_intrinsics(intrinsics_a)
        self.mtx_b, self.dist_b = load_intrinsics(intrinsics_b)
        rot, tras, self.mesa = extrinsecos(extrinsics)
        self.proj_a, self.proj_b = proyecciones(self.mtx_a, self.mtx_b, rot, tras)
        self.fund = fundamental(self.mtx_a, self.mtx_b, rot, tras)

    def reconstruct(self, frame_a, frame_b):
        dets_a, avisos_a = reconstruir.detectar(frame_a)
        dets_b, avisos_b = reconstruir.detectar(frame_b)
        avisos = [f"camera a: {w}" for w in avisos_a] + [f"camera b: {w}" for w in avisos_b]
        parejas, match_warnings, sueltas = emparejar(
            sin_distorsion(dets_a, self.mtx_a, self.dist_a),
            sin_distorsion(dets_b, self.mtx_b, self.dist_b),
            self.fund, self.proj_a, self.proj_b,
        )
        puntos = a_mesa(triangular(parejas, self.proj_a, self.proj_b), self.mesa)
        if self.mesa is None and puntos:
            match_warnings.append("no mesa pose in the extrinsics file -- frame fitted to the puntos themselves")
        return puntos, avisos + match_warnings, sueltas


def reportar(puntos, avisos, sueltas=(), interpretar: bool = True):
    print("\n" + "=" * 60)
    for lexema, point in puntos:
        x, y, z = point
        print(f"  {lexema:>6}  x={x:8.1f}  y={y:8.1f}  z={z:8.1f}  (mm, mesa frame)")
    for warning in avisos:
        print(f"  ! {warning}")
    if not puntos and not sueltas:
        print("  (no casadas detections)")
        return [], []

    instrs, program_warnings = instrucciones(puntos)
    lineas = [" ".join([i["token"], *i["operandos"]]) for i in instrs]
    print("[programa reconstruido]")
    print("\n".join(f"  {line}" for line in lineas) if lineas else "  (vacío)")
    for warning in program_warnings:
        print(f"  ! {warning}")

    donde = {"a": "solo en la cámara A", "b": "solo en la cámara B", "both": "sin pareja entre vistas"}
    huecos = pendientes(instrs) + [
        f"{lexema}: {cuantas} detección(es) {donde[camara]}, vista pero no localizable"
        for lexema, camara, cuantas in sueltas
    ]
    if huecos:
        print(f"[lectura incompleta] {len(huecos)} hueco(s), no se ejecuta")
        for hueco in huecos:
            print(f"  - {hueco}")
        return instrs, lineas
    if interpretar:
        print("[intérprete scala]")
        for line in reconstruir.ejecutar("\n".join(lineas)).splitlines():
            print(f"  {line}")
    return instrs, lineas


def desde_imagenes(rig: Par, image_a: str, image_b: str, interpretar: bool) -> None:
    frame_a = cv2.imread(image_a)
    frame_b = cv2.imread(image_b)
    if frame_a is None or frame_b is None:
        sys.exit("could not read one of the images")
    puntos, avisos, sueltas = rig.reconstruct(frame_a, frame_b)
    reportar(puntos, avisos, sueltas, interpretar)


async def en_vivo(rig: Par, source_a, source_b, interpretar: bool, servidor) -> None:
    cap_a = cv2.VideoCapture(source_a)
    cap_b = cv2.VideoCapture(source_b)
    if not cap_a.isOpened() or not cap_b.isOpened():
        sys.exit("cannot open both cameras")

    print("running -- ctrl+C to stop")
    last_report = 0.0
    last_program = None
    try:
        while True:
            ok_a, frame_a = cap_a.read()
            ok_b, frame_b = cap_b.read()
            if not (ok_a and ok_b):
                await asyncio.sleep(0)
                continue

            now = time.time()
            if now - last_report < INTERVAL_S:
                await asyncio.sleep(0)
                continue
            last_report = now

            puntos, avisos, sueltas = rig.reconstruct(frame_a, frame_b)
            instrs, lineas = reportar(puntos, avisos, sueltas, interpretar)

            if servidor is not None and instrs and lineas != last_program:
                last_program = lineas
                await servidor.difundir({"tipo": "programa", "origen": "3d", "instrucciones": instrs})
            await asyncio.sleep(0)
    finally:
        cap_a.release()
        cap_b.release()


async def principal_async() -> None:
    parser = argparse.ArgumentParser(description="Reconstruct a SCuLPT program from two calibrated cameras")
    parser.add_argument("--intrinsics-a", required=True)
    parser.add_argument("--intrinsics-b", required=True)
    parser.add_argument("--extrinsics", required=True, help="rot/tras from camera A to camera B")
    parser.add_argument("--image-a", help="static test image for camera A")
    parser.add_argument("--image-b", help="static test image for camera B")
    parser.add_argument("--camera-a", help="camera A index or video URL")
    parser.add_argument("--camera-b", help="camera B index or video URL")
    parser.add_argument("--sin-interprete", action="store_true", help="only print the program, do not run scala-cli")
    parser.add_argument("--servir-3d", action="store_true", help="serve the reconstruction to simulador_3d over WebSocket")
    args = parser.parse_args()

    rig = Par(args.intrinsics_a, args.intrinsics_b, args.extrinsics)
    interpretar = not args.sin_interprete

    if args.image_a and args.image_b:
        desde_imagenes(rig, args.image_a, args.image_b, interpretar)
        return
    if not (args.camera_a and args.camera_b):
        sys.exit("provide either --image-a/--image-b or --camera-a/--camera-b")

    servidor = None
    if args.servir_3d:
        servidor = reconstruir.ServidorSimulador(reconstruir.PUERTO_WEBSOCKET)
        await websockets.serve(servidor.manejar_cliente, "localhost", reconstruir.PUERTO_WEBSOCKET)
        print(f"servidor para el simulador 3D en ws://localhost:{reconstruir.PUERTO_WEBSOCKET}")

    await en_vivo(
        rig,
        reconstruir.fuente(args.camera_a),
        reconstruir.fuente(args.camera_b),
        interpretar,
        servidor,
    )


def main() -> None:
    try:
        asyncio.run(principal_async())
    except KeyboardInterrupt:
        print("\ndetenido")


if __name__ == "__main__":
    main()
