# Lectura compartida entre cámaras

La fusión pertenece a `vision-prototype` y usa el intérprete compilado existente. Reconstruye fichas visibles en un marco 3D común, conserva sus identidades y presenta un programa candidato. No certifica los encajes físicos ni garantiza observar piezas totalmente ocultas desde el comienzo.

## Preparar una sesión

1. Conecta las webcams y, si está disponible, un Kinect v2 o RealSense con sus controladores.
2. Guarda los intrínsecos de cada webcam. Registra todas las cámaras conectadas con el mismo tablero inmóvil, orientado de la misma manera. El origen y los ejes del tablero definen las coordenadas del montaje.
3. En Cámaras, selecciona **Combinar cámaras**. Mide el paso entre centros de las fichas de operación consecutivas y pulsa **Guardar lectura**. El valor inicial de 60 mm es una referencia del prototipo; no autoriza reconstrucción hasta guardarlo. Si las piezas o los giros generan distancias incompatibles con un paso único, la cadena puede quedar pendiente.
4. Observa las lecturas y las fuentes de cada ficha. Activa **Actualizar la mesa** para enviar versiones completas y estables al IDE.
5. Si retiraste piezas, despeja la vista y pulsa **Reiniciar seguimiento**. Esto limpia también el montaje recibido cuando está activa la actualización. El sistema no interpreta automáticamente una pérdida de visibilidad como retirada.

**Una sola vista** mantiene la lectura anterior por filas, útil para diagnóstico. No resuelve oclusiones entre cámaras.

## Flujo implementado

Cada hilo de cámara reconoce símbolos y publica un cuadro con secuencia, reloj monotónico del equipo, caja en píxeles de la resolución original, candidatos y calidad de imagen. Conserva como máximo seis cuadros con profundidad registrada, sin guardar vídeos en disco. Las capturas antiguas no reemplazan una posterior.

Un único hilo agregador toma instantáneas de los productores, limita la separación temporal a 120 ms y publica una revisión coherente. El navegador consulta ese estado; la fusión sigue funcionando aunque no se consulte la página. La sincronización es aproximada, basada en la recepción de cuadros, sin sincronización física de obturadores.

La localización utiliza dos rutas:

- **Profundidad registrada:** deproyección al marco del tablero y proyección sobre las webcams. Se busca una superficie local consistente junto al centro de la detección. Permite que una webcam vea solo la operación y otra solo los parámetros cuando el sensor de profundidad observa sus superficies.
- **Webcams:** triangulación de pares con suficiente separación y ángulo, profundidad positiva y error de reproyección acotado. La asignación debe ser única en ambas vistas. Los símbolos repetidos sobre líneas epipolares ambiguas quedan pendientes.

Las medidas próximas de distintas cámaras se agrupan y se asocian de forma conservadora a las fichas anteriores. Una cámara aporta como máximo una lectura por ficha en cada actualización. Las puntuaciones se ponderan por tamaño y nitidez del recorte; siguen siendo similitudes, no probabilidades. Dos lecturas fuertes contradictorias producen ambigüedad, aunque una tercera coincida con una de ellas.

## Estados y ejecución

| Estado de ficha | Significado |
| --- | --- |
| Leída | Posición reciente y símbolo con suficiente separación entre candidatos. |
| Ambigua | Conflicto de símbolos o margen insuficiente. Se conserva provisionalmente la identidad anterior, si existe. |
| Oculta | La profundidad muestra una superficie delante de la posición anterior. |
| Sin observación reciente | No se pudo localizar de nuevo. Puede estar tapada, haberse movido o haber sido retirada. |

Una sola vista sin profundidad puede reconocer una ficha ya conocida, pero no confirma su nueva posición 3D. Si no hay geometría suficiente, queda pendiente. Un desplazamiento grande o una asociación ambigua puede exigir reiniciar el seguimiento; no se inventa continuidad entre fichas iguales.

`adjacency.py` reconstruye una cadena candidata usando el paso medido y las posiciones de los parámetros. La fusión rechaza ramificaciones, ciclos, piezas aisladas, sentidos casi empatados y cantidades de parámetros incompatibles con las operaciones. Se conserva la semántica de operaciones como `CMP`, con uno o dos operandos.

