# Lector

Lee en vivo un programa SCuLPT armado sobre la mesa, con varias webcams, y lo manda al
simulador. Scala decide si el programa es válido.

```
camara 0 ─┐
camara 1 ─┤
camara 2 ─┼─► votacion ─► programa (estable) ─► veredicto (Scala) ─► simulador
camara 3 ─┘
```

| Archivo | Qué hace |
| --- | --- |
| `camaras.py` | Un hilo por cámara; guarda solo el último cuadro |
| `detector.py` | YOLO con tres clases: `bloque`, `operacion`, `parametro` |
| `fichas.py` | Reconoce cada cara comparándola con las fichas inscritas (DINOv2, sin entrenar) |
| `lectura.py` | Cajas de una cámara → secuencia de instrucciones con candidatos |
| `votacion.py` | Alinea las lecturas de todas las cámaras y vota ranura por ranura |
| `grafo.py` | Grafo de dependencias: propaga sin glitches y numera las versiones |
| `lenguaje.py` | Pregunta a Scala (el `interprete.js` del simulador) si un programa es válido |
| `servidor.py` | Sirve el simulador y le manda cada versión por websocket |

## Preparar

```bash
python3 -m pip install -r lector/requirements.txt
npm install
npm run build:simulator      # genera simulador/generado/interprete.js
```

## Flujo de trabajo

1. **Fotos.** `python3 -m lector.herramientas.capturar --sesion s1-mesa-limpia`
   Espacio guarda una foto por cámara; `r` activa la ráfaga (una foto de cada cámara cada 1.5 s) mientras mueves las piezas.
2. **Primeras etiquetas a mano.** Unas 50 fotos en CVAT, con una caja por `bloque`, `operacion` y `parametro`. Exporta como «Ultralytics YOLO Detection» en `lector/datos/dataset/`.
3. **Detector.** `python3 -m lector.herramientas.entrenar`. Queda en `lector/modelos/detector.pt`.
4. **El resto, corrigiendo en vez de dibujar.** `python3 -m lector.herramientas.prellenar --fotos lector/datos/fotos/s2-objetos` crea `s2-objetos-etiquetas.zip`; en CVAT se importa como «YOLO 1.1» sobre las mismas fotos y solo se corrigen las cajas. Se vuelve a entrenar y se repite.
5. **Fichas.** Las 13 operaciones una vez, y los parámetros de cada sesión:
   `python3 -m lector.herramientas.inscribir --tipo operaciones --nombre PUSH`
   `python3 -m lector.herramientas.inscribir --tipo parametros --nombre triangulo`
6. **Ver los recuadros.** `python3 -m lector.herramientas.ver` muestra las 4 cámaras con cada bloque numerado en el orden de lectura y cada ficha con su nombre. Con `--fotos carpeta --salida carpeta-vista` dibuja sobre fotos guardadas.
7. **En vivo.** `python3 -m lector --camaras 0 1 2 3`, abre http://localhost:8000 y activa «Leer desde las cámaras» en la Mesa.

## Cámaras (Logitech C270)

- Máximo 1280×720 y foco fijo: se ven nítidas desde unos 40 cm.
- A 45 cm, una cara de 15 mm mide unos 45 px. Más allá de 60 cm baja de 35 px y la lectura se vuelve frágil.
- Cada cámara cubre unos 40×23 cm a 45 cm: la zona de trabajo es de unos 35×25 cm, con una cámara en cada esquina.
- En macOS el índice de cada cámara puede cambiar al reconectarlas: revisa con `capturar` antes de cada sesión.

## Alcance

Cadenas de bloques con `JMP` y `?`. Las uniones en T y los ciclos físicos quedan para después.

## Pruebas

```bash
python3 -m pytest lector/tests
```
