# Lectura continua del montaje físico

Objetivo: que una persona construya y modifique un programa con bloques y fichas reales, y que
la lectura y el veredicto de Scala se actualicen mientras lo hace.

> **Nada de este documento es una prueba del montaje físico.** Todas las cifras de más abajo
> salen de imágenes **virtuales** rasterizadas desde los STL. Lo que falta para la demostración
> real está en la última sección, con la lista exacta de capturas y datos de calibración.

## El ciclo

```
cámaras ──► lectura por cámara ──► fusión entre vistas ──► versión del montaje ──► Scala
            (regiones, símbolos,    (acuerdo, posición,     (identidad + orden)    (un veredicto
             tinta sin resolver)     quietud, oclusión)                             por versión)
```

`plataforma/lector.py` es el ciclo. Cada captura produce una **lectura** con uno de dos estados:

- `completa`: el montaje está quieto, hay acuerdo entre vistas y el programa es ejecutable.
- `pendiente`: siempre con un motivo concreto. Nunca se entrega un programa a medias como si
  estuviera leído.

### Versión del montaje

Cada lectura lleva una `version` —resumen del programa leído más las posiciones y el estado de
cada pieza— y un `orden` que solo crece. Sirven para dos cosas que en tiempo real importan:

- **Un veredicto atrasado no reemplaza una lectura nueva.** La validación corre en un hilo
  aparte; al llegar, se compara su `orden` con el actual y se descarta si es más viejo. Lo
  comprueba `tests/test_lector.py::VeredictoAtrasadoTest`, incluyendo un validador lento a
  propósito mientras el montaje cambia.
- **Una versión idéntica no se vuelve a ejecutar.** El veredicto se guarda por texto de programa
  y se marca «en vuelo» al lanzarlo, así que ni la caché ni una carrera entre hilos producen dos
  ejecuciones del mismo programa. Medido: 84 capturas con dos programas distintos dan
  exactamente **2** ejecuciones de Scala.

### Latencia con reloj de pared

```bash
PYTHONPATH=. python3 herramientas/latencia_real.py
```

Las cifras de los ensayos por pasos **no son latencia**: avanzan un reloj virtual 0.1 s por
captura, así que miden cuántas capturas hacen falta, no cuánto tarda. Esta herramienta usa el
reloj real: rasterizar, reconocer, fusionar y validar cuestan lo que cuestan, y la espera de
quietud transcurre de verdad.

Con **dos webcams**, programa corto, nueve episodios (construir, cambiar una ficha, retirar la
mano que tapaba el literal; tres vueltas):

| | Mediana | p95 | Meta |
| --- | --- | --- | --- |
| cambio físico → programa confirmado | **1.65 s** | **1.71 s** | ≤1 s · **no alcanzada** |
| cambio físico → veredicto de Scala en pantalla | **2.19 s** | **2.28 s** | ≤2 s p95 · **no alcanzada** |

Reparto por etapa y captura:

| Etapa | Mediana | p95 |
| --- | --- | --- |
| construcción de mallas | 0.001 s | 0.004 s |
| captura (por cámara) | 0.203 s | 0.215 s |
| reconocimiento (por cámara) | 0.281 s | 0.345 s |
| fusión | 0.001 s | 0.001 s |
| Scala | 0.04 s | 0.06 s |

**El cuello de botella es el reconocimiento, y detrás la espera de quietud.** Un ciclo de dos
cámaras cuesta ~0.5 s; la fusión exige 0.8 s de quietud, así que hacen falta tres ciclos para
confirmar y uno más para que el veredicto llegue a pantalla. Ni la fusión (1 ms) ni Scala (40 ms)
pesan.

Dos avisos sobre estas cifras:

- **La «captura» aquí es rasterizar un STL, no exponer una webcam.** En un montaje real ese
  coste lo sustituye la cámara. No es una predicción que yo pueda hacer sin medirla.
- Al medir con reloj real aparecieron dos defectos que el reloj virtual escondía, los dos
  corregidos: sellar cada cuadro al terminar de reconocerlo separaba los sellos más que la
  ventana de sincronización de 0.12 s y la fusión descartaba una cámara; y la fusión trataba
  cualquier hueco mayor de 0.35 s entre capturas como un corte del flujo, de modo que un ciclo
  lento pero regular reiniciaba la espera de quietud en cada captura y **nunca** confirmaba.
  Ahora la continuidad se mide contra la cadencia observada, no contra una constante.