La publicación ejecutable exige evidencia reciente, una cadena completa y 0,8 s de estabilidad. Un movimiento acumulado superior a 3 mm reinicia esa ventana. Una pérdida de evidencia cancela la validación pendiente y deshabilita los pasos de ejecución del montaje recibido. El código anterior permanece visible como provisional. Al recuperar la lectura se vuelve a preparar la traza desde el comienzo.

El intérprete valida el texto fuera del ciclo de captura. Sus resultados no resuelven ambigüedades visuales: un programa sintácticamente válido no demuestra una lectura correcta. Las conexiones se muestran como estimadas, nunca como encajes observados.

## Ensayo con dos webcams reales

Primero conecta las webcams, toma fotos de referencia de las fichas impresas en Símbolos, calibra los intrínsecos de cada cámara y regístralas con el mismo tablero inmóvil. Mide en milímetros la distancia entre centros de operaciones consecutivas y guárdala en Cámaras. El montaje debe permanecer fijo después del registro. Usa `herramientas/listar_camaras.py` para identificar los índices y desconecta las cámaras del servicio antes de grabar, pues la grabadora abrirá esos dispositivos directamente.

Graba una sesión por situación: programa completo y quieto, parámetro oculto, mano moviendo fichas y símbolos repetidos. Escribe el programa real completo en `--esperado`; marca `--debe-ejecutar` solo cuando toda la escena está visible y quieta. Las imágenes y la calibración usada se guardan localmente en `datos_locales/`, fuera de Git.

```sh
python3 vision-prototype/herramientas/registrar_sesion.py --camara-a 0 --camara-b 1 --out vision-prototype/datos_locales/sesiones/completa --esperado 'PUSH a 2' --escena completa --debe-ejecutar
python3 vision-prototype/herramientas/registrar_sesion.py --camara-a 0 --camara-b 1 --out vision-prototype/datos_locales/sesiones/occlusion --esperado 'PUSH a 2' --escena oclusion
python3 vision-prototype/herramientas/evaluar_sesion.py --sesion vision-prototype/datos_locales/sesiones/completa --json vision-prototype/datos_locales/sesiones/completa/informe.json
python3 vision-prototype/herramientas/evaluar_dataset.py --manifest vision-prototype/datos_locales/dataset/manifest.jsonl --datos vision-prototype/datos_locales
```

El informe separa confirmaciones correctas, confirmaciones incorrectas y lecturas pendientes. Mide mediana y percentil 95 de lectura, fusión y tiempo total por par de imágenes. Una confirmación incorrecta incluye cualquier ejecución durante una escena marcada como oculta o en movimiento. Esta medición permite decidir si conviene filtrar por geometría epipolar, reducir el trabajo de profundidad o acortar el tiempo de bloqueo. Las pruebas sintéticas comprueban el instrumento, pero no aportan tasas de acierto de fichas reales.

## Límites y comprobación física

La detección todavía parte de regiones y plantillas de símbolos. No identifica caras mediante modelos del bloque, no reconoce manos y no mide automáticamente ranuras o conectores. Tampoco puede descubrir una operación o un parámetro que ninguna vista haya observado. La proyección de profundidad puede fallar por superficies reflectantes, resolución insuficiente o discontinuidades; en esos casos se necesita otra vista, mejor montaje o referencias de reconocimiento.

Los umbrales geométricos y temporales son valores iniciales verificables, no una garantía de precisión. Hay que comprobarlos con las fichas, distancias, iluminación y velocidades de manipulación reales. Mover una cámara o cambiar su resolución exige revisar la calibración. La fusión de símbolos no reemplaza la futura detección explícita de conexiones y capacidades físicas.

Las pruebas sintéticas cubren triangulación métrica, fuentes complementarias con profundidad, oclusión parcial y total, recuperación, conflicto entre cámaras, símbolos repetidos, movimiento acumulado, cuadros atrasados, calibración incompatible, geometría curva y copia independiente de revisiones. También se comprueban la escala de las cajas y la compatibilidad con las pruebas existentes.

```sh
python3 -m unittest discover -s tests -v
node --test simulador_3d/tests/*.test.mjs
```

La prueba de navegador usa datos sintéticos en un servicio separado: reconstruir `PUSH a 2`, ejecutar hasta `a = [2]`, ocultar las lecturas y verificar la pausa, y recuperar el programa con operación y parámetros visibles en cámaras diferentes. No sustituye el ensayo con dispositivos reales.
