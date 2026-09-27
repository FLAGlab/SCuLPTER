import test from 'node:test';
import assert from 'node:assert/strict';
import { CaidaVertical, conjuntosRigidos } from './gravedad.mjs';
import { EJEMPLOS, montajeEjemplo } from './ejemplos.mjs';
import { conexionesValidas } from './conexiones.mjs';

test('la caída toca el suelo, reposa y no atraviesa la mesa', () => {
  const caida = new CaidaVertical();
  for (let i = 0; i < 600; i++) { caida.avanzar(1 / 60); assert.ok(caida.altura >= 0); }
  assert.equal(caida.altura, 0); assert.equal(caida.reposo, true);
});
test('los montajes curvos conservan su programa y sus uniones articuladas', () => {
  for (const e of EJEMPLOS.filter(e => e.giros)) {
    const m = montajeEjemplo(e), programa = JSON.stringify(m.programa());
    assert.ok(new Set(m.bloques.map(b => b.angulo)).size > 1);
    assert.equal(conexionesValidas(m).length, m.bloques.length - 1);
    assert.equal(new Set(conjuntosRigidos(m, conexionesValidas(m)).values()).size, 1);
    assert.equal(JSON.stringify(m.programa()), programa);
    m.bloques[1].posicion[2] += 10;
    assert.ok(conexionesValidas(m).length < m.bloques.length - 1);
  }
});
test('un bloque separado forma otro cuerpo rígido', () => {
  const m = montajeEjemplo(EJEMPLOS[0]);
  m.conexiones.pop();
  assert.equal(new Set(conjuntosRigidos(m, conexionesValidas(m)).values()).size, 2);
});
