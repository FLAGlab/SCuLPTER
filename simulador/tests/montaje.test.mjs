import test from 'node:test';
import assert from 'node:assert/strict';
import {Montaje, lexemaParametro, parametroDesdeTexto, SIN_LEER} from '../src/modelo/montaje.mjs';
import {sculptEjecutar} from '../generado/interprete.js';
const etiqueta = texto => ({tipo:'etiqueta',texto,trazos:[]});
test('un parámetro suelto no se ejecuta; retirar y volver a encajar conserva su identidad', () => {
  const m=new Montaje(), b=m.agregarBloque('PUSH'), a=m.agregarParametro(etiqueta('★')), n=m.agregarParametro(parametroDesdeTexto('2'));
  assert.equal(m.pendientes().length,2);
  m.acoplar(a.id,b.id,0); m.acoplar(n.id,b.id,1);
  assert.equal(m.pendientes().length,0);
  const codigo=m.programa().map(i=>[i.token,...i.operandos].join(' ')).join('\n');
  const r=sculptEjecutar(codigo+'\n'); assert.equal(r.valido,true);
  assert.deepEqual(r.pasos[0][lexemaParametro(a.contenido)],[2]);
  m.desacoplar(a.id,[100,1.5,0]); assert.equal(m.programa()[0].operandos[0],SIN_LEER);
  m.acoplar(a.id,b.id,0); assert.equal(m.pendientes().length,0);
});
test('un encaje ocupado o de otro tipo no pierde sus fichas',()=>{
  const m=new Montaje(), b=m.agregarBloque('PUSH'), a=m.agregarParametro(etiqueta('a')), c=m.agregarParametro(etiqueta('b'));
  m.acoplar(a.id,b.id,0); m.acoplar(c.id,b.id,1);
  assert.equal(m.acoplar(c.id,b.id,0),false); assert.equal(b.parametros[1],c.id);
  assert.equal(m.acoplar(c.id,b.id,-1),false); assert.ok(b.operacion);
});
test('trasladar un parámetro deja incompleto el bloque anterior',()=>{
  const m=new Montaje(), b=m.agregarBloque('POP'), c=m.agregarBloque('POP'), p=m.agregarParametro(etiqueta('a'));
  m.acoplar(p.id,b.id,0); m.acoplar(p.id,c.id,0);
  assert.equal(b.parametros[0],null); assert.equal(c.parametros[0],p.id); assert.equal(m.pendientes().length,1);
});
test('operación incompatible no cabe en bloque de un parámetro',()=>{
  const m=new Montaje(), b=m.agregarBloque('PUSH'), c=m.agregarBloque('POP');
  const id=b.operacion; m.desacoplar(c.operacion);
  assert.equal(m.acoplar(id,c.id,-1),false); assert.equal(b.operacion,id);
});
test('etiquetas libres, reservadas y prefijos no colisionan ni inyectan instrucciones',()=>{
  const nombres=['a','★','círculo','PUSH','nil','dos palabras','a\nPUSH b 8','sculpt_label_2605','2'];
  const ids=nombres.map(s=>lexemaParametro(etiqueta(s)));
  assert.equal(new Set(ids).size,nombres.length);
  for(const id of ids) assert.match(id,/^[A-Za-z_][A-Za-z0-9_]*$/);
  assert.equal(lexemaParametro(etiqueta('círculo')),lexemaParametro(etiqueta('ci\u0301rculo')));
});
test('un dibujo y su etiqueta comparten la pila por su nombre',()=>{
  const m=new Montaje(), b=m.agregarBloque('PUSH'), c=m.agregarBloque('DUP');
  const p=m.agregarParametro({...etiqueta('mi estrella'),trazos:[[[0,0],[1,1]]]}), n=m.agregarParametro(parametroDesdeTexto('4')), q=m.agregarParametro(etiqueta('mi estrella'));
  m.acoplar(p.id,b.id,0);m.acoplar(n.id,b.id,1);m.acoplar(q.id,c.id,0);
  const r=sculptEjecutar(m.programa().map(i=>[i.token,...i.operandos].join(' ')).join('\n')+'\n');
  assert.equal(r.valido,true);assert.deepEqual(r.pasos[1][lexemaParametro(p.contenido)],[4,4]);
});
