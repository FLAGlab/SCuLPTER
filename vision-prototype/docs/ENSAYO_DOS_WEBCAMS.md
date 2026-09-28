# Primer ensayo con dos webcams

Orden de trabajo para el primer ensayo reproducible. Nada de esto se ha hecho todavía con
fichas reales; mientras no se haga, cualquier tasa de acierto que salga del sistema mide
renders contra renders.

## Antes de conectar nada

**1. Audita el vocabulario.**

```bash
python3 herramientas/auditar_vocabulario.py --programa todos
```

Distingue tres estados: listo (foto de ficha real), provisional (render) y falta. Hoy salen
12 provisionales y 0 listos. Hasta el programa mínimo `PUSH a 3 · PUSH a 5 · ADD a` necesita
fotografiar el literal `3`, el literal `5` y la etiqueta `a`.

**2. Fotografía lo que falte.** Sigue [CAPTURA_REFERENCIAS.md](CAPTURA_REFERENCIAS.md) y vuelve
a auditar hasta que «desde ficha real» deje de ser 0.

**3. Mide el paso.** Sigue [MEDIR_PASO.md](MEDIR_PASO.md). Son dos medidas, una por tamaño de
bloque, no un promedio.

## Calibrar

Cada cámara necesita sus intrínsecos y después una posición común.

1. Página Calibración: tablero de 9 × 6 esquinas, cuadros de 25 mm, al menos 15 capturas por
   cámara variando distancia e inclinación. Se acepta con error de reproyección menor que 1 px.
2. Con las dos cámaras conectadas y el **mismo tablero inmóvil visible en ambas**, pulsa
   Registrar cámaras. Las imágenes no pueden separarse más de 0.5 s.
3. Si mueves una cámara, repite el registro. Los intrínsecos se conservan.

## Grabar las sesiones

Cinco escenas, cada una en su carpeta dentro de `datos_locales/`, que está excluido de Git.

```bash
python3 herramientas/registrar_sesion.py --camara-a 0 --camara-b 1 \
  --out datos_locales/sesiones/completa \
  --esperado "PUSH a 3;PUSH a 5;ADD a" --escena completa --debe-ejecutar
```

| Escena | Qué hacer | Qué se espera |
| --- | --- | --- |
| `completa` | Programa armado y quieto, nada delante | Única con `--debe-ejecutar`; debe confirmar el programa correcto |
| `oclusion` | Tapa un parámetro con la mano y mantén | No debe habilitar la ejecución |
| `movimiento` | Pasa la mano sobre el montaje | No debe habilitar la ejecución mientras haya movimiento |
| `repetidos` | Varias fichas del mismo símbolo | Debe distinguirlas por posición, sin fundir identidades |
| `retirada` | Quita una pieza durante la grabación | Debe dejar de habilitar en cuanto falte |

Solo `completa` admite `--debe-ejecutar`; la herramienta rechaza lo contrario.

## Evaluar

```bash
python3 herramientas/evaluar_sesion.py --sesion datos_locales/sesiones/completa \
  --json datos_locales/informes/completa.json
```

El informe separa tres cosas y no las mezcla:

- **confirmaciones correctas**: el sistema habilitó la ejecución y el programa coincide con el
  esperado;
- **confirmaciones incorrectas**: habilitó la ejecución y el programa no coincide, o la escena
  no debía ejecutarse. Es el número que importa; una sola es grave;
- **pendientes**: no habilitó la ejecución. No es un fallo en las escenas de oclusión,
  movimiento y retirada, donde es justo lo que se espera.

La condición que cuenta como «habilitó» es `puede_ejecutar`, la misma que usa el IDE:
estable, compatible, con instrucciones, aridad correcta y sin `<sin leer>`.
`tests/test_fusion.py` comprueba que las dos no se separen.

Para fotografías etiquetadas sueltas, sin sesión, usa `evaluar_dataset.py`.

## Medir el coste de la fusión

```bash
PYTHONPATH=. python3 herramientas/perfilar_fusion.py --fichas 15 30 --perfil
```

Escenas sintéticas con cámaras simuladas: sirven para comparar cambios de código, **no** para
predecir el rendimiento del montaje real. Repite el comando antes y después de tocar la fusión.

## Qué no demuestra este ensayo

Dos webcams RGB no dan profundidad, así que una ficha tapada no se distingue de una que
ninguna cámara miró: las dos salen como «no observada». Una ficha «sin contradicción» vista
por una sola cámara no está corroborada de forma independiente; solo significa que ninguna
vista la desmiente. Las uniones entre bloques se estiman por geometría y nunca se dan por
confirmadas.
