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
triángulos y unos 200 ms por cámara.

## Preparar el vocabulario

Un solo comando deja el gemelo reproducible desde una copia limpia:

```bash
PYTHONPATH=. python3 herramientas/preparar_gemelo.py
```

Siembra los parámetros y rinde las 13 operaciones desde `parametro.stl`. Dos copias limpias
salen **idénticas byte a byte**; comprobado. `tests/conftest.py` lo invoca solo si falta el
vocabulario, así que las pruebas corren desde un árbol recién clonado sin pasos manuales.
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
mismo detector que recortará la observación. A cada etiqueta de pila se
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
| Evidencia por ficha | «6 de 8 cámaras la leen como PUSH · 2 no la encuadran»: ya no conviven un rótulo de coincidencia y cuatro «no la ve» |
| Veredicto de Scala | «Veredicto sobre un programa candidato que las cámaras todavía no dan por leído. No valida el montaje» y, en el error, «es un error de ejecución del propio programa candidato» |
| Tocar una unión | «Conector recto · Estado: estimada…» |
| Ejemplos → Gemelo | El botón abre la escena `ejecutable` para «Sumar dos valores» |
| Errores de consola | Ninguno |

Un aviso para quien lo pruebe: cada paso tarda unos 3 s con ocho cámaras, y los clics seguidos
sobre «paso» se descartan mientras hay una petición en vuelo. Hay que dar tiempo entre pasos
antes de concluir que algo no se confirma.

## La matriz de casos

```bash
PYTHONPATH=. python3 herramientas/matriz_gemelo.py --json datos_locales/informes/matriz.json
```

Recorre diecisiete casos y para cada uno imprime el programa reconstruido, cuántas cámaras y
dónde, los px/mm, el estado visual, el veredicto de Scala y el tiempo por captura.
`tests/test_matriz.py` fija las mismas expectativas, derivadas de las reglas de Scala y no de
lo que hoy devuelve la implementación: cada caso positivo comprueba **secuencia completa,
orden, operandos, estado de aceptación, veredicto y longitud de la traza**.

Los casos negativos exigen dos cosas a la vez: cero programas confirmados que no estén sobre la
mesa, y un motivo concreto para quedar pendiente. Cuando no hay aviso, el motivo solo puede ser
que el montaje no se queda quieto, y la prueba lo comprueba explícitamente.

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
| `contradice` | Propone otro símbolo y la fusión no la usó |
| `ilegible` | La detecta pero no puede identificarla |
| `sin_deteccion` | La encuadra y no detecta nada ahí |
| `fuera` | La ficha cae fuera de su encuadre |

## Procedencia de cada pieza

Una pieza lleva dos listas distintas, y confundirlas era lo que hacía contradictorio el panel:
`camaras` son las que aportaron alguna observación a esa posición, y `lectores` son las que
además la leyeron como ese símbolo. Una cámara apartada puede seguir aportando una mancha
ilegible; no puede seguir sosteniendo la lectura. La procedencia y el recuento del panel usan
`lectores`.

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

## Lo que el gemelo confirma hoy

Ocho programas distintos se reconstruyen enteros desde los píxeles rasterizados de los STL y
llegan hasta Scala. Medido con `herramientas/matriz_gemelo.py --pasos 10`:

| Escena | Cám. | Estado visual | Scala | s/captura | Programa reconstruido |
| --- | --- | --- | --- | --- | --- |
| `una_instruccion` | 4 | confirma correcto | `ok a=[3]` | 1.04 | `PUSH a 3` |
| `completa` | 8 | confirma correcto | `runtime a=[3]` | 2.92 | `PUSH a 3 · ADD a` |
| `ejecutable` | 14 | confirma correcto | `ok a=[8]` | 6.11 | `PUSH a 3 · PUSH a 5 · ADD a` |
| `dos_pilas` | 14 | confirma correcto | `ok a=[5,3] b=[]` | 5.80 | `PUSH a 3 · PUSH b 5 · MOV a b` |
| `repetidos` | 10 | confirma correcto | `ok a=[3,3]` | 3.90 | `PUSH a 3 · PUSH a 3` |
| `fondo` | 8 | confirma correcto | `runtime a=[3]` | 3.08 | `PUSH a 3 · ADD a` |
| `desacuerdo` | 8 | confirma correcto | `runtime a=[3]` | 2.81 | `PUSH a 3 · ADD a` |
| `contradiccion` | 9 | confirma correcto | `runtime a=[3]` | 3.20 | `PUSH a 3 · ADD a` |
| `dos_webcams` | 2 | pendiente | — | 0.82 | `PUSH` (real: `PUSH a 3 · ADD a`) |
| `cobertura_parcial` | 3 | **confirma incorrecto** | `ok a=[3]` | 1.27 | `PUSH a 3` (real: `PUSH a 3 · ADD a`) |
| `oclusion`, `retirada`, `retirar_una`, `reaparece`, `movimiento`, `bloque_tapa`, `fondo_dificil` | 8-10 | pendiente | — | 2.0-4.3 | — |

Total: **8 confirmados correctos, 1 confirmado incorrecto, 8 pendientes**. El único incorrecto
es el bloqueo que se describe más abajo.

`runtime` no es un fallo de lectura: `PUSH a 3 · ADD a` se lee perfecto y es Scala quien lo
rechaza, porque `ADD` unario saca dos valores y solo hay uno.

