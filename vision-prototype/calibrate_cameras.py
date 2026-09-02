import argparse
import json
import sys

import cv2
import numpy as np

BOARD_SIZE = (9, 6)  # inner corners
SQUARE_SIZE_MM = 25.0
MIN_SAMPLES = 15
CORNER_CRITERIA = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)


def resolve_source(value: str):
    try:
        return int(value)
    except ValueError:
        return value


def board_points() -> np.ndarray:
    cols, rows = BOARD_SIZE
    pts = np.zeros((cols * rows, 3), np.float32)
    pts[:, :2] = np.mgrid[0:cols, 0:rows].T.reshape(-1, 2)
    return pts * SQUARE_SIZE_MM


def find_corners(frame: np.ndarray):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    found, corners = cv2.findChessboardCorners(gray, BOARD_SIZE)
    if not found:
        return None
    return cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), CORNER_CRITERIA)


def frame_size(frame: np.ndarray) -> tuple[int, int]:
    height, width = frame.shape[:2]
    return width, height


def capture_intrinsic_samples(source):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        sys.exit(f"cannot open camera: {source}")

    board = board_points()
    obj_pts, img_pts = [], []
    size = None

    print("SPACE: capture sample | q: finish")
    while True:
        ok, frame = cap.read()
        if not ok:
            continue
        size = frame_size(frame)
        corners = find_corners(frame)

        preview = frame.copy()
        if corners is not None:
            cv2.drawChessboardCorners(preview, BOARD_SIZE, corners, True)
        cv2.putText(preview, f"samples: {len(obj_pts)}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        cv2.imshow("calibration", preview)

        key = cv2.waitKey(1) & 0xFF
        if key == ord(" ") and corners is not None:
            obj_pts.append(board)
            img_pts.append(corners)
            print(f"sample {len(obj_pts)} captured")
        elif key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    return obj_pts, img_pts, size


def calibrate_intrinsics(source, out_path: str) -> None:
    obj_pts, img_pts, size = capture_intrinsic_samples(source)
    if len(obj_pts) < MIN_SAMPLES:
        sys.exit(f"not enough samples ({len(obj_pts)}/{MIN_SAMPLES}) -- redo with more angles/distances")

    error, cam_mtx, dist, _, _ = cv2.calibrateCamera(obj_pts, img_pts, size, None, None)
    print(f"reprojection error: {error:.4f}px")

    data = {"camera_matrix": cam_mtx.tolist(), "dist_coeffs": dist.tolist(), "image_size": size}
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"saved intrinsics to {out_path}")


def load_intrinsics(path: str):
    with open(path) as f:
        data = json.load(f)
    return np.array(data["camera_matrix"]), np.array(data["dist_coeffs"])


def capture_stereo_samples(source_a, source_b):
    cap_a = cv2.VideoCapture(source_a)
    cap_b = cv2.VideoCapture(source_b)
    if not cap_a.isOpened() or not cap_b.isOpened():
        sys.exit("cannot open both cameras")

    board = board_points()
    obj_pts, pts_a, pts_b = [], [], []
    size = None

    print("SPACE: capture sample (board visible in both views) | q: finish")
    while True:
        ok_a, frame_a = cap_a.read()
        ok_b, frame_b = cap_b.read()
        if not (ok_a and ok_b):
            continue
        size = frame_size(frame_a)
        corners_a = find_corners(frame_a)
        corners_b = find_corners(frame_b)

        preview_a, preview_b = frame_a.copy(), frame_b.copy()
        if corners_a is not None:
            cv2.drawChessboardCorners(preview_a, BOARD_SIZE, corners_a, True)
        if corners_b is not None:
            cv2.drawChessboardCorners(preview_b, BOARD_SIZE, corners_b, True)
        cv2.imshow("camera a", preview_a)
        cv2.imshow("camera b", preview_b)

        key = cv2.waitKey(1) & 0xFF
        if key == ord(" ") and corners_a is not None and corners_b is not None:
            obj_pts.append(board)
            pts_a.append(corners_a)
            pts_b.append(corners_b)
            print(f"sample {len(obj_pts)} captured")
        elif key == ord("q"):
            break

    cap_a.release()
    cap_b.release()
    cv2.destroyAllWindows()
    return obj_pts, pts_a, pts_b, size


def calibrate_extrinsics(source_a, source_b, intrinsics_a: str, intrinsics_b: str, out_path: str) -> None:
    mtx_a, dist_a = load_intrinsics(intrinsics_a)
    mtx_b, dist_b = load_intrinsics(intrinsics_b)

    obj_pts, pts_a, pts_b, size = capture_stereo_samples(source_a, source_b)
    if len(obj_pts) < MIN_SAMPLES:
        sys.exit(f"not enough samples ({len(obj_pts)}/{MIN_SAMPLES}) -- redo with more angles/distances")

    error, _, _, _, _, rotation, translation, _, _ = cv2.stereoCalibrate(
        obj_pts, pts_a, pts_b, mtx_a, dist_a, mtx_b, dist_b, size,
        flags=cv2.CALIB_FIX_INTRINSIC,
    )
    print(f"stereo reprojection error: {error:.4f}px")

    data = {"rotation": rotation.tolist(), "translation": translation.tolist()}
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"saved extrinsics to {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chessboard calibration for the multi-camera SCuLPT vision pipeline")
    subparsers = parser.add_subparsers(dest="mode", required=True)

    intrinsics_cmd = subparsers.add_parser("intrinsics", help="calibrate one camera's matrix and distortion")
    intrinsics_cmd.add_argument("--camera", required=True, help="camera index or video URL")
    intrinsics_cmd.add_argument("--out", required=True, help="output JSON path")

    extrinsics_cmd = subparsers.add_parser("extrinsics", help="calibrate rotation/translation between two cameras")
    extrinsics_cmd.add_argument("--camera-a", required=True)
    extrinsics_cmd.add_argument("--camera-b", required=True)
    extrinsics_cmd.add_argument("--intrinsics-a", required=True, help="intrinsics JSON for camera A")
    extrinsics_cmd.add_argument("--intrinsics-b", required=True, help="intrinsics JSON for camera B")
    extrinsics_cmd.add_argument("--out", required=True, help="output JSON path")

    args = parser.parse_args()

    if args.mode == "intrinsics":
        calibrate_intrinsics(resolve_source(args.camera), args.out)
    else:
        calibrate_extrinsics(
            resolve_source(args.camera_a), resolve_source(args.camera_b),
            args.intrinsics_a, args.intrinsics_b, args.out,
        )


if __name__ == "__main__":
    main()