### Traza de Scala, completa y acotada

El servicio ya no publica solo cuántos pasos hubo y el último: entrega la **traza entera** tal
como la produce `PuenteJS` —estado inicial más un escalón por instrucción, con `instruccion`,
`siguiente`, `pilas` y `omitida`—, acotada a `LIMITE_PASOS` (200) para que el recorrido no crezca
sin fin ante un ciclo. La página la recorre con `Ejecucion.cargar`, el mismo objeto que usa el
simulador, **sin volver a ejecutar nada**.

Un rechazo del lenguaje también trae traza: `PUSH a 3 · ADD a` se lee perfecto, Scala lo rechaza
en `runtime` con `decide: lenguaje`, y la lectura sigue **confirmada**. Un error de ejecución del
programa no es un error de cámara, y la pantalla los separa.

### Los dos contadores que publica el `Lector`

| | Qué mide |
| --- | --- |
| `latencia_lectura` | desde que la evidencia deja de coincidir con la última lectura completa hasta que vuelve a haber una lectura completa |
| `latencia_scala` | desde que se envía el programa hasta que llega su veredicto |

Son los contadores que el servicio publica en cada captura. En los ensayos por pasos se expresan
en el reloj virtual del guion y **no son latencia de pared**: ahí sirven para contar capturas.
Las cifras de latencia real son las de la sección anterior.

## Ensayo de uso: construir y modificar

```bash
PYTHONPATH=. python3 herramientas/ensayo_continuo.py
```

Guion corto, **dos webcams** (separadas 60 mm, 380 mm de altura, 40° de campo), programa
`PUSH a 3`:

| Acción | Esperado | Resultado | Lectura | Scala | Programa / motivo |
| --- | --- | --- | --- | --- | --- |
| construir el programa | completa | completa | 0.90 s | 0.05 s | `PUSH a 3` |
| cambiar la ficha 3 por un 5 | completa | completa | 0.90 s | 0.04 s | `PUSH a 5` |
| cruzar la mano sobre el literal | pendiente | pendiente | — | — | piezas ocultas o sin observación reciente |
| retirar la mano | completa | completa | 2.10 s | caché | `PUSH a 5` |
| girar la ficha de operación 90° | cualquiera | pendiente | — | — | piezas ocultas, ambiguas o sin observación |
| devolverla a su sitio | completa | completa | 2.00 s | caché | `PUSH a 5` |
| quitar una de las dos webcams | pendiente | pendiente | — | — | sin dos vistas no se sitúa ninguna ficha |

84 capturas · 11 versiones · 4 lecturas completas · 71 capturas pendientes · **2** ejecuciones de
Scala. Acciones que incumplen lo esperado: **0**. (Las latencias de este guion están en el reloj
virtual del ensayo; las reales están más arriba.)

Guion de dos bloques, banco de ocho cámaras, programa `PUSH a 3 · ADD a`:

| Acción | Esperado | Resultado | Lectura | Programa / motivo |
| --- | --- | --- | --- | --- |
| construir el programa | completa | completa | 0.90 s | `PUSH a 3 · ADD a` |
| cambiar la ficha 3 por un 5 | completa | completa | 0.90 s | `PUSH a 5 · ADD a` |
| cruzar la mano sobre el literal | pendiente | pendiente | — | piezas ocultas o sin observación |
| retirar la mano | completa | completa | 2.10 s | `PUSH a 5 · ADD a` |
| girar la ficha ADD 90° | cualquiera | completa | 0.00 s | `PUSH a 5 · ADD a` |
| devolverla a su sitio | completa | completa | 0.00 s | `PUSH a 5 · ADD a` |
| retirar el segundo bloque y esperar | completa | completa | 2.30 s | `PUSH a 5` |
| devolver el segundo bloque | completa | completa | 0.80 s | `PUSH a 5 · ADD a` |
| quitar una cámara | completa | completa | 0.00 s | `PUSH a 5 · ADD a` |

144 capturas · 15 versiones · 8 lecturas completas · 70 pendientes · **3** ejecuciones de Scala
para 3 programas distintos. Acciones que incumplen: **0**. Además,
`tests/test_ensayo_continuo.py` comprueba **cada captura** de los dos guiones, no solo el final
de cada acción: ninguna captura confirma un programa distinto del que hay sobre la mesa, y toda
captura pendiente trae motivo.

