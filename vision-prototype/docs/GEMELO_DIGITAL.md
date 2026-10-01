# Gemelo digital del montaje multicámara

Sirve para probar el reconocimiento y la fusión **antes** de tener las cámaras. Las cámaras
virtuales rinden imágenes RGB desde su posición y esas imágenes pasan por el **mismo**
reconocimiento y la misma fusión que usarán las físicas. La verdad conocida de la escena se
guarda aparte y solo se usa para evaluar; nunca entra en la tubería.

## Qué atraviesa código real y qué está simulado

| Etapa | Estado |
| --- | --- |
| Geometría de cámara, pose e intrínsecos | **Real**: `geometria_fusion.modelo` y `proyectar`, la misma que la fusión |
| Imagen RGB | **Simulada**: proyección de cuadriláteros con oclusión por orden de profundidad |
| Detección de regiones | **Real**: `reconstruir.regiones`, umbral adaptativo y contornos |
| Lectura de símbolos | **Real**: `Vocabulario.puntuar` y `aceptar_candidatos`, con los umbrales de producción |
| Estado compartido y fusión | **Real**: `Fusion.actualizar`, con una corrección que el gemelo obligó a hacer (§ defecto 5) |
| Validación y traza | **Real**: el intérprete Scala compilado, en un Web Worker |
| Profundidad | **No implementada**: las cámaras virtuales son RGB y entregan `profundidad: None` |
| Piezas que no computan | **Simuladas**: soportes, conectores, T y hojas impresas se rinden pero no entran en `piezas_del_programa()` |

`Fusion.actualizar` **sí cambió**. No se ajustó ningún umbral ni se tocó el orden de la
tubería: se corrigió `_votar`, que fabricaba confianza a partir de la ausencia de lecturas.
El detalle está en el defecto 5. La corrección es del código que usará el montaje físico, no
de la simulación.

## Preparar el vocabulario

El catálogo real solo tiene referencias de las 13 operaciones, y son renders. Para que una
escena tenga etiquetas y literales hay que sembrar fichas sintéticas:

```bash
python3 herramientas/sembrar_vocabulario_virtual.py a b n tmp fib 0 1 2 3 5 99 \
  --datos datos_locales/virtual
```

Quedan con `origen: "sintetico"`, distinto de `foto` y de `render`. A cada etiqueta de pila se
le asigna un dibujo distinto y comprobado para que no colisione con otra. Los informes y la
página Símbolos dicen la procedencia; una medida obtenida así **no** describe fichas impresas.

Las cifras de más abajo se midieron con exactamente ese comando. Sembrar solo los tres
símbolos que una escena necesita da el mismo resultado: los once no introducen confusiones.

## Ejecutar sin abrir la interfaz

```bash
PYTHONPATH=. python3 herramientas/simular_escena.py --escena todas --pasos 12 \
  --json datos_locales/informes/gemelo.json
```

**Con `--pasos 8` el informe da cero confirmaciones en las dieciocho escenas**, y no es un
fallo del reconocimiento: la fusión exige 0.8 s de quietud antes de confirmar y cada paso
avanza 0.1 s, así que el paso 7 va por 0.7 s y nunca se cumple el plazo. La reconstrucción ya
es correcta desde el paso 0; lo que falta es tiempo. Con doce pasos se confirma a partir del
paso 8. Cualquier medida de confirmaciones necesita `--pasos 12` o más.

Cada informe trae confirmaciones correctas, confirmaciones incorrectas, pendientes, latencia de
lectura y de fusión, y la cobertura de cada cámara. Con `--guardar-imagenes CARPETA` se vuelcan
los fotogramas sintéticos.

## La pantalla

```bash
python3 servicio.py
```

Abre la dirección que imprime y entra en **Gemelo**. La vista principal es la mesa en 3D con
los bloques en su inclinación y su altura reales, las fichas sobre sus caras, los conectores,
los conectores en T con sus tres puertos, los soportes y los modelos de cámara con su cono de
visión. Se orbita libremente y se puede tocar una ficha, un conector o una T para ver su
estado. Mover una cámara actualiza a la vez su pose, su monitor y sus observaciones.

La escena 3D se dibuja con la geometría que el simulador ya conoce. Esa geometría **no entra
como evidencia** en el reconocimiento ni en la fusión: sirve para pintar, no para decidir.

Alrededor, por cámara, la vista que realmente obtiene desde su posición, su cobertura en
píxeles por milímetro, lo que leyó y cuántas regiones detectó sin poder leer. Debajo, el
resultado conjunto con la procedencia de cada pieza, y un panel con el veredicto de Scala
sobre el programa candidato.

En el panel derecho se elige la escena, se avanza o retrocede el armado, se reproduce, se
reinicia, se selecciona una cámara para mover su posición, su objetivo y su campo de visión,
se añaden o quitan cámaras y se guarda la configuración en `datos_locales/`.

## Procedencia de cada pieza

No se usa «consenso» como sinónimo de mayoría. Se distinguen cuatro situaciones:

