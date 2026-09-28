# Capturar referencias de fichas reales

Las 12 referencias actuales salieron de `public/imgs/Renders/Ops Front.png` con
`herramientas/sembrar_referencias_desde_renders.py`. Son **renders**: sirven para probar la
tubería, no acreditan nada sobre una ficha impresa. El catálogo lo marca con `origen: render`
y la página Símbolos lo muestra en cada tarjeta.

Para saber qué falta antes de un ensayo:

```bash
python3 herramientas/auditar_vocabulario.py --programa todos
```

## Qué hace falta para el programa mínimo

`PUSH a 3` · `PUSH a 5` · `ADD a` necesita cinco símbolos. `PUSH` y `ADD` tienen render;
faltan por fotografiar el literal `3` (declarado, sin foto), el literal `5` (sin declarar) y
la etiqueta de pila `a` (sin declarar).

## Cómo tomar cada foto

Una ficha por foto, nunca un bloque montado.

- **Encuadre.** La ficha ocupando la mayor parte del cuadro, con un margen de un 10 % alrededor.
  El clasificador recorta el interior descartando un 8 % de borde, así que un margen mayor
  desperdicia resolución y uno menor corta el trazo.
- **Fondo.** Claro y liso, mate. El umbral de Otsu separa tinta de papel; un fondo con vetas o
  sombras duras se lee como trazo.
- **Luz.** Difusa y por ambos lados. Sin flash directo y sin la sombra de la mano o del móvil
  sobre la ficha. El brillo del plástico satura y borra el trazo.
- **Enfoque.** Toca la ficha en la pantalla para enfocar antes de disparar.
- **Perpendicular.** La cámara sobre la ficha, no en diagonal. La perspectiva deforma el símbolo
  más de lo que corrigen las rotaciones sintéticas.
- **Orientaciones.** Al menos tres fotos por símbolo: a 0°, y giradas unos 20° a cada lado.
  El clasificador ya genera rotaciones de −40° a 40° en pasos de 8°, así que no hace falta
  cubrir el giro completo, pero varias tomas reales capturan cómo cambian brillo y grosor.
- **Repeticiones.** Si tienes varias fichas del mismo símbolo, fotografía dos o tres. El trazo a
  mano varía y eso es justo lo que debe tolerar.

La foto debe pesar menos de 6 MB y medir entre 8 y 6000 píxeles de lado.

## Dónde guardarlas

Dos caminos, los dos válidos:

**Página Símbolos del simulador.** Escribe el nombre, elige el tipo y guarda la foto. Queda en
`datos_locales/referencias/` con `origen: foto`, disponible para todas las cámaras sin reiniciar.
Es el camino recomendado porque valida el recorte al guardar y rechaza una foto sin trazo.

**Herramienta de captura.** `python3 herramientas/capturar_referencias.py` toma las fotos desde
una webcam conectada.

Nada de esto se versiona: `datos_locales/` está excluido de Git.

## Después de capturar

Vuelve a auditar y comprueba que `desde ficha real` sube:

```bash
python3 herramientas/auditar_vocabulario.py --programa minimo
```

Después mide cuánto acierta con fotos etiquetadas, que es distinto de tener plantilla:

```bash
python3 herramientas/evaluar_dataset.py --help
```

Mientras `desde ficha real` sea 0, cualquier tasa de acierto que salga del sistema mide
renders contra renders y no dice nada sobre las fichas.

## Qué significa y qué no significa «desde ficha real»

Que un símbolo tenga una foto real **no** quiere decir que el clasificador lo reconozca solo
con ella. Por omisión se usan todas las referencias del símbolo, fotos y renders juntos, y esa
mezcla no se cambia en silencio. Una medida tomada así no es el rendimiento con fichas reales,
y tanto la página Símbolos como los informes lo dicen, nombrando los símbolos en los que
conviven las dos procedencias.

Para medir solo con lo fotografiado:

```bash
python3 herramientas/evaluar_dataset.py --manifest ... --solo-fotos
python3 herramientas/evaluar_sesion.py --sesion ... --solo-fotos
```

Descarta los renders y deja sin plantilla los símbolos que aún no has fotografiado, así que
al principio quedarán muchos sin reconocer. Es lo correcto: es la única cifra que describe
fichas reales.
