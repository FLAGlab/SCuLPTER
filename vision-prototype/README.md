# Visión de SCuLPTER

Este prototipo recibe imágenes de cámaras, reconstruye un programa físico y lo muestra en el simulador. El servicio comparte observaciones de varias cámaras calibradas y mantiene el estado de las fichas durante el montaje. La validación del programa se hace con el intérprete existente.

## Dónde está cada cosa

| Ruta | Función |
| --- | --- |
| `servicio.py`, `plataforma/` | API local, cámaras, calibración, fusión y estado compartido |
| `simulador_3d/` | IDE y visualización del programa |
| `reconstruir.py`, `triangulate.py`, `adjacency.py` | Reconstrucción clásica y geometría |
| `clasificador_simbolos.py`, `simbolos.json`, `referencias/` | Lectura de símbolos y fotos de referencia |
| `herramientas/` | Captura, diagnóstico y evaluación de imágenes |
| `tests/datos/` | Escenas y puntos de prueba reproducibles |
| `docs/` | Montajes, conexión de cámaras, fusión y documentación técnica |
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

## Verificar

```bash
PYTHONPATH=vision-prototype python3 -m unittest discover -s vision-prototype/tests
node --test vision-prototype/simulador_3d/tests/*.test.mjs
```

El recorrido de la página Mesa se comprueba en un navegador real con `npm run test:mesa`. Queda fuera de `npm test` porque abre Chromium y tarda unos veinte segundos. La primera vez en una máquina nueva hay que descargar el navegador con `npx playwright install chromium`. Las capturas quedan en `simulador_3d/capturas/` y no se versionan.

La [guía de reconstrucción clásica](docs/reconstruccion-clasica.md) conserva los comandos para captura de referencias, evaluación del reconocedor, calibración estéreo y uso de los puntos sintéticos. Las herramientas se ejecutan desde `vision-prototype/herramientas/`.