- **Coincidencia independiente**: dos o más cámaras la sitúan y la leen igual.
- **Observación única**: una sola cámara la sostiene. Nadie la desmiente y nadie la corrobora.
- **Inferencia geométrica**: su posición sale de la nube de profundidad, no de dos vistas.
- **Sin información**: ninguna cámara la observó en este paso. Sin profundidad no se distingue
  de una ficha tapada.

## Fichas repetidas

Dos fichas con el mismo lexema son dos piezas distintas. Cada una lleva su propio
identificador desde que se crea, y retirar una no retira la otra. La lista «Sin información
de» cuenta por instancia: si hay dos `a` y falta una, informa que falta una `a` aunque siga
viéndose la otra. Las escenas `repetidos`, `retirar_una` y `reaparece` cubren el símbolo
repetido, la retirada de una sola y su vuelta.

## Sustituir la fuente virtual

`Camara` entrega `pose()`, `intrinsecos()` y un cuadro con `observaciones` y `profundidad`.
La fusión solo consume eso, así que una webcam, una RealSense o un Kinect entran en el mismo
sitio sin tocar `Fusion`. Si se añade profundidad virtual habrá que tratarla como etapa
aparte y documentar sus unidades; hoy las cámaras virtuales trabajan en milímetros y no
producen mapa de profundidad.

## Lo que el gemelo ya descubrió

Defectos encontrados y corregidos antes de comprar ninguna cámara. Los cuatro primeros eran
del propio gemelo; el quinto es de la fusión y afecta también al montaje físico:

1. **El render no era determinista.** `warpPerspective` con `BORDER_TRANSPARENT` dejaba sin
   inicializar los píxeles de fuera del cuadrilátero y se copiaba esa memoria en los bordes
   antialiasados. Dos fotogramas de una escena estática salían distintos y la lectura oscilaba,
   así que nunca se cumplían los 0.8 s de quietud. Se corrige componiendo con la máscara de
   cobertura del propio warp.
2. **La oclusión se ordenaba mal.** Se usaba la distancia euclídea al centro de la cámara; una
   ficha desplazada lateralmente queda «más lejos» que el bloque que la sostiene y el bloque se
   pintaba encima. Se ordena por profundidad en el eje de la cámara.
3. **Plantilla y observación se recortaban distinto.** `regiones` entrega el recorte ajustado al
   contorno y `normalizar` le quita otro 8 %, que se come el marco de la ficha; la plantilla
   conservaba su margen blanco y el marco sobrevivía. Correlación 0.049 entre la misma ficha
   vista de las dos maneras. La lección vale para las fotos reales: **una referencia debe
   recortarse como la recortará el detector de regiones**, pegada al contorno.
4. **Fichas espejadas** por el orden de las esquinas al proyectar.
5. **La fusión fabricaba confianza.** Con `len(votos) <= 1` el caso «ninguna cámara pudo leerla»
   se trataba igual que «una la leyó», y un candidato ausente de la lista de otra cámara contaba
   como 0, lo que inflaba el margen del líder. Dos cámaras que por separado devolvían
   `<sin leer>` producían un `DIV` confirmado, y equivocado. Ahora se exige que al menos una
   cámara haya aceptado una lectura y que ninguna la contradiga, y los promedios solo se hacen
   sobre las cámaras donde el candidato aparece. **Este defecto afecta igual al montaje real.**
6. **El marco fino de la ficha no sobrevive a la perspectiva.** Bajo un cuadrilátero
   trapezoidal, la tira del 8 % que quita `normalizar` se come el borde de un lado y no el del
   otro; queda una barra oscura asimétrica que desplaza el glifo. Un `5` se leía como `CMP`
   por 0.03 de diferencia. La ficha sintética se dibuja ahora con un marco lo bastante grueso
   para que la tira lo recorte por igual en los dos lados. Esto cambia **cómo se dibuja la
   ficha simulada**, no ningún umbral del clasificador; el valor se eligió barriendo grosores,
   y la lección para las fichas impresas es que el borde debe ser ancho frente al 8 %.
7. **Las fichas repetidas compartían identidad.** Retirar una `a` retiraba todas las `a`, y la
   lista de faltantes callaba mientras quedara una. Ahora cada ficha tiene identificador propio.

## Lo que el gemelo confirma hoy

Dos programas se reconstruyen enteros a partir de las imágenes rinderizadas, sin inyectar la
verdad conocida:

- **`completa`** reconstruye `PUSH a 3 · ADD a` con las cinco fichas confirmadas por dos
  cámaras cada una, y habilita la ejecución. Ese programa es sintácticamente válido y
  **semánticamente incorrecto**: `ADD a` unario saca dos valores y solo hay uno, así que Scala
  devuelve error de ejecución. Es un buen ejemplo de la separación que la pantalla explica:
  las cámaras pueden estar seguras de un programa que el lenguaje rechaza.
- **`ejecutable`** reconstruye `PUSH a 3 · PUSH a 5 · ADD a` con las ocho fichas confirmadas
  por dos cámaras cada una, habilita la ejecución y Scala lo ejecuta en tres pasos con
  resultado `a=[8]`.

