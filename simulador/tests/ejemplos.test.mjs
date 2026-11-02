import test from 'node:test';
import assert from 'node:assert/strict';
import { EJEMPLOS, montajeEjemplo } from '../src/modelo/ejemplos.mjs';
import { sculptEjecutar } from '../generado/interprete.js';
import { pendientesConexiones } from '../src/modelo/conexiones.mjs';

for (const ejemplo of EJEMPLOS) test(ejemplo.nombre, () => {
  const montaje = montajeEjemplo(ejemplo);
  assert.deepEqual(montaje.pendientes(), []);
  assert.deepEqual(pendientesConexiones(montaje), []);
  const codigo = montaje.programa().map(i => [i.token, ...i.operandos].join(' ')).join('\n');
  const resultado = sculptEjecutar(codigo + '\n');
  assert.equal(resultado.valido, !ejemplo.error);
  assert.deepEqual(resultado.traza.at(-1).pilas, ejemplo.esperado);
  assert.ok(resultado.traza.length > 1);
});
