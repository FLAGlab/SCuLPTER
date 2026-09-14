import argparse
import itertools
import json
import sys
import time
from collections import defaultdict

import cv2
import numpy as np

from calibrate_cameras import load_intrinsics
from adjacency import build_program
import reconstruir

INTERVAL_S = 0.5
EPIPOLAR_TOLERANCE_PX = 15.0   # how far a detection may sit from its partner's epipolar line
DEPTH_WEIGHT_PX_PER_MM = 0.05  # duplicates on one epipolar line are told apart by depth plausibility
MAX_BRUTE_FORCE = 7            # above this many duplicates of one lexeme, match greedily


def load_extrinsics(path: str):
    with open(path) as f:
        data = json.load(f)
    return np.array(data["rotation"]), np.array(data["translation"])


def build_projections(mtx_a, mtx_b, rotation, translation):
    proj_a = mtx_a @ np.hstack([np.eye(3), np.zeros((3, 1))])
    proj_b = mtx_b @ np.hstack([rotation, translation])
    return proj_a, proj_b


def fundamental_matrix(mtx_a, mtx_b, rotation, translation):
    """F such that x_b^T F x_a = 0 for undistorted pixel coordinates."""
    t = translation.reshape(3)
    t_cross = np.array([[0, -t[2], t[1]], [t[2], 0, -t[0]], [-t[1], t[0], 0]])
    essential = t_cross @ rotation
    return np.linalg.inv(mtx_b).T @ essential @ np.linalg.inv(mtx_a)


def undistort_detections(dets, mtx, dist):
    if not dets:
        return []
    raw = np.array([[x, y] for _, x, y in dets], dtype=np.float64).reshape(-1, 1, 2)
    und = cv2.undistortPoints(raw, mtx, dist, P=mtx).reshape(-1, 2)
    return [(lexeme, float(x), float(y)) for (lexeme, _, _), (x, y) in zip(dets, und)]


def epipolar_distance(fund, pt_a, pt_b) -> float:
    """Distance in B from pt_b to the epipolar line of pt_a."""
    line = fund @ np.array([pt_a[0], pt_a[1], 1.0])
    norm = np.hypot(line[0], line[1])
    if norm < 1e-9:
        return float("inf")
    return abs(line @ np.array([pt_b[0], pt_b[1], 1.0])) / norm


def _assign(cost):
    """Row -> column assignment minimising total cost; None for unmatched rows."""
    rows, cols = cost.shape
    if rows == 0 or cols == 0:
        return [None] * rows
    if max(rows, cols) <= MAX_BRUTE_FORCE:
        best, best_total = None, float("inf")
        for perm in itertools.permutations(range(cols), min(rows, cols)):
            total = sum(cost[r, c] for r, c in enumerate(perm))
            if total < best_total:
                best, best_total = perm, total
        assignment = [None] * rows
        for r, c in enumerate(best):
            assignment[r] = c
        return assignment
    assignment = [None] * rows
    used = set()
    for r, c in sorted(((r, c) for r in range(rows) for c in range(cols)), key=lambda rc: cost[rc]):
        if assignment[r] is None and c not in used:
            assignment[r] = c
            used.add(c)
    return assignment


def _depth(proj_a, proj_b, pt_a, pt_b) -> float:
    point = cv2.triangulatePoints(
        proj_a, proj_b, np.array(pt_a, dtype=np.float64).reshape(2, 1), np.array(pt_b, dtype=np.float64).reshape(2, 1)
    )
    return float(point[2, 0] / point[3, 0])