`tests/test_aceptacion.py` recorre las dos escenas de imagen → detección → reconocimiento →
fusión → candidato → habilitación → Scala. El código que se envía a Scala se arma a partir de
`resultado['instrucciones']`, no de una constante del propio test.

En las dieciocho escenas, con `--pasos 12`, hay **16 confirmaciones correctas y 0 incorrectas**.
Esas 16 no son 16 programas distintos: son **cuatro escenas** (`completa`, `ejecutable`,
`fondo` y `repetidos`) confirmadas en cada uno de los **cuatro fotogramas sintéticos** que
quedan tras cumplirse el plazo de quietud. Las catorce restantes quedan pendientes en los doce
pasos, que es el fallo correcto: oclusión, movimiento, retirada, desacuerdo, T, ciclo,
montajes separados, inclinación, vertical, soportes, bloque que tapa, fondo difícil, retirada
de una sola ficha y su reaparición.

## Escenas

| Escena | Qué representa |
| --- | --- |
| `completa` | Programa armado y quieto, sin nada delante |
| `ejecutable` | `PUSH a 3 · PUSH a 5 · ADD a`, que Scala sí ejecuta |
| `oclusion` | Una mano tapa el literal `3` desde el paso 2 |
| `movimiento` | Una mano cruza la mesa durante toda la sesión |
| `repetidos` | Dos bloques con el mismo símbolo y los mismos parámetros |
| `retirada` | Se retira el bloque `ADD` y su parámetro en el paso 5 |
| `retirar_una` | Dos fichas `a` iguales; se retira solo la segunda |
| `reaparece` | El literal desaparece en el paso 4 y vuelve en el 9 |
| `desacuerdo` | La lateral apunta desviada y no coincide con la cenital |
| `vertical` | Cadena que sube casi vertical, con fichas a cinco alturas distintas |
| `inclinada` | Segundo bloque inclinado 35°, fichas fuera del plano de la mesa |
| `regresa` | Seis bloques girando 60° que vuelven sobre sí mismos |
| `te` | Dos ramas que confluyen en un conector en T de tres puertos |
| `separados` | Dos montajes distintos sobre la misma mesa |
| `bloque_tapa` | Un bloque suelto tapa una ficha desde arriba |
| `soportes` | Cuñas y bases junto a los bloques, que no computan |
| `fondo` | Hoja impresa con texto junto al montaje, que no es parte del programa |
| `fondo_dificil` | Hoja con recuadros y dígitos impresos que imitan fichas |

## El fondo impreso

La hoja del fondo no es una superficie lisa: lleva texto y símbolos impresos, para poner a
prueba si el detector los confunde con fichas. Hay dos variantes.

- **`fondo`**: texto corriente junto al montaje. El detector no produce ninguna lectura falsa
  y la escena confirma igual que `completa`: 4 correctas, 0 incorrectas.
- **`fondo_dificil`**: dígitos impresos dentro de recuadros del tamaño de una ficha. El
  sistema **no** distingue con seguridad entre un dígito enmarcado sobre papel y una ficha, y
  la lectura queda pendiente los doce pasos. No confirma nada incorrecto, pero tampoco
  confirma el programa que sí está sobre la mesa.

El segundo caso es un límite real, no un fallo de esta simulación: sin profundidad, un
recuadro impreso y una ficha se proyectan igual. Resolverlo pide altura medida (una cámara de
profundidad o triangulación fiable entre dos vistas), no un umbral distinto.

## Uniones: estimadas, nunca observadas

Ninguna cámara detecta conectores: no están en el vocabulario. Toda unión entre bloques se
deduce de la distancia medida, así que la fusión marca `conexion_estimada` y nunca declara
`conexiones_confirmadas`. Cuando el grafo presenta una confluencia de tres, la lectura queda
pendiente y se informa que **puede** ser un conector en T, que el lenguaje admite para unir dos
caminos en uno, pero que la distancia no dice cuál rama entra y cuál sale. Un ciclo cerrado se
informa igual: es válido en el lenguaje, pero sin evidencia de por dónde empieza no se afirma un
orden. Dos grupos sin unión entre sí se informan como montajes distintos.

En la vista 3D esto se puede tocar: un conector dice «Estado: estimada», y una T dice «Estado:
sin resolver» con sus tres puertos nombrados. Que se dibujen no significa que se hayan visto.

## Lo que el gemelo no demuestra

Las imágenes son sintéticas: cuadriláteros con textura, sin ruido de sensor, sin desenfoque,
sin sombras, sin variación de iluminación y sin el grano del plástico impreso. El resultado no
sustituye una prueba con fichas impresas y cámaras reales, y ninguna cifra de acierto obtenida
aquí describe el montaje físico.

Un dibujo libre desconocido no se convierte en un token conocido. Puesto en el sitio de una
ficha, las cámaras lo detectan como región y todas lo devuelven `<sin leer>`: ninguna plantilla
supera el umbral y el margen, no se añade como pieza y el programa no se confirma, porque
falta la ficha que ese dibujo ocupa. Conviene saber que el dibujo solo llega a detectarse si
lleva el marco de una ficha; un trazo suelto sobre el bloque, sin borde, ni siquiera se
segmenta como región.
