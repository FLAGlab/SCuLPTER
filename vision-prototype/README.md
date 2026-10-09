# Visión de SCuLPTER

Este prototipo recibe imágenes de cámaras, reconstruye un programa físico y lo muestra en el simulador. El servicio comparte observaciones de varias cámaras calibradas y mantiene el estado de las fichas durante el montaje. La validación del programa se hace con el intérprete existente.

Hay un **gemelo digital** para probar el reconocimiento antes de tener cámaras: las cámaras
virtuales reciben píxeles rasterizados desde los STL del proyecto y pasan por el mismo
reconocimiento y la misma fusión que usarán las físicas. Está en
[GEMELO_DIGITAL.md](docs/GEMELO_DIGITAL.md).

El **ciclo continuo de lectura** —construir y modificar el montaje y ver la lectura y el veredicto
de Scala actualizarse— está en [LECTURA_CONTINUA.md](docs/LECTURA_CONTINUA.md), junto con la lista
exacta de capturas y calibración que falta para demostrarlo con cámaras reales. Todas las cifras
publicadas hoy son **virtuales**: ningún programa físico se ha leído todavía.

## Dónde está cada cosa

### La ruta principal: de la cámara al veredicto

Es la cadena que recorre una captura. Si buscas dónde se decide algo, está aquí y en este orden:

| Paso | Archivo | Qué decide |
| --- | --- | --- |
| 1. API local | `servicio.py` | Expone el estado y las acciones; un hilo por petición |
| 2. Estado compartido | `plataforma/estado.py` | Un hilo de captura por cámara y un único hilo de fusión |
| 3. Dispositivo | `plataforma/dispositivos.py` | Webcam, RealSense, Kinect v2 y reproducción de grabaciones |
| 4. Reconocimiento | `plataforma/lectura.py` | Regiones y símbolos de **un** cuadro |
| 5. Vocabulario | `plataforma/vocabulario.py`, `clasificador_simbolos.py` | Plantillas por símbolo; devuelve similitud, no probabilidad |
| 6. Fusión | `plataforma/fusion.py` | Acuerdo entre vistas, posición, quietud, oclusión y grafo físico |
| 7. Geometría | `plataforma/geometria_fusion.py`, `adjacency.py` | Triangulación, proyección y orden de la cadena |
| 8. Ciclo de lectura | `plataforma/lector.py` | Una versión por montaje leído y un veredicto por versión |
| 9. Lenguaje | `simulador_3d/generado/interprete.js` | El veredicto, generado desde `src/main/scala/sculpter/` |
| 10. IDE | `simulador_3d/` | Muestra programa, traza y evidencia por ficha |

`plataforma/medidas.py` contiene las medidas del montaje físico y la configuración de fusión que
se deriva de ellas. Lo comparten la ruta principal y el gemelo, y no depende de ninguno de los dos.

### Lo que se conserva aparte, y para qué

Ninguno de estos archivos está sin uso: cada uno lo ejercita una prueba, una herramienta o un
comando documentado. No sustituyen a la ruta principal y no se borran.

| Ruta | Para qué se conserva |
| --- | --- |
| `plataforma/escena_virtual.py`, `malla.py`, `rasterizador.py`, `gemelo.py`, `guiones.py` | **Gemelo digital**: cámaras virtuales que rasterizan los STL y entran por la misma fusión. Permite probar el reconocimiento sin cámaras, y el servicio lo expone en `/api/gemelo`. Sus cifras son virtuales |
| `plataforma/ensayo.py`, `recorrido.py` | Mesa y guiones de ensayo del ciclo continuo, que usan las pruebas y las herramientas de latencia |
| `reconstruir.py`, `triangulate.py`, `calibrate_cameras.py` | **Reconstrucción clásica**: comandos anteriores a la fusión, sin estado compartido. Siguen documentados en [reconstruccion-clasica.md](docs/reconstruccion-clasica.md) y conservan funciones de calibración reutilizables |
| `herramientas/` | Comandos de captura, diagnóstico, evaluación, ensayo y latencia. Se ejecutan, no se importan; cada uno está documentado en `docs/` |
| `simbolos.json`, `referencias/` | Tabla de símbolos y fotos de referencia. Hoy son **renders**, no fichas impresas |
| `tests/datos/` | Escenas y puntos de prueba reproducibles |
| `docs/` | Montajes, cámaras, fusión, gemelo digital, lectura continua y guías de ensayo |
| `datos_locales/` | Capturas y datos generados en esta máquina; se ignoran en Git |

## Preparar el primer ensayo

