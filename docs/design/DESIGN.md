# Diseño del Simulador 3D SCuLPT

Este documento es la especificación visual y de interacción del simulador. Cualquier cambio de interfaz debe seguirlo. Las referencias visuales exactas están en `docs/design/reference/`:

- `reference/*.png`: las siete pantallas objetivo, a 1440 × 900 (renderizadas a 2x).
- `reference/html/*.html` + `reference/html/styles.css`: los mockups como HTML y CSS reales. **El CSS es la fuente de verdad de medidas, colores y tipografía**; cuando este documento y el CSS no coincidan, manda el CSS.

Los mockups son estáticos: no tienen JavaScript y las escenas 3D son SVG. En la app, la mesa la sigue dibujando three.js y la lógica la sigue haciendo `app.js`.

---

## 1. Idea general

Es un editor al estilo Figma: la mesa ocupa toda la ventana y los paneles flotan encima. Lo que se construye se ve dos veces, como objeto 3D en la mesa y como lista ordenada en el panel izquierdo, y las dos vistas están sincronizadas: seleccionar en una es seleccionar en la otra.

Lo usan niñas y niños, artistas e ingenieros. Por eso los bloques llevan colores fuertes por familia, y todo lo demás es blanco y gris claro.

## 2. Reglas que no se rompen

1. **El color tiene significado.** El violeta, el amarillo y el magenta son solo para las familias de bloques; el azul, solo para selección, foco y la acción principal; el rojo naranja, solo para lo que falta o falla; el verde, solo para "Programa válido" y "Calibración buena". Ningún otro uso de color.
2. **Sin pastillas ni etiquetas decorativas.** Nada de chips de estado junto a títulos, puntos de colores, badges ni contadores decorativos. Las formas de pastilla o botón se usan solo en controles reales.
3. **Sin datos inventados.** No se muestran versiones, FPS, latencias ni métricas que la app no calcule de verdad. Si un dato todavía no existe, la sección no se muestra.
4. **Textos en español y en minúscula de oración.** Nada en mayúsculas sostenidas, salvo los nombres de operación (`PUSH`, `MOV`…), que son código.
5. **La monoespaciada es solo para código:** nombres de operación, etiquetas de pila, valores, texto SCuLPT y trazas.
6. **Íconos solo cuando el ícono es el control:** cerrar, borrar, reordenar, cámara, pasos de ejecución.
7. **No se cambia la semántica del lenguaje.** La interfaz muestra lo que dice SCuLPTER (sección 9).

## 3. Tokens

Se definen como variables en `:root`. Hay que copiarlos tal cual de `reference/html/styles.css`.

| Token | Valor | Uso |
|---|---|---|
| `--canvas` | `#F5F5F5` | fondo de la mesa y de la ventana |
| `--panel` | `#FFFFFF` | paneles flotantes, barra, popovers, marcos |
| `--field` | `#F5F5F5` | campos, bloques de código, tarjetas |
| `--line` | `#E6E6E6` | separadores entre secciones (1 px) |
| `--text` | `#1E1E1E` | texto principal |
| `--text-2` | `#757575` | texto secundario y rótulos |
| `--text-3` | `#B3B3B3` | pasos pendientes, deshabilitado |
| `--sel` | `#0D99FF` | selección, foco, botón principal |
| `--sel-bg` | `#E5F4FF` | fila seleccionada |
| `--sel-bg-2` | `#F2F9FF` | hijos de la fila seleccionada |
| `--bin` | `#7B61FF` | familia binaria: PUSH, MOV |
| `--una` | `#FFC700` | familia unaria y mixta: POP, DUP, NEG, ?, JMP, CMP (texto encima **oscuro**) |
| `--ari` | `#F0368D` | familia aritmética: ADD, SUB, MUL, DIV, MOD |
| `--ok` | `#14AE5C` | válido |
| `--err` | `#F24822` | sin leer, errores |

**Sombra de los paneles flotantes:** `0 0 0 .5px rgba(0,0,0,.14), 0 1px 3px rgba(0,0,0,.08), 0 5px 12px rgba(0,0,0,.08)`.

**Radios:** 13 px en paneles, barra y popover; 8 px en tarjetas y bloques de la barra; 5 px en campos, botones y filas; 3 px en muestras de color.

**Espaciado:** base de 4 px. Las secciones llevan `12px 16px 16px` de padding y las filas de lista miden 32 px de alto.

## 4. Tipografía

- **Interfaz:** Google Sans Flex, 12.5 px / 16 px. Títulos de sección en 12.5 px con peso 600. Nombre de la app en 13 px con peso 600.
- **Código:** Roboto Mono 400/500, 12.5 px (18 px en las fichas de las pilas).
- **Íconos:** Material Symbols Rounded, 16–20 px, relleno solo cuando está activo.
- Los archivos `.woff2` están en `reference/html/fonts/`. En la app se pueden servir desde ahí o desde Google Fonts. Material Symbols conviene cargarlo desde Google Fonts, porque el archivo local pesa 5 MB.

## 5. Estructura de la ventana