def match_detections(dets_a, dets_b, fund, proj_a, proj_b):
    """Pairs detections across the two views.

    Same-lexeme detections are the only candidates. Among duplicates the
    epipolar constraint rules out most pairings; duplicates that share an
    epipolar line (blocks in one row, cameras side by side) are told apart by
    depth: a wrong pairing triangulates far from where the rest of the scene is.
    """
    by_lexeme_a = defaultdict(list)
    by_lexeme_b = defaultdict(list)
    for lexeme, x, y in dets_a:
        by_lexeme_a[lexeme].append((x, y))
    for lexeme, x, y in dets_b:
        by_lexeme_b[lexeme].append((x, y))

    # Depth reference from the unambiguous symbols; failing that, from every
    # epipolar-consistent pairing (the true ones outnumber the wrong ones).
    depths = [
        _depth(proj_a, proj_b, pts_a[0], by_lexeme_b[lexeme][0])
        for lexeme, pts_a in by_lexeme_a.items()
        if len(pts_a) == 1 and len(by_lexeme_b.get(lexeme, [])) == 1
        and epipolar_distance(fund, pts_a[0], by_lexeme_b[lexeme][0]) <= EPIPOLAR_TOLERANCE_PX
    ]
    if not depths:
        depths = [
            _depth(proj_a, proj_b, pa, pb)
            for lexeme, pts_a in by_lexeme_a.items()
            for pa in pts_a for pb in by_lexeme_b.get(lexeme, [])
            if epipolar_distance(fund, pa, pb) <= EPIPOLAR_TOLERANCE_PX
        ]
    depth_ref = float(np.median(depths)) if depths else None

    pairs, warnings = [], []
    for lexeme, pts_a in by_lexeme_a.items():
        pts_b = by_lexeme_b.get(lexeme, [])
        if not pts_b:
            warnings.append(f"{lexeme}: seen only in camera a -- skipped")
            continue
        epi = np.array([[epipolar_distance(fund, pa, pb) for pb in pts_b] for pa in pts_a])
        cost = epi.copy()
        if depth_ref is not None and (len(pts_a) > 1 or len(pts_b) > 1):
            for r, pa in enumerate(pts_a):
                for c, pb in enumerate(pts_b):
                    cost[r, c] += DEPTH_WEIGHT_PX_PER_MM * abs(_depth(proj_a, proj_b, pa, pb) - depth_ref)
        matched = 0
        for r, c in enumerate(_assign(cost)):
            if c is None or epi[r, c] > EPIPOLAR_TOLERANCE_PX:
                continue
            pairs.append((lexeme, pts_a[r], pts_b[c]))
            matched += 1
        if matched < len(pts_a) or matched < len(pts_b):
            warnings.append(
                f"{lexeme}: {len(pts_a)} in a, {len(pts_b)} in b, {matched} matched within "
                f"{EPIPOLAR_TOLERANCE_PX:.0f}px of the epipolar line"
            )
    for lexeme in set(by_lexeme_b) - set(by_lexeme_a):
        warnings.append(f"{lexeme}: seen only in camera b -- skipped")
    return pairs, warnings


def triangulate_pairs(pairs, proj_a, proj_b):
    if not pairs:
        return []
    lexemes = [lexeme for lexeme, _, _ in pairs]
    pts_a = np.array([pt_a for _, pt_a, _ in pairs], dtype=np.float64).T
    pts_b = np.array([pt_b for _, _, pt_b in pairs], dtype=np.float64).T
    points_4d = cv2.triangulatePoints(proj_a, proj_b, pts_a, pts_b)
    points_3d = (points_4d[:3] / points_4d[3]).T
    return list(zip(lexemes, points_3d))


class StereoRig:
    def __init__(self, intrinsics_a: str, intrinsics_b: str, extrinsics: str):
        self.mtx_a, self.dist_a = load_intrinsics(intrinsics_a)
        self.mtx_b, self.dist_b = load_intrinsics(intrinsics_b)
        rotation, translation = load_extrinsics(extrinsics)
        self.proj_a, self.proj_b = build_projections(self.mtx_a, self.mtx_b, rotation, translation)
        self.fund = fundamental_matrix(self.mtx_a, self.mtx_b, rotation, translation)

    def reconstruct(self, frame_a, frame_b):
        dets_a, avisos_a = reconstruir.detectar_en_cuadro(frame_a)
        dets_b, avisos_b = reconstruir.detectar_en_cuadro(frame_b)
        warnings = [f"camera a: {w}" for w in avisos_a] + [f"camera b: {w}" for w in avisos_b]
        pairs, match_warnings = match_detections(
            undistort_detections(dets_a, self.mtx_a, self.dist_a),
            undistort_detections(dets_b, self.mtx_b, self.dist_b),
            self.fund, self.proj_a, self.proj_b,
        )
        points = triangulate_pairs(pairs, self.proj_a, self.proj_b)
        return points, warnings + match_warnings


