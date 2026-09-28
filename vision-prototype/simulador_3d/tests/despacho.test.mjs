import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptEjecutar } from '../generado/interprete.js';
import { Despacho, Ejecucion, veredicto, senalDeCambio } from '../src/modelo/ejecucion.mjs';
import { EJEMPLOS, TRAZOS, montajeEjemplo } from '../src/modelo/ejemplos.mjs';
import { lexemaParametro } from '../src/modelo/montaje.mjs';

test('una misma firma no vuelve a pedir trabajo al intérprete', () => {
  const d = new Despacho();
  const uno = d.solicitar('a');
  assert.ok(uno > 0);
  assert.equal(d.solicitar('a'), 0);
  assert.ok(d.solicitar('b') > uno);
});

test('una respuesta atrasada se descarta cuando el montaje ya cambió', () => {
  const d = new Despacho();
  const vieja = d.solicitar('programa-1');
  const nueva = d.solicitar('programa-2');
  assert.equal(d.resolver(vieja), false);
  assert.equal(d.resolver(nueva), true);
});

test('invalidar descarta la respuesta en vuelo y permite volver a pedir la misma firma', () => {
  const d = new Despacho();
  const enVuelo = d.solicitar('programa-1');
  assert.equal(d.invalidar(), true);
  assert.equal(d.resolver(enVuelo), false);
  const otra = d.solicitar('programa-1');
  assert.ok(otra > enVuelo);
  assert.equal(d.resolver(otra), true);
  assert.equal(d.resolver(otra), false, 'una respuesta no se acepta dos veces');
});

test('invalidar sin nada pendiente no gasta revisiones', () => {
  const d = new Despacho();
  assert.equal(d.invalidar(), false);
  assert.equal(d.revision, 0);
});

test('una traza cargada deja de ser seguible en cuanto el montaje se mueve', () => {
  const e = new Ejecucion();
  e.cargar(sculptEjecutar('PUSH a 3\nPUSH a 5\nADD a\n'));
  e.todo();
  assert.equal(veredicto({ bloques: 3, resultado: e.resultado }).seguible, true);
  for (const motivo of [{ moviendo: true }, { incertidumbre: 'lectura dudosa' }, { pendientes: ['falta una ficha'] }]) {
    assert.equal(veredicto({ bloques: 3, resultado: e.resultado, ...motivo }).seguible, false, JSON.stringify(motivo));
  }
  e.limpiar();
  assert.equal(e.actual, null);
  assert.equal(veredicto({ bloques: 3, resultado: e.resultado }).clase, 'validando');
});

test('el sonido de error solo suena al entrar en un rechazo nuevo', () => {
  const valido = veredicto({ bloques: 1, resultado: sculptEjecutar('PUSH a 1\n') });
  const roto = veredicto({ bloques: 1, resultado: sculptEjecutar('PUSH a nil\nADD a 2\n') });
  const incompleto = veredicto({ bloques: 1, pendientes: ['falta una ficha'] });
  assert.equal(senalDeCambio(valido, roto), 'error');
  assert.equal(senalDeCambio(roto, roto), null);
  assert.equal(senalDeCambio(roto, valido), null);
  assert.equal(senalDeCambio(valido, incompleto), null, 'montar no es un rechazo del lenguaje');
  assert.equal(senalDeCambio(incompleto, incompleto), null);
  assert.equal(senalDeCambio(null, valido), null);
});

const CON_DIBUJOS = EJEMPLOS.filter(e => e.dibujos);

test('hay ejemplos con dibujos precargados y todos usan trazos declarados', () => {
  assert.ok(CON_DIBUJOS.length >= 3);
  for (const e of CON_DIBUJOS) for (const nombre of Object.values(e.dibujos)) assert.ok(TRAZOS[nombre], nombre);
});

for (const ejemplo of CON_DIBUJOS) test(`los dibujos sobreviven a cargar ${ejemplo.nombre}`, () => {
  const montaje = montajeEjemplo(ejemplo);
  const fichas = [...montaje.piezas.values()].filter(p => p.tipo === 'parametro');
  for (const [texto, trazo] of Object.entries(ejemplo.dibujos)) {
    const propias = fichas.filter(p => p.contenido.texto === texto);
    assert.ok(propias.length, texto);
    for (const p of propias) {
      assert.deepEqual(p.contenido.trazos, TRAZOS[trazo], `${texto} conserva su dibujo`);
      assert.equal(lexemaParametro(p.contenido), texto, 'el dibujo no cambia el identificador que ve Scala');
    }
    assert.equal(new Set(propias.map(p => lexemaParametro(p.contenido))).size, 1, `${texto} mantiene una sola identidad`);
  }
  const codigo = montaje.programa().map(i => [i.token, ...i.operandos].join(' ')).join('\n');
  const r = sculptEjecutar(codigo + '\n');
  assert.equal(r.valido, !ejemplo.error);
  assert.deepEqual(r.traza.at(-1).pilas, ejemplo.esperado);
});

test('Fibonacci recorre 74 pasos y deja los seis primeros términos', () => {
  const ejemplo = EJEMPLOS.find(e => e.nombre === 'Sucesión de Fibonacci');
  const montaje = montajeEjemplo(ejemplo);
  const codigo = montaje.programa().map(i => [i.token, ...i.operandos].join(' ')).join('\n');
  const r = sculptEjecutar(codigo + '\n');
  assert.equal(r.etapa, 'ok');
  assert.equal(r.pasos.length, 74);
  assert.deepEqual(r.pasos.at(-1).fib, [5, 3, 2, 1, 1, 0]);
  assert.ok(new Set(ejemplo.giros).size > 1, 'el montaje no es una línea recta');
});

test('el ejemplo de diagnóstico permite recorrer los pasos previos al error', () => {
  const ejemplo = EJEMPLOS.find(e => e.nombre === 'Rastro de un valor vacío');
  const codigo = montajeEjemplo(ejemplo).programa().map(i => [i.token, ...i.operandos].join(' ')).join('\n');
  const r = sculptEjecutar(codigo + '\n');
  assert.equal(r.valido, false);
  assert.equal(r.etapa, 'runtime');
  assert.equal(r.error.decide, 'lenguaje');
  const e = new Ejecucion(); e.cargar(r);
  assert.equal(e.ultimo, 5);
  e.todo(); assert.deepEqual(e.actual.pilas.serie, [null]);
  e.ir(2); assert.deepEqual(e.actual.pilas.serie, [12, 0]);
  e.siguiente(); assert.deepEqual(e.actual.pilas.serie, [null], 'aquí aparece el valor vacío');
});