Un contraste que conviene retener: **girar una ficha 90° rompe la lectura con dos webcams y no la
rompe con el banco de ocho.** Con dos vistas la ficha girada deja de leerse y el montaje queda
pendiente; con ocho, alguna vista sigue leyéndola. La tolerancia al giro no es una propiedad del
reconocedor, es una propiedad de cuántas vistas haya.

Retirar un bloque y volver a leer `PUSH a 3` como programa completo exigió un cambio: **olvidar
las piezas retiradas**. Antes se conservaban como «sin observación reciente» para siempre, así
que después de quitar un bloque la lectura no volvía a cerrarse nunca. Ahora una pieza se olvida
si, durante 1.5 s, la encuadran dos o más cámaras, ninguna la reporta y **no hay tinta sin
resolver** en su posición. Esa última condición es la que distingue retirada de oclusión: una
mano deja tinta encima, una ficha retirada deja mesa limpia. Sin ella, olvidar sería adivinar.

## De una captura al resultado visible: quién decide cada paso

| # | Transición | Quién decide | Dónde |
| --- | --- | --- | --- |
| 1 | cuadro de la cámara → regiones, símbolos y tinta sin resolver | **servicio** | `reconstruir.analizar` + `plataforma/lectura.leer`, desde `Estado.procesar` |
| 2 | observaciones de varias cámaras → piezas situadas y su estado | **servicio** | `Fusion.actualizar` |
| 3 | piezas → programa reconstruido y motivo si no se puede | **servicio** | `fusion.reconstruir` + condición de los extremos |
| 4 | programa → `pendiente` / `estabilizando` / `confirmada` + versión | **servicio** | `Lector.actualizar` |
| 5 | versión confirmada **nueva** → veredicto y traza de Scala | **servicio** | `Lector._pedir` → `node` con el intérprete compilado |
| 6 | veredicto → se publica solo si su versión es la vigente | **servicio** | `Lector._aceptar` |
| 7 | estado publicado → se muestra; la ejecución física se habilita o no | **página** (sin juzgar) | `vistas.js` → `veredictoVigente` |
| 8 | traza publicada → recorrido paso a paso | **página** | `Ejecucion.cargar` sobre la traza del servicio |

La página **no** reconoce símbolos, **no** fusiona cámaras y **no** decide si el programa físico
es válido. `validaElNavegador({origen})` devuelve `false` para `camara`, así que el worker del
navegador queda reservado a los programas construidos a mano en el simulador.

Entre el paso 6 y el 7 está la garantía que importa en tiempo real: si cambia la versión, si la
lectura deja de estar confirmada o si llega un veredicto de otra versión, `veredictoVigente`
devuelve `null` y la página deshabilita la ejecución física en ese mismo refresco. Lo mismo vale
cuando **no hay** nada publicado: sin lectura del servicio, `motivoFisico` da el motivo y la
ejecución física queda deshabilitada, en lugar de dejar que decida el navegador.

Un **fallo del ciclo** se trata igual que una lectura incompleta. Si la fusión lanza una
excepción, `Lector.fallar` publica una lectura `pendiente` con el motivo, borra la versión y el
veredicto y estrena `orden`, así que ni el veredicto anterior ni una respuesta tardía de Scala
pueden seguir habilitando la ejecución. `Estado._fusionar` encamina por ahí cualquier error del
hilo de fusión, no solo los de la triangulación.

### Una sesión en vivo no crece sin fin

`Lector` acota lo que guarda: `HISTORIA = 120` capturas de historial, `MUESTRAS = 256` latencias
de lectura y de Scala, `CACHE_MAXIMA = 12` trazas en caché (LRU, y la de la versión vigente es
por definición la más reciente, así que no se desaloja) y los hilos terminados se descartan al
pedir la siguiente validación. Un programa deja de estar marcado «en vuelo» en cuanto termina su
validación: a partir de ahí lo responde la caché. Los totales que publica `metricas()` son
contadores propios, no el tamaño de esas listas.

## La aplicación, no solo el gemelo

La ruta de decisión es **una sola**: `plataforma/lector.py`. La usan igual

- `plataforma/estado.py`, que es lo que hay detrás de la página de cámaras del servicio. Ahora
  `Estado` tiene un `Lector` en lugar de una `Fusion` suelta, `Estado.procesar` lee con
  `plataforma.lectura.leer` y **conserva la tinta** en el historial de cada cámara, y
  `Estado.resumen()` publica `lectura` (estado, versión, motivo, latencia) y `veredicto`.
