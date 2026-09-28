import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptEjecutar } from '../generado/interprete.js';
import { Ejecucion, veredicto, necesitaInterprete, resumenFinal } from '../src/modelo/ejecucion.mjs';
import { Montaje, lexemaParametro, parametroDesdeTexto, OPERACIONES } from '../src/modelo/montaje.mjs';
import { ordenarMontaje, pendientesConexiones } from '../src/modelo/conexiones.mjs';

const hechos = (extra = {}) => ({ bloques: 1, pendientes: [], incertidumbre: '', moviendo: false, ...extra });

function mesa(filas) {
  const m = new Montaje();
  for (const [token, ...operandos] of filas) {
    const b = m.agregarBloque(token, Math.max(OPERACIONES[token][0], operandos.length));
    operandos.forEach((texto, j) => m.acoplar(m.agregarParametro(parametroDesdeTexto(texto)).id, b.id, j));
  }
  ordenarMontaje(m);
  return m;
}
const texto = m => m.programa().map(i => [i.token, ...i.operandos].join(' ')).join('\n');
function correr(m) {
  const pendientes = [...m.pendientes(), ...pendientesConexiones(m)];
  const datos = hechos({ bloques: m.bloques.length, pendientes });
  if (!necesitaInterprete(datos)) return { v: veredicto(datos), r: null };
  const r = sculptEjecutar(texto(m) + '\n');
  return { v: veredicto({ ...datos, resultado: r }), r };
}

test('un montaje completo y correcto da un veredicto válido y seguible', () => {
  const { v, r } = correr(mesa([['PUSH', 'circle', '3'], ['PUSH', 'circle', '5'], ['ADD', 'circle']]));
  assert.equal(v.clase, 'valido');
  assert.equal(v.seguible, true);
  assert.equal(v.color, 'okc');
  assert.equal(r.etapa, 'ok');
  assert.equal(resumenFinal(r, new Map()), 'circle queda en [8]');
});

test('faltar una ficha deja el montaje incompleto y no llega al intérprete', () => {
  const m = mesa([['PUSH', 'a', '3']]);
  m.bloques[0].parametros[1] = null;
  const { v, r } = correr(m);
  assert.equal(v.clase, 'incompleto');
  assert.equal(v.seguible, false);
  assert.equal(r, null);
  assert.match(v.detalle, /falta el parámetro 2/);
});

test('faltar un conector deja el montaje incompleto aunque las fichas estén puestas', () => {
  const m = mesa([['POP', 'a'], ['POP', 'a']]);
  m.bloques[1].posicion = [500, 0, 0];
  const { v } = correr(m);
  assert.equal(v.clase, 'incompleto');
  assert.match(v.detalle, /Falta unir los bloques 1 y 2/);
});

test('el intérprete es quien declara inválido, no el montaje', () => {
  const m = mesa([['ADD', 'a']]);
  assert.deepEqual(m.pendientes(), []);
  const { v, r } = correr(m);
  assert.equal(r.valido, false);
  assert.equal(r.etapa, 'runtime');
  assert.equal(v.clase, 'fallo');
  assert.equal(v.titulo, 'Error de ejecución');
  assert.equal(v.detalle, r.mensaje);
  assert.equal(r.traza.length, 1);
  assert.equal(v.seguible, false, 'fallar en la primera instrucción no deja nada que recorrer');
});

test('solo se puede recorrer lo que trae traza de verdad', () => {
  const conPasos = veredicto(hechos({ resultado: sculptEjecutar('PUSH a nil\nADD a 2\n') }));
  assert.equal(conPasos.clase, 'fallo');
  assert.equal(conPasos.seguible, true);
  for (const etapa of ['motor', 'tiempo', 'worker']) {
    const v = veredicto(hechos({ resultado: { valido: false, etapa, mensaje: 'se cayó' } }));
    assert.equal(v.clase, 'sistema', etapa);
    assert.equal(v.titulo, 'No se pudo ejecutar');
    assert.equal(v.seguible, false);
  }
  const sintaxis = veredicto(hechos({ resultado: sculptEjecutar('PUSH a\n') }));
  assert.equal(sintaxis.seguible, false);
  assert.equal(sintaxis.clase, 'invalido');
});

