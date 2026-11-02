import test from 'node:test';
import assert from 'node:assert/strict';
import { Cadena } from '../src/fisica/cadena.mjs';

test('los tramos conservan su longitud mientras cuelgan desde un extremo', () => {
  const cadena = new Cadena([[0, 300, 0], [100, 300, 0], [200, 300, 0]]);
  cadena.sujetar(0, [0, 300, 0]);
  for (let i = 0; i < 90; i++) cadena.integrar(1 / 60);
  assert.ok(cadena.puntos[1][1] < 260);
  assert.ok(cadena.puntos[2][1] < cadena.puntos[1][1]);
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(Math.hypot(...cadena.puntos[i].map((v, j) => v - cadena.puntos[i + 1][j])) - 100) < .1);
});

test('cada tramo corrige su contacto con el tablero', () => {
  const cadena = new Cadena([[0, 10, 0], [100, 10, 0], [200, 10, 0]]);
  cadena.contacto(1, 12);
  assert.equal(cadena.puntos[0][1], 10);
  assert.equal(cadena.puntos[1][1], 22);
  assert.equal(cadena.puntos[2][1], 22);
  cadena.resolver();
  cadena.soltar();
  cadena.elevar(180);
  assert.ok(cadena.puntos.every(p => p[1] >= 190));
});

test('los bloques vecinos no se pliegan uno encima del otro', () => {
  const cadena = new Cadena([[0, 30, 0], [100, 30, 0], [200, 30, 0]]);
  cadena.puntos[2] = [0, 30, 0];
  cadena.resolver();
  assert.ok(Math.hypot(...cadena.puntos[2].map((v, i) => v - cadena.puntos[0][i])) >= 120);
});