```
┌───────────┬──────────────────────────────────────┬──────────────┐
│ panel izq │                                      │ panel der    │
│ 248 px    │            lienzo / mesa 3D          │ 288 px       │
│ flotante  │                                      │ flotante     │
│ 12 px de  │                                      │ 12 px de     │
│ margen    │       ┌─ barra de herramientas ─┐    │ margen       │
│           │       └─ flotante, centrada ────┘    │              │
└───────────┴──────────────────────────────────────┴──────────────┘
```

- El lienzo ocupa **toda** la ventana. Los paneles van `position: absolute` encima, con `top/bottom: 12px`.
- **Panel izquierdo**, de arriba abajo: nombre de la app, lista de **Páginas** (la actual con ✓) y la lista de la página (Programa, Capturas, Vocabulario o Lista de piezas).
- **Panel derecho:** propiedades de lo seleccionado en secciones separadas por `--line`. No tiene pestañas.
- **Barra de herramientas:** abajo, centrada sobre el área visible del lienzo, a 16 px del borde. Su contenido cambia según la página.

## 6. Componentes

Cada uno tiene su clase en `styles.css`. Hay que reusar esos nombres o mapearlos 1 a 1.

- **Fila de programa** (`.layer`): chevron, número, muestra de color de la familia, operación en mono y parámetros. Las etiquetas de pila van como su forma dibujada; los números, como texto. Estados: normal; `.sel.open`, que despliega los hijos (operación y cada parámetro) sobre `--sel-bg-2`; `.next`, que marca la instrucción siguiente en Ejecución con un ▶ azul en lugar del chevron. Un parámetro que no se leyó se muestra como "Sin leer" en `--err`, con una ficha de borde punteado.
- **Propiedad** (`.prop` + `.fld`): rótulo gris de 84 px a la izquierda y un campo gris a la derecha. El campo en foco lleva fondo blanco y un borde interior de 1 px en `--sel`.
- **Barra de bloques** (`.toolbar` + `.blk`): "Parámetro libre" y luego los grupos Binarias | Unarias y mixtas | selector de tamaño + Aritméticas, separados por divisores de 1 px. Cada bloque es un botón de 36 px de alto con el color de su familia; el texto es blanco, salvo en amarillo, donde es oscuro.
- **Selección en la mesa:** marco de 1.5 px en `--sel` alrededor del bloque, cuatro tiradores blancos de 8 px con borde azul y, debajo, una etiqueta azul con la instrucción en mono (`MOV circle triangle`). En Ejecución no lleva tiradores y la etiqueta dice `Siguiente: …`.
- **Popover de parámetro** (`.popover`): flota junto al bloque seleccionado, sin oscurecer el fondo. Tiene 272 px de ancho y contiene Contenido (select), Nombre (campo en foco), ayuda, Dibujo (lienzo gris con "Borrar") y los botones Cancelar (secundario) y Guardar (primario).
- **Estado** (`.status`): ícono de 16 px, título en 600 y texto de apoyo gris. El ícono puede ser un ✓ verde (válido o calibración buena) o un ! rojo (lectura incompleta o error).
- **Marco en el lienzo** (`.frame` + `.frame-label`): nombre gris encima y contenido blanco sin borde ni radio, como un frame de Figma.
- **Torre de pila** (`.tower`): fichas grises de 88 × 44 px apiladas de abajo arriba. El tope es blanco con borde de 2 px en `--text`, lleva una base negra de 6 px y debajo la forma y el nombre de la pila.
- **Traza** (`.trace`): tabla con columnas #, Instrucción y una por pila. La fila recién ejecutada va en `--sel-bg-2` y las pendientes en `--text-3`. La notación es `[3, 5]`, con el tope a la derecha.
- **Botones:** primario en `--sel` con texto blanco y secundario en `--field`. Ambos miden 28 px de alto y tienen radio de 5 px.
- **Interruptor** (`.toggle`): 28 × 16 px; activo en `--sel`.

## 7. Mesa 3D (three.js)

La referencia visual es `reference/1-mesa.png`.

- **Fondo de la escena:** `#F5F5F5`, igual que `--canvas`, para que la mesa y la interfaz sean una sola superficie.
- **Mesa:** plano con esquinas redondeadas en `#EBEBEB`, sin textura.
- **Bloques:** del color de su familia (`--bin`, `--una`, `--ari`). La cara superior va en el color puro y las laterales entre 16 y 30 % más oscuras; el sombreado plano (`MeshLambertMaterial` o `flatShading`) basta. La parte elevada, donde va la ficha de operación, lleva el color 8 % más oscuro.
- **Fichas:** cuadradas y blancas. La de operación muestra su nombre en Roboto Mono; las de etiqueta de pila, su forma o dibujo en trazo negro; las de valor, el número.
- **Tamaño de bloque:** los bloques de 1 parámetro son más cortos que los de 2 (en la referencia, 42 mm frente a 60 mm).
- **Sombra de contacto:** suave, negra al 16 % y difuminada.
- **Selección:** marco, tiradores y etiqueta según la sección 6. Pueden dibujarse como overlay HTML o SVG proyectando la caja del bloque a pantalla, o con un `Box3Helper` en `#0D99FF`. Tiene que coincidir con la fila seleccionada del panel izquierdo.
- **En Ejecución:** los bloques ya ejecutados y los pendientes se aclaran mezclándolos al 55 % con `#F5F5F5`; el bloque siguiente queda en color pleno.

