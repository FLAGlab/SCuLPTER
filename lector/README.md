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

1. **Fotos.** Con las cámaras ya montadas:
   `python3 -m lector.herramientas.capturar --sesion mesa-limpia`
   Cambia montajes, luz y objetos alrededor entre fotos. Usa sesiones distintas para entrenar y para validar.
2. **Etiquetas.** En CVAT, una caja por `bloque`, por `operacion` y por `parametro`.
   Exporta como «Ultralytics YOLO Detection» en `lector/datos/dataset/`.
3. **Detector.** `python3 -m lector.herramientas.entrenar`. Queda en `lector/modelos/detector.pt`.
4. **Fichas.** Las 12 operaciones una vez, y los parámetros de cada sesión:
   `python3 -m lector.herramientas.inscribir --tipo operaciones --nombre PUSH`
   `python3 -m lector.herramientas.inscribir --tipo parametros --nombre triangulo`
5. **En vivo.** `python3 -m lector --camaras 0 1 2 3`, abre http://localhost:8000 y activa «Leer desde las cámaras» en la Mesa.

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