def report(points, warnings, run_interpreter: bool = True) -> None:
    print("\n" + "=" * 60)
    for lexeme, point in points:
        x, y, z = point
        print(f"  {lexeme:>6}  x={x:8.1f}  y={y:8.1f}  z={z:8.1f}  (mm, camera-a frame)")
    for warning in warnings:
        print(f"  ! {warning}")
    if not points:
        print("  (no matched detections)")
        return

    lines, program_warnings = build_program(points)
    print("[programa reconstruido]")
    print("\n".join(f"  {line}" for line in lines) if lines else "  (vacío)")
    for warning in program_warnings:
        print(f"  ! {warning}")
    if run_interpreter:
        print("[intérprete scala]")
        for line in reconstruir.ejecutar_en_interprete("\n".join(lines)).splitlines():
            print(f"  {line}")


def run_static(rig: StereoRig, image_a: str, image_b: str, run_interpreter: bool) -> None:
    frame_a = cv2.imread(image_a)
    frame_b = cv2.imread(image_b)
    if frame_a is None or frame_b is None:
        sys.exit("could not read one of the images")
    points, warnings = rig.reconstruct(frame_a, frame_b)
    report(points, warnings, run_interpreter)


def run_live(rig: StereoRig, source_a, source_b, run_interpreter: bool) -> None:
    cap_a = cv2.VideoCapture(source_a)
    cap_b = cv2.VideoCapture(source_b)
    if not cap_a.isOpened() or not cap_b.isOpened():
        sys.exit("cannot open both cameras")

    print("running -- ctrl+C to stop")
    last_report = 0.0
    try:
        while True:
            ok_a, frame_a = cap_a.read()
            ok_b, frame_b = cap_b.read()
            if not (ok_a and ok_b):
                continue

            now = time.time()
            if now - last_report < INTERVAL_S:
                continue
            last_report = now

            points, warnings = rig.reconstruct(frame_a, frame_b)
            report(points, warnings, run_interpreter)
    finally:
        cap_a.release()
        cap_b.release()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconstruct a SCuLPT program from two calibrated cameras")
    parser.add_argument("--intrinsics-a", required=True)
    parser.add_argument("--intrinsics-b", required=True)
    parser.add_argument("--extrinsics", required=True, help="rotation/translation from camera A to camera B")
    parser.add_argument("--image-a", help="static test image for camera A")
    parser.add_argument("--image-b", help="static test image for camera B")
    parser.add_argument("--camera-a", help="camera A index or video URL")
    parser.add_argument("--camera-b", help="camera B index or video URL")
    parser.add_argument("--sin-interprete", action="store_true", help="only print the program, do not run scala-cli")
    args = parser.parse_args()

    rig = StereoRig(args.intrinsics_a, args.intrinsics_b, args.extrinsics)
    run_interpreter = not args.sin_interprete

    if args.image_a and args.image_b:
        run_static(rig, args.image_a, args.image_b, run_interpreter)
    elif args.camera_a and args.camera_b:
        run_live(
            rig,
            reconstruir.resolver_fuente_camara(args.camera_a),
            reconstruir.resolver_fuente_camara(args.camera_b),
            run_interpreter,
        )
    else:
        sys.exit("provide either --image-a/--image-b or --camera-a/--camera-b")


if __name__ == "__main__":
    main()
