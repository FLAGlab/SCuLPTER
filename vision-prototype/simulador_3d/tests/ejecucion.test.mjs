import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptEjecutar } from '../generado/interprete.js';
import { Ejecucion, mostrarPila } from '../src/modelo/ejecucion.mjs';
import { Montaje } from '../src/modelo/montaje.mjs';
import { unir, conexionesValidas, pendientesConexiones, ordenarMontaje } from '../src/modelo/conexiones.mjs';

test('la traza empieza en cero, sigue el intérprete y no adelanta las pilas', () => {
  const r = sculptEjecutar('PUSH circle 3\nPUSH triangle 5\nDUP triangle\nMOV circle triangle\nADD circle\n');
  assert.equal(r.completa, true);
  assert.equal(r.traza.length, 6);
  const e = new Ejecucion(); e.cargar(r);
  assert.deepEqual(e.actual.pilas, {});
  assert.equal(e.actual.siguiente, 0);
  e.ir(4);
  assert.equal(e.actual.siguiente, 4);
  assert.equal(mostrarPila(e.actual.pilas.circle), '[3, 5]');
  e.todo(); assert.deepEqual(e.actual.pilas.circle, [8]); assert.equal(e.actual.siguiente, null);
  e.atras(); assert.deepEqual(e.actual.pilas.circle, [5, 3]);
  e.reiniciar(); assert.equal(e.cursor, 0); assert.deepEqual(e.actual.pilas, {});
});
test('JMP y Atrás siguen el contador real de instrucciones', () => {
  const r = sculptEjecutar('PUSH a 1\nJMP 2\nPUSH a 99\nPUSH a 2\n');
  assert.deepEqual(r.traza.map(f => f.instruccion), [null, 0, 1, 3]);
  const e = new Ejecucion(); e.cargar(r); e.todo(); e.atras();
  assert.equal(e.actual.siguiente, 3); assert.deepEqual(e.actual.pilas.a, [1]);
  e.atras(); assert.equal(e.actual.siguiente, 1);
});
test('? omite una instrucción con negativo y con nil', () => {
  for (const v of ['nil', '-1']) {
    const r = sculptEjecutar(`PUSH a ${v}\n? a\nPUSH b 99\nPUSH c 7\n`);
    assert.equal(r.valido, true);
    assert.deepEqual(r.traza.map(f => f.instruccion), [null, 0, 1, 3]);
    assert.equal(r.traza[2].omitida, 2); assert.equal(r.traza[2].siguiente, 3);
    assert.equal(r.traza.at(-1).pilas.b, undefined);
  }
});
test('JMP 0 se detiene por presupuesto y conserva una traza navegable', () => {
  const r = sculptEjecutar('JMP 0\n', 25);
  assert.equal(r.valido, true); assert.equal(r.completa, false); assert.equal(r.etapa, 'limite');
  assert.equal(r.pasos.length, 25); assert.equal(r.traza.at(-1).siguiente, 0);
});
test('llegar al final justo en el límite cuenta como terminación', () => {
  assert.equal(sculptEjecutar('PUSH a 1\n', 1).etapa, 'ok');
});
test('nil es null serializable y se muestra como #', () => {
  const r = sculptEjecutar('PUSH a 2\nDIV a 0\n');
  assert.deepEqual(r.pasos.at(-1).a, [null]);
  assert.equal(mostrarPila(r.pasos.at(-1).a), '[#]');
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
});
test('un error conserva los pasos previos y señala la instrucción exacta', () => {
  const r = sculptEjecutar('PUSH a nil\nADD a 2\n');
  assert.equal(r.valido, false); assert.equal(r.error.instruccion, 1);
  assert.equal(r.traza.length, 2); assert.deepEqual(r.traza.at(-1).pilas.a, [null]);
  assert.equal(r.traza.at(-1).siguiente, 1);
});
test('las validaciones son independientes y los errores de sintaxis no tienen traza', () => {
  assert.equal(sculptEjecutar('PUSH\n').valido, false);
  const r = sculptEjecutar('PUSH b 7\n');
  assert.deepEqual(r.traza[0].pilas, {}); assert.deepEqual(r.pasos.at(-1), { b: [7] });
});
test('la cercanía no crea conexiones y una unión desalineada no se dibuja', () => {
  const m = new Montaje(), a = m.agregarBloque('POP'), b = m.agregarBloque('POP', 1, [80, 0, 0]);
  assert.equal(conexionesValidas(m).length, 0); assert.equal(pendientesConexiones(m).length, 1);
  unir(m, a, b); assert.equal(conexionesValidas(m).length, 1);
  b.angulo = Math.PI / 2; assert.equal(conexionesValidas(m).length, 0);
});
test('reordenar recoloca las piezas y actualiza conexiones y eliminación', () => {
  const m = new Montaje(), a = m.agregarBloque('PUSH'), b = m.agregarBloque('POP'), c = m.agregarBloque('PUSH');
  m.bloques = [a, c, b]; ordenarMontaje(m);
  assert.ok(a.posicion[0] < c.posicion[0] && c.posicion[0] < b.posicion[0]);
  assert.deepEqual(conexionesValidas(m).map(c => [c.origen, c.destino]), [[a.id, c.id], [c.id, b.id]]);
  m.eliminarBloque(c.id); assert.equal(conexionesValidas(m).length, 0);
});
