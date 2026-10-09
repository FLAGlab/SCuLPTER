# Gemelo digital del montaje multicámara

Sirve para probar el reconocimiento y la fusión **antes** de tener las cámaras. Las cámaras
virtuales rinden imágenes RGB desde su posición y esas imágenes pasan por el **mismo**
reconocimiento y la misma fusión que usarán las físicas. La verdad conocida de la escena se
guarda aparte y solo se usa para evaluar; nunca entra en la tubería.

## Qué atraviesa código real y qué está simulado

| Etapa | Estado |
| --- | --- |
| Geometría de cámara, pose e intrínsecos | **Real**: `geometria_fusion.modelo` y `proyectar`, la misma que la fusión |
| Imagen RGB | **Geometría real, pintado simulado**: se rasterizan los triángulos de los STL con z-buffer (`plataforma/rasterizador.py`) |
| Detección de regiones | **Real**: `reconstruir.regiones`, umbral adaptativo y contornos |
| Lectura de símbolos | **Real**: `Vocabulario.puntuar` y `aceptar_candidatos`, con los umbrales de producción |
| Estado compartido y fusión | **Real**: `Fusion.actualizar`, con una corrección que el gemelo obligó a hacer (§ defecto 5) |
| Validación y traza | **Real**: el intérprete Scala compilado, en un Web Worker |
| Profundidad | **No implementada**: las cámaras virtuales son RGB y entregan `profundidad: None` |
| Piezas que no computan | **Soporte y conector desde STL**; la T no tiene STL y es provisional; las hojas impresas son sintéticas |
| Materiales, luz, ruido | **Simulados**: un color plano por pieza y una luz direccional fija. Sin textura de plástico, sin sombras proyectadas, sin ruido de sensor |

Entre capturas se **reutilizan** dos cosas, y solo dos: la imagen rasterizada y su lectura. La
clave es la geometría ya montada (un resumen de todos los triángulos, colores y texturas que
entran al rasterizador) más la pose, los intrínsecos y la resolución de la cámara, más la
revisión del vocabulario. Mover una cámara, tapar una ficha, retirarla o cambiar una referencia
produce otra clave y obliga a rasterizar y a reconocer de nuevo, así que la reutilización no
puede ocultar nada de lo que el gemelo mide;
`tests/test_gemelo_stl.py::ReutilizacionDeVistasTest` lo comprueba caso por caso. La fusión **no**
se reutiliza nunca: se vuelve a calcular en cada captura, que es lo que exige el plazo de 0.8 s de
quietud. `escena_virtual.olvidar_vistas()` vacía las dos memorias, y las pruebas de determinismo
del render la usan para no comparar un resultado consigo mismo.

`Fusion.actualizar` **sí cambió**. No se ajustó ningún umbral ni se tocó el orden de la
tubería: se corrigió `_votar`, que fabricaba confianza a partir de la ausencia de lecturas.
El detalle está en el defecto 5. La corrección es del código que usará el montaje físico, no
de la simulación.

## De dónde sale cada pieza

Las cámaras virtuales no reciben cuadriláteros de otro renderizador: reciben el mismo cuadro
que se rasteriza desde los STL del proyecto, con la pose y los intrínsecos de esa cámara.
`plataforma/malla.py` lee los STL binarios y reproduce en numpy la interpretación que ya hacía
`simulador_3d/src/escena/piezas.js`.

| Pieza | Origen | Estado |
| --- | --- | --- |
| Bloque de 1 y 2 parámetros | `bloque_1_param.stl`, `bloque_2_param.stl` | Geometría real |
| Ficha de operación (13) | `parametro.stl`, que es una lámina de impresión con las 12 fichas; PUSH es POP girado | Geometría real, **con el símbolo grabado 1 mm** |
| Conector recto | `conector.stl`, solo el vástago de 42.5 mm | Geometría real |
| Cuña y tuerca | `cuna.stl`, `tuerca.stl` | Geometría real |
| Ficha de parámetro (`a`, `3`, `5`…) | **No hay STL** | Provisional: caja de 18×12×18 mm con la cara impresa, como ya la representaba la interfaz |
| Conector en **T** | **No hay STL** | Provisional: dos vástagos de `conector.stl`. No hay medidas definitivas |
| Mano, hoja de fondo, mesa | Sintéticas | No son piezas del montaje |

Las mallas se simplifican a una rejilla de 0.6 mm antes de rasterizar (de 18 108 a unos 7 000
triángulos por bloque). Rejillas más gruesas agrietan la malla y generan regiones falsas, así
que 0.6 mm es el límite medido, no una preferencia. Una escena de dos bloques son 19 222
triángulos. La malla simplificada de cada bloque se calcula ahora **una vez por proceso**: antes
se volvía a leer `bloque_2_param.stl` y a pasar `np.unique` sobre sus 18 108 triángulos en cada
captura y por cada bloque de la escena.

## Preparar el vocabulario

Un solo comando deja el gemelo reproducible desde una copia limpia:

```bash
PYTHONPATH=. python3 herramientas/preparar_gemelo.py
```

Siembra los parámetros y rinde las 13 operaciones desde `parametro.stl`. Dos preparaciones de
una carpeta vacía salen **idénticas byte a byte**, y ahora es verdad: cada referencia se llamaba
`ref_<uuid>.png`, de modo que dos preparaciones no coincidían ni en los nombres ni en
`simbolos.json`. El nombre sale ahora del símbolo (`ref_<tipo>_<sha256 recortado>.png`) y
`tests/test_vocabulario.py::PreparacionReproducibleTest` compara las dos carpetas archivo a
archivo. **El límite de esa afirmación**: el dibujo libre que recibe cada etiqueta de pila
depende de los que ya estuvieran sembrados, así que añadir etiquetas a un catálogo existente no
equivale a prepararlo desde cero. Para reproducir un catálogo hay que sembrarlo entero sobre una
carpeta vacía.

