import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puedeAplicarLectura } from '../src/vision/lectura-fusion.mjs';
import { OPERACIONES } from '../src/modelo/montaje.mjs';

const compartido = JSON.parse(readFileSync(new URL('../../tests/datos/habilitar_ejecucion.json', import.meta.url), 'utf8'));

test('los casos compartidos dan el resultado fijado', () => {
  for (const caso of compartido.casos) {
    assert.equal(puedeAplicarLectura(caso.lectura), caso.esperado, caso.nombre);
  }
});

test('la tabla de aridades del simulador es la misma que fija los casos', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(OPERACIONES).map(([k, v]) => [k, [...v]])), compartido.aridades);
});

test('los casos cubren todos los operadores con cero a tres operandos', () => {
  const nombres = compartido.casos.map(c => c.nombre).join(' ');
  for (const token of Object.keys(OPERACIONES)) {
    for (let n = 0; n < 4; n++) assert.ok(nombres.includes(`${token} con ${n} operandos`), `${token} con ${n}`);
  }
});

test('hay casos de sobra de los dos signos', () => {
  const esperados = compartido.casos.map(c => c.esperado);
  assert.ok(esperados.filter(Boolean).length > 10);
  assert.ok(esperados.filter(e => !e).length > 10);
});
