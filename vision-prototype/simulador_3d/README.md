# 3D Simulator SCuLPT

A build-table simulation: drag an operation from the palette, assign its
operands, and it shows up in the scene with the real STL geometry
(`modelos/`). Every change is rebuilt and validated against the real
SCuLPTER interpreter, compiled to JavaScript unmodified
(`interprete.js`, generated from `src/main/scala/sculpter/*.scala` +
`PuenteJS.scala`).

## Setup

`interprete.js` isn't checked in (it's a build artifact) — generate it
first:

```bash
cd /path/to/SCuLPTER
scala-cli package --power --js --js-module-kind es \
  src/main/scala/sculpter/Tokens.scala \
  src/main/scala/sculpter/AST.scala \
  src/main/scala/sculpter/Lexer.scala \
  src/main/scala/sculpter/Parser.scala \
  src/main/scala/sculpter/Interpreter.scala \
  vision-prototype/simulador_3d/PuenteJS.scala \
  -o vision-prototype/simulador_3d/interprete.js --force
```

`PuenteJS.scala` is the only new file — it exposes `sculptEjecutar(codigo)`
as a global JS function. It imports `Lexer`/`Parser`/`Interpreter` as-is,
doesn't touch or duplicate them. Re-run this whenever the language changes.

## Running it

ES modules and `.stl` loading need HTTP, not `file://`:

```bash
cd vision-prototype/simulador_3d
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Live camera mode

Besides manual drag, the page auto-connects to `ws://localhost:8765`. Run,
in another terminal:

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --servir-3d
```

The "Camera" indicator on the right panel flips to "connected", and every
time the physical table settles, the reconstructed program **replaces**
whatever was in the scene — hand-built or from a previous reading. Both
paths go through the same code (`reconstruirTodo` → `sculptEjecutar`), so
there's no separate validation logic for each.

## What's simplified, on purpose

- Each drag places a full instruction (operation + operands), not
  individual connected blocks. A fidelity step for a later version, not an
  oversight.
- Operands are entered via `prompt()` instead of dragging and connecting a
  real parameter piece — the `Parameter v4.stl` piece does show up next to
  each operand, but its value is typed, not physically assembled.
- Instruction order is controlled with the ↑/↓ buttons on the right panel,
  not by reordering in the 3D scene directly.