La preparación vive en `tests/entorno.py`, no en `pytest_configure`: el README verifica con
`unittest` y antes la siembra automática solo ocurría bajo `pytest`, así que una copia limpia
verificada como dice el README fallaba por falta de datos locales. Ahora la pide cualquier módulo
de prueba que use el gemelo, y `tests/conftest.py` se limita a llamar a lo mismo.
`datos_locales/` sigue fuera de Git a propósito: son renders, no fichas fotografiadas.

El catálogo real solo tiene referencias de las 13 operaciones, y son renders. Para que una
escena tenga etiquetas y literales hay que sembrar fichas sintéticas:

```bash
python3 herramientas/sembrar_vocabulario_virtual.py a b c n tmp fib 0 1 2 3 5 7 99 -1 -3 \
  --datos datos_locales/virtual
python3 herramientas/sembrar_operaciones_stl.py --datos datos_locales/virtual
```

El segundo comando rinde las 13 fichas de operación **desde `parametro.stl` con el mismo
rasterizador que usan las cámaras**, así que la referencia y la observación nacen del mismo
renderizador. Ambos quedan con `origen: "render"`. Los parámetros se rinden igual, sobre su
caja provisional. En los dos casos la referencia se recorta **pasándola por `regiones`**, el
mismo detector que recortará la observación. A cada etiqueta de pila se le asigna un dibujo
distinto, de un juego de siete que ya no incluye el cuadrado: chocaba con el buje roscado del
bloque, como cuenta el defecto 13. Los informes y la
página Símbolos dicen la procedencia; una medida obtenida así **no** describe fichas impresas.

Las cifras de más abajo se midieron con exactamente ese comando. Sembrar solo los tres
símbolos que una escena necesita da el mismo resultado: los once no introducen confusiones.

## Ejecutar sin abrir la interfaz

```bash
PYTHONPATH=. python3 herramientas/simular_escena.py --escena todas --pasos 12 \
  --json datos_locales/informes/gemelo.json
```

**Con `--pasos 8` el informe da cero confirmaciones en todas las escenas**, y no es un
fallo del reconocimiento: la fusión exige 0.8 s de quietud antes de confirmar y cada paso
avanza 0.1 s, así que el paso 7 va por 0.7 s y nunca se cumple el plazo. La reconstrucción ya
es correcta desde el paso 0; lo que falta es tiempo. Con doce pasos se confirma a partir del
paso 8. Cualquier medida de confirmaciones necesita `--pasos 12` o más.

Cada informe separa **confirmado correcto**, **confirmado incorrecto** y **pendiente**, además
de la latencia de lectura y de fusión, la cobertura de cada cámara y la configuración usada
(cuántas cámaras, dónde y con qué campo).

Antes la métrica daba por correcta una lectura si coincidía el **conjunto de símbolos**, de
modo que un programa con el orden cambiado o los operandos mal repartidos contaba como acierto.
Ahora se compara el **programa completo**: token, orden y operandos. Una tasa de cero
confirmaciones incorrectas solo significa algo medida así. Con `--guardar-imagenes CARPETA` se vuelcan
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

## Comprobado en el navegador

Con `python3 servicio.py` y la página **Gemelo** abierta:

| Qué | Resultado |
| --- | --- |
| Vista 3D desde STL | Pide `bloque_1_param`, `bloque_2_param`, `parametro`, `conector` y `cuna`; se ven el buje roscado y el grabado de cada operación |
| Reconstrucción | `PUSH a 3 · ADD a`, estado `estable`, habilita la ejecución, sin avisos |
| Mover una cámara | `POST gemelo/mover`; la cámara pasa de x=0 a x=340, cambia el monitor, los lectores bajan (`3`: 2→1, `a`: 4→3) y la ejecución se desactiva con el motivo concreto |
| Evidencia por ficha | «6 de 8 cámaras la leen como PUSH · 2 no la encuadran»: ya no conviven un rótulo de coincidencia y cuatro «no la ve», y cada fila cita la observación que usó la fusión |
| Veredicto de Scala | «Veredicto sobre un programa candidato que las cámaras todavía no dan por leído. No valida el montaje» y, en el error, «es un error de ejecución del propio programa candidato» |
| Tocar una unión | «Conector recto · Estado: estimada…» |
| Ejemplos → Gemelo | El botón abre la escena `ejecutable` para «Sumar dos valores» |
| Errores de consola | Ninguno |

Un aviso para quien lo pruebe: el primer paso de una escena de ocho cámaras tarda del orden de
un segundo y medio porque hay que rasterizar y reconocer ocho vistas; los siguientes, mientras no
se mueva nada, son inmediatos porque se reutilizan la imagen y la lectura idénticas. Mover una
cámara, tapar o retirar una ficha vuelve a costar la captura entera, que es lo correcto. Los
clics seguidos sobre «paso» se descartan mientras hay una petición en vuelo.

## La matriz de casos

Dos juegos, para que el ciclo de todos los días no cueste lo que la evaluación completa:

```bash
# catorce escenas, ninguna de catorce cámaras
PYTHONPATH=. python3 herramientas/matriz_gemelo.py

# las veintisiete
PYTHONPATH=. python3 herramientas/matriz_gemelo.py --completa \
  --json datos_locales/informes/matriz.json
```

De cada escena imprime lo que **se espera** de ella, el programa reconstruido, cuántas cámaras y
dónde, los px/mm, el estado visual, el veredicto de Scala y dos tiempos: la primera captura, con
las cachés frías, y la mediana del resto. Una escena que no cumple lo esperado sale marcada
`INCUMPLE` y se cuenta aparte, así que la matriz no puede darse por buena por omisión.

