import test from 'node:test';
import assert from 'node:assert/strict';
import { Validador, CADUCADO } from '../src/modelo/validacion.mjs';

class MotorFalso {
  constructor(registro) { this.registro = registro; this.pendientes = []; this.terminado = false; registro.vivos.push(this); }
  postMessage(mensaje) { this.pendientes.push(mensaje); this.registro.enviados.push(mensaje); this.revision = mensaje.revision; }
  fallar() { this.onerror(new Error('el motor se cayó')); }
  terminate() { this.terminado = true; this.pendientes = []; this.registro.terminados++; }
  responder(resultado) {
    const mensaje = this.pendientes.shift();
    if (!mensaje || this.terminado) return false;
    this.onmessage({ data: { revision: mensaje.revision, resultado: { ...resultado, codigo: mensaje.codigo } } });
    return true;
  }
}

function banco(limiteMs = 10000) {
  const registro = { vivos: [], enviados: [], terminados: 0 };
  const publicados = [];
  const relojes = new Map();
  let siguiente = 1;
  const validador = new Validador({
    crearMotor: () => new MotorFalso(registro),
    alTerminar: resultado => publicados.push(resultado),
    limiteMs,
    temporizar: (fn, ms) => { const id = siguiente++; relojes.set(id, { fn, ms }); return id; },
    cancelar: id => relojes.delete(id),
  });
  return { validador, registro, publicados, relojes, motor: () => registro.vivos.at(-1) };
}

const ok = codigo => ({ valido: true, etapa: 'ok', programa: codigo });

test('una misma firma no vuelve a ocupar el motor', () => {
  const b = banco();
  assert.ok(b.validador.solicitar('f1', 'PUSH a 1'));
  assert.equal(b.validador.solicitar('f1', 'PUSH a 1'), 0);
  assert.equal(b.registro.enviados.length, 1);
});

test('un cambio abandona el trabajo anterior en vez de encolarse detrás', () => {
  const b = banco();
  b.validador.solicitar('f1', 'lento');
  const primero = b.motor();
  b.validador.solicitar('f2', 'nuevo');
  assert.equal(primero.terminado, true, 'el motor ocupado se termina');
  assert.notEqual(b.motor(), primero, 'la solicitud vigente usa un motor libre');
  assert.equal(b.motor().pendientes.length, 1);
  assert.equal(b.motor().pendientes[0].codigo, 'nuevo');
  assert.equal(b.registro.terminados, 1);
});

test('tras cambios sucesivos solo se publica el resultado del programa más reciente', () => {
  const b = banco();
  const codigos = ['p1', 'p2', 'p3', 'p4'];
  const abandonados = [];
  for (const codigo of codigos) {
    if (b.validador.pendiente) abandonados.push(b.motor());
    b.validador.solicitar(codigo, codigo);
  }
  assert.equal(abandonados.length, 3);
  assert.ok(abandonados.every(m => m.terminado), 'ninguno de los anteriores sigue ocupando el motor');
  assert.equal(b.motor().responder(ok('p4')), true);
  assert.deepEqual(b.publicados.map(r => r.codigo), ['p4']);
});

test('una respuesta atrasada de un motor abandonado no se publica', () => {
  const b = banco();
  b.validador.solicitar('f1', 'viejo');
  const viejo = b.motor();
  b.validador.solicitar('f2', 'nuevo');
  viejo.terminado = false;
  viejo.pendientes = [{ revision: 1, codigo: 'viejo' }];
  viejo.onmessage({ data: { revision: 1, resultado: ok('viejo') } });
  assert.deepEqual(b.publicados, []);
  b.motor().responder(ok('nuevo'));
  assert.deepEqual(b.publicados.map(r => r.codigo), ['nuevo']);
});

test('no se espera a que termine el trabajo abandonado para publicar el vigente', () => {
  const b = banco();
  b.validador.solicitar('f1', 'interminable');
  const colgado = b.motor();
  b.validador.solicitar('f2', 'rapido');
  b.motor().responder(ok('rapido'));
  assert.deepEqual(b.publicados.map(r => r.codigo), ['rapido']);
  assert.equal(colgado.pendientes.length, 0, 'el trabajo colgado se descartó, no se esperó');
});

test('invalidar libera el motor y descarta lo que estaba en vuelo', () => {
  const b = banco();
  b.validador.solicitar('f1', 'algo');
  const motor = b.motor();
  assert.equal(b.validador.invalidar(), true);
  assert.equal(motor.terminado, true);
  assert.equal(b.validador.pendiente, false);
  assert.deepEqual([...b.relojes.keys()], [], 'no queda temporizador vivo');
  motor.terminado = false;
  motor.pendientes = [{ revision: 1, codigo: 'algo' }];
  motor.onmessage({ data: { revision: 1, resultado: ok('algo') } });
  assert.deepEqual(b.publicados, []);
});

