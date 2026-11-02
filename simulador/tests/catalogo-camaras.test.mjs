import test from 'node:test';
import assert from 'node:assert/strict';
import { centroDesdePose, catalogoCamaras } from '../src/vision/catalogo-camaras.mjs';

test('sin cámaras muestra un montaje previsto y no dispositivos conectados', () => {
  const catalogo = catalogoCamaras();
  assert.equal(catalogo.length, 3);
  assert.ok(catalogo.every(c => c.prevista));
  assert.ok(catalogo.some(c => c.nombre.includes('cenital')));
});

test('la posición real proviene de la pose respecto al tablero', () => {
  const pose = { rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], tras: [-50, -25, -400], tablero: [9, 6], mm: 25 };
  assert.deepEqual(centroDesdePose(pose), [50, 25, 400]);
  const ficha = catalogoCamaras([{ id: 'a', nombre: 'A', rol: 'simbolos', pose }])[0];
  assert.equal(ficha.prevista, false);
  assert.deepEqual(ficha.plano, [150, 74.8]);
  assert.match(ficha.ubicacion, /z 400 mm/);
  const sinCalibrar = catalogoCamaras([{ id: 'b', nombre: 'B', rol: 'simbolos' }])[0];
  assert.equal(sinCalibrar.plano, null);
  assert.match(sinCalibrar.ubicacion, /sin registrar/);
});
