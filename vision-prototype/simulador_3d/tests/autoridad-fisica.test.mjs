import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Ejecucion, validaElNavegador, veredictoVigente, motivoFisico } from '../src/modelo/ejecucion.mjs';

test('aplicar una lectura física no provoca una segunda decisión de validez en la página', () => {
  assert.equal(validaElNavegador({ origen: 'camara' }), false);
  assert.equal(validaElNavegador({ origen: 'manual' }), true);
  assert.equal(validaElNavegador(), true, 'por omisión, programa construido a mano');
});

test('el veredicto solo entra si pertenece a la versión confirmada que se publica ahora', () => {
  const lectura = { estado: 'confirmada', version: 'v2' };
  assert.deepEqual(veredictoVigente(lectura, { version: 'v2', etapa: 'ok' }), { version: 'v2', etapa: 'ok' });
  assert.equal(veredictoVigente(lectura, { version: 'v1', etapa: 'ok' }), null, 'respuesta tardía de otra versión');
  assert.equal(veredictoVigente(lectura, null), null);
});

test('mientras la lectura no está confirmada no se activa ningún veredicto', () => {
  for (const estado of ['pendiente', 'estabilizando']) {
    const lectura = { estado, version: 'v2', motivo: 'algo se mueve' };
    assert.equal(veredictoVigente(lectura, { version: 'v2', etapa: 'ok' }), null, estado);
  }
  assert.equal(veredictoVigente(null, { version: 'v2', etapa: 'ok' }), null);
});

test('la traza del servicio se recorre sin volver a ejecutar el programa', () => {
  const resultado = {
    etapa: 'ok', valido: true, version: 'v9',
    pasos: [{ a: [3] }, { a: [3, 5] }, { a: [8] }],
    traza: [
      { paso: 0, instruccion: null, siguiente: 0, pilas: {} },
      { paso: 1, instruccion: 0, siguiente: 1, pilas: { a: [3] } },
      { paso: 2, instruccion: 1, siguiente: 2, pilas: { a: [3, 5] } },
      { paso: 3, instruccion: 2, siguiente: null, pilas: { a: [8] } },
    ],
  };
  const ejecucion = new Ejecucion();
  ejecucion.cargar(resultado);
  assert.equal(ejecucion.ultimo, 3);
  assert.deepEqual(ejecucion.actual.pilas, {});
  assert.deepEqual(ejecucion.siguiente().pilas, { a: [3] });
  assert.deepEqual(ejecucion.todo().pilas, { a: [8] });
  assert.deepEqual(ejecucion.reiniciar().pilas, {});
  assert.equal(ejecucion.ir(99).paso, 3, 'el recorrido queda acotado por la traza');
});

test('cambiar de versión descarta la traza anterior', () => {
  const ejecucion = new Ejecucion();
  ejecucion.cargar({ traza: [{ paso: 0, pilas: {} }, { paso: 1, pilas: { a: [1] } }] });
  ejecucion.todo();
  assert.equal(ejecucion.cursor, 1);
  ejecucion.limpiar();
  assert.equal(ejecucion.resultado, null);
  assert.deepEqual(ejecucion.traza, [], 'sin traza no hay recorrido que mostrar');
});

test('sin veredicto ni versión del servicio, la ejecución física queda deshabilitada con motivo', () => {
  assert.equal(motivoFisico({ veredicto: { version: 'v2' }, version: 'v2' }), '');
  assert.equal(motivoFisico({ version: 'v2' }), '', 'confirmada y esperando a Scala: no es incertidumbre');
  assert.equal(motivoFisico({ motivo: 'se perdió el servicio' }), 'se perdió el servicio');
  assert.equal(motivoFisico(), 'La lectura de las cámaras no está confirmada.',
    'la ausencia de lectura publicada no puede habilitar la ejecución');
  assert.equal(motivoFisico({}), 'La lectura de las cámaras no está confirmada.');
});

test('la pantalla de lectura no valida nada en el navegador y escala las cajas con su cuadro', () => {
  const fuente = readFileSync(new URL('../src/interfaz/vistas.js', import.meta.url), 'utf8');
  const panel = fuente.slice(fuente.indexOf('function resultadoLectura'), fuente.indexOf('function cajasDeCamara'));
  assert.ok(!/new Worker/.test(panel), 'el worker queda reservado al programa construido a mano');
  const cajas = fuente.slice(fuente.indexOf('function cajasDeCamara'), fuente.indexOf('function mesaEstimada'));
  assert.ok(/resolucion_vistas/.test(cajas), 'las cajas se escalan con la resolución de su cuadro');
  assert.ok(!/resolucion_lectura|640/.test(cajas), 'no puede quedar la resolución del cuadro reducido');
  assert.ok(/secuencia=\$\{sello\}/.test(fuente), 'la imagen se pide por el cuadro de las cajas');
  const pintar = fuente.slice(fuente.indexOf('function pintarEvidencia'), fuente.indexOf('function pintarCatalogo'));
  assert.ok(/addEventListener\('load'/.test(pintar), 'las cajas esperan a que cargue su imagen');
  assert.ok(/addEventListener\('error'/.test(pintar), 'una imagen que falla al cargar no lleva cajas');
  const estilos = readFileSync(new URL('../estilos/vistas.css', import.meta.url), 'utf8');
  assert.ok(/\.evid-lienzo:not\(\.lista\) \.caja \{ display: none/.test(estilos),
    'sin imagen cargada no se dibuja ninguna caja');
});
