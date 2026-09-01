# Simulador 3D SCuLPT

Simulación de mesa de construcción: arrastras una operación desde la
paleta, le asignas sus operandos, y aparece en la escena con la geometría
STL real (`modelos/`, copiada de `/Users/carlagonzalez/SCuLPT/STLs`). El
programa se reconstruye y se valida en cada cambio contra el **intérprete
real de SCuLPTER, compilado a JavaScript sin modificarlo**
(`interprete.js`, generado desde `src/main/scala/sculpter/*.scala` +
`PuenteJS.scala` con `scala-cli --js`).

## Cómo correrlo

Los módulos ES y la carga de los `.stl` necesitan HTTP, no `file://`:

```bash
cd vision-prototype/simulador_3d
python3 -m http.server 8000
```

Abrir `http://localhost:8000` en el navegador.

## Modo cámara en vivo

Además del arrastre manual, la página se conecta automáticamente a
`ws://localhost:8765`. Si corres, en otra terminal:

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --servir-3d
```

el indicador "Cámara" en el panel derecho pasa a "conectada", y cada vez
que la mesa real se estabiliza, el programa reconstruido por la(s)
cámara(s) **reemplaza** lo que hubiera en la escena -- construido a mano o
por una lectura anterior. Ambas fuentes usan el mismo camino interno
(`reconstruirTodo` → `sculptEjecutar`), así que no hay dos lógicas de
validación distintas.

## Qué se simplificó (a propósito)

- Cada arrastre coloca una instrucción completa (operación + operandos),
  no bloque por bloque conectados físicamente uno a uno. Eso es un paso
  más de fidelidad para una siguiente versión, no algo que faltara por
  descuido.
- Los operandos se piden con un `prompt()` en vez de arrastrar una pieza
  de parámetro real y conectarla -- la pieza `Parameter v4.stl` sí se
  muestra en la escena junto a cada operando, pero su valor se escribe,
  no se arma físicamente.
- El orden de las instrucciones se controla con los botones ↑/↓ del panel
  derecho, no reordenando en la escena 3D directamente.

## Regenerar `interprete.js` tras cambiar el lenguaje

```bash
cd /Users/carlagonzalez/SCuLPTER
scala-cli package --power --js --js-module-kind es \
  src/main/scala/sculpter/Tokens.scala \
  src/main/scala/sculpter/AST.scala \
  src/main/scala/sculpter/Lexer.scala \
  src/main/scala/sculpter/Parser.scala \
  src/main/scala/sculpter/Interpreter.scala \
  vision-prototype/simulador_3d/PuenteJS.scala \
  -o vision-prototype/simulador_3d/interprete.js --force
```

`PuenteJS.scala` es el único archivo nuevo: expone `sculptEjecutar(codigo)`
como función global de JS. No toca ni duplica `Lexer`, `Parser` ni
`Interpreter` -- los importa tal cual.