- `herramientas/leer_grabacion.py`, que pasa grabaciones reales por el mismo `Lector`. Exige las
  medidas y las referencias del montaje **físico**: `--datos` con las fichas fotografiadas,
  `--paso-mm`, `--paso-2-mm` (o `--paso-unico`), la banda de planos y `--area`. Lo que falte se
  informa y el resultado se marca como **no** aceptación física; con plantillas de render también.
- `herramientas/ensayo_continuo.py` y `herramientas/latencia_real.py`, los ensayos.

En la interfaz, la página Mesa en modo «Combinar cámaras» **ya no juzga la lectura**: muestra
`lectura.estado`, su versión y el veredicto que publica el servicio. Antes decidía por su cuenta
con `puedeAplicarLectura` en JavaScript, que era una segunda ruta de decisión. El modo «Una sola
vista» sigue siendo un diagnóstico de cámara, no pasa por el `Lector` y **no habilita la
ejecución física**: lo dice en el panel y la página no valida su lectura en el navegador. Si se
pierde la conexión con el servicio, la ejecución física se invalida aunque «Actualizar la mesa»
esté desactivado.

El worker del navegador queda para el programa construido a mano en el simulador. La página del
gemelo digital también valida en el navegador, pero ahí el programa viene de una escena
**sintética** rasterizada desde los STL —no de las cámaras—, y el propio panel lo dice.

Para que la aplicación pueda satisfacer la condición de los extremos hacen falta dos datos de
instalación que antes no se podían configurar y ahora sí: la **banda de planos** de las fichas y
el **área de trabajo**. `configurar_fusion` acepta los cuatro límites del área en mm y conserva
la banda; sin área declarada la comprobación es estricta y exige testigo en los dos extremos.

`tests/test_servicio_lectura.py` comprueba esta integración contra `Estado`: que la tinta llega
al historial, que el resumen publica lectura y veredicto con la misma versión, que un programa
idéntico no se reejecuta por cada cuadro, que cambiar una ficha cambia la versión y revalida, y
que reiniciar borra versión y veredicto.

## El hueco de continuación: visible no basta, hay que verlo vacío

Era el límite abierto número 1 y está **cerrado**. `reconstruir.analizar` devuelve ahora dos cosas
separadas: las regiones que pasan por ficha y **la tinta que el detector no consigue resolver en
fichas**. La segunda no se interpreta nunca como un símbolo; solo dice «aquí hay algo».

**Corrección de una afirmación anterior.** La primera versión de esta comprobación muestreaba
unos puntos y, si no encontraba una caja de tinta encima, daba el hueco por vacío. Eso no
acredita nada: no encontrar tinta es también lo que pasa cuando ninguna cámara mira ahí, cuando
el sitio cae fuera del cuadro o cuando está tan lejos que una ficha no se resolvería. La
condición actual es distinta y sí es comprobable con la evidencia de las cámaras:

1. El sitio se trata como una **huella** del tamaño de la ficha de operación (24 mm), muestreada
   en una rejilla de 3×3, no como un punto.
2. Cada punto de la huella necesita **una cámara que lo encuadre**, que lo vea con al menos
   2 px/mm a esa distancia (calculado como `fx/z`, no supuesto) y que **no tenga ningún contorno
   encima**, ni leído ni sin resolver. La cobertura se acredita por **unión** de vistas, así que
   dos vistas parciales que juntas cubren la huella bastan.
3. Si falta un solo punto por cubrir, el resultado es **pendiente** con ese motivo. Si alguna
   cámara competente ve algo encima, pendiente con el motivo contrario: «hay algo ahí y no se ha
   podido leer».
4. Un sitio **fuera del área de trabajo declarada** no necesita testigo: ahí no cabe un bloque.
   El área es un dato de la instalación —dónde está la mesa—, no del programa, así que no puede
   ajustarse por escena para que una lectura salga adelante.
5. A qué distancia se engancharía el bloque siguiente lo fija el **tamaño del bloque del
   extremo**, y para `CMP` y las aritméticas, cuya aridad no lo dice, lo fija el **número de
   parámetros observados**: un `ADD` con un parámetro es un bloque corto. Es evidencia, no
   suposición.