Las expectativas están en `plataforma/guiones.py::EXPECTATIVAS`, una por escena, y la de las que
deben quedar pendientes lleva el motivo. `GUIONES` y `EXPECTATIVAS` se comprueban entre sí al
importar —cosa que ya descubrió tres banderas mal puestas: `contradiccion` y `ejemplo_condicion`
estaban marcadas como «no debe ejecutar» y sí reconstruyen, y `dos_webcams` al contrario— y
`tests/test_matriz.py::CoberturaDeLaMatrizTest` exige que **toda** escena del gemelo tenga su
caso. Antes faltaban ocho (`inclinada`, `vertical`, `regresa`, `te`, `separados`, `soportes`,
`ejemplo_condicion` y `ejemplo_bucle`) y nada lo señalaba.

Cada caso positivo comprueba secuencia completa, orden, operandos, estado de aceptación,
veredicto de Scala y longitud de la traza. Los negativos exigen dos cosas a la vez: cero
programas confirmados que no estén sobre la mesa, y un motivo concreto para quedar pendiente.
Cuando no hay aviso, el motivo solo puede ser que el montaje no se queda quieto, y la prueba lo
comprueba explícitamente.

## Al reproducir y al mover

La reproducción pedía un paso cada 1.4 s aunque una captura tarde cerca de 3 s, así que las
peticiones se apilaban. Ahora cada paso se encadena **cuando la respuesta anterior ha llegado**,
y toda respuesta lleva un número de turno: una contestación atrasada se descarta en vez de
repintar un estado más nuevo.

En el detalle por ficha cada cámara cae en una de cinco situaciones, y el recuento que se
muestra es exactamente el que la fusión usó para aceptarla:

| Clase | Qué significa |
| --- | --- |
| `asociada` | La fusión usó esta lectura para aceptar la ficha |
| `contradice` | Aportó una observación a esa posición leyéndola de otro modo, y la fusión no la usó |
| `ilegible` | Aportó una observación a esa posición y no pudo identificarla |
| `sin_asociar` | Detectó algo ahí que la fusión no pudo situar en ninguna pieza |
| `sin_deteccion` | La encuadra y no detecta nada ahí |
| `fuera` | La ficha cae fuera de su encuadre |

Las tres primeras clases se dibujan desde `piezas[].lecturas`, que es el diccionario
`cámara → observación` que la fusión agrupó en esa pieza: el lexema y los puntajes que se
muestran son los de esa observación concreta. Antes el panel proyectaba la pieza, buscaba la
región más cercana en la imagen y rellenaba el lexema **desde el resultado fusionado**, así que
podía atribuir a una cámara una lectura que esa cámara no había hecho. `sin_asociar` existe
porque sin ella una observación real que la fusión no consigue situar se mostraba como «la
encuadra y no detecta nada».

## Procedencia de cada pieza

Una pieza lleva tres cosas distintas, y confundirlas era lo que hacía contradictorio el panel:
`camaras` son las que aportaron alguna observación a esa posición, `lectores` son las que además
la leyeron como ese símbolo, y `lecturas` es el diccionario `cámara → observación` con la
observación concreta que cada una entregó. Una cámara apartada puede seguir aportando una mancha
ilegible; no puede seguir sosteniendo la lectura. La procedencia y el recuento del panel usan
`lectores`; el lexema y los puntajes de cada fila salen de `lecturas`, no del resultado
fusionado.

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
7. **El detalle por cámara se calculaba antes de fusionar.** `gemelo.py` proyectaba las pistas
   de la fusión **anterior** para explicar cada vista, así que recién cargada una escena el
   diccionario estaba vacío y las cuatro cámaras decían «la ficha cae fuera de su encuadre»
   mientras tenían dos o tres observaciones cada una. Ahora se proyecta después de
   `Fusion.actualizar`, desde las piezas del resultado y con el modelo del cuadro mostrado.
8. **Mover una cámara dejaba observaciones atrasadas.** `secuencia` e `instante` salían del
   número de paso, y mover una cámara no avanza el paso, así que la clave `(id, secuencia)` no
   cambiaba y `Fusion` se saltaba entera la refusión: el monitor mostraba la vista nueva y la
   fusión seguía sosteniendo la lectura vieja. Ahora cada captura lleva un contador propio.
   **Este defecto afecta igual al montaje real**: cualquier cuadro nuevo debe ser identificable
   como nuevo.
9. **Las fichas repetidas compartían identidad.** Retirar una `a` retiraba todas las `a`, y la
   lista de faltantes callaba mientras quedara una. Ahora cada ficha tiene identificador propio.
13. **Un dibujo libre chocaba con una pieza del montaje.** A cada etiqueta de pila se le asigna
    un dibujo distinto, y uno de los ocho era un **cuadrado**. El buje roscado del bloque es un
    cuadrado del tamaño de una ficha: con esa forma en el catálogo, una sola vista leía el buje
    como la etiqueta que la tenía (0.457, por encima del umbral de 0.45), ninguna otra la
    contradecía y la fusión confirmaba una ficha que no estaba sobre la mesa. El cuadrado está
    fuera del juego de formas. Un dibujo libre es arbitrario; una pieza del montaje no, así que
    **la lección vale para las fichas impresas**: el catálogo de símbolos no puede contener una
    forma que se parezca a un detalle del propio bloque. Lo descubrió el caso `separados` al
    entrar en la matriz, y el defecto **solo aparecía con el vocabulario preparado desde cero**:
    la carpeta local, crecida símbolo a símbolo, le había dado otro dibujo a esa etiqueta. Es la
    razón por la que la reproducibilidad de la preparación no es cosmética.