test('un error de sintaxis se distingue de un error de ejecución', () => {
  const r = sculptEjecutar('PUSH a\n');
  const v = veredicto(hechos({ resultado: r }));
  assert.equal(v.clase, 'invalido');
  assert.equal(v.titulo, 'Programa inválido');
  assert.equal(v.seguible, false);
  assert.deepEqual(r.traza, undefined);
});

test('mover una ficha o dudar de la cámara suspende la ejecución anterior', () => {
  for (const extra of [{ moviendo: true }, { incertidumbre: 'Dos cámaras no coinciden.' }]) {
    const datos = hechos(extra);
    assert.equal(necesitaInterprete(datos), false);
    const v = veredicto({ ...datos, resultado: sculptEjecutar('PUSH a 1\n') });
    assert.equal(v.seguible, false);
    assert.notEqual(v.clase, 'valido');
  }
});

test('el veredicto nunca declara válido sin que lo diga Scala', () => {
  for (const r of [null, { valido: false, etapa: 'lexer' }, { valido: false, etapa: 'runtime' },
    { valido: true, etapa: 'limite' }, { valido: true, etapa: 'ok', pasos: [{}] }]) {
    const v = veredicto(hechos({ resultado: r }));
    assert.equal(v.clase === 'valido', r?.valido === true && r.etapa === 'ok');
  }
});

test('las etiquetas dibujadas viajan a Scala como identificadores válidos', () => {
  for (const dibujo of ['★', 'círculo', 'mi pila', 'add', '1a']) {
    const lexema = lexemaParametro(parametroDesdeTexto(dibujo));
    const r = sculptEjecutar(`PUSH ${lexema} 1\n`);
    assert.equal(r.valido, true, `${dibujo} -> ${lexema}`);
    assert.deepEqual(r.pasos.at(-1)[lexema], [1]);
  }
});

test('la tabla de aridad del montaje coincide con el analizador de Scala', () => {
  for (const [token, [min, max]] of Object.entries(OPERACIONES)) {
    for (const n of [1, 2]) {
      const r = sculptEjecutar(`PUSH a 1\nPUSH a 1\n${token} a${n === 2 ? ' 1' : ''}\n`);
      const rechazaScala = r.etapa === 'lexer' || r.etapa === 'parser';
      assert.equal(n >= min && n <= max, !rechazaScala, `${token} con ${n} operandos`);
    }
  }
});

test('la interfaz avisa cuando la comprobación es del puente y no del lenguaje', () => {
  const salto = veredicto(hechos({ resultado: sculptEjecutar('PUSH a 1\nJMP -100\n') }));
  assert.equal(salto.clase, 'fallo');
  assert.match(salto.detalle, /Lo comprueba el puente del simulador, no el intérprete\.$/);
  const propio = veredicto(hechos({ resultado: sculptEjecutar('PUSH a nil\nADD a 2\n') }));
  assert.equal(propio.clase, 'fallo');
  assert.doesNotMatch(propio.detalle, /puente/, 'un error del lenguaje no se atribuye al puente');
});

test('el resumen final omite las pilas que quedan vacías', () => {
  const r = sculptEjecutar('PUSH x 7\nPUSH y 4\nDUP x\nDUP y\nMOV t y\nMOV t x\nSUB t\n? t\nJMP 3\nMOV mayor y\nJMP 2\nMOV mayor x\n');
  const resumen = resumenFinal(r, new Map());
  assert.match(resumen, /mayor queda en \[7\]/);
  assert.doesNotMatch(resumen, /t queda en/);
  assert.equal(resumenFinal(sculptEjecutar('PUSH a 1\nPOP a\n'), new Map()), 'todas las pilas quedan vacías');
});

test('un salto fuera del programa nombra la instrucción que saltó', () => {
  const r = sculptEjecutar('PUSH a 1\nJMP -100\n');
  assert.equal(r.valido, false);
  assert.equal(r.etapa, 'runtime');
  assert.equal(r.error.instruccion, 1);
  assert.equal(r.mensaje, 'El salto sale del programa.');
  const e = new Ejecucion(); e.cargar(r); e.todo();
  assert.deepEqual(e.actual.pilas.a, [1]);
  assert.equal(veredicto(hechos({ resultado: r })).clase, 'fallo');
});
