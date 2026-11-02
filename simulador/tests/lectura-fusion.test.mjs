import test from 'node:test';
import assert from 'node:assert/strict';
import { puedeAplicarLectura, codigoLectura, esEstadoActual } from '../src/vision/lectura-fusion.mjs';

const lectura = {estable:true,compatible:true,instrucciones:[{token:'PUSH',operandos:['a','2']}]};

test('solo una lectura completa y estable puede reemplazar la mesa', () => {
  assert.equal(puedeAplicarLectura(lectura),true);
  for (const cambio of [{estable:false},{compatible:false},{instrucciones:[]}]) assert.equal(puedeAplicarLectura({...lectura,...cambio}),false);
  for (const operandos of [['a'],['a','<sin leer>'],['a','2','3']]) assert.equal(puedeAplicarLectura({...lectura,instrucciones:[{token:'PUSH',operandos}]}),false);
});

test('el código de validación no cambia con el ruido de las posiciones', () => {
  const movida = structuredClone(lectura);
  movida.instrucciones[0].posicion = [1,2,3];
  assert.equal(codigoLectura(lectura),codigoLectura(movida));
  assert.equal(codigoLectura(lectura),'PUSH a 2');
});


test('una respuesta atrasada no reactiva una lectura y un reinicio admite otra sesión', () => {
  const reciente = {sesion:'a',fusion:{revision:12,estable:false}};
  assert.equal(esEstadoActual({sesion:'a',fusion:{revision:11,estable:true}},reciente),false);
  assert.equal(esEstadoActual({sesion:'a',fusion:{revision:13,estable:true}},reciente),true);
  assert.equal(esEstadoActual({sesion:'b',fusion:{revision:1,estable:false}},reciente),true);
});