Todavía no se ha leído ningún programa físico. Las 12 referencias de símbolos son **renders**
recortados de `public/imgs/Renders`, marcados con `origen: render`; ninguna procede de una
ficha impresa. El orden de trabajo está en [ENSAYO_DOS_WEBCAMS.md](docs/ENSAYO_DOS_WEBCAMS.md).

```bash
python3 herramientas/auditar_vocabulario.py --programa todos
```

Indica, por programa, qué símbolos están declarados, cuáles tienen referencia utilizable,
cuáles son provisionales y cuáles hay que fotografiar. La página Símbolos muestra lo mismo y
etiqueta cada tarjeta como «ficha real» o «render». Para capturar:
[CAPTURA_REFERENCIAS.md](docs/CAPTURA_REFERENCIAS.md). Para medir el paso de la cadena, que son
dos medidas y no un promedio: [MEDIR_PASO.md](docs/MEDIR_PASO.md).

## Quién decide cada veredicto

No todo lo que muestra el simulador lo decide el lenguaje. El resultado que devuelve `sculptEjecutar` trae un campo `decide` que lo separa:

| Procedencia | Qué decide |
| --- | --- |
| `lenguaje` | Validez léxica y gramatical, cada paso ejecutado, las pilas y los errores de ejecución con su mensaje, tal como los produce `src/main/scala/sculpter/` |
| `puente` | El presupuesto de pasos y el salto que cae por debajo del inicio del programa. `Interpreter.scala` no comprueba un contador negativo, así que `simulador_3d/scala/PuenteJS.scala` lo detecta y lo informa como error propio |
| `sistema` | Que el worker no cargue, venza el tiempo de espera o lance una excepción inesperada. No dice nada sobre el programa |

La interfaz lo distingue: la consola marca cada línea con su origen y el panel de la Mesa avisa cuando la comprobación es del puente. El montaje decide aparte si un programa está completo, y nunca declara válido lo que el lenguaje no aceptó.

## Ejecutar

Desde la raíz de SCuLPTER:

```bash
python3 -m pip install -r vision-prototype/requirements.txt
python3 vision-prototype/servicio.py
```

Luego abre la dirección local que muestra el servicio. Para el simulador sin cámaras, consulta [su guía](simulador_3d/README.md). La lista de fuentes y la configuración están en [Conexión de cámaras](docs/CONEXION_CAMARAS.md); la arquitectura de RealSense, Kinect y webcams está en [Montajes](docs/MONTAJES.md). La política para combinar vistas y tratar oclusiones se describe en [Fusión de cámaras](docs/FUSION_CAMARAS.md).

En la página Mesa, el **Editor SCuLPT** permite escribir código, ver la salida de Lex y Parse, y construir sus bloques de izquierda a derecha. El programa mínimo es `PUSH a 3`; al importar texto, la primera instrucción debe ser un `PUSH` con valor numérico. Un texto inválido conserva el montaje anterior. Los controles del editor comparten la traza con Ejecución. `?` y `JMP` se ejecutan; la geometría física de uniones en T y ciclos sigue pendiente de definición.

## Verificar

Desde la raíz de SCuLPTER y en este orden, porque la comprobación con Scala necesita el
intérprete compilado:

```bash
npm run build:simulator
PYTHONPATH=vision-prototype python3 -m unittest discover -s vision-prototype/tests
node --test vision-prototype/simulador_3d/tests/*.test.mjs
```

`npm test` hace los tres pasos. Una copia limpia no necesita nada más: las pruebas que usan el
gemelo siembran su vocabulario con `herramientas/preparar_gemelo.py` si falta —desde
`tests/entorno.py`, así que vale igual con `unittest` y con `pytest`— y dos preparaciones dan el
mismo resultado porque el nombre de cada referencia se deriva del símbolo. Si falta
`simulador_3d/generado/interprete.js`, las pruebas **fallan** indicando el comando que hay que
ejecutar, en vez de saltarse la comprobación en silencio; `SCULPTER_SIN_SCALA=1` la omite a
propósito y lo dice.

El recorrido de la página Mesa se comprueba en un navegador real con `npm run test:mesa`. Queda fuera de `npm test` porque abre Chromium y tarda unos veinte segundos. La primera vez en una máquina nueva hay que descargar el navegador con `npx playwright install chromium`. Las capturas quedan en `simulador_3d/capturas/` y no se versionan.

La [guía de reconstrucción clásica](docs/reconstruccion-clasica.md) conserva los comandos para captura de referencias, evaluación del reconocedor, calibración estéreo y uso de los puntos sintéticos. Las herramientas se ejecutan desde `vision-prototype/herramientas/`.
