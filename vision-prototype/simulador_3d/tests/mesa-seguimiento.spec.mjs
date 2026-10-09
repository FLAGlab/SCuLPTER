import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const CAPTURAS = process.env.CAPTURAS ?? '../capturas/';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.stl': 'model/stl', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

function servir() {
  const servidor = createServer(async (pet, res) => {
    const ruta = join(raiz, normalize(decodeURIComponent(new URL(pet.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try {
      const cuerpo = await readFile(ruta.endsWith('/') ? join(ruta, 'index.html') : ruta);
      res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(cuerpo);
    } catch { res.writeHead(404).end('no'); }
  });
  return new Promise(ok => servidor.listen(0, '127.0.0.1', () => ok(servidor)));
}

const leer = pagina => pagina.evaluate(() => ({
  titulo: document.querySelector('#resultado .t1')?.textContent ?? '',
  detalle: document.querySelector('#resultado .t2')?.textContent ?? '',
  color: document.querySelector('#resultado .marca')?.className ?? '',
  instruccion: document.getElementById('mesa-instruccion').textContent.trim(),
  estado: document.getElementById('mesa-estado').textContent.trim(),
  pilas: [...document.querySelectorAll('#mesa-pilas .pila-linea')].map(l => l.textContent.trim()),
  contador: document.getElementById('mesa-contador').textContent.trim(),
  abrirActivo: !document.getElementById('mesa-ver-ejecucion').disabled,
  marcada: [...document.querySelectorAll('#lista-programa .layer.next .num')].map(n => n.textContent),
  seccionVisible: !document.getElementById('sec-seguimiento').closest('.sec').hidden,
  consola: [...document.querySelectorAll('#consola-lineas .consola-linea')].map(l => [...l.children].map(c => c.textContent).join(' ')),
}));

async function abrir(pagina, base, nombre) {
  await pagina.goto(base, { waitUntil: 'load' });
  await pagina.waitForSelector('#lista-programa', { state: 'attached' });
  await pagina.click('#pagina-ejemplos');
  await pagina.click(`[data-elegir-ejemplo="${nombre}"]`);
  await pagina.click('#ejemplo-mesa');
  await pagina.waitForFunction(() => !document.getElementById('resultado').textContent.includes('Validando'));
}

test('la mesa sigue la ejecución y distingue válido, incompleto e inválido', async t => {
  const servidor = await servir();
  const base = `http://127.0.0.1:${servidor.address().port}/index.html`;
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  const fallos = [];
  pagina.on('pageerror', e => fallos.push(e.message));
  t.after(async () => { await navegador.close(); servidor.close(); });

  await abrir(pagina, base, 0);
  let v = await leer(pagina);
  assert.equal(v.titulo, 'Programa válido');
  assert.equal(v.color, 'marca okc');
  assert.match(v.detalle, /a queda en \[8\]/);
  assert.equal(v.seccionVisible, true);
  assert.equal(v.contador, 'paso 0 de 3');
  assert.deepEqual(v.marcada, ['1']);
  assert.equal(v.abrirActivo, true);
  assert.match(v.estado, /^Sin recorrer\./);
  assert.equal(await pagina.locator('#mesa-siguiente').count(), 0, 'Mesa ya no repite los controles de Ejecución');
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-valido.png', import.meta.url).pathname });

  await pagina.click('#mesa-ver-ejecucion');
  assert.equal(await pagina.evaluate(() => document.body.classList.contains('modo-ejecucion')), true);
  await pagina.click('#ej-siguiente');
  await pagina.click('#ej-siguiente');
  let e = await pagina.evaluate(() => ({
    contador: document.getElementById('ej-contador').textContent,
    marcada: [...document.querySelectorAll('#lista-programa .layer.next .num')].map(n => n.textContent),
    torres: [...document.querySelectorAll('#torres .torre')].map(t => t.textContent.trim()),
    filas: document.querySelectorAll('#ej-traza tbody tr').length,
  }));
  assert.equal(e.contador, 'Paso 2 de 3');
  assert.deepEqual(e.marcada, ['3']);
  assert.equal(e.filas, 2, 'la traza no adelanta pasos sin recorrer');

  await pagina.click('#pagina-mesa');
  v = await leer(pagina);
  assert.equal(v.contador, 'paso 2 de 3', 'el cursor es el mismo en las dos páginas');
  assert.deepEqual(v.marcada, ['3']);
  assert.deepEqual(v.pilas, ['a[3, 5]']);
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-recorrida.png', import.meta.url).pathname });

  await pagina.evaluate(() => [...document.querySelectorAll('#lista-programa .layer')][0].click());
  await pagina.click('#seleccion .acciones-ficha button:text("Eliminar ficha")');
  v = await leer(pagina);
  assert.equal(v.titulo, 'Montaje incompleto');
  assert.equal(v.color, 'marca errc');
  assert.match(v.detalle, /falta/i);
  assert.equal(v.instruccion, 'Sin ejecución');
  assert.equal(v.estado, '', 'el motivo lo da Intérprete, no se repite aquí');
  assert.deepEqual(v.pilas, []);
  assert.equal(v.contador, '');
  assert.equal(v.abrirActivo, false);
  assert.deepEqual(v.marcada, [], 'no debe quedar marcada la instrucción de la ejecución anterior');
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-incompleto.png', import.meta.url).pathname });

  await abrir(pagina, base, 0);
  await pagina.click('#mesa-ver-ejecucion');
  await pagina.click('#ej-todo');
  await pagina.click('#pagina-mesa');
  assert.equal((await leer(pagina)).contador, 'paso 3 de 3');
  const origen = await pagina.locator('.pieza-paleta[data-token="POP"]').boundingBox();
  await pagina.mouse.move(origen.x + origen.width / 2, origen.y + origen.height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(720, 420, { steps: 8 });
  v = await leer(pagina);
  assert.equal(v.titulo, 'En construcción', 'arrastrar debe suspender la ejecución mostrada');
  assert.equal(v.instruccion, 'Sin ejecución');
  assert.equal(v.contador, '');
  assert.deepEqual(v.pilas, []);
  assert.deepEqual(v.marcada, []);
  await pagina.keyboard.press('Escape');
  await pagina.mouse.up();
  await pagina.waitForFunction(() => !document.getElementById('resultado').textContent.includes('Validando'));
  v = await leer(pagina);
  assert.equal(v.titulo, 'Programa válido', 'cancelar el arrastre debe devolver el veredicto');
  assert.equal(v.contador, 'paso 0 de 3', 'la ejecución se reinicia, no se reanuda donde estaba');

  await abrir(pagina, base, 7);
  v = await leer(pagina);
  assert.equal(v.titulo, 'Error de ejecución');
  assert.equal(v.color, 'marca errc');
  assert.match(v.detalle, /nil/);
  assert.equal(v.abrirActivo, true);
  await pagina.click('#mesa-ver-ejecucion');
  await pagina.click('#ej-todo');
  await pagina.click('#pagina-mesa');
  v = await leer(pagina);
  assert.match(v.estado, /^Error en la instrucción 2:/);
  assert.deepEqual(v.pilas, ['a[#]']);
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-invalido.png', import.meta.url).pathname });

  await abrir(pagina, base, 10);
  v = await leer(pagina);
  assert.equal(v.titulo, 'Programa válido');
  assert.match(v.detalle, /fib queda en \[0, 1, 1, 2, 3, 5\]/);
  assert.equal(v.contador, 'paso 0 de 74');
  const dibujos = await pagina.evaluate(() =>
    [...document.querySelectorAll('#lista-programa .layer .simbolo svg')].length);
  assert.ok(dibujos > 0, 'las fichas del ejemplo llevan dibujo');
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-fibonacci.png', import.meta.url).pathname });

  await abrir(pagina, base, 0);
  await pagina.click('#ver-consola');
  await pagina.click('#mesa-ver-ejecucion');
  await pagina.click('#ej-siguiente');
  await pagina.click('#ej-todo');
  await pagina.click('#pagina-mesa');
  v = await leer(pagina);
  assert.deepEqual(v.consola, [
    'mesa sin instrucciones · Añade instrucciones a la mesa.',
    'mesa sculptEjecutar · 3 instrucciones · límite 2000',
    'scala valido etapa=ok pasos=3',
    'traza siguiente · paso 1 · 1 PUSH a 3 · a=[3]',
    'traza ejecutar todo · paso 3 · 3 ADD a · a=[8]',
  ]);
  await pagina.screenshot({ path: new URL(CAPTURAS + 'mesa-consola.png', import.meta.url).pathname });
  await pagina.click('#limpiar-consola');
  assert.deepEqual((await leer(pagina)).consola, []);

  await abrir(pagina, base, 0);
  await pagina.click('#ver-consola');
  await pagina.click('#limpiar-consola');
  await pagina.evaluate(() => [...document.querySelectorAll('#lista-programa .layer')][0].click());
  const bajar = pagina.locator('#seleccion .sec-head .tools button').nth(1);
  const subir = pagina.locator('#seleccion .sec-head .tools button').nth(0);
  for (let i = 0; i < 4; i++) { await bajar.click({ noWaitAfter: true }); await subir.click({ noWaitAfter: true }); }
  await pagina.waitForFunction(() => !document.getElementById('resultado').textContent.includes('Validando'));
  const tras = await leer(pagina);
  const codigo = await pagina.evaluate(() => document.getElementById('codigo-generado').textContent);
  const peticiones = tras.consola.filter(l => l.includes('sculptEjecutar'));
  const respuestas = tras.consola.filter(l => /^(scala|puente|sistema) /.test(l));
  assert.ok(peticiones.length >= 2, `hubo varios cambios seguidos: ${peticiones.length}`);
  assert.ok(respuestas.length <= peticiones.length, 'no se publica más de lo que se pidió');
  assert.equal(peticiones.at(-1), `mesa sculptEjecutar · ${codigo.split('\n').filter(l => l.trim()).length} instrucciones · límite 2000`,
    'la última petición corresponde al programa más reciente');
  assert.equal(tras.titulo, 'Programa válido');
  const r = await pagina.evaluate(async c => {
    const { sculptEjecutar } = await import('../generado/interprete.js');
    return sculptEjecutar(c + '\n').pasos.length;
  }, codigo);
  assert.equal(respuestas.at(-1), `scala valido etapa=ok pasos=${r}`, 'lo publicado corresponde al programa que está en la mesa');

  assert.deepEqual(fallos, []);
});

test('el editor convierte texto válido en bloques y conserva la mesa ante errores', async t => {
  const servidor = await servir();
  const base = `http://127.0.0.1:${servidor.address().port}/index.html`;
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  const fallos = [];
  pagina.on('pageerror', e => fallos.push(e.message));
  t.after(async () => { await navegador.close(); servidor.close(); });

  await pagina.goto(base, { waitUntil: 'load' });
  await pagina.locator('#editor-codigo-texto').fill('// inicio\n\nPUSH a 3\n');
  await pagina.click('#editor-lex');
  await pagina.waitForFunction(() => document.getElementById('editor-lexemas').textContent.includes('PUSH "PUSH"'));
  await pagina.click('#editor-parse');
  await pagina.waitForFunction(() => document.getElementById('editor-arbol').textContent.includes('BinaryStatement: PUSH'));
  await pagina.click('#editor-construir');
  await pagina.waitForFunction(() => document.querySelector('#resultado .t1')?.textContent === 'Programa válido');
  assert.equal(await pagina.locator('#codigo-generado').textContent(), 'PUSH a 3');
  assert.equal(await pagina.locator('#lista-programa .layer').count(), 1);
  await pagina.screenshot({ path: new URL(CAPTURAS + 'editor-codigo.png', import.meta.url).pathname });
  await pagina.click('#editor-siguiente');
  assert.deepEqual((await leer(pagina)).pilas, ['a[3]']);
  await pagina.click('#editor-atras');
  assert.deepEqual((await leer(pagina)).pilas, []);

  await pagina.locator('#editor-codigo-texto').fill('PUSH a');
  await pagina.click('#editor-construir');
  await pagina.waitForFunction(() => document.getElementById('editor-codigo-estado').textContent.includes('Revisa'));
  assert.equal(await pagina.locator('#codigo-generado').textContent(), 'PUSH a 3');
  await pagina.locator('#editor-codigo-texto').fill('POP a');
  await pagina.click('#editor-construir');
  await pagina.waitForFunction(() => document.getElementById('editor-codigo-estado').textContent.includes('debe comenzar'));
  assert.equal(await pagina.locator('#codigo-generado').textContent(), 'PUSH a 3');

  await pagina.click('#editor-desde-mesa');
  assert.equal(await pagina.locator('#editor-codigo-texto').inputValue(), 'PUSH a 3');
  await pagina.click('#editor-limpiar');
  assert.equal(await pagina.locator('#editor-codigo-texto').inputValue(), '');
  assert.equal(await pagina.locator('#codigo-generado').textContent(), 'PUSH a 3');

  await pagina.locator('#editor-codigo-texto').fill('PUSH a 1\nJMP 2\nPUSH a 99\nPUSH a 2');
  await pagina.click('#editor-construir');
  await pagina.waitForFunction(() => document.querySelector('#resultado .t1')?.textContent === 'Programa válido'
    && document.getElementById('codigo-generado').textContent.includes('JMP 2'));
  assert.equal(await pagina.locator('#lista-programa .layer').count(), 4);
  await pagina.click('#editor-todo');
  assert.deepEqual((await leer(pagina)).pilas, ['a[1, 2]']);
  assert.deepEqual(fallos, []);
});