Dos piezas del montaje real estorban y hubo que tratarlas:

- **El buje roscado del bloque parece una ficha.** Es geometría real del STL y produce una
  región cuadrada del tamaño de una ficha que ninguna cámara puede leer. Se separa de una ficha
  ilegible de verdad por el respaldo relativo, como se explica más arriba.
- **Una observación suelta que nadie puede leer no es evidencia.** Bloquea una observación
  **leída como símbolo** que no se puede situar; una que ninguna cámara identifica se informa
  (`sin_leer_sueltas`) y no bloquea.

## Cuántas cámaras hacen falta

| Programa | Bloques | Cámaras que bastan | Qué pasa con menos |
| --- | --- | --- | --- |
| `PUSH a 3` | 1 | 4 | — |
| `PUSH a 3 · ADD a` | 2 | 8 | con 3 confirma solo el primer bloque; con 2 no pasa de `PUSH` |
| `PUSH a 3 · PUSH a 5 · ADD a` | 3 | 14 | — |

A 280 mm de altura y 40° de campo cada cámara da **3.1 px/mm**, y la ficha de 20 mm ocupa unos
62 px. Con dos webcams el campo se ensancha a **2.4 px/mm** y la cadena de dos bloques ya no se
lee: sale `PUSH` y el aviso «Instrucción 1: faltan parámetros o su asociación es ambigua». Dos
webcams no son consenso logrado; son el límite medido.

El coste en tiempo crece con las cámaras: de 1.0 s por captura con cuatro a 6.1 s con catorce.

## Lo que todavía no se puede leer

**Con cobertura parcial el programa se trunca en silencio.** `cobertura_parcial` deja tres
cámaras sobre el primer bloque: el sistema confirma `PUSH a 3` con la mesa puesta en
`PUSH a 3 · ADD a`, y no da ningún aviso, porque no tiene evidencia de que exista un segundo
bloque.

La causa está medida y **no es de cobertura geométrica**: las dos fichas del segundo bloque
caen dentro del encuadre de dos de las tres cámaras. Lo que falla es la detección: a esa
distancia y ese ángulo, `regiones` funde la ficha `ADD` con la `a` contigua en un solo contorno
de 124×69 px y no entrega ninguna región. Sin región no hay observación, y ninguna regla
geométrica posterior puede recuperar evidencia que nunca se extrajo.

`tests/test_matriz.py::PrefijoSilenciosoPendienteTest` lo reproduce y comprueba dos cosas: que
lo confirmado es un **prefijo** de la verdad y no un programa inventado, y que no hay aviso.
Si algún día deja de confirmar, la prueba falla a propósito para que se promueva a caso
negativo.

El cambio mínimo que lo resolvería es **separar fichas contiguas en la detección**. A 20 mm de
paso con fichas de 18-20 mm el hueco es de 2 mm, que a 3.1 px/mm son unos 6 px: el umbral
adaptativo los puentea. Haría falta o bien más resolución efectiva sobre ese tramo (más
cámaras, campo más estrecho), o bien un detector que parta un contorno cuya proporción y tamaño
correspondan a dos fichas pegadas. Lo segundo es trabajo de reconocimiento, no de fusión, y
queda fuera de este pase.

Mientras no se resuelva, la lectura de un montaje solo es de fiar si la cobertura alcanza toda
la cadena: la tabla de arriba dice cuántas vistas hacen falta por longitud de programa.

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
| `ejemplo_condicion` | Ejemplo «condicion» de la página Ejemplos: salto condicional, tres pilas, literal negativo |
| `ejemplo_bucle` | Ejemplo «bucle»: cinco bloques con un `JMP` que vuelve atrás |
| `una_instruccion` | Un solo bloque: `PUSH a 3` |
| `dos_pilas` | `PUSH a 3 · PUSH b 5 · MOV a b`, dos pilas distintas |
| `contradiccion` | Una cámara enfrente, al otro lado de la mesa, ve la flecha girada |
| `dos_webcams` | Solo dos cámaras, como dos webcams plausibles sobre la mesa |
| `cobertura_parcial` | Tres cámaras que solo cubren el primer bloque |

## El fondo impreso

La hoja del fondo no es una superficie lisa: lleva texto y símbolos impresos, para poner a
prueba si el detector los confunde con fichas. Hay dos variantes.

- **`fondo`**: texto corriente junto al montaje. El detector no produce ninguna lectura falsa
  y la escena confirma igual que `completa`: 4 correctas, 0 incorrectas.
- **`fondo_dificil`**: dígitos impresos dentro de recuadros del tamaño de una ficha. Las
  cámaras **sí** los detectan y llegan a parecer fichas en la imagen, pero al triangularlos
  caen a la altura del papel (z ≈ 0) y no a la de las caras de ficha (28–40 mm), así que la
  banda de planos los descarta: seis piezas rechazadas por altura y ninguna marca impresa entra
  en el programa.

Esto cambió respecto a la versión anterior de esta guía, que daba el caso por irresoluble
«sin profundidad». La profundidad está: no viene de una cámara de profundidad sino de
triangular la misma marca desde dos vistas. Lo que faltaba no era el sensor, era usar la altura
que la fusión ya calculaba. Queda en pie el límite de fondo: una marca impresa **a la altura de
una ficha** —pegada sobre un bloque, por ejemplo— seguiría sin distinguirse.

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