10. **El detector tiraba las fichas contiguas sin decirlo.** `regiones` descartaba todo contorno
    con proporción mayor que 1.8. Dos fichas a 20 mm de paso quedan unidas por el puente de tinta
    que el umbral adaptativo tiende entre sus bordes y forman un contorno de 124×69 px: se
    descartaba entero y no quedaba ni una observación de ese tramo. Ahora, antes de descartarlo,
    se erosiona el trozo con radios de 1, 2 y 3 px hasta que el puente se corta, y las partes se
    aceptan solo si cada una pasa por ficha. Un cuerpo macizo se erosiona sin partirse, así que no
    fabrica fichas. **Este defecto afecta igual al montaje real.**
11. **Las partes despegadas duplicaban fichas ya detectadas.** La primera versión del punto
    anterior producía cajas encima de regiones que ya habían salido de su propio contorno, y una
    lectura duplicada que la fusión no puede situar bloquea la ejecución sin motivo: `dos_pilas`
    pasó de correcto a pendiente. Una parte que se solape más del 30 % con una región ya aceptada
    se descarta.
12. **El panel por cámara inventaba la procedencia.** Descrito arriba: proyectaba la pieza,
    buscaba la región más cercana y ponía el lexema del resultado fusionado. **Este defecto
    afecta igual al montaje real**: el panel es lo que un operador mira para decidir si se fía.

## La asociación, que era el cuello de botella

Reconocer bien no bastaba: las fichas se leían y aun así el programa no se reconstruía. Tres
defectos medidos en la asociación geométrica, todos corregidos:

- **La triangulación aceptaba puntos imposibles.** De 241 emparejamientos que pasaban
  `triangular` en la escena de tres bloques, **149 (62 %) caían fuera del volumen de trabajo**,
  entre z = −3272 mm y z = +241 mm. Ahora el emparejamiento exige que el punto caiga en la
  banda de planos declarada, y esos 149 dejan de competir por las observaciones.
- **El error de reproyección no mide la calidad con base corta.** El par `c4-c5`, separado
  41.7 mm, situaba una ficha con **50 mm de error y 0.00 px de reproyección**: con poca
  paralaje la profundidad queda indeterminada a lo largo del rayo y cualquier distancia
  reproyecta perfecto. Por eso no sirve elegir el par de menor error.
- **Se usaba el primer par que llegara.** El emparejamiento recorría las cámaras de dos en dos
  y consumía observaciones por orden, así que un par malo bloqueaba al bueno. Ahora se calculan
  todas las triangulaciones plausibles, se agrupan por proximidad (9 mm, menos de medio paso de
  ficha) y gana el racimo con más cámaras distintas, tomando la **mediana** de sus votos. De
  doce estimaciones de una misma ficha, la mediana cae a 3-5 mm del centro real aunque alguna
  se vaya a 50 mm.

Se añadió además un enganche por símbolo: una lectura que coincide con el lexema de una pista
ya formada y cae cerca de su proyección se asocia a ella, aunque la geometría pura la dejara
fuera. Sin eso, una cámara que lee bien el `5` a 24 px del centro proyectado quedaba huérfana y
bloqueaba la ejecución entera.

## Qué es ficha y qué es hardware

La regla anterior descartaba toda región ilegible, lo que era cómodo pero ciego: una ficha que
se ve y no se lee no puede desaparecer del montaje. La evidencia que las separa es **cuántas de
las cámaras que la encuadran la reportan**:

| | cámaras que la encuadran | que la reportan |
| --- | --- | --- |
| Buje roscado del bloque, cruce de rayos | 8-10 | 2 |
| Ficha de operación ilegible de verdad | 6-10 | 6 y 9 |

Un elemento del hardware lo sostiene solo el par que lo inventó; una ficha real la ve casi toda
cámara que la encuadra. El corte está en la mitad, así que vale igual con dos cámaras que con
catorce. Lo que queda por debajo se cuenta en `hardware`; lo que queda por encima sigue siendo
una pieza pendiente que **bloquea** la ejecución.

Comprobado con una operación ilegible en medio y al final de un programa de tres bloques: en
medio no se produce programa alguno, al final se reconstruye el prefijo pero **no se confirma**.
Los dos casos están en `tests/test_matriz.py` como `OperacionIlegibleEnMedioTest` y
`OperacionIlegibleAlFinalTest`, y cada uno comprueba además que lo confirmado no sea el prefijo
legible.

## Lo que el STL obligó a cambiar en el reconocimiento

Al pasar de cuadriláteros pintados a los símbolos grabados de verdad, el reconocedor dejó de
funcionar. Las tres correcciones son medidas, y ninguna toca `UMBRAL` ni `MARGEN`:

- **Las 13 operaciones comparten cuerpo.** El glifo grabado es una fracción mínima de los
  píxeles, así que la correlación la domina la parte común: `PUSH` contra `POP` daba **0.981**,
  margen 0.011 frente al 0.08 exigido. No es resolución: barriendo de 6 a 12 px/mm el margen se
  queda clavado en 0.011. Se añaden dos canales de gradiente (Sobel en x e y) junto al de
  intensidad; como `PUSH` y `POP` son la misma flecha girada 180°, el canal vertical
  anticorrela. `PUSH` contra `POP` baja a **0.709** y el margen mínimo entre las 13 operaciones
  pasa de 0.011 a **0.291**.
- **Los gradientes solos inventaban símbolos.** Una mancha cuadrada sin estructura pasaba a
  aceptarse como `DIV` (0.527 contra 0.432). Se exige **consenso**: un lexema solo recibe la
  media de los tres canales si gana en los tres; si no, recibe su canal más bajo. La mancha
  queda rechazada porque los canales discrepan (`DIV`, `DIV`, `DUP`), y de paso la cobertura
  correcta de la escena subió, porque deja de haber coincidencias casuales apretando el margen.
