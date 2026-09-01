# SCuLPT Vision — reconstrucción sin marcadores, multi-cámara

Reconstruye un programa SCuLPT a partir de lo que ven una o varias cámaras
apuntando a los bloques físicos reales (sin ningún marcador pegado), y lo
ejecuta en el **intérprete real de SCuLPTER, sin modificarlo**
(`src/main/scala/sculpter/*.scala` tal cual están en el repo).

No usa ArUco ni ningún otro marcador -- se eliminó por completo. Cada
región detectada se compara contra fotos de referencia reales en
`referencias/`.

## Cómo reconoce el símbolo

`referencias/` ya trae 12 de las 13 operaciones, sembradas directamente
desde el render oficial `public/imgs/Renders/Ops Front.png` con
`sembrar_referencias_desde_renders.py`. Cada símbolo se compara contra un
banco de rotaciones (-40° a 40°) porque la comparación simple no aguanta ni
20° de rotación de cámara -- se comprobó que sin eso confunde símbolos.

**Qué falta:** `a`, `b`, `c`, los números y `POP` -- ninguno tiene render
oficial en el repo. Sin ellos, la cámara reconoce el símbolo pero el
intérprete real marca la instrucción como incompleta (correcto: le falta
el operando, no es un error del sistema). En cuanto haya una foto real de
esas piezas, guardarla en `referencias/` con el nombre del lexema
(`a.jpg`, `5.jpg`) y ya queda activo, sin tocar código.

## Multi-cámara: selección de mejor vista, no fusión 3D

Sin calibrar las cámaras entre sí (intrínsecos/extrínsecos, con un patrón
de ajedrez -- eso sigue pendiente) no se puede triangular una posición 3D
real combinando varias vistas. Lo que sí hace hoy: cada cámara detecta por
su cuenta, y en cada instante se usa **la que dio la lectura más completa**
(más símbolos reconocidos, menos avisos de "sin coincidencia"). Si una
cámara ve un bloque de canto y no lo reconoce, pero otra lo ve de frente,
se usa esa automáticamente. Es un paso honesto antes de la fusión 3D real,
no un reemplazo de ella.

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --camara 2
```

Se abre una ventana por cámara; la que está en uso en cada instante se
marca como `[EN USO]`.

## Cámara: celular por Bluetooth/WiFi o cualquier otra

macOS ya expone el iPhone como cámara del sistema (Continuity Camera) sin
configurar nada. Para saber qué índice le corresponde:

```bash
python3 vision-prototype/listar_camaras.py
```

`--camara` acepta índice numérico o una URL de video (DroidCam, IP Webcam,
etc.), y se puede repetir una vez por cámara.

## Conectarlo al simulador 3D

```bash
python3 vision-prototype/reconstruir.py --camara 0 --camara 1 --servir-3d
```

Levanta un servidor WebSocket en `ws://localhost:8765`. Con
`vision-prototype/simulador_3d/index.html` abierto (ver su propio
`README.md`), cada lectura estable de la cámara reemplaza el programa en la
mesa 3D -- el mismo intérprete y la misma escena que ya funcionaban con
arrastre manual, ahora alimentados por los bloques reales.

## Respaldo sin cámara

Mismo pipeline sobre una o varias imágenes ya guardadas (una por cámara
simulada):

```bash
python3 vision-prototype/reconstruir.py --imagen vision-prototype/imagenes_prueba/demo_simbolos_reales.png
```

## Regenerar las referencias

```bash
python3 vision-prototype/sembrar_referencias_desde_renders.py
```

## Primera corrida de `scala-cli`

La primera vez descarga dependencias (~1 min); después queda en caché.
