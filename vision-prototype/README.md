# SCuLPT Vision — markerless, multi-camera reconstruction

Reconstructs a SCuLPT program from one or more cameras pointed at the real
physical blocks (no markers), and runs it on the real SCuLPTER interpreter,
unmodified.

## Symbol recognition

Reference photos live in `referencias/`, seeded from the official renders
(`sembrar_referencias_desde_renders.py`). Each symbol is matched against a
bank of rotations (-40° to 40°) — plain matching breaks past ~20° of camera
rotation.

Missing: `a`, `b`, `c`, digits, and `POP` — no official render for these
yet. Until then the camera reads the symbol but the interpreter correctly
flags the instruction as incomplete (missing operand, not a bug). Drop a
photo in `referencias/` named after the lexeme (`a.jpg`, `5.jpg`) to enable
it, no code changes needed.

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
- Reference photos for `a`, `b`, `c`, digits, `POP`
