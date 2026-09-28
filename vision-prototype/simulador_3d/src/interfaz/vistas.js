import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OPERACIONES } from '../modelo/montaje.mjs';
import { crearFichaOperando } from '../escena/piezas.js';
import { EJEMPLOS, montajeEjemplo } from '../modelo/ejemplos.mjs';
import { puedeAplicarLectura, codigoLectura, esEstadoActual } from '../vision/lectura-fusion.mjs';
import { catalogoCamaras } from '../vision/catalogo-camaras.mjs';

const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const MODELOS = [
  ['bloque_1_param', 'Bloque de un parámetro', 'Base para operaciones de una ranura.'],
  ['bloque_2_param', 'Bloque de dos parámetros', 'Base para PUSH, MOV y operaciones con dos operandos.'],
  ['parametro', 'Fichas de operaciones', 'Lámina original completa de operaciones. En la mesa se separa cada ficha.'],
  ['ficha_parametro', 'Ficha de parámetro', 'Representación editable de etiqueta, dibujo, número o nil. No hay un STL individual para este modelo.'],
  ['conector', 'Conectores', 'Archivo original con sus componentes de unión.'],
  ['cuna', 'Cuña', 'Soporte para el montaje físico.'],
  ['tuerca', 'Tuerca', 'Fijación del montaje.'],
];

