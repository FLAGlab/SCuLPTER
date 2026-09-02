import argparse
import json
import sys
import time
from collections import defaultdict

import cv2
import numpy as np

from calibrate_cameras import load_intrinsics
import reconstruir

INTERVAL_S = 0.5


def load_extrinsics(path: str):
    with open(path) as f:
        data = json.load(f)
    return np.array(data["rotation"]), np.array(data["translation"])


def build_projections(mtx_a, mtx_b, rotation, translation):
    proj_a = mtx_a @ np.hstack([np.eye(3), np.zeros((3, 1))])
    proj_b = mtx_b @ np.hstack([rotation, translation])
    return proj_a, proj_b


def match_detections(dets_a, dets_b):
    """Pairs same-lexeme detections across the two views.

    Assumes at most one instance of each symbol on the table -- with
    duplicates there is no way yet to tell which one in A is which one in
    B, so those are reported as warnings instead of guessed.
    """
    by_lexeme_a = defaultdict(list)
    by_lexeme_b = defaultdict(list)
    for lexeme, x, y in dets_a:
        by_lexeme_a[lexeme].append((x, y))
    for lexeme, x, y in dets_b:
        by_lexeme_b[lexeme].append((x, y))

    pairs, warnings = [], []
    for lexeme, pts_a in by_lexeme_a.items():
        pts_b = by_lexeme_b.get(lexeme)
        if not pts_b:
            continue
        if len(pts_a) > 1 or len(pts_b) > 1:
            warnings.append(
                f"{lexeme}: {len(pts_a)} in a, {len(pts_b)} in b -- ambiguous, skipped "
                "(cross-view correspondence not solved yet)"
            )
            continue
        pairs.append((lexeme, pts_a[0], pts_b[0]))
    return pairs, warnings


def triangulate_pairs(pairs, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b):
    if not pairs:
        return []

    lexemes = [lexeme for lexeme, _, _ in pairs]
    raw_a = np.array([pt_a for _, pt_a, _ in pairs], dtype=np.float64).reshape(-1, 1, 2)
    raw_b = np.array([pt_b for _, _, pt_b in pairs], dtype=np.float64).reshape(-1, 1, 2)

    und_a = cv2.undistortPoints(raw_a, mtx_a, dist_a, P=mtx_a).reshape(-1, 2).T
    und_b = cv2.undistortPoints(raw_b, mtx_b, dist_b, P=mtx_b).reshape(-1, 2).T

    points_4d = cv2.triangulatePoints(proj_a, proj_b, und_a, und_b)
    points_3d = (points_4d[:3] / points_4d[3]).T
    return list(zip(lexemes, points_3d))


def report(points, warnings) -> None:
    print("\n" + "=" * 60)
    for lexeme, point in points:
        x, y, z = point
        print(f"  {lexeme:>6}  x={x:8.1f}  y={y:8.1f}  z={z:8.1f}  (mm, camera-a frame)")
    for warning in warnings:
        print(f"  ! {warning}")
    if not points:
        print("  (no matched detections)")


def run_static(image_a: str, image_b: str, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b) -> None:
    frame_a = cv2.imread(image_a)
    frame_b = cv2.imread(image_b)
    if frame_a is None or frame_b is None:
        sys.exit("could not read one of the images")

    dets_a, _ = reconstruir.detectar_en_cuadro(frame_a)
    dets_b, _ = reconstruir.detectar_en_cuadro(frame_b)
    pairs, warnings = match_detections(dets_a, dets_b)
    points = triangulate_pairs(pairs, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b)
    report(points, warnings)


def run_live(source_a, source_b, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b) -> None:
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

            dets_a, _ = reconstruir.detectar_en_cuadro(frame_a)
            dets_b, _ = reconstruir.detectar_en_cuadro(frame_b)
            pairs, warnings = match_detections(dets_a, dets_b)
            points = triangulate_pairs(pairs, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b)
            report(points, warnings)
    finally:
        cap_a.release()
        cap_b.release()


def main() -> None:
    parser = argparse.ArgumentParser(description="Triangulate 3D block positions from two calibrated cameras")
    parser.add_argument("--intrinsics-a", required=True)
    parser.add_argument("--intrinsics-b", required=True)
    parser.add_argument("--extrinsics", required=True, help="rotation/translation from camera A to camera B")
    parser.add_argument("--image-a", help="static test image for camera A")
    parser.add_argument("--image-b", help="static test image for camera B")
    parser.add_argument("--camera-a", help="camera A index or video URL")
    parser.add_argument("--camera-b", help="camera B index or video URL")
    args = parser.parse_args()

    mtx_a, dist_a = load_intrinsics(args.intrinsics_a)
    mtx_b, dist_b = load_intrinsics(args.intrinsics_b)
    rotation, translation = load_extrinsics(args.extrinsics)
    proj_a, proj_b = build_projections(mtx_a, mtx_b, rotation, translation)

    if args.image_a and args.image_b:
        run_static(args.image_a, args.image_b, proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b)
    elif args.camera_a and args.camera_b:
        run_live(
            reconstruir.resolver_fuente_camara(args.camera_a), reconstruir.resolver_fuente_camara(args.camera_b),
            proj_a, proj_b, mtx_a, dist_a, mtx_b, dist_b,
        )
    else:
        sys.exit("provide either --image-a/--image-b or --camera-a/--camera-b")


if __name__ == "__main__":
    main()