## 8. Páginas

| Página | Referencia | Barra inferior | Panel izquierdo | Panel derecho |
|---|---|---|---|---|
| Mesa | `1-mesa.png` | bloques | Programa | Instrucción N, Texto SCuLPT, Intérprete, Cámara |
| (Mesa + popover) | `2-parametro.png` | bloques | Programa | igual que Mesa |
| Ejecución | `3-ejecucion.png` | Reiniciar, Atrás, **Siguiente paso**, Ejecutar todo, "Paso X de N" | Programa con ▶ en la siguiente | Siguiente instrucción, Traza, Valor vacío |
| Cámaras | `4-camaras.png` | ninguna | Programa reconstruido | Resultado, Lecturas, Cámara |
| Calibración | `5-calibracion.png` | ninguna | Capturas | Tablero, Capturas, Error de reproyección |
| Símbolos | `6-simbolos.png` | ninguna | Vocabulario | Símbolo, Fotos de referencia, Se parece a |
| Piezas | `7-piezas.png` | ninguna | Lista de piezas | Imprimir, Total |

Notas por página:

- **Cámaras:** las detecciones se dibujan sobre la imagen con el color de la familia del bloque, y la etiqueta muestra lexema y puntaje (`PUSH 0.82`). Lo que no se leyó va en `--err` con la etiqueta "Sin leer". El veredicto separa **"Lectura incompleta"** (falla de la visión; el programa no se ejecuta) de **"Programa inválido"** (lo decide el intérprete).
- **Calibración:** tablero de 9 × 6 esquinas y cuadros de 25 mm, con al menos 15 capturas. La calibración es buena si el error de reproyección está por debajo de 1 px, y hay que repetirla si se mueve una cámara.
- **Símbolos:** una lectura se acepta si su puntaje supera 0.45 y le saca al menos 0.08 al segundo símbolo más parecido. Un dibujo que no se ha registrado aparece como "Sin registrar".
- **Piezas:** separa las piezas que computan (bloques y fichas) de las de estructura (conectores, conector en T y bases). Estas últimas no cambian el programa.
- Las páginas cuya funcionalidad todavía no existe en el código **se muestran en la lista, pero no se implementan** hasta que haya datos reales (regla 3).

## 9. Semántica de SCuLPT que la interfaz debe respetar

Los rótulos del panel derecho dependen de la operación:

| Operación | Parámetros | Rótulos |
|---|---|---|
| `PUSH S n` | pila, valor | Pila, Valor |
| `MOV S1 S2` | destino, origen | Destino, Origen |
| `POP S`, `DUP S`, `NEG S`, `? S` | pila | Pila |
| `JMP k` / `JMP S` | valor o pila | Desplazamiento |
| `CMP S` / `CMP S n` | pila, valor opcional | Pila, Valor |
| `ADD`/`SUB`/`MUL`/`DIV`/`MOD` `S` o `S n` | pila, valor opcional | Pila, Valor |

- El selector "Tamaño de bloque" (1 o 2 parámetros) elige entre `ADD S` y `ADD S n`.
- `#` (escrito `nil`) es el valor vacío. Nunca se usa para representar una ficha que no se leyó.
- Programa de ejemplo de las referencias, válido, que termina con `circle = [8]`:
  `PUSH circle 3`, `PUSH triangle 5`, `DUP triangle`, `MOV circle triangle`, `ADD circle`.

## 10. Cómo implementarlo

1. **No romper la lógica.** `app.js` depende de IDs como `#lista-programa`, `#codigo-generado`, `#resultado`, `#editor-parametro`, `.pieza-paleta`, `.encaje` y `#capacidad-mixtas`. Si un elemento cambia de lugar, se conserva su ID o se actualizan en el mismo cambio todas las referencias en `app.js`. El arrastre de bloques hacia la mesa tiene que seguir funcionando desde la nueva barra inferior.
2. **Por fases, un commit por fase:**
   1. Tokens, fuentes y la estructura de paneles flotantes.
   2. Página Mesa: panel izquierdo, panel derecho y barra de bloques.
   3. Colores y selección de la escena three.js.
   4. Popover de parámetro, que reemplaza al `<dialog>` actual conservando su formulario.
   5. Lista de páginas y la página Ejecución, que se apoya en la ejecución paso a paso del intérprete.
   6. Las demás páginas, solo cuando exista su funcionalidad.
3. **Verificar cada fase con capturas.** Abrir la app a 1440 × 900 con Playwright, tomar una captura y compararla lado a lado con la referencia correspondiente. Corregir las diferencias de medida, color o tipografía antes de seguir.
4. **No agregar nada que no esté en las referencias ni en este documento.** Si algo parece faltar, se pregunta antes de inventarlo.