Con esta condición, `cobertura_parcial` pasa a quedar pendiente por el motivo correcto: *hay algo
donde iría el bloque siguiente y no se ha podido leer*, que es exactamente lo que ocurre.

Pruebas: `tests/test_lector.py::HuecoNoVacioTest` cubre las tres disposiciones a 1024 px que
confirmaban en silencio, y `BarridoDePosesTest` amplía el barrido a **18 configuraciones**
—tres alturas × tres campos × dos anchos de trabajo (640 y 1024 px)— exigiendo cero
confirmaciones de un programa que no esté sobre la mesa y motivo en toda pendiente.
`tests/test_redundancia.py::AnchoDeTrabajoMayorTest` ya **no** es un fallo esperado.

## Pantalla de lectura: evidencia por cámara

```bash
PYTHONPATH=. python3 herramientas/demostrar_lectura.py            # recorrido completo
```

La pantalla se mira en la página real (`npm run dev` y la vista **Cámaras**), que es la única
que la dibuja. Hubo una herramienta que volcaba una copia de esa pantalla a HTML; se eliminó
porque repetía su HTML y su JavaScript, y esa copia ya traía un defecto de escala que la página
no tenía.

El servicio publica, por cámara, un paquete de **un solo cuadro**: `cuadro` (su número),
`vistas` (las cajas clasificadas), `tinta` y `resolucion_vistas`, que es la resolución del cuadro
original en la que están esas coordenadas. La página pide la imagen de ese mismo número
(`/api/imagen/<id>/limpio?secuencia=N`, servida desde un anillo de los últimos cuadros limpios) y
escala las cajas con `resolucion_vistas`, no con el tamaño del cuadro reducido: por encima de
640 px el reconocimiento trabaja sobre una copia reducida y usar su tamaño dejaba las cajas
desplazadas. Si la imagen de ese cuadro ya no está, el servicio responde 409 y no se publica
ninguna caja; si la imagen falla al cargar, la página tampoco dibuja ninguna.

Sobre la imagen de **cada cámara y cada cuadro** se dibuja un rectángulo por región detectada,
con su símbolo y su puntuación, en cuatro colores: verde la lectura que la fusión usó, rojo la
que contradice, amarillo la región que se detectó y no se pudo leer, y violeta la observación que
la fusión no consiguió situar. En trazo discontinuo, el contenido detectado que **no** se pudo
convertir en ficha. Al lado, la mesa estimada sitúa solo las fichas que la fusión localizó, con
relleno sólido las confirmadas y contorno las provisionales; no usa la verdad de la escena.

**Correspondencia entre caja e imagen.** Cada observación lleva el número de cuadro del que
salió, y el servicio solo publica las de la captura que está publicando. Las pistas conservan su
última lectura para no perder la identidad de una ficha tapada, pero esa lectura es de un cuadro
anterior y **no** se dibuja. La imagen se pide con `?secuencia=N` y el servicio responde 409 si
ya no es ese cuadro, en vez de devolver otro. Lo comprueban
`tests/test_autoridad_servicio.py::CorrespondenciaCajaImagenTest`, incluido el caso de oclusión
que lo destapó: antes de filtrar por cuadro, una cámara mostraba cuatro cajas con dos regiones.

## Qué hace falta para la demostración real

No tengo acceso a cámaras ni a grabaciones. El camino está montado y espera datos:
`plataforma/dispositivos.Grabacion` reproduce un vídeo o una carpeta de imágenes por la misma
tubería que una webcam, y

```bash
PYTHONPATH=. python3 herramientas/leer_grabacion.py \
  --camara web1=datos_locales/grabaciones/web1.mp4 \
  --camara web2=datos_locales/grabaciones/web2.mp4 \
  --montaje datos_locales/montaje.json --paso-mm 95 --paso-2-mm 115
```

pasa esas grabaciones por el ciclo completo e imprime la misma tabla de métricas, marcada
`RESULTADOS CON IMÁGENES REALES`. Se niega a arrancar sin calibración y dice qué falta.

Lo que necesito, en concreto:

1. **Dos grabaciones simultáneas**, una por webcam, del mismo montaje y con las dos cámaras al
   mismo lado de la mesa. Vídeo o secuencia de imágenes. Que incluyan, seguido y sin cortar:
   montar el programa, dejarlo quieto unos segundos, cambiar una ficha, pasar la mano por encima,
   retirar un bloque, volver a ponerlo. Si las dos grabaciones no arrancan a la vez, hace falta
   algo que permita alinearlas (una palmada visible, un cronómetro en cuadro, o los dos vídeos
   cortados al mismo instante).