test('invalidar sin nada en vuelo no destruye un motor reutilizable', () => {
  const b = banco();
  b.validador.solicitar('f1', 'algo');
  b.motor().responder(ok('algo'));
  const motor = b.motor();
  b.validador.invalidar();
  assert.equal(motor.terminado, false, 'un motor libre se conserva para la siguiente consulta');
  assert.equal(b.registro.terminados, 0);
});

test('el motor se reutiliza mientras las consultas no se solapen', () => {
  const b = banco();
  for (const codigo of ['a', 'b', 'c']) {
    b.validador.solicitar(codigo, codigo);
    b.motor().responder(ok(codigo));
  }
  assert.equal(b.registro.vivos.length, 1, 'una sola creación de motor');
  assert.equal(b.registro.terminados, 0);
  assert.deepEqual(b.publicados.map(r => r.codigo), ['a', 'b', 'c']);
});

test('el tiempo de espera corta el trabajo y publica un fallo del sistema', () => {
  const b = banco(500);
  b.validador.solicitar('f1', 'eterno');
  const motor = b.motor();
  const [reloj] = [...b.relojes.values()];
  assert.equal(reloj.ms, 500);
  reloj.fn();
  assert.equal(motor.terminado, true);
  assert.equal(b.publicados.length, 1);
  assert.equal(b.publicados[0].etapa, CADUCADO.etapa);
  assert.equal(b.validador.pendiente, false);
});

test('cada solicitud lleva su revisión y crece de forma estricta', () => {
  const b = banco();
  const revisiones = ['p1', 'p2', 'p3'].map(c => b.validador.solicitar(c, c));
  assert.deepEqual(revisiones, [1, 2, 3]);
  assert.equal(b.validador.abandonados, 2);
});

test('el error tardío de un motor abandonado no toca la revisión vigente', () => {
  const b = banco();
  b.validador.solicitar('f1', 'p1');
  const abandonado = b.motor();
  b.validador.solicitar('f2', 'p2');
  const vigente = b.motor();
  assert.notEqual(vigente, abandonado);
  abandonado.fallar();
  assert.deepEqual(b.publicados, [], 'un motor abandonado no publica nada');
  assert.equal(b.validador.pendiente, true, 'la revisión vigente sigue esperando su respuesta');
  vigente.responder(ok('p2'));
  assert.deepEqual(b.publicados.map(r => r.codigo), ['p2'], 'la respuesta válida no se pierde');
  assert.deepEqual(b.publicados.map(r => r.etapa), ['ok']);
});

test('un mensaje tardío de un motor abandonado tampoco se publica', () => {
  const b = banco();
  b.validador.solicitar('f1', 'p1');
  const abandonado = b.motor();
  b.validador.solicitar('f2', 'p2');
  abandonado.terminado = false;
  abandonado.onmessage({ data: { revision: 1, resultado: ok('p1') } });
  abandonado.onmessage({ data: { revision: 2, resultado: ok('suplantado') } });
  assert.deepEqual(b.publicados, []);
  b.motor().responder(ok('p2'));
  assert.deepEqual(b.publicados.map(r => r.codigo), ['p2']);
});

test('el fallo del motor vigente sí se publica con su propia revisión', () => {
  const b = banco();
  const revision = b.validador.solicitar('f1', 'p1');
  b.motor().fallar();
  assert.equal(b.publicados.length, 1);
  assert.equal(b.publicados[0].etapa, 'motor');
  assert.equal(b.validador.pendiente, false);
  assert.equal(b.validador.solicitar('f2', 'p2'), revision + 1, 'se puede seguir pidiendo tras el fallo');
});

test('un motor cancelado por invalidar no publica su error posterior', () => {
  const b = banco();
  b.validador.solicitar('f1', 'p1');
  const motor = b.motor();
  b.validador.invalidar();
  motor.fallar();
  assert.deepEqual(b.publicados, []);
  assert.equal(b.validador.pendiente, false);
});

test('el vencimiento publica una sola vez y el motor cortado ya no interfiere', () => {
  const b = banco(500);
  b.validador.solicitar('f1', 'eterno');
  const motor = b.motor();
  [...b.relojes.values()][0].fn();
  assert.deepEqual(b.publicados.map(r => r.etapa), ['tiempo']);
  motor.fallar();
  assert.deepEqual(b.publicados.map(r => r.etapa), ['tiempo'], 'el motor cortado no añade un fallo');
  b.validador.solicitar('f2', 'otro');
  b.motor().responder(ok('otro'));
  assert.deepEqual(b.publicados.map(r => r.etapa), ['tiempo', 'ok']);
});

test('el motor reutilizado informa el fallo de la solicitud que estaba sirviendo', () => {
  const b = banco();
  b.validador.solicitar('f1', 'p1');
  b.motor().responder(ok('p1'));
  const revision = b.validador.solicitar('f2', 'p2');
  assert.equal(b.registro.vivos.length, 1);
  b.motor().fallar();
  assert.deepEqual(b.publicados.map(r => r.etapa), ['ok', 'motor']);
  assert.equal(b.validador.despacho.revision, revision);
});