- **La perspectiva deformaba la ficha.** Ahora las fichas son cajas 3D vistas en trapecio, no
  cuadrados frontales. Antes de normalizar se rectifica el cuadrilátero de la pieza a un
  cuadrado. La ficha `a` pasó de 0.452 **con ganador equivocado** (`tmp`) a **0.864 correcto**,
  y `ADD` dejó de perder contra `CMP` (0.739).

## Dónde hay que poner las cámaras

El gemelo acabó imponiendo dos condiciones que antes no se veían:

- **Todas al mismo lado.** Dos cámaras enfrentadas ven la misma ficha girada 180°, así que una
  lee `PUSH` y la otra `POP`. Con símbolos que dependen de la orientación, un par enfrentado no
  es redundancia: es contradicción garantizada.
- **La resolución efectiva no la pone la cámara.** `reconstruir.reducir_resolucion` baja todo
  cuadro a `ANCHO_TRABAJO_PX` (640) antes de buscar regiones, así que una webcam de 1080p no da
  más px/mm que una de 480p mientras ese tope no suba. Conviene saberlo antes de comprar
  sensores: lo que compra px/mm es acercar la cámara o estrechar el campo, no el sensor.
- **Dos filas, no una.** Con todas las cámaras alineadas sobre el eje de la cadena la
  triangulación es degenerada y la fusión no coloca las fichas. La disposición por omisión son
  dos filas a −15 mm y −70 mm del eje, a 280 mm sobre el plano de las fichas y 40° de campo.

Esa disposición tiene un coste medido, y conviene saberlo antes de montar nada:

- **Quitar una cámara se tolera; tapar una ficha desde arriba, no.** Apartar una de las ocho
  deja el mismo programa aceptado. Pero las dos filas se diferencian unos 11° en ángulo de
  visión, así que una mano sobre una ficha ciega a todas a la vez. El sistema queda pendiente y
  no adivina, que es el fallo correcto, pero no hay vista de reserva. Recuperarla pediría una
  cámara rasante, y una vista rasante del lado contrario volvería a confundir `PUSH` con `POP`.
- **El margen es estrecho.** Mover las cuatro posiciones de 0/45/90/135 mm a 0/46/92/140 mm basta
  para que `completa` deje de habilitar. La lectura funciona, pero no con holgura.
- **El campo tiene que cubrir también los huecos.** Resolver las fichas pide campo estrecho;
  descartar que la cadena siga pide campo ancho. Con el banco de ocho las dos cosas se cumplen de
  sobra —los huecos de continuación los encuadran dos cámaras en todas las escenas que se
  confirman—, pero con dos webcams las dos exigencias se pisan y solo quedan unas pocas
  combinaciones de altura y campo. Está medido más abajo.

## Lo que cuesta una captura

```bash
PYTHONPATH=. python3 herramientas/perfilar_gemelo.py --escenas completa ejecutable
```

Reparte el tiempo de una captura entre construcción de mallas, rasterizado, reconocimiento,
fusión y Scala, **sin** reutilizar nada, para saber qué cuesta de verdad una vista nueva:

