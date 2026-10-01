import test from 'node:test';
import assert from 'node:assert/strict';
import { aTres, aPython, anguloATres, anguloAPython, baseDeCamara, centroDeCamara } from '../src/vision/coordenadas.mjs';
import { posicionPosterior } from '../src/modelo/conexiones.mjs';

const CASOS = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10], [-40, 25, 37], [115.5, -60.25, 23]];

test('la conversión entre Python y Three.js es reversible', () => {
  for (const punto of CASOS) {
    assert.deepEqual(aPython(aTres(punto)), punto, JSON.stringify(punto));
    assert.deepEqual(aTres(aPython(punto)), punto, JSON.stringify(punto));
  }
});

test('la altura de Python es la vertical de Three.js', () => {
  assert.deepEqual(aTres([0, 0, 37]), [0, 37, 0]);
  assert.deepEqual(aTres([0, 0, 0]), [0, 0, 0]);
  assert.equal(aTres([12, 34, 56])[1], 56);
});

test('el plano de la mesa de Python es el plano horizontal de Three.js', () => {
  for (const [x, y] of [[10, 0], [0, 10], [-25, 40]]) {
    const [tx, ty, tz] = aTres([x, y, 0]);
    assert.equal(ty, 0, 'una ficha apoyada en la mesa no puede tener altura');
    assert.equal(tx, x);
    assert.equal(tz + 0, -y + 0);
  }
});

test('la conversión conserva distancias', () => {
  const norma = p => Math.hypot(...p);
  for (const a of CASOS) {
    for (const b of CASOS) {
      const enPython = norma(a.map((v, i) => v - b[i]));
      const ta = aTres(a), tb = aTres(b);
      const enTres = norma(ta.map((v, i) => v - tb[i]));
      assert.ok(Math.abs(enPython - enTres) < 1e-9);
    }
  }
});

test('el avance de la cadena coincide con el que usa el simulador', () => {
  for (const grados of [0, 30, 45, -60]) {
    const angulo = grados * Math.PI / 180;
    const paso = 95;
    const avancePython = [Math.cos(angulo) * paso, Math.sin(angulo) * paso, 0];
    const [dx, , dz] = aTres(avancePython);
    const giro = anguloATres(angulo);
    assert.ok(Math.abs(dx - Math.cos(giro) * paso) < 1e-9);
    assert.ok(Math.abs(dz - Math.sin(giro) * paso) < 1e-9);
    assert.ok(Math.abs(anguloAPython(giro) - angulo) < 1e-12);
  }
});

test('el avance convertido apunta como posicionPosterior del montaje', () => {
  const bloque = { posicion: [0, 0, 0], angulo: 0, capacidad: 1 };
  const [px, , pz] = posicionPosterior(bloque);
  const avance = aTres([Math.cos(0) * Math.hypot(px, pz), 0, 0]);
  assert.ok(Math.abs(avance[0] - px) < 1e-9);
  assert.ok(Math.abs(avance[2] - pz) < 1e-9);
});

test('el centro de la cámara se recupera de la pose que usa la fusión', () => {
  const pose = { rot: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], tras: [0, 0, 600] };
  assert.deepEqual(centroDeCamara(pose), aTres([0, 0, 600]));
});

test('la base de la cámara es ortonormal y mira hacia donde apunta', () => {
  const pose = { rot: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], tras: [0, 0, 600] };
  const { derecha, arriba, frente } = baseDeCamara(pose);
  const punto = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  for (const eje of [derecha, arriba, frente]) assert.ok(Math.abs(Math.hypot(...eje) - 1) < 1e-9);
  assert.ok(Math.abs(punto(derecha, arriba)) < 1e-9);
  assert.ok(Math.abs(punto(derecha, frente)) < 1e-9);
  assert.ok(Math.abs(punto(arriba, frente)) < 1e-9);
  assert.deepEqual(frente, [0, -1, 0], 'una cámara cenital mira hacia abajo en Three.js');
  assert.deepEqual(derecha, [1, 0, 0]);
});