export function crearVistas({ navegar, cargarEjemplo, restaurar, inventario, recibir, verGravedad, incertidumbre }) {
  const base = location.port === '8000' ? 'http://127.0.0.1:8766' : location.origin;
  let solicitudEstado = 0;
  let estado = null, pagina = 'mesa', firmaCamaras = '', ultimaLectura = '', timer, ocupado = false;
  let visor = null, generacion = 0;
  const raiz = $('vistas');
  let simbolosDatos = [], simboloElegido = null, ejemploElegido = 0;
  const listaLateral = document.createElement('div'); listaLateral.id = 'vistas-lista'; listaLateral.hidden = true; $('paleta').append(listaLateral);
  const propiedad = (nombre, control) => `<label class="prop"><span class="lbl">${nombre}</span>${control}</label>`;
  const seccion = (titulo, contenido) => `<div class="sec"><div class="sec-head">${titulo}</div>${contenido}</div>`;
  raiz.innerHTML = `
    <div id="vistas-lienzo">
      <section data-vista="ejemplos" hidden><div class="frame-label" id="ejemplo-nombre"></div><div class="frame" id="ejemplo-plano"></div><div class="frame-label">Texto SCuLPT</div><pre class="frame code" id="ejemplo-codigo"></pre></section>
      <section data-vista="camaras" hidden><div id="mapa-camaras"></div><p id="camaras-vacio" class="canvas-note">Montaje de referencia. Añade tus cámaras desde el panel derecho para registrar sus posiciones y ver las imágenes reales.</p><div id="camaras-lista"></div></section>
      <section data-vista="calibracion" hidden><div class="frame-label">Captura actual</div><div class="frame captura-frame"><img id="cal-imagen" alt="Vista de la cámara seleccionada" hidden><p id="cal-vacio" class="nota">Conecta una cámara y selecciona su vista.</p></div><div id="cal-grafica" hidden></div></section>
      <section data-vista="simbolos" hidden><div id="simbolos-lista"></div></section>
      <section data-vista="piezas" hidden><div class="frame-label">Piezas que computan</div><div class="frame pieces">${MODELOS.slice(0,4).map(([archivo, nombre]) => `<button class="pcard" data-modelo="${archivo}"><div class="pimg"><img hidden data-miniatura="${archivo}" alt="${nombre}"></div><div class="pname">${nombre}</div></button>`).join('')}</div><div class="frame-label">Piezas de estructura</div><div class="frame pieces">${MODELOS.slice(4).map(([archivo, nombre]) => `<button class="pcard" data-modelo="${archivo}"><div class="pimg"><img hidden data-miniatura="${archivo}" alt="${nombre}"></div><div class="pname">${nombre}</div></button>`).join('')}</div><p class="canvas-note">Las piezas de estructura sostienen la escultura. No cambian el programa.</p><div class="frame-label" id="modelo-titulo"></div><div class="frame" id="modelo-visor" aria-label="Vista 3D de la pieza"></div></section>
    </div>
    <aside id="vistas-propiedades" class="panel">
      <div id="vista-mensaje" role="status" hidden></div>
      <div data-prop="ejemplos" hidden>${seccion('Ejemplo', '<div id="ejemplo-descripcion"></div><p class="nota" id="ejemplo-forma"></p><div class="acciones"><button class="accion" id="ejemplo-mesa">Cargar en mesa</button><button class="accion primaria" id="ejemplo-ejecucion">Ver ejecución</button></div>')}${seccion('Montaje', '<button class="accion" id="ejemplo-gravedad">Ver con gravedad</button><p class="nota">Sujeta un extremo del montaje y levántalo. Cada bloque gira en su conector y se apoya en la mesa al soltarlo.</p><button class="accion" id="ejemplo-restaurar" disabled>Restaurar mi montaje</button>')}</div>
      <div data-prop="camaras" hidden>
        ${seccion('Resultado', '<div id="lectura-estado"></div><pre id="lectura-codigo" class="code"></pre><label class="toggle-row">Actualizar la mesa<input type="checkbox" id="lectura-aplicar"><span class="toggle"></span></label><p class="nota">Actualiza con una lectura completa y estable. Una oclusión o un desacuerdo pausa la ejecución. Una ficha leída tiene posición y símbolo sin contradicción observada: puede proceder de una sola cámara. Los encajes se estiman por geometría.</p>')}
        ${seccion('Lectura compartida', `<form id="fusion-form">${propiedad('Origen','<select class="fld" name="modo"><option value="fusion">Combinar cámaras</option><option value="individual">Una sola vista</option></select>')}${propiedad('Paso (mm)','<input class="fld" name="paso_mm" type="number" min="20" max="300" step="0.1" required>')}<p class="nota">Mide la distancia entre los centros de las fichas de operación de bloques consecutivos. Todas las cámaras deben estar registradas en Calibración.</p><button class="accion" type="submit">Guardar lectura</button></form><div id="fusion-resumen" class="nota"></div><div id="fusion-piezas"></div><button class="accion" id="fusion-reiniciar">Reiniciar seguimiento</button><p class="nota">Si retiraste piezas, reinicia cuando la mesa esté visible. No se borran piezas por una oclusión.</p>`)}
        ${seccion('Lecturas por cámara', '<div id="cam-lecturas-panel"></div><p class="nota">Los puntajes miden similitud, no probabilidad. Una cámara que no ve una ficha no vota en su contra.</p>')}
        ${seccion('Cámara', `<div id="cam-controles"></div><details><summary>Añadir cámara</summary><form id="camara-form">${propiedad('Nombre','<input class="fld" name="nombre" placeholder="Cenital…" maxlength="80" required>')}${propiedad('Dispositivo','<select class="fld" name="tipo"><option value="webcam">Webcam</option><option value="kinect">Kinect v2</option><option value="realsense">RealSense</option></select>')}${propiedad('Índice / serial','<input class="fld" name="fuente" value="0">')}${propiedad('Aporte','<select class="fld" name="rol"><option value="simbolos">Símbolos</option><option value="profundidad">Profundidad</option><option value="ambos">Ambos</option></select>')}<button class="accion primaria" type="submit">Añadir cámara</button></form></details><details><summary>Montajes y controladores</summary><div id="adaptadores"></div><p class="nota">A: RealSense y webcams. B: Kinect v2 y webcams. Kinect de Xbox 360 es v1 y aún no tiene adaptador; identifica el modelo antes de conectarlo.</p></details>`)}
      </div>
      <div data-prop="calibracion" hidden>
        ${seccion('Tablero', `<form id="calibracion-form">${propiedad('Cámara','<select class="fld" name="id" id="cal-camara"></select>')}${propiedad('Columnas','<input class="fld" name="columnas" type="number" min="3" max="20" value="9" required>')}${propiedad('Filas','<input class="fld" name="filas" type="number" min="3" max="20" value="6" required>')}${propiedad('Cuadro (mm)','<input class="fld" name="mm" type="number" min="1" max="200" step="0.1" value="25" required>')}<p class="nota">Cuenta las esquinas interiores. Mide el tablero impreso.</p><button class="accion" type="submit">Reiniciar capturas</button></form>`)}
        ${seccion('Capturas', '<p id="cal-estado"></p><div class="acciones"><button class="accion" id="cal-capturar">Capturar tablero</button><button class="accion primaria" id="cal-calcular">Calcular</button></div><p class="nota">Al menos 15 vistas distintas, con el tablero en varios ángulos y posiciones.</p>')}
        ${seccion('Error de reproyección', '<div id="cal-error"></div><p class="nota">La calibración es buena por debajo de 1 px. Repite el registro si se mueve una cámara.</p>')}
        ${seccion('Posición común', '<button class="accion" id="cal-registrar">Registrar cámaras</button><p class="nota">El mismo tablero inmóvil debe verse en todas las cámaras conectadas, con igual origen y orientación.</p><div id="cal-resultados"></div>')}
      </div>
      <div data-prop="simbolos" hidden>
        <form id="simbolo-form">${seccion('Símbolo', `<div id="simbolo-grande" class="big-glyph"></div>${propiedad('Nombre','<input class="fld mono" name="nombre" maxlength="80" placeholder="Nombre del dibujo" required>')}${propiedad('Tipo','<select class="fld" name="tipo"><option value="pila">Etiqueta de pila</option><option value="literal">Número o nil</option><option value="operacion">Operación</option></select>')}<button class="accion" type="button" id="simbolo-nuevo">Nuevo símbolo</button>`)}
        ${seccion('Fotos de referencia', '<div id="simbolo-fotos" class="thumbs"></div><label class="foto-label">Foto de una sola ficha<input name="foto" id="foto-simbolo" class="archivo-oculto" type="file" accept="image/png,image/jpeg" required></label><button class="accion" type="button" id="seleccionar-foto">Seleccionar foto</button><p class="nota" id="foto-nombre">Ninguna foto seleccionada.</p><button class="accion primaria" type="submit">Guardar referencia</button><p class="nota">Puedes guardar varias fotos para el mismo nombre.</p>')}</form>
        ${seccion('Se parece a', '<button class="accion" id="simbolo-probar">Probar esta foto</button><div id="simbolo-prueba"></div><p class="nota">La lectura requiere similitud de 0.45 o más y una diferencia de 0.08 o más con el segundo símbolo.</p>')}
      </div>
      <div data-prop="piezas" hidden>${seccion('Imprimir', '<p id="modelo-descripcion"></p><a class="accion primaria" id="modelo-descarga" download>Descargar STL original</a><p class="nota">Se descarga la geometría original. Las fichas de operaciones comparten una lámina; los parámetros editables de la mesa son representaciones.</p>')}${seccion('Total', '<div id="inventario"></div>')}</div>
      <div id="servicio-seccion" class="sec"><div class="sec-head">Servicio de visión</div><div id="servicio-estado" role="status"></div><div id="servicio-ayuda" hidden><p class="nota">Desde vision-prototype inicia <code>python3 servicio.py</code>.</p><button class="accion" id="servicio-reintentar">Volver a conectar</button></div></div>
    </aside>`;

  const ordenOperaciones = ['PUSH','MOV','POP','DUP','NEG','?','JMP','CMP','ADD','SUB','MUL','DIV','MOD'];
  const rotulo = s => s.lexema.startsWith('sculpt_label_') ? s.nombre : s.lexema;
  const familia = token => ['PUSH','MOV'].includes(token) ? 'bin' : ['ADD','SUB','MUL','DIV','MOD'].includes(token) ? 'ari' : 'una';
  function pintarVocabulario() {
    if (pagina !== 'simbolos') return;
    listaLateral.innerHTML = '<h2>Vocabulario</h2>' + simbolosDatos.map(s => `<button class="layer ${s.lexema === simboloElegido ? 'sel' : ''}" data-simbolo="${escapar(s.lexema)}"><span class="mono">${escapar(rotulo(s))}</span></button>`).join('');
  }
  function seleccionarSimbolo(id) {
    const s = simbolosDatos.find(s => s.lexema === id); if (!s) return;
    simboloElegido = id; pintarVocabulario();
    for (const boton of $('simbolos-lista').querySelectorAll('[data-simbolo]')) boton.classList.toggle('selected', boton.dataset.simbolo === id);
    const f = $('simbolo-form').elements; f.nombre.value = rotulo(s); f.tipo.value = s.tipo;
    $('simbolo-grande').textContent = s.nombre;
    $('simbolo-fotos').innerHTML = s.fotos.map(f => `<img class="thumb" alt="Referencia de ${escapar(s.nombre)}" src="${base}/api/foto/${encodeURIComponent(f)}">`).join('');
  }
  function seleccionarEjemplo(indice) {
    ejemploElegido = indice; const e = EJEMPLOS[indice];
    listaLateral.innerHTML = '<h2>Ejemplos</h2>' + EJEMPLOS.map((e,i) => `<button class="layer ${i === indice ? 'sel' : ''}" data-elegir-ejemplo="${i}">${e.nombre}</button>`).join('');
    $('ejemplo-nombre').textContent = e.nombre; $('ejemplo-codigo').textContent = e.codigo;
    $('ejemplo-descripcion').textContent = e.descripcion; $('ejemplo-forma').textContent = e.forma ? 'Montaje en ' + e.forma.toLowerCase() + '. Los conectores permiten giros en el plano de la mesa.' : 'Montaje recto.';
    const m = montajeEjemplo(e), xs = m.bloques.map(b => b.posicion[0]), ys = m.bloques.map(b => -b.posicion[2]);
    const x = Math.min(...xs)-65, y = Math.min(...ys)-55, w = Math.max(...xs)-x+100, h = Math.max(...ys)-y+75;
    $('ejemplo-plano').innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" aria-label="Distribución del ejemplo vista desde arriba" role="img">${m.conexiones.map(c => { const a=m.bloque(c.origen), b=m.bloque(c.destino); return `<line x1="${a.posicion[0]}" y1="${-a.posicion[2]}" x2="${b.posicion[0]}" y2="${-b.posicion[2]}" class="diagrama-union"/>`; }).join('')}${m.bloques.map((b,i) => `<g transform="translate(${b.posicion[0]},${-b.posicion[2]}) rotate(${b.angulo*180/Math.PI})"><rect x="-24" y="-18" width="${b.capacidad === 2 ? 80 : 60}" height="36" rx="5" class="bloque-${familia(m.programa()[i].token)}"/><rect x="-20" y="-13" width="29" height="26" rx="3" class="ficha-operacion"/><text x="-5" y="3" text-anchor="middle" class="diagrama-op">${escapar(m.programa()[i].token)}</text>${m.programa()[i].operandos.map((p,j) => `<rect x="${14+j*20}" y="-9" width="17" height="18" rx="2" class="ficha-${/^(-?\d|nil)/.test(p) ? 'numero' : 'etiqueta'}"/><text x="${22+j*20}" y="3" text-anchor="middle" class="diagrama-param">${escapar((m.etiquetas().get(p) || p).length > 5 ? '…' : m.etiquetas().get(p) || p)}</text>`).join('')}</g>`).join('')}</svg>`;
  }
  for (const [id,destino] of [['ejemplo-mesa','mesa'],['ejemplo-ejecucion','ejecucion'],['ejemplo-gravedad','mesa']]) $(id).onclick = () => {
    if (cargarEjemplo(EJEMPLOS[ejemploElegido], destino)) { $('ejemplo-restaurar').disabled = false; if (id === 'ejemplo-gravedad') verGravedad(); }
  };
  listaLateral.addEventListener('click', e => {
    const ejemplo = e.target.closest('[data-elegir-ejemplo]'); if (ejemplo) seleccionarEjemplo(Number(ejemplo.dataset.elegirEjemplo));
    const simbolo = e.target.closest('[data-simbolo]'); if (simbolo) seleccionarSimbolo(simbolo.dataset.simbolo);
    const pieza = e.target.closest('[data-modelo]'); if (pieza) modelo(pieza.dataset.modelo);
  });
  $('seleccionar-foto').onclick = () => $('foto-simbolo').click();
  $('foto-simbolo').onchange = () => { $('foto-nombre').textContent = $('foto-simbolo').files[0]?.name || 'Ninguna foto seleccionada.'; };
  $('simbolo-nuevo').onclick = () => { simboloElegido = null; $('simbolo-form').reset(); $('foto-nombre').textContent = 'Ninguna foto seleccionada.'; $('simbolo-grande').textContent = ''; $('simbolo-fotos').replaceChildren(); pintarVocabulario(); $('simbolo-form').elements.nombre.focus(); };
  async function objetoModelo(archivo) {
    if (archivo === 'ficha_parametro') {
      const objeto = crearFichaOperando({tipo:'etiqueta', texto:'a', trazos:[]});
      const centro = new THREE.Box3().setFromObject(objeto).getCenter(new THREE.Vector3()); objeto.position.sub(centro); return objeto;
    }
    const geometry = await new STLLoader().loadAsync(`./modelos/${archivo}.stl`); geometry.center();
    const material = new THREE.MeshLambertMaterial({color:archivo.startsWith('bloque') ? 0x7b61ff : archivo === 'parametro' ? 0x439b9e : 0xa8a8a8, flatShading:true});
    return new THREE.Mesh(geometry, material);
  }
  function eliminarObjeto(objeto) {
    const materiales = new Set(); objeto.traverse(o => { o.geometry?.dispose(); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiales.add(m); });
    for (const m of materiales) { m.map?.dispose(); m.dispose(); }
  }

  let miniaturasCargadas = false, miniaturasPendientes = false;
  async function miniaturas() {
    if (miniaturasCargadas || miniaturasPendientes) return;
    miniaturasPendientes = true;
    const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true}); renderer.setSize(260,180);
    try {
      for (const [archivo] of MODELOS) {
        const objeto = await objetoModelo(archivo);
        const radio = new THREE.Box3().setFromObject(objeto).getSize(new THREE.Vector3()).length()/2, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40,260/180,.1,10000);
        camera.position.set(radio*2,radio*1.5,radio*2.5); camera.lookAt(0,0,0);
        scene.add(objeto); scene.add(new THREE.HemisphereLight(0xffffff,0x666666,2));
        renderer.render(scene,camera); const miniatura = raiz.querySelector(`[data-miniatura="${archivo}"]`); miniatura.src = renderer.domElement.toDataURL(); miniatura.hidden = false; eliminarObjeto(objeto);
      }
      miniaturasCargadas = true;
    } catch(e) { mensaje('No se pudieron cargar todas las miniaturas.', true); }
    finally { renderer.dispose(); miniaturasPendientes = false; }
  }
  async function api(ruta, datos) {
    const respuesta = await fetch(base + '/api/' + ruta, { ...(datos ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) } : {}), signal: AbortSignal.timeout(ruta === 'estado' ? 1500 : 15000) });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'El servicio no pudo completar la solicitud.');
    return resultado;
  }
  function mensaje(texto, error = false) { $('vista-mensaje').hidden = !texto; $('vista-mensaje').textContent = texto; $('vista-mensaje').classList.toggle('error', error); }
  async function actuar(tarea, texto) {
    if (ocupado) return;
    ocupado = true; raiz.setAttribute('aria-busy', 'true');
    try { await tarea(); mensaje(texto); await actualizar(); }
    catch (e) { mensaje(e.message, true); }
    finally { ocupado = false; raiz.removeAttribute('aria-busy'); }
  }
  function datosFormulario(id) { return Object.fromEntries(new FormData($(id))); }
  let configuracionFusion = '', ultimoAviso = '';
  function pausarLectura(texto) {
    ultimaLectura = '';
    if ($('lectura-aplicar').checked && ultimoAviso !== texto) { ultimoAviso = texto; incertidumbre?.(texto); }
  }
  let motorLectura = null, firmaLectura = '', dictamenLectura = '', errorLectura = false, tiempoLectura;
  function detenerValidacion() { motorLectura?.terminate(); motorLectura = null; clearTimeout(tiempoLectura); }
  function resultadoLectura(principal) {
    const instrucciones = principal?.instrucciones || [];
    const incompleta = !!instrucciones.length && !puedeAplicarLectura({...principal, estable:true});
    if (!puedeAplicarLectura(principal)) {
      detenerValidacion(); firmaLectura = ''; dictamenLectura = '';
      $('lectura-estado').className = incompleta ? 'errc' : '';
      $('lectura-estado').textContent = principal?.avisos?.join(' ') || (incompleta ? 'Lectura incompleta. Revisa las fichas antes de ejecutar.' : principal ? 'Esperando una lectura estable.' : 'Selecciona una cámara para el programa.');
      return;
    }
    const firma = principal.id + codigoLectura(principal);
    if (firma !== firmaLectura) {
      detenerValidacion(); firmaLectura = firma; dictamenLectura = 'Validando el programa…'; errorLectura = false;
      motorLectura = new Worker(new URL('../interprete-worker.js', import.meta.url), {type:'module'});
      const terminar = (texto, error) => { if (firmaLectura !== firma) return; detenerValidacion(); dictamenLectura = texto; errorLectura = error; };
      motorLectura.onmessage = ({data}) => { const r = data.resultado; terminar(r.valido ? r.completa ? 'Programa válido. Uniones físicas por confirmar.' : 'Ejecución detenida por límite.' : 'Programa inválido. ' + (r.mensaje || ''), !r.valido || !r.completa); };
      motorLectura.onerror = () => terminar('No se pudo validar con el intérprete.', true);
      tiempoLectura = setTimeout(() => terminar('La validación tardó demasiado.', true), 10000);
      motorLectura.postMessage({revision:1, codigo:instrucciones.map(i => [i.token,...i.operandos].join(' ')).join('\n')+'\n'});
    }
    $('lectura-estado').textContent = dictamenLectura;
    $('lectura-estado').className = errorLectura ? 'errc' : motorLectura ? '' : 'okc';
  }
  function pintarCatalogo(camaras) {
    const fichas = catalogoCamaras(camaras);
    const previsto = !camaras.length;
    const localizadas = fichas.filter(c => c.plano);
    $('mapa-camaras').innerHTML = `<div class="frame-label">${previsto ? 'Montaje previsto' : 'Posiciones respecto al tablero'}</div><div class="mapa-frame"><svg viewBox="0 0 360 205" role="img" aria-label="${previsto ? 'Esquema de cámaras sugeridas alrededor de la mesa' : 'Ubicación calibrada de las cámaras alrededor del tablero'}"><rect x="110" y="54" width="160" height="104" rx="8" class="mapa-mesa"/><text x="190" y="110" text-anchor="middle" class="mapa-texto">Mesa</text>${localizadas.map((c, i) => `<line x1="${c.plano[0]}" y1="${c.plano[1]}" x2="190" y2="106" class="mapa-rayo"/><circle cx="${c.plano[0]}" cy="${c.plano[1]}" r="15" class="mapa-punto"/><text x="${c.plano[0]}" y="${c.plano[1] + 4}" text-anchor="middle" class="mapa-numero">${i + 1}</text>`).join('')}</svg><p class="nota">${previsto ? 'Ubicaciones sugeridas, todavía sin cámaras configuradas.' : localizadas.length ? `${localizadas.length} de ${fichas.length} posiciones registradas. Los ejes siguen el tablero de calibración.` : 'Registra las cámaras en Calibración para situarlas en este plano.'}</p></div>`;
    $('camaras-lista').innerHTML = fichas.map((c, i) => `<article class="catalogo-camara" ${c.prevista ? '' : `data-camara="${escapar(c.id)}"`}><div class="catalogo-cabecera"><span class="catalogo-numero">${i + 1}</span><div><strong>${escapar(c.nombre)}</strong><p class="nota">${escapar(c.ubicacion)}</p></div></div><div class="frame camara-frame">${c.prevista ? '<p class="nota">Vista disponible cuando se conecte una cámara.</p>' : `<img class="camara-imagen cam-color" alt="Imagen de ${escapar(c.nombre)}" hidden><p class="cam-sin-imagen nota">Conecta esta cámara para ver su imagen.</p>`}</div>${c.prevista ? '' : `<div class="frame profundidad-frame" hidden><img class="camara-imagen cam-depth" alt="Profundidad de ${escapar(c.nombre)}" hidden></div>`}<p class="catalogo-aporte">${escapar(c.aporte)}</p></article>`).join('');
    $('camaras-vacio').hidden = !previsto;
  }
  pintarCatalogo([]);
  function pintarCamaras() {
    const firma = JSON.stringify(estado.camaras.map(c => [c.id, c.nombre, c.tipo, c.pose]));
    if (firma !== firmaCamaras) {
      firmaCamaras = firma;
      pintarCatalogo(estado.camaras);
      $('cam-controles').innerHTML = estado.camaras.map(c => `<div class="cam-row" data-control="${c.id}"><strong>${escapar(c.nombre)}</strong><p class="cam-estado nota"></p><p class="cam-error error"></p><div class="acciones"><button class="accion" data-accion="iniciar">Conectar</button><button class="accion" data-accion="detener">Desconectar</button><button class="accion" data-accion="principal">Usar para programa</button><button class="accion" data-accion="eliminar">Quitar</button></div></div>`).join('');
      const anterior = $('cal-camara').value;
      $('cal-camara').innerHTML = estado.camaras.map(c => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('');
      if (estado.camaras.some(c => c.id === anterior)) $('cal-camara').value = anterior;
    }
    for (const c of estado.camaras) {
      const tarjeta = raiz.querySelector(`[data-control="${c.id}"]`);
      const marco = raiz.querySelector(`[data-camara="${c.id}"]`);
      tarjeta.querySelector('.cam-estado').textContent = `${c.estado}${c.resolucion ? ' · ' + c.resolucion.join(' × ') : ''}${estado.configuracion_fusion?.modo === 'individual' && estado.principal === c.id ? ' · Fuente del programa' : ''}`;
      tarjeta.querySelector('.cam-error').textContent = c.error;
      tarjeta.querySelector('[data-accion="iniciar"]').disabled = ['conectada', 'conectando', 'deteniendo'].includes(c.estado);
      tarjeta.querySelector('[data-accion="detener"]').disabled = !['conectada', 'conectando'].includes(c.estado);
      tarjeta.querySelector('[data-accion="principal"]').hidden = estado.configuracion_fusion?.modo !== 'individual';
      tarjeta.querySelector('[data-accion="principal"]').disabled = c.rol === 'profundidad';
      tarjeta.querySelector('[data-accion="eliminar"]').disabled = false;
      for (const [selector, sufijo, disponible] of [['.cam-color', '', c.secuencia], ['.cam-depth', '/depth', c.profundidad]]) {
        const img = marco.querySelector(selector); img.hidden = !disponible;
        marco.querySelector('.cam-sin-imagen').hidden = !!c.secuencia;
        marco.querySelector('.profundidad-frame').hidden = !c.profundidad;
        if (disponible && pagina === 'camaras') img.src = `${base}/api/imagen/${c.id}${sufijo}?v=${c.secuencia}`;
      }

    }
    $('cam-lecturas-panel').textContent = estado.camaras.map(c => c.nombre + ': ' + ((c.observaciones || []).map(o => (estado.etiquetas?.[o.lexema] || o.lexema) + ' ' + (o.candidatos[0]?.puntaje.toFixed(2) ?? 'Sin leer')).join(' · ') || 'Sin lecturas')).join('\n');
    const config = estado.configuracion_fusion || {modo:'individual',paso_mm:60};
    const firmaConfig = JSON.stringify(config);
    if (firmaConfig !== configuracionFusion) {
      configuracionFusion = firmaConfig;
      const f = $('fusion-form').elements; f.modo.value = config.modo; f.paso_mm.value = config.paso_mm;
    }
    const fusion = estado.fusion;
    $('fusion-resumen').textContent = config.modo === 'fusion' ? fusion ? `${fusion.piezas.length} piezas en seguimiento · ${fusion.camaras.length} cámaras sincronizadas${fusion.desfase_ms == null ? '' : ' · separación ' + fusion.desfase_ms + ' ms'}` : 'Esperando el estado compartido.' : 'Lectura de una vista: no combina observaciones ni resuelve oclusiones.';
    const nombres = Object.fromEntries(estado.camaras.map(c => [c.id,c.nombre]));
    const estadosPieza = {confirmada:'Leída',ambigua:'Ambigua',oculta:'Oculta',no_observada:'Sin observación reciente'};
    $('fusion-piezas').hidden = config.modo !== 'fusion';
    $('fusion-piezas').innerHTML = (fusion?.piezas || []).map(p => `<div class="pieza-observada"><div><span class="mono">${escapar(estado.etiquetas?.[p.lexema] || p.lexema)}</span><span class="${p.estado === 'confirmada' ? '' : 'errc'}">${escapar(estadosPieza[p.estado] || p.estado)}${p.estado === 'confirmada' ? ` · ${p.camaras.length} ${p.camaras.length === 1 ? 'vista' : 'vistas'}` : ''}</span></div><div class="nota">${escapar(p.id)} · ${escapar(p.camaras.map(id => nombres[id] || id).join(', '))}${p.candidatos?.length ? ' · similitud ' + p.candidatos[0].puntaje.toFixed(2) : ''}</div></div>`).join('');
    const principal = config.modo === 'fusion' ? fusion : estado.camaras.find(c => c.id === estado.principal);
    $('lectura-codigo').hidden = !principal?.instrucciones?.length;
    $('lectura-codigo').textContent = (principal?.instrucciones || []).map(i => [i.token, ...i.operandos.map(v => estado.etiquetas?.[v] || v)].join(' ')).join('\n');
    resultadoLectura(principal);
    if (puedeAplicarLectura(principal) && $('lectura-aplicar').checked) {
      const firma = principal.id + principal.firma;
      if (firma !== ultimaLectura && recibir(principal.instrucciones, estado.etiquetas)) { ultimaLectura = firma; ultimoAviso = ''; }
    } else if ($('lectura-aplicar').checked) pausarLectura(principal?.avisos?.join(' ') || 'Esperando una lectura completa y estable.');
    if (pagina === 'camaras') listaLateral.innerHTML = '<h2>Programa reconstruido</h2>' + (principal?.instrucciones || []).map((i,n) => `<div class="layer"><span class="num">${n+1}</span><span class="sw ${familia(i.token)}"></span><span class="txt">${escapar([i.token,...i.operandos.map(v => estado.etiquetas?.[v] || v)].join(' '))}</span></div>`).join('');
    pintarCalibracion();
  }
  function pintarCalibracion() {
    const c = estado?.camaras.find(c => c.id === $('cal-camara').value);
    const img = $('cal-imagen'); img.hidden = !c?.secuencia; $('cal-vacio').hidden = !!c?.secuencia;
    if (c?.secuencia && pagina === 'calibracion') img.src = `${base}/api/imagen/${c.id}?v=${c.secuencia}`;
    $('cal-estado').textContent = c ? `${c.capturas} / 15 capturas mínimas · ${c.intrinsecos ? `Intrínsecos ${c.intrinsecos.origen === 'fabrica' ? 'de fábrica' : 'guardados'}${c.intrinsecos.rms != null ? ' · RMS ' + c.intrinsecos.rms.toFixed(3) + ' px' : ''}` : 'Sin calibración guardada'}` : 'Agrega una cámara en Cámaras.';
    const rms = c?.intrinsecos?.rms;
    $('cal-grafica').hidden = !c?.intrinsecos?.errores?.length;
    if (c?.intrinsecos?.errores?.length) {
      const valores = c.intrinsecos.errores, maximo = Math.max(1,...valores);
      $('cal-grafica').innerHTML = `<div class="frame-label">Error por captura (px)</div><div class="frame grafica-error"><svg viewBox="0 0 600 150" role="img" aria-label="Errores de reproyección por captura"><line x1="0" x2="600" y1="${130-100/maximo}" y2="${130-100/maximo}" class="limite-error"/><text x="4" y="${125-100/maximo}">1 px</text>${valores.map((v,i) => `<rect x="${i*600/valores.length+3}" y="${130-v/maximo*100}" width="${600/valores.length-6}" height="${v/maximo*100}" class="barra-error"><title>Captura ${i+1}: ${v.toFixed(3)} px</title></rect>`).join('')}</svg></div>`;
    }
    $('cal-error').textContent = rms == null ? 'Aún no hay una medición.' : `${rms.toFixed(3)} px · ${rms < 1 ? 'Calibración buena' : 'Repite las capturas'}`;
    $('cal-error').className = rms == null ? 'nota' : rms < 1 ? 'okc' : 'errc';
    if (pagina === 'calibracion') listaLateral.innerHTML = '<h2>Capturas</h2>' + Array.from({length:c?.capturas || 0}, (_,i) => `<div class="layer">Captura ${i+1}</div>`).join('');
    $('cal-resultados').textContent = (estado?.camaras || []).map(c => `${c.nombre}: ${c.pose ? 'posición guardada · RMS ' + c.pose.rms.toFixed(3) + ' px' : 'sin posición común'}`).join(' / ');
  }
  async function actualizar() {
    const solicitud = ++solicitudEstado;
    try {
      const nuevoEstado = await api('estado');
      if (solicitud !== solicitudEstado || !esEstadoActual(nuevoEstado, estado)) return;
      if (estado && nuevoEstado.sesion !== estado.sesion) pausarLectura('El servicio se reinició. Esperando una nueva lectura.');
      estado = nuevoEstado;
      $('servicio-estado').textContent = 'Servicio local conectado'; $('servicio-ayuda').hidden = true;
      $('adaptadores').innerHTML = estado.adaptadores.map(a => `<div><strong>${escapar(a.nombre)}</strong><span>${a.disponible ? 'Controlador disponible' : 'Falta controlador'}</span><small>${escapar(a.requisito)}</small></div>`).join('');
      pintarCamaras();
    } catch {
      if (solicitud !== solicitudEstado) return;
      pausarLectura('Se perdió la conexión con las cámaras. El montaje mostrado es la última lectura.');
      estado = null; detenerValidacion(); firmaLectura = ''; $('lectura-estado').className = ''; $('servicio-estado').textContent = 'Servicio local desconectado';
      for (const tarjeta of raiz.querySelectorAll('[data-control]')) {
        tarjeta.querySelector('.cam-estado').textContent = 'Sin conexión · última imagen recibida';
        for (const boton of tarjeta.querySelectorAll('[data-accion]')) boton.disabled = true;
      }
      $('cal-estado').textContent = 'Servicio desconectado; la imagen y los resultados no se están actualizando.';
      $('servicio-ayuda').hidden = !['camaras', 'calibracion', 'simbolos'].includes(pagina);
      $('lectura-estado').textContent = 'Sin conexión: se conserva el último programa recibido.';
    }
  }
  async function simbolos() {
    try {
      const lista = await api('simbolos');
      simbolosDatos = lista;
      $('simbolos-lista').innerHTML = [['pila','Etiquetas de pila'],['operacion','Operaciones'],['literal','Valores']].map(([tipo,titulo]) => `<div class="frame-label">${titulo}</div><div class="frame ${tipo === 'operacion' ? 'ops-frame' : 'grid-frame'}">${lista.filter(s => s.tipo === tipo).sort((a,b) => tipo === 'operacion' ? ordenOperaciones.indexOf(a.lexema)-ordenOperaciones.indexOf(b.lexema) : 0).map(s => `<button class="${tipo === 'operacion' ? 'ocard ' + familia(s.lexema) : 'scard'}" data-simbolo="${escapar(s.lexema)}">${tipo === 'operacion' ? `<span class="oname">${escapar(s.lexema)}</span>` : `<div class="spad">${s.fotos[0] ? `<img alt="${escapar(s.nombre)}" src="${base}/api/foto/${encodeURIComponent(s.fotos[0])}">` : `<span class="glyph">${escapar(s.nombre)}</span>`}</div><span class="sname mono">${escapar(rotulo(s))}</span>`}<span class="${tipo === 'operacion' ? 'ocap' : 'scap' + (s.fotos.length ? '' : ' errc')}">${s.fotos.length ? s.fotos.length + (s.fotos.length === 1 ? ' foto' : ' fotos') : 'Sin registrar'}</span></button>`).join('')}</div>`).join('');
      pintarVocabulario();
      seleccionarSimbolo(simboloElegido || lista.find(s => s.tipo === 'pila')?.lexema || lista[0]?.lexema);

    } catch (e) { mensaje('Conecta el servicio local para consultar y registrar símbolos.', true); }
  }
  async function foto() {
    const archivo = $('simbolo-form').elements.foto.files[0];
    if (!archivo || archivo.size > 6_000_000) throw new Error('Selecciona una foto PNG o JPEG de menos de 6 MB.');
    return new Promise((resolve, reject) => { const lector = new FileReader(); lector.onload = () => resolve(lector.result); lector.onerror = () => reject(new Error('No se pudo leer la foto.')); lector.readAsDataURL(archivo); });
  }
  function cerrarVisor() {
    generacion++;
    if (!visor) return;
    visor.renderer.setAnimationLoop(null); visor.controls.dispose(); eliminarObjeto(visor.objeto); visor.renderer.dispose(); visor.renderer.domElement.remove(); visor = null;
  }
  async function modelo(archivo) {
    cerrarVisor(); const turno = generacion;
    const [, nombre, descripcion] = MODELOS.find(m => m[0] === archivo);
    $('modelo-titulo').textContent = nombre; $('modelo-descripcion').textContent = descripcion;
    $('modelo-descarga').hidden = archivo === 'ficha_parametro';
    if (archivo !== 'ficha_parametro') $('modelo-descarga').href = `./modelos/${archivo}.stl`;
    for (const b of document.querySelectorAll('[data-modelo]')) b.classList.toggle('sel', b.dataset.modelo === archivo);
    try {
      const objeto = await objetoModelo(archivo);
      if (turno !== generacion || pagina !== 'piezas') { eliminarObjeto(objeto); return; }
      const radio = new THREE.Box3().setFromObject(objeto).getSize(new THREE.Vector3()).length()/2;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .1, 10000);
      camera.position.set(radio * 2, radio * 1.5, radio * 2.5);
      scene.add(objeto); scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 3));
      const luz = new THREE.DirectionalLight(0xffffff, 3); luz.position.set(100, 180, 100); scene.add(luz);
      $('modelo-visor').append(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
      visor = { renderer, controls, objeto };
      renderer.setAnimationLoop(() => { const w = $('modelo-visor').clientWidth; renderer.setSize(w, 280, false); camera.aspect = w / 280; camera.updateProjectionMatrix(); controls.update(); renderer.render(scene, camera); });
    } catch (e) { mensaje('No se pudo abrir el modelo: ' + e.message, true); }
  }
  raiz.addEventListener('click', e => {
    const simbolo = e.target.closest('[data-simbolo]'); if (simbolo) seleccionarSimbolo(simbolo.dataset.simbolo);
    const boton = e.target.closest('[data-accion]');
    if (boton) actuar(() => api('camaras/' + boton.dataset.accion, { id: boton.closest('[data-control]').dataset.control }), 'Configuración actualizada.');
    const pieza = e.target.closest('[data-modelo]'); if (pieza) modelo(pieza.dataset.modelo);
  });
  $('ejemplo-restaurar').onclick = () => { if (restaurar()) $('ejemplo-restaurar').disabled = true; };
  $('servicio-reintentar').onclick = actualizar;
  $('camara-activa').addEventListener('change', () => { if ($('camara-activa').checked) $('lectura-aplicar').checked = false; });
  $('fusion-form').onsubmit = e => {
    e.preventDefault(); pausarLectura('La configuración cambió. Esperando una nueva lectura.');
    actuar(() => api('camaras/configurar_fusion', datosFormulario('fusion-form')), 'Configuración de lectura guardada.');
  };
  $('fusion-reiniciar').onclick = () => {
    pausarLectura('Seguimiento reiniciado. Esperando una nueva lectura.');
    actuar(async () => { await api('camaras/reiniciar_fusion', {}); if ($('lectura-aplicar').checked) recibir([], {}); ultimoAviso = ''; }, 'Seguimiento reiniciado.');
  };
  $('lectura-aplicar').onchange = () => { ultimoAviso = ''; ultimaLectura = ''; if ($('lectura-aplicar').checked) $('camara-activa').checked = false; if (estado) pintarCamaras(); };
  $('camara-form').elements.tipo.onchange = e => { const f = $('camara-form').elements; f.fuente.value = e.target.value === 'webcam' ? '0' : ''; f.rol.value = e.target.value === 'kinect' ? 'profundidad' : e.target.value === 'webcam' ? 'simbolos' : 'ambos'; };
  $('camara-form').onsubmit = e => { e.preventDefault(); actuar(() => api('camaras/agregar', datosFormulario('camara-form')), 'Cámara agregada. Pulsa Conectar para empezar.'); };
  $('calibracion-form').onsubmit = e => { e.preventDefault(); actuar(() => api('camaras/reiniciar_calibracion', datosFormulario('calibracion-form')), 'Sesión iniciada. Cambia el ángulo del tablero entre capturas.'); };
  for (const accion of ['capturar', 'calcular', 'registrar']) $('cal-' + accion).onclick = () => actuar(() => api('camaras/' + accion, datosFormulario('calibracion-form')), accion === 'capturar' ? 'Captura guardada.' : 'Calibración guardada.');
  $('cal-camara').onchange = pintarCalibracion;
  $('simbolo-form').onsubmit = e => { e.preventDefault(); actuar(async () => { const f = datosFormulario('simbolo-form'); await api('simbolos/guardar', { nombre: f.nombre, tipo: f.tipo, imagen: await foto() }); await simbolos(); }, 'Referencia guardada y disponible para todas las cámaras.'); };
  $('simbolo-probar').onclick = () => actuar(async () => { const r = await api('simbolos/probar', { imagen: await foto() }); $('simbolo-prueba').innerHTML = r.candidatos.map(c => `<div class="simrow"><span class="mono">${escapar(c.nombre || c.lexema)}</span><span>${c.puntaje.toFixed(3)}</span></div>`).join('') || 'Sin trazo reconocible.'; }, 'Similitudes calculadas. No representan probabilidades.');
  async function ciclo() { await actualizar(); timer = setTimeout(ciclo, 250); }
  ciclo();
  window.addEventListener('pagehide', () => { clearTimeout(timer); cerrarVisor(); detenerValidacion(); });
  return {
    mostrar(destino) {
      pagina = destino; const activa = !['mesa', 'ejecucion'].includes(destino); raiz.hidden = !activa;
      for (const s of raiz.querySelectorAll('[data-vista]')) s.hidden = s.dataset.vista !== destino;
      for (const s of raiz.querySelectorAll('[data-prop]')) s.hidden = s.dataset.prop !== destino;
      listaLateral.hidden = !activa;
      listaLateral.innerHTML = '';
      $('servicio-seccion').hidden = ['ejemplos', 'piezas'].includes(destino);
      if (destino === 'ejemplos') seleccionarEjemplo(ejemploElegido);
      $('servicio-estado').hidden = ['ejemplos', 'piezas'].includes(destino);
      $('servicio-ayuda').hidden = !!estado || !['camaras', 'calibracion', 'simbolos'].includes(destino);
      mensaje(''); cerrarVisor();
      if (destino === 'simbolos') simbolos();
      if (destino === 'piezas') { const cantidades = inventario(); $('inventario').innerHTML = propiedad('Piezas', `<div class="fld">${Object.values(cantidades).reduce((a,b) => a+b,0)}</div>`); listaLateral.innerHTML = '<h2>Lista de piezas</h2>' + MODELOS.map(([id,nombre]) => `<button class="layer" data-modelo="${id}"><span>${nombre}</span><span class="right-num">${cantidades[id] || 0}</span></button>`).join(''); miniaturas(); modelo('bloque_1_param'); }
      if (estado) pintarCamaras();
    },
    detenerLectura() { $('lectura-aplicar').checked = false; ultimaLectura = ''; },
  };
}
