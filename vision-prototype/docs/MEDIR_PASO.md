# Medir el paso de la cadena

## Qué distancia necesita el algoritmo

`adjacency.grafo` une dos bloques cuando la distancia **entre los centros de sus fichas de
operación** cae dentro del margen de algún paso admisible. No mide entre caras, ni entre
conectores, ni entre bordes de bloque: entre las dos fichas cuadradas que llevan el símbolo
de la operación.

Esa distancia depende del bloque que queda **detrás**, porque los dos tamaños tienen cuerpos
distintos. Según los STL:

| Bloque | Cuerpo | Paso hasta la siguiente ficha |
| --- | --- | --- |
| 1 parámetro | 65.5 mm | 65.5 + hueco del conector |
| 2 parámetros | 85.5 mm | 85.5 + hueco del conector |

El simulador usa un hueco de 29.5 mm, lo que da 95 mm y 115 mm. **Son los valores del modelo,
no una medición.** Sirven para comprobar coherencia; hay que medir las piezas impresas.

## Por qué no vale un solo número

`PASO_MM = 60` es el valor inicial, nunca medido. Sustituirlo por 105 mm tampoco es correcto:
105 es el promedio de 95 y 115, y no corresponde a ninguna pieza.

Con la regla anterior, de un paso con margen del 20 %, un solo valor cubre una cadena mixta
solo si está entre **95.8 y 118.8 mm**. Es decir: si mides bien el bloque de un parámetro y
escribes 95, la cadena mixta se rompe y pierdes dos uniones de cuatro. Que 105 funcionara era
suerte del margen, no corrección. `tests/test_paso.py` fija los tres casos.

Por eso la configuración acepta ahora **dos pasos**, uno por tamaño de bloque, y el margen pasa
a ser absoluto (8 mm) en vez de proporcional. Si toda la cadena usa el mismo tamaño, deja el
segundo vacío.

## Cómo medir con calibrador

Mide sobre el montaje armado, no sobre piezas sueltas: el conector se inserta y la distancia
real depende de cuánto entra.

1. **Arma una cadena homogénea de tres bloques de 1 parámetro** con sus conectores, apoyada y
   recta sobre la mesa.
2. Con el calibrador, mide del **centro de la ficha de operación** del bloque 1 al centro de la
   del bloque 2. Repite entre el 2 y el 3. Para encontrar el centro, mide el borde izquierdo y
   el derecho de la ficha y toma el punto medio; o mide borde izquierdo a borde izquierdo de
   dos fichas consecutivas, que da lo mismo si las fichas son iguales.
3. Anota las dos medidas y promédialas. Ese es **paso 1**.
4. **Repite con tres bloques de 2 parámetros.** Ese es **paso 2**.
5. **Arma una cadena mixta** alternando tamaños y comprueba que cada distancia cae a menos de
   8 mm de uno de los dos pasos. Si no, la tolerancia de impresión es mayor de lo previsto y
   hay que ampliar el margen antes del ensayo.

Mide cada distancia dos veces y quédate con la media. Una diferencia de más de 2 mm entre
repeticiones indica que el conector no está bien insertado.

## Dónde se anotan

En la página Cámaras, sección de fusión: **paso** y **paso 2**. El servicio los guarda en la
configuración y marca `medido: true`. Mientras `medido` sea falso, la fusión avisa de que el
paso no se ha medido.

```
paso_mm    = medida de la cadena de 1 parámetro
paso_2_mm  = medida de la cadena de 2 parámetros, o vacío
```

Los dos deben estar entre 20 y 300 mm y diferenciarse al menos 2 mm.

## Comprobar la coherencia con el modelo

Si tus medidas se apartan de 95 y 115 en más de unos milímetros, antes de seguir revisa que la
impresión no haya salido a otra escala. Los STL están en `simulador_3d/modelos/` y sus cajas se
leen con cualquier visor; el cuerpo del bloque corto debe medir 65.5 mm.

## El paso se ata al bloque de origen

Aceptar las dos distancias para cualquier pareja uniría bloques que no pueden ser contiguos.
La aridad de la operación dice el tamaño del bloque en 7 de las 13 operaciones:

| Operación | Bloque | Paso que admite |
| --- | --- | --- |
| `PUSH`, `MOV` | 2 parámetros | solo el largo |
| `POP`, `DUP`, `NEG`, `?`, `JMP` | 1 parámetro | solo el corto |
| `CMP`, `ADD`, `SUB`, `MUL`, `DIV`, `MOD` | uno o dos | ambos, sin poder decidir |

Así, dos `POP` separados por el paso largo ya no se unen: ninguno puede ser un bloque de dos
parámetros. Cuando la unión solo se sostiene por una operación de aridad mixta,
`uniones_ambiguas` la marca y la fusión avisa de que esa unión está **sin confirmar**. No se
descarta ni se da por buena: se declara.

Contar los parámetros observados resolvería la ambigüedad, pero el reparto de parámetros
ocurre después de construir el grafo y depende de él. Deshacer esa dependencia es trabajo
pendiente; hasta entonces la ambigüedad se informa.

## Lo que esto todavía no resuelve

La distancia sola no distingue un bloque contiguo de otro que la cadena trae de vuelta al
curvarse **cuando ambos admiten el mismo paso**: en una herradura cerrada de bloques de un
parámetro, el primero y el último quedan a un paso corto sin estar unidos, y eso el margen no
lo arregla. Si los tamaños difieren, atar el paso a la operación sí lo descarta. Eso lo trata `recorridos()` con sus aristas de retorno, y es lo que
convierte un bucle físico en `JMP -n`. Ampliar o estrechar el margen no cambia ese caso.
