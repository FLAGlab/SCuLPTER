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

## Ejecutar

Desde la raíz de SCuLPTER:

```bash
python3 -m pip install -r vision-prototype/requirements.txt
python3 vision-prototype/servicio.py
```

Luego abre la dirección local que muestra el servicio. Para el simulador sin cámaras, consulta [su guía](simulador_3d/README.md). La lista de fuentes y la configuración están en [Conexión de cámaras](docs/CONEXION_CAMARAS.md); la arquitectura de RealSense, Kinect y webcams está en [Montajes](docs/MONTAJES.md). La política para combinar vistas y tratar oclusiones se describe en [Fusión de cámaras](docs/FUSION_CAMARAS.md).

## Verificar

```bash
python3 -m unittest discover -s vision-prototype/tests
node --test vision-prototype/simulador_3d/*.test.mjs
```

La [guía de reconstrucción clásica](docs/reconstruccion-clasica.md) conserva los comandos para captura de referencias, evaluación del reconocedor, calibración estéreo y uso de los puntos sintéticos. Las herramientas se ejecutan desde `vision-prototype/herramientas/`.