2. **Intrínsecos de cada cámara**: matriz y distorsión, con RMS de reproyección menor que 1 px.
   Se obtienen con el tablero de calibración desde la página de cámaras del servicio, o con
   `calibrate_cameras.py`.
3. **Pose de cada cámara en un sistema común**, del registro conjunto: las dos cámaras viendo el
   **mismo** tablero inmóvil a la vez. Sin esto no hay triangulación y no hay lectura.
4. **Los dos pasos de la cadena medidos**, en milímetros: bloque de un parámetro y bloque de dos.
   No un promedio, las dos medidas. Está explicado en [MEDIR_PASO.md](MEDIR_PASO.md).
5. **Fotos de las fichas reales** para el vocabulario, recortadas como las recorta el detector.
   Hoy las 29 referencias son renders de los STL (`origen: render`) y **no acreditan nada sobre
   fichas impresas**. Guía en [CAPTURA_REFERENCIAS.md](CAPTURA_REFERENCIAS.md).
6. **Las medidas de la mesa y la altura de las cámaras**, para saber si el campo cubre a la vez
   las fichas y los huecos de continuación, que es la restricción que más apretó en virtual.

7. **Los cuatro límites del área de trabajo en mm** (`x_min`, `x_max`, `y_min`, `y_max`), en el
   mismo sistema que las poses: dónde está la mesa. Sin ese dato la comprobación de los extremos
   es estricta y exigirá testigo en los dos, lo que con dos webcams deja la lectura pendiente.

Con 1-4 y 7 puedo dar latencias y recuentos reales. Sin 5, el reconocimiento seguirá midiéndose
contra renders, así que las tasas de acierto no serían trasladables a fichas impresas.

### Lo que sigue SIN VERIFICAR

- **La aceptación física.** No se ha leído ningún programa con cámaras reales. Ninguna cifra de
  este documento acredita el montaje físico.
- **La latencia real de extremo a extremo.** Lo medido sustituye la exposición de la cámara por
  un rasterizado de los STL. El coste de reconocimiento, fusión, espera de quietud y Scala sí es
  real; el de captura, no.
- **El reconocimiento de fichas impresas.** Las 29 referencias son renders (`origen: render`).

## Lo que la condición de los extremos obligó a cambiar en las pruebas

Nueve pruebas unitarias de la cadena (`test_fusion`, `test_paso_fusion`, `test_ensayo`) pasaron a
quedar pendientes al exigir testigo del hueco. No era una regresión del producto: sus cámaras
sintéticas están a 0.86 px/mm, donde una ficha de 20 mm no se resolvería, así que **ninguna puede
acreditar nada**, y no declaraban área de trabajo. Ahora declaran una mesa que termina donde
termina su montaje, con un comentario que lo dice: esas pruebas miden la reconstrucción de la
cadena, y la comprobación de los extremos se ejercita en `test_lector.py`,
`test_ensayo_continuo.py` y la matriz del gemelo.

Conviene no perder de vista lo que eso significa para un montaje real: **una cámara a más de
medio metro con 500 px de focal no sirve de testigo**. El umbral de 2 px/mm no es una preferencia,
es lo que hace falta para que una ficha de 20 mm ocupe unos 40 px.

## Límites de ángulo y cobertura observados (en virtual)

- **Dos webcams leen un programa de un bloque, no de dos.** El campo tiene que cubrir las fichas
  y los dos huecos de continuación a la vez; para dos bloques eso pide ~324 mm de campo, que a
  640 px de ancho de trabajo son 1.98 px/mm, por debajo de lo que separa dos fichas contiguas.
- **La resolución efectiva no la pone el sensor**, sino `ANCHO_TRABAJO_PX` (640). Una webcam de
  1080p no da más px/mm mientras ese tope no suba.
- **Girar un bloque rompe la lectura de su ficha.** Con el símbolo orientado, una ficha girada 90°
  deja de leerse, y una cadena que acumula 180° hace que una vista lea `POP` como `PUSH`. Sigue
  siendo límite abierto; está en [GEMELO_DIGITAL.md](GEMELO_DIGITAL.md).
