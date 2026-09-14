# SCuLPT Vision — markerless, multi-camera reconstruction

Reconstructs a SCuLPT program from one or more cameras pointed at the real
physical blocks (no markers), and runs it on the real SCuLPTER interpreter,
unmodified.

## Symbol recognition

Reference photos live in `referencias/`, seeded from the official renders
(`sembrar_referencias_desde_renders.py`). Each symbol is matched against a
bank of rotations (-40° to 40°) — plain matching breaks past ~20° of camera
rotation.

`simbolos.json` maps each reference photo to the lexeme it emits, and records
how the symbol is handwritten on the physical block (`↓` → `PUSH`, `+` →
`ADD`, `♡` → `heart`, …). Stack names must be ASCII identifiers because the
SCuLPTER lexer accepts nothing else, so `♡` becomes `heart` and `○` becomes
`circle`. Entries with `"confirmado": false` were inferred from a photo and
still need checking against the real blocks.

The current reference photos were cut from the official render, but the
physical blocks carry hand-drawn symbols, so those templates will most likely
not match. To enable a symbol, photograph the real block and save it in
`referencias/` under the `archivo` name from the table (`PUSH.jpg`,
`heart.jpg`, `3.jpg`). A photo whose name is not in the table is used as-is
with its filename as lexeme. `reconstruir.py` prints at startup which table
entries still have no photo.

## Multi-camera, uncalibrated (2D)

Each camera reads independently, and the reading with the most recognized
symbols wins per frame. Instructions are grouped by pixel row, so this only
works for programs laid flat on the table. A stopgap before real fusion.

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --camara 2
```

## Two calibrated cameras (3D)

Calibrate once with a 9×6 chessboard (25 mm squares), then reconstruct:

```bash
python3 vision-prototype/calibrate_cameras.py intrinsics --camera 0 --out cam_a.json
python3 vision-prototype/calibrate_cameras.py intrinsics --camera 1 --out cam_b.json
python3 vision-prototype/calibrate_cameras.py extrinsics --camera-a 0 --camera-b 1 \
    --intrinsics-a cam_a.json --intrinsics-b cam_b.json --out rig.json
python3 vision-prototype/triangulate.py --intrinsics-a cam_a.json --intrinsics-b cam_b.json \
    --extrinsics rig.json --camera-a 0 --camera-b 1
```

`triangulate.py` pairs detections across the views (same lexeme, epipolar
constraint, and depth plausibility to tell apart duplicates such as several
`PUSH` blocks in one row), triangulates them to millimetres, and hands the
points to `adjacency.py`, which turns them into a program:

- Operation tiles one block pitch apart (`BLOCK_PITCH_MM`, 60 mm until
  measured on the printed blocks) are consecutive instructions.
- Parameter tiles belong to the block whose operation tile sits right before
  them along the flow. The reading direction is whichever orientation makes
  that true for every tile; a chain with no parameter tiles at all is
  reported as `direction unconfirmed`.
- A physical loop (a cycle closed with a T connector) becomes a trailing
  `JMP -n` back to the block it re-enters, which is how the paper's
  Fibonacci sculpture is written in SCuLPTER.

The program is then run on the real interpreter (`--sin-interprete` skips
that). `test_points/*.json` are synthetic point sets for `adjacency.py`, and
`tests/` covers the whole 3D path with virtual cameras:

```bash
python3 vision-prototype/adjacency.py --points vision-prototype/test_points/loop_with_prefix.json
python3 -m unittest discover -s vision-prototype/tests
```

## Camera input

Works with any camera index or a video URL (DroidCam, IP Webcam, etc). On
macOS, an iPhone shows up automatically via Continuity Camera —
`listar_camaras.py` helps find the right index.

## 3D simulator

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --servir-3d
```

Opens a websocket on `ws://localhost:8765`. With `simulador_3d/index.html`
open, each stable camera reading replaces the program on the 3D table.

## No camera

```bash
python3 vision-prototype/reconstruir.py --imagen vision-prototype/imagenes_prueba/demo_simbolos_reales.png
```

## TODO

- Reference photos of the real hand-drawn blocks (see `simbolos.json`)
- Measure the real block pitch, and the pitch through a T connector, and set
  `BLOCK_PITCH_MM` / `PITCH_TOLERANCE_MM` in `adjacency.py` accordingly
- Feed the 3D reconstruction to the simulator (only `reconstruir.py` serves it)