| Escena | Cám. | Triángulos | Mallas | Rasterizado | Reconocimiento | Fusión | Captura |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dos_webcams_corta` | 2 | 8 521 | 0.001 s | 0.183 s | 0.341 s | 0.001 s | **0.53 s** |
| `una_instruccion` | 4 | 8 521 | 0.001 s | 0.369 s | 0.682 s | 0.003 s | **1.05 s** |
| `completa` | 8 | 19 222 | 0.001 s | 1.374 s | 1.710 s | 0.016 s | **3.10 s** |
| `ejecutable` | 14 | 29 673 | 0.002 s | 2.742 s | 3.527 s | 0.068 s | **6.34 s** |
| `dos_pilas` | 14 | 29 460 | 0.002 s | 2.698 s | 3.131 s | 0.050 s | **5.88 s** |

El reparto desmiente dónde se suponía que estaba el coste:

- **Rasterizado 44 % y reconocimiento 55 %**, los dos proporcionales al número de vistas: unos
  0.19 s y 0.22 s por cámara. Ahí está el gasto entero.
- **La fusión no es el cuello de botella**: del 0.2 % al 1.1 % de la captura. Con catorce cámaras
  y nueve fichas son 68 ms.
- **Las mallas son 1 o 2 ms.** Simplificar `bloque_2_param` cuesta 5.4 ms (de 16 776 a 8 132
  triángulos) y antes se repetía por bloque y por captura; ahora se calcula una vez por proceso.
  Era trabajo repetido, pero nunca fue el gasto: en `ejecutable` son 0.2 s de los 76 s que
  costaban doce capturas.
- **Scala tampoco**: los seis programas distintos que la matriz confirma se validan en **0.04 s**
  en un solo proceso de node, frente a 0.25 s abriendo uno por programa. La batería de `node` se
  agrupó porque es gratis hacerlo, no porque pesara.

Conclusión: el único gasto grande es rasterizar y reconocer cada vista, y la única forma de
bajarlo sin falsear nada es **no repetir vistas idénticas**. De ahí la reutilización descrita
arriba, con su clave sobre la geometría y la pose.

### Antes y después

Las diecisiete escenas de la matriz anterior, mismo vocabulario, misma máquina, doce pasos:

| | Antes | Después |
| --- | --- | --- |
| Matriz completa (17 escenas) | **10 min 26 s** | **1 min 17 s** |
| Confirmado correcto / incorrecto / pendiente | 8 / **1** / 8 | 8 / **0** / 9 |

Y el coste por captura, según el número de cámaras:

| Cámaras | Antes, cada captura | Después, 1.ª captura | Después, mediana del resto |
| --- | --- | --- | --- |
| 2 (`dos_webcams`) | 0.81 s | 0.81 s | 0.00 s |
| 4 (`una_instruccion`) | 1.07 s | 1.06 s | 0.00 s |
| 8 (`completa`) | 2.94 s | 3.10 s | 0.02 s |
| 14 (`ejecutable`) | 6.07 s | 6.36 s | 0.07 s |

**La primera captura no mejora**; es un 3-5 % peor, porque despegar fichas contiguas y resumir la
geometría cuestan algo. Lo que desaparece es repetir doce veces una captura idéntica. Donde la
escena cambia de verdad en cada paso no hay nada que reutilizar y se ve: `movimiento`, con una
mano cruzando la mesa, sigue costando 2.36 s de mediana con ocho cámaras.

Los dos juegos de la matriz, con las veintisiete escenas de hoy:

| Juego | Escenas | Tiempo |
| --- | --- | --- |
| `matriz_gemelo.py` (rápido) | 14 | **40 s** |
| `matriz_gemelo.py --completa` | 27 | **2 min 0 s** |

## Lo que el gemelo confirma hoy

**Once escenas se confirman, y contienen seis programas distintos.** No son once programas: la
cadena `PUSH a 3 · ADD a` aparece en cinco escenas (`completa`, `fondo`, `desacuerdo`,
`contradiccion`, `soportes`) y `PUSH a 3` en dos. La matriz imprime los dos recuentos para que no
se confundan. Medido con `herramientas/matriz_gemelo.py --completa --pasos 12`:

| Escena | Cám. | Scala | 1.ª s | s/capt | Programa reconstruido |
| --- | --- | --- | --- | --- | --- |
| `dos_webcams_corta` | 2 | `ok a=[3]` | 0.51 | 0.00 | `PUSH a 3` |
| `una_instruccion` | 4 | `ok a=[3]` | 1.08 | 0.00 | `PUSH a 3` |
| `completa` | 8 | `runtime a=[3]` | 1.71 | 0.02 | `PUSH a 3 · ADD a` |
| `desacuerdo` | 8 | `runtime a=[3]` | 0.26 | 0.02 | `PUSH a 3 · ADD a` |
| `fondo` | 8 | `runtime a=[3]` | 3.10 | 0.02 | `PUSH a 3 · ADD a` |
| `soportes` | 8 | `runtime a=[3]` | 4.42 | 0.03 | `PUSH a 3 · ADD a` |
| `contradiccion` | 9 | `runtime a=[3]` | 0.21 | 0.02 | `PUSH a 3 · ADD a` |
| `repetidos` | 10 | `ok a=[3,3]` | 3.96 | 0.03 | `PUSH a 3 · PUSH a 3` |
| `ejemplo_condicion` | 10 | `ok a=[] c=[7]` | 3.97 | 0.03 | `PUSH a -1 · ? a · PUSH b 99 · PUSH c 7` |
| `dos_pilas` | 14 | `ok a=[5,3] b=[]` | 5.69 | 0.05 | `PUSH a 3 · PUSH b 5 · MOV a b` |
| `ejecutable` | 14 | `ok a=[8]` | 6.20 | 0.07 | `PUSH a 3 · PUSH a 5 · ADD a` |

Las «1.ª s» de `desacuerdo` y `contradiccion` son bajas porque su geometría es la de `completa`,
ya rasterizada en la misma pasada; es la reutilización funcionando entre escenas.

`runtime` no es un fallo de lectura: `PUSH a 3 · ADD a` se lee perfecto y es Scala quien lo
rechaza, porque `ADD` unario saca dos valores y solo hay uno.

Y las dieciséis que deben quedar pendientes, con el motivo declarado y el que el sistema informa
de verdad:

| Escena | Cám. | Lo que se lee | Motivo informado |
| --- | --- | --- | --- |
| `cobertura_parcial` | 3 | `PUSH a 3` | un símbolo leído sin posición compartida inequívoca |
| `sin_encuadrar` | 4 | `PUSH a 3` | ninguna cámara encuadra los dos huecos de continuación |
| `dos_webcams` | 2 | `PUSH` | faltan parámetros o su asociación es ambigua |
| `bloque_tapa` | 8 | `PUSH a · ADD a` | faltan parámetros o su asociación es ambigua |
| `oclusion` | 8 | `PUSH a 3 · ADD a` | piezas ocultas o sin observación reciente |
| `retirada` | 8 | `PUSH a 3 · ADD a` | piezas ocultas o sin observación reciente |
| `retirar_una` | 10 | `PUSH a 3 · PUSH a 3` | piezas ocultas o sin observación reciente |
| `reaparece` | 8 | `PUSH a 3 · ADD a` | no se estabiliza: el literal va y vuelve |
| `movimiento` | 8 | `PUSH a 3 · ADD a` | no se estabiliza: la mano no se detiene |
| `fondo_dificil` | 8 | `PUSH a 3 · ADD a` | 16 símbolos leídos sin posición compartida |
| `inclinada` | 8 | `<sin leer> a 3 a · PUSH` | los parámetros no dan dirección de lectura |
| `vertical` | 8 | (nada) | ninguna ficha cae en la banda de planos declarada |
| `te` | 16 | `POP a · <sin leer>…` | no sale una única cadena de operaciones |
| `regresa` | 12 | (nada) | dos grupos de bloques sin unión entre sí |
| `separados` | 16 | (nada) | dos grupos de bloques sin unión entre sí |
| `ejemplo_bucle` | 12 | (nada) | dos grupos de bloques sin unión entre sí |

**Donde el motivo informado no nombra la causa real** está anotado en `EXPECTATIVAS` y sigue
abierto: en `te`, `regresa` y `separados` solo se localizan dos de los tres o seis bloques, así
que el sistema informa «grupos sin unión» o «dirección ambigua» y **no** llega a diagnosticar el
conector en T ni el ciclo. Queda pendiente, que es el resultado correcto, pero por un motivo
menos preciso del que debería dar.

`fibonacci` sigue identificado como límite: quince instrucciones no caben en la mesa que el
gemelo representa hoy, y aparece en `EJEMPLOS_SIN_ESCENA` en vez de como escena.

Dos piezas del montaje real estorban y hubo que tratarlas:

- **El buje roscado del bloque parece una ficha.** Es geometría real del STL y produce una
  región cuadrada del tamaño de una ficha que ninguna cámara puede leer. Se separa de una ficha
  ilegible de verdad por el respaldo relativo, como se explica más arriba.
- **Una observación suelta que nadie puede leer no es evidencia.** Bloquea una observación
  **leída como símbolo** que no se puede situar; una que ninguna cámara identifica se informa
  (`sin_leer_sueltas`) y no bloquea. Esa regla es la que hace que `cobertura_parcial` quede
  pendiente: la `a` del segundo bloque se lee y no se puede situar con una sola vista.
- **Una ficha detectada dos veces bloquearía sin motivo.** Al despegar fichas contiguas
  aparecían cajas encima de regiones que ya habían salido de su propio contorno, y esa lectura
  duplicada tampoco se puede situar. Se descartan las partes que se solapen con una región ya
  aceptada; sin eso, `dos_pilas` dejaba de confirmar un programa que leía bien.

## Cuántas cámaras hacen falta

| Programa | Bloques | Cámaras que bastan | Qué pasa con menos |
| --- | --- | --- | --- |
| `PUSH a 3` | 1 | **2 webcams**, o 4 del banco | con una sola vista no se sitúa ninguna ficha |
| `PUSH a 3 · ADD a` | 2 | 8 | con 3 queda pendiente; con 2 no se alcanzó |
| `PUSH a 3 · PUSH a 3` | 2 | 10 | — |
| `PUSH a 3 · PUSH a 5 · ADD a` | 3 | 14 | — |
| `PUSH a 3 · PUSH b 5 · MOV a b` | 3 | 14 | — |
| `PUSH a -1 · ? a · PUSH b 99 · PUSH c 7` | 4 | 10 | — |

A 280 mm de altura y 40° de campo cada cámara del banco da **3.1 px/mm**, y la ficha de 20 mm
ocupa unos 62 px.

### Dos webcams: lo que sí, y el límite medido

```bash
PYTHONPATH=. python3 herramientas/ensayo_dos_webcams.py
```

Barre separación, retroceso, altura y campo con dos cámaras **al mismo lado** de la mesa, y
después sacude la configuración que encuentre. Se probaron unas 470 configuraciones entre
`una_instruccion` y `completa`, y **ninguna confirmó un programa que no estuviera sobre la
mesa**: ni una sola confirmación incorrecta en todo el barrido.

**Sí hay una disposición plausible que lee un programa corto entero.** Dos webcams separadas
60 mm, 45 mm por delante del eje de la cadena, a 380 mm de altura y 40° de campo leen `PUSH a 3`
completo y sin avisos, a **2.48 px/mm** y 258 mm de campo: por debajo de los 3.1 px/mm del banco
de ocho. Es la escena `dos_webcams_corta`, y `tests/test_matriz.py::DosWebcamsCortaTest` fija su
programa, su veredicto de Scala y su traza. **Lo que la desbloquea no es resolución: es campo.**
Hace falta que el encuadre cubra a la vez las fichas y los dos huecos donde la cadena podría
seguir, y eso obliga a subir la cámara, no a estrechar el campo.

Lo que se ve al sacudirla, con `--desvio 15 --giro 5`:

| Variación | Resultado |
| --- | --- |
| sin variación | lee `PUSH a 3` entero |
| ±15 mm en x, y, z de cada cámara (12 casos) | 11 siguen leyéndolo entero; `web1 x −15 mm` queda pendiente con motivo |
| ±5° de puntería de cada cámara (4 casos) | los 4 siguen leyéndolo entero |
| quitar una vista | pendiente: sin dos vistas no se sitúa ninguna ficha |

Es decir: **tolera la pose y no tolera el encuadre.** Mover una webcam 15 mm casi nunca la rompe;
cambiar el campo o la altura sí. A 380 mm solo funcionan 40° y 52°: con 30° y 35° el campo no
cubre los huecos y con 45° las fichas dejan de resolverse. Y no es un umbral limpio de px/mm:
**1.85 px/mm funciona y 2.18 px/mm no**, porque cerca del límite lo que decide es cómo cae el
contorno de cada ficha sobre la rejilla de píxeles. De las 100 configuraciones barridas para
`una_instruccion` solo 3 leen el programa entero.
`tests/test_redundancia.py::DosWebcamsTest` comprueba las 17 variaciones en cada ejecución.

**La cadena de dos bloques no se alcanzó con dos webcams, y el límite está demostrado.** Con los
bloques en x=0 y x=95 y los huecos de continuación en x=−95 y x=+190, cubrirlo todo desde dos
cámaras que miran al mismo centro pide unos 324 mm de campo, que al ancho de trabajo de 640 px
son 1.98 px/mm: por debajo de lo que hace falta para separar las dos fichas contiguas de cada
bloque. Ninguna de las 108 configuraciones probadas para `completa` lo lee entero, y todas quedan
pendientes con motivo.

**Qué lo desbloquearía, medido**: subir `ANCHO_TRABAJO_PX` de 640 a 1024 px, con cámaras de al
menos esa resolución, da 2.97 px/mm con 344 mm de campo, y entonces sí salen lecturas de los dos
bloques. Pero **al subirlo reaparece el truncamiento silencioso**: de las 18 configuraciones
probadas a 1024 px, dos confirman `PUSH a 3` con `PUSH a 3 · ADD a` sobre la mesa y sin ningún
aviso. Subir el ancho de trabajo es la palanca correcta para el caso de dos webcams, pero **no
antes** de cerrar ese hueco, que se describe abajo.

## Lo que ya no se trunca en silencio

**Era el único «confirma incorrecto» de la matriz.** `cobertura_parcial` deja tres cámaras sobre
el primer bloque: el sistema daba por leído `PUSH a 3` con la mesa puesta en `PUSH a 3 · ADD a`,
y sin un solo aviso. La prueba que lo cubría exigía justamente eso, que confirmara, así que la
matriz pasaba con el fallo dentro.

La causa estaba medida y era de detección, no de cobertura geométrica: las dos fichas del segundo
bloque caen dentro del encuadre de dos de las tres cámaras, pero `regiones` las fundía en un
contorno de 124×69 px y lo descartaba por proporción, sin entregar ninguna región. Está corregido
en las dos capas que podían fallar, porque son fallos distintos:

1. **Despegar fichas contiguas** (defecto 10). De ese tramo sale ahora al menos una lectura. En
   `cobertura_parcial` una cámara lee la `a` del segundo bloque, la fusión no puede situarla con
   una sola vista, e informa «1 símbolos leídos aún no tienen una posición compartida inequívoca»
   sin habilitar. El programa leído sigue siendo `PUSH a 3`, pero ya no se presenta como leído.
2. **Comprobar que la continuación esté cubierta.** Si de un bloque no se captura ni un píxel,
   ninguna mejora del detector puede recuperarlo. `Fusion.continuaciones` calcula los dos sitios
   donde iría un bloque más —un paso corto desde cada extremo de la cadena, en la dirección que
   da la propia reconstrucción— y si ninguna cámara los encuadra, la lectura queda pendiente con
   ese motivo. No usa la verdad de la escena: solo las poses y los intrínsecos que la fusión ya
   tiene. La escena `sin_encuadrar` lo ejercita con un campo estrecho sobre el primer bloque, y
   `tests/test_matriz.py::SinEncuadrarElSegundoTest` comprueba primero que de verdad no haya un
   solo píxel del segundo.

Las dos condiciones se verifican con la misma evidencia que tendría el montaje físico. En las
escenas que se confirman con el banco de ocho o más, los huecos de continuación los encuadran dos
cámaras, así que la segunda condición no cuesta nada ahí; con dos webcams es la que marca el
límite.

## Límites que siguen abiertos

De los tres que había, uno está cerrado y dos siguen abiertos. Los abiertos conservan una prueba
que los enseña, marcada como fallo esperado para que no cuenten como criterio cumplido y para que
unittest avise si alguien los arregla.

1. ~~Del hueco de continuación se comprueba que se ve, no que esté vacío.~~ **Cerrado.**
   `reconstruir.analizar` informa de la tinta que no consigue resolver en fichas, y antes de dar
   un programa por leído se exige que el sitio del bloque siguiente tenga **testigo limpio**: su
   huella muestreada en rejilla, cada punto encuadrado por alguna cámara con al menos 2 px/mm y
   sin ningún contorno encima, o bien fuera del área de trabajo declarada. 18 configuraciones
   barridas, cero confirmaciones de un programa que no esté. El detalle y la corrección de la
   primera versión —que solo muestreaba puntos— están en
   [LECTURA_CONTINUA.md](LECTURA_CONTINUA.md).
2. **Una sola vista puede confirmar una ficha que no está.** La regla «todas las cámaras al mismo
   lado» evita el par enfrentado, pero no evita que el **montaje** gire el bloque: en `regresa`,
   seis bloques a 60° acumulan 300° y una vista lee el `POP` de [95,165] como `PUSH` (0.805) y el
   `NEG` de [−48,82] como `MOD` (0.556). La otra vista que las observa no logra leerlas y, sin
   nadie que contradiga, la fusión las confirma. La escena queda **pendiente**, que es lo
   correcto, pero con dos fichas confirmadas que no están sobre la mesa.
   Se intentó exigir que al menos la mitad de las vistas que observan una ficha logren leerla
   —el mismo corte que separa el buje roscado— y **no sirve**: el literal `3` también lo lee
   menos de la mitad de las vistas que lo encuadran, así que esa regla dejaba pendientes ocho
   programas que hoy se leen bien. La evidencia disponible no separa «buje leído por una de
   cuatro» de «literal leído por una de cuatro». Resolverlo pide un símbolo que no dependa de la
   orientación, o deducir la orientación del bloque antes de leer la ficha.
   Prueba: `RecorridoQueRegresaTest::test_no_inventa_simbolos_confirmados`.
3. **Tres escenas quedan pendientes por un motivo menos preciso del que deberían dar.** En `te`,
   `regresa` y `separados` solo se localizan dos de los tres o seis bloques, así que el sistema
   informa «grupos sin unión» o «no sale una única cadena» y no llega a diagnosticar el conector
   en T ni el ciclo. El veredicto es correcto; la explicación, pobre. Está anotado escena por
   escena en
   `EXPECTATIVAS`.

Y uno que no es un defecto sino una carencia conocida: **`fibonacci` sigue fuera**. Quince
instrucciones no caben en la mesa que el gemelo representa hoy, así que está en
`EJEMPLOS_SIN_ESCENA` y no como escena.
