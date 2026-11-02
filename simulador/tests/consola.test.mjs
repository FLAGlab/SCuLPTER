import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptEjecutar } from '../generado/interprete.js';
import { Consola, lineaPeticion, lineasDeResultado, lineaDeNavegacion, lineaDeVeredicto, ORIGENES } from '../src/modelo/consola.mjs';
import { Ejecucion, veredicto } from '../src/modelo/ejecucion.mjs';

const programa = codigo => codigo.trim().split('\n').map(l => {
  const [token, ...operandos] = l.split(' ');
  return { token, operandos };
});

test('la consola descarta repeticiones seguidas y respeta su tamaño', () => {
  const c = new Consola(3);
  assert.equal(c.escribir({ origen: 'mesa', texto: 'a' }), true);
  assert.equal(c.escribir({ origen: 'mesa', texto: 'a' }), false);
  assert.equal(c.escribir({ origen: 'scala', texto: 'a' }), true);
  c.escribir({ origen: 'mesa', texto: 'b' });
  c.escribir({ origen: 'mesa', texto: 'c' });
  assert.deepEqual(c.lineas.map(l => l.texto), ['a', 'b', 'c']);
  c.limpiar();
  assert.deepEqual(c.lineas, []);
});

test('el contador de escrituras sigue creciendo al llenarse el historial', () => {
  const c = new Consola(5);
  for (let i = 0; i < 40; i++) c.escribir({ origen: 'mesa', texto: `l${i}` });
  assert.equal(c.lineas.length, 5);
  assert.equal(c.escritas, 40);
  const antes = c.escritas;
  c.escribir({ origen: 'mesa', texto: 'nueva' });
  assert.equal(c.lineas.length, 5, 'la longitud se estanca en el máximo');
  assert.notEqual(c.escritas, antes, 'el repintado debe guiarse por las escrituras, no por la longitud');
  assert.deepEqual(c.desde(antes).map(l => l.texto), ['nueva']);
});

test('desde entrega solo lo nuevo y nunca más de lo que conserva', () => {
  const c = new Consola(3);
  for (const t of ['a', 'b']) c.escribir({ origen: 'mesa', texto: t });
  assert.deepEqual(c.desde(0).map(l => l.texto), ['a', 'b']);
  assert.deepEqual(c.desde(c.escritas), []);
  for (const t of ['c', 'd', 'e']) c.escribir({ origen: 'mesa', texto: t });
  assert.deepEqual(c.desde(0).map(l => l.texto), ['c', 'd', 'e']);
  assert.deepEqual(c.desde(4).map(l => l.texto), ['e']);
});

test('cada respuesta de Scala se registra con su etapa real', () => {
  const casos = [
    ['PUSH a 3\nPUSH a 5\nADD a\n', 'scala', 'okc', /^valido etapa=ok pasos=3$/],
    ['PUSH a\n', 'scala', 'errc', /^invalido etapa=parser · /],
    ['PUSH ★ 1\n', 'scala', 'errc', /^invalido etapa=lexer · /],
    ['PUSH a nil\nADD a 2\n', 'scala', 'errc', /^invalido etapa=runtime instruccion=2 pasos=1 · /],
  ];
  for (const [codigo, origen, tono, patron] of casos) {
    const [linea, ...resto] = lineasDeResultado(sculptEjecutar(codigo));
    assert.deepEqual(resto, []);
    assert.equal(linea.origen, origen);
    assert.equal(linea.tono, tono);
    assert.match(linea.texto, patron, codigo);
  }
});

test('lo que decide el puente no se atribuye al lenguaje', () => {
  const salto = sculptEjecutar('PUSH a 1\nJMP -100\n');
  assert.equal(salto.decide, 'lenguaje', 'el índice negativo lo rechaza Interpreter.scala');
  assert.equal(salto.error.decide, 'lenguaje');
  assert.equal(lineasDeResultado(salto)[0].origen, 'scala');
  const limite = sculptEjecutar('JMP 0\n', 25);
  assert.equal(limite.decide, 'puente');
  assert.equal(lineasDeResultado(limite)[0].origen, 'puente');
  assert.match(lineasDeResultado(limite)[0].texto, /^valido etapa=limite pasos=25 · /);
  const propio = sculptEjecutar('PUSH a nil\nADD a 2\n');
  assert.equal(propio.decide, 'lenguaje');
  assert.equal(propio.error.decide, 'lenguaje');
  assert.equal(lineasDeResultado(propio)[0].origen, 'scala');
  assert.equal(sculptEjecutar('PUSH a 1\n').decide, 'lenguaje');
});

