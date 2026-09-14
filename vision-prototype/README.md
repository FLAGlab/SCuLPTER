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

## Multi-camera

No calibration yet, so no real 3D triangulation. Each camera reads
independently, and the reading with the most recognized symbols wins per
frame. A stopgap before real fusion, not a replacement for it.

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --camara 2
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

- Camera calibration for real 3D fusion (currently best-view selection only)
- Reference photos of the real hand-drawn blocks (see `simbolos.json`)