test('un fallo del navegador o del tiempo de espera es del sistema, no de Scala', () => {
  for (const etapa of ['motor', 'tiempo']) {
    const [linea] = lineasDeResultado({ valido: false, etapa, mensaje: 'no se pudo' });
    assert.equal(linea.origen, 'sistema');
    assert.equal(linea.tono, 'errc');
    assert.match(linea.texto, new RegExp(`^fallo etapa=${etapa} · `));
  }
});

test('la línea de petición cuenta las instrucciones que se envían', () => {
  assert.deepEqual(lineaPeticion('PUSH a 3\nADD a 1', 2000),
    { origen: 'mesa', texto: 'sculptEjecutar · 2 instrucciones · límite 2000' });
});

test('recorrer la traza se registra como navegación, no como respuesta de Scala', () => {
  const codigo = 'PUSH a 3\nPUSH a 5\nADD a\n';
  const e = new Ejecucion(); e.cargar(sculptEjecutar(codigo));
  const p = programa(codigo);
  assert.deepEqual(lineaDeNavegacion(e.actual, p, 'reiniciar'),
    { origen: 'traza', texto: 'reiniciar · paso 0 · sin instrucciones ejecutadas' });
  assert.deepEqual(lineaDeNavegacion(e.siguiente(), p, 'siguiente'),
    { origen: 'traza', texto: 'siguiente · paso 1 · 1 PUSH a 3 · a=[3]' });
  e.todo();
  assert.deepEqual(lineaDeNavegacion(e.actual, p, 'ejecutar todo'),
    { origen: 'traza', texto: 'ejecutar todo · paso 3 · 3 ADD a · a=[8]' });
  assert.equal(lineaDeNavegacion(null, p, 'atrás'), null);
});

test('un paso que omite una instrucción lo dice', () => {
  const codigo = 'PUSH a -1\n? a\nPUSH b 99\nPUSH c 7\n';
  const e = new Ejecucion(); e.cargar(sculptEjecutar(codigo));
  e.ir(2);
  assert.match(lineaDeNavegacion(e.actual, programa(codigo), 'siguiente').texto,
    /^siguiente · paso 2 · 2 \? a · omite 3 · a=\[\]$/);
});

test('el motivo de no ejecutar se registra como propio de la mesa', () => {
  const incompleto = veredicto({ bloques: 1, pendientes: ['Bloque 1: falta el parámetro 2.'] });
  assert.deepEqual(lineaDeVeredicto(incompleto),
    { origen: 'mesa', tono: 'errc', texto: 'montaje incompleto · Bloque 1: falta el parámetro 2.' });
  assert.equal(lineaDeVeredicto(veredicto({ bloques: 1, moviendo: true })).origen, 'mesa');
  assert.equal(lineaDeVeredicto(veredicto({ bloques: 1, resultado: sculptEjecutar('PUSH a 1\n') })), null);
  assert.equal(lineaDeVeredicto(veredicto({ bloques: 1, validando: true })), null, 'validando es transitorio, no se registra');
});

test('todo origen registrado pertenece al vocabulario declarado', () => {
  const c = new Consola();
  c.escribir(lineaPeticion('PUSH a 1', 2000));
  c.escribir(lineaDeVeredicto(veredicto({ bloques: 1, pendientes: ['falta algo'] })));
  c.todas(lineasDeResultado(sculptEjecutar('PUSH a 1\n')));
  c.todas(lineasDeResultado(sculptEjecutar('JMP 0\n', 25)));
  c.todas(lineasDeResultado({ valido: false, etapa: 'tiempo', mensaje: 'lento' }));
  const e = new Ejecucion(); e.cargar(sculptEjecutar('PUSH a 1\n'));
  c.escribir(lineaDeNavegacion(e.siguiente(), programa('PUSH a 1'), 'siguiente'));
  assert.deepEqual(c.lineas.map(l => l.origen), ['mesa', 'mesa', 'scala', 'puente', 'sistema', 'traza']);
  for (const linea of c.lineas) assert.ok(ORIGENES.includes(linea.origen), linea.origen);
});
