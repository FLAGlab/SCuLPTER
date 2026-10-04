import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OPERACIONES } from '../modelo/montaje.mjs';
import { crearFichaOperando } from '../escena/piezas.js';
import { EJEMPLOS, montajeEjemplo } from '../modelo/ejemplos.mjs';
import { puedeAplicarLectura, codigoLectura, esEstadoActual } from '../vision/lectura-fusion.mjs';
import { veredicto } from '../modelo/ejecucion.mjs';
import { procedencia } from '../modelo/consola.mjs';
import { crearEscenaGemelo } from '../vision/escena-gemelo.js';
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
  let gemeloCodigoPedido = null, gemeloAviso = '';
  let visor = null, generacion = 0;
  const raiz = $('vistas');
  let simbolosDatos = [], simboloElegido = null, ejemploElegido = 0;
  const listaLateral = document.createElement('div'); listaLateral.id = 'vistas-lista'; listaLateral.hidden = true; $('paleta').append(listaLateral);
  const propiedad = (nombre, control) => `<label class="prop"><span class="lbl">${nombre}</span>${control}</label>`;
  const seccion = (titulo, contenido) => `<div class="sec"><div class="sec-head">${titulo}</div>${contenido}</div>`;
  raiz.innerHTML = `
    <div id="vistas-lienzo">
      <section data-vista="ejemplos" hidden><div class="frame-label" id="ejemplo-nombre"></div><div class="frame" id="ejemplo-plano"></div><div class="frame-label">Texto SCuLPT</div><pre class="frame code" id="ejemplo-codigo"></pre></section>
      <section data-vista="gemelo" hidden>
        <div class="frame-label" id="gemelo-titulo">Gemelo digital</div>
        <div class="gemelo-espacio">
          <div class="gemelo-mesa"><div class="frame" id="gemelo-escena3d" aria-label="Mesa con las cámaras virtuales"></div><p class="nota">Arrastra una cámara para moverla. Gira la vista con el ratón: la cámara de inspección no altera las virtuales.</p></div>
          <div class="gemelo-monitores">
            <div class="frame-label" id="gemelo-monitor-titulo">Monitor</div>
            <div class="frame" id="gemelo-monitor"></div>
            <div class="frame-label">Otras cámaras</div>
            <div class="frame" id="gemelo-otras"></div>
          </div>
        </div>
        <div class="frame-label">Lecturas, fusión y programa candidato</div><div class="frame" id="gemelo-conjunto"></div>
      </section>
      <section data-vista="camaras" hidden><div id="mapa-camaras"></div><p id="camaras-vacio" class="canvas-note">Montaje de referencia. Añade tus cámaras desde el panel derecho para registrar sus posiciones y ver las imágenes reales.</p><div id="camaras-lista"></div></section>
      <section data-vista="calibracion" hidden><div class="frame-label">Captura actual</div><div class="frame captura-frame"><img id="cal-imagen" alt="Vista de la cámara seleccionada" hidden><p id="cal-vacio" class="nota">Conecta una cámara y selecciona su vista.</p></div><div id="cal-grafica" hidden></div></section>
      <section data-vista="simbolos" hidden><div class="frame-label">Preparación del ensayo</div><div class="frame" id="ensayo-vocabulario"></div><div id="simbolos-lista"></div></section>
      <section data-vista="piezas" hidden><div class="frame-label">Piezas que computan</div><div class="frame pieces">${MODELOS.slice(0,4).map(([archivo, nombre]) => `<button class="pcard" data-modelo="${archivo}"><div class="pimg"><img hidden data-miniatura="${archivo}" alt="${nombre}"></div><div class="pname">${nombre}</div></button>`).join('')}</div><div class="frame-label">Piezas de estructura</div><div class="frame pieces">${MODELOS.slice(4).map(([archivo, nombre]) => `<button class="pcard" data-modelo="${archivo}"><div class="pimg"><img hidden data-miniatura="${archivo}" alt="${nombre}"></div><div class="pname">${nombre}</div></button>`).join('')}</div><p class="canvas-note">Las piezas de estructura sostienen la escultura. No cambian el programa.</p><div class="frame-label" id="modelo-titulo"></div><div class="frame" id="modelo-visor" aria-label="Vista 3D de la pieza"></div></section>
    </div>
    <aside id="vistas-propiedades" class="panel">
      <div id="vista-mensaje" role="status" hidden></div>
      <div data-prop="ejemplos" hidden>${seccion('Ejemplo', '<div id="ejemplo-descripcion"></div><p class="nota" id="ejemplo-forma"></p><div class="acciones"><button class="accion" id="ejemplo-mesa">Cargar en mesa</button><button class="accion primaria" id="ejemplo-ejecucion">Ver ejecución</button><button class="accion" id="ejemplo-gemelo">Abrir en el Gemelo</button></div>')}${seccion('Montaje', '<button class="accion" id="ejemplo-gravedad">Ver con gravedad</button><p class="nota">Sujeta un extremo del montaje y levántalo. Cada bloque gira en su conector y se apoya en la mesa al soltarlo.</p><button class="accion" id="ejemplo-restaurar" disabled>Restaurar mi montaje</button>')}</div>
      <div data-prop="camaras" hidden>
        ${seccion('Resultado', '<div id="lectura-estado"></div><pre id="lectura-codigo" class="code"></pre><label class="toggle-row">Actualizar la mesa<input type="checkbox" id="lectura-aplicar"><span class="toggle"></span></label><p class="nota">Hay dos señales de estabilidad distintas. Cada cámara dice si <b>su vista</b> lleva 0.8 s quieta; la fusión dice si <b>el programa</b> lleva 0.8 s sin cambiar. La que habilita la ejecución es la del origen principal, marcada en la lista. Una ficha «sin contradicción» tiene posición y símbolo que ninguna cámara desmiente, y eso puede venir de una sola vista: no es corroboración independiente. Sin profundidad no se distingue una ficha tapada de una que nadie miró. Los encajes se estiman por geometría.</p>')}
        ${seccion('Lectura compartida', `<form id="fusion-form">${propiedad('Origen','<select class="fld" name="modo"><option value="fusion">Combinar cámaras</option><option value="individual">Una sola vista</option></select>')}${propiedad('Paso 1 par. (mm)','<input class="fld" name="paso_mm" type="number" min="20" max="300" step="0.1" required>')}${propiedad('Paso 2 par. (mm)','<input class="fld" name="paso_2_mm" type="number" min="20" max="300" step="0.1" placeholder="opcional">')}<p class="nota">Distancia entre los centros de las fichas de operación de dos bloques consecutivos, medida sobre el montaje armado. Los bloques de uno y dos parámetros dan pasos distintos: mide los dos. Deja el segundo vacío solo si toda la cadena usa el mismo tamaño. No pongas el promedio; consulta MEDIR_PASO.md. Con los dos pasos, la distancia esperada se ata a la operación: PUSH y MOV llevan bloque de dos parámetros, y POP, DUP, NEG, ? y JMP de uno. CMP y las aritméticas admiten uno o dos, así que su unión se informa como sin confirmar en vez de darse por buena. Todas las cámaras deben estar registradas en Calibración.</p><button class="accion" type="submit">Guardar lectura</button></form><div id="fusion-resumen" class="nota"></div><div id="fusion-piezas"></div><button class="accion" id="fusion-reiniciar">Reiniciar seguimiento</button><p class="nota">Si retiraste piezas, reinicia cuando la mesa esté visible. No se borran piezas por una oclusión.</p>`)}
        ${seccion('Lecturas por cámara', '<div id="cam-lecturas-panel"></div><p class="nota">Los puntajes miden similitud, no probabilidad. Una cámara que no ve una ficha no vota en su contra.</p>')}
        ${seccion('Cámara', `<div id="cam-controles"></div><details><summary>Añadir cámara</summary><form id="camara-form">${propiedad('Nombre','<input class="fld" name="nombre" placeholder="Cenital…" maxlength="80" required>')}${propiedad('Dispositivo','<select class="fld" name="tipo"><option value="webcam">Webcam</option><option value="kinect">Kinect v2</option><option value="realsense">RealSense</option></select>')}${propiedad('Índice / serial','<input class="fld" name="fuente" value="0">')}${propiedad('Aporte','<select class="fld" name="rol"><option value="simbolos">Símbolos</option><option value="profundidad">Profundidad</option><option value="ambos">Ambos</option></select>')}<button class="accion primaria" type="submit">Añadir cámara</button></form></details><details><summary>Montajes y controladores</summary><div id="adaptadores"></div><p class="nota">A: RealSense y webcams. B: Kinect v2 y webcams. Kinect de Xbox 360 es v1 y aún no tiene adaptador; identifica el modelo antes de conectarlo.</p></details>`)}
      </div>
      <div data-prop="calibracion" hidden>
        ${seccion('Tablero', `<form id="calibracion-form">${propiedad('Cámara','<select class="fld" name="id" id="cal-camara"></select>')}${propiedad('Columnas','<input class="fld" name="columnas" type="number" min="3" max="20" value="9" required>')}${propiedad('Filas','<input class="fld" name="filas" type="number" min="3" max="20" value="6" required>')}${propiedad('Cuadro (mm)','<input class="fld" name="mm" type="number" min="1" max="200" step="0.1" value="25" required>')}<p class="nota">Cuenta las esquinas interiores. Mide el tablero impreso.</p><button class="accion" type="submit">Reiniciar capturas</button></form>`)}
        ${seccion('Capturas', '<p id="cal-estado"></p><div class="acciones"><button class="accion" id="cal-capturar">Capturar tablero</button><button class="accion primaria" id="cal-calcular">Calcular</button></div><p class="nota">Al menos 15 vistas distintas, con el tablero en varios ángulos y posiciones.</p>')}
        ${seccion('Error de reproyección', '<div id="cal-error"></div><p class="nota">La calibración es buena por debajo de 1 px. Repite el registro si se mueve una cámara.</p>')}
        ${seccion('Posición común', '<button class="accion" id="cal-registrar">Registrar cámaras</button><p class="nota">El mismo tablero inmóvil debe verse en todas las cámaras conectadas, con igual origen y orientación.</p><div id="cal-resultados"></div>')}
      </div>
      <div data-prop="gemelo" hidden>
        ${seccion('Escena', '<select class="fld" id="gemelo-escena"></select><p class="nota" id="gemelo-descripcion"></p><div class="acciones"><button class="accion" id="gemelo-reiniciar">Reiniciar</button><button class="accion" id="gemelo-atras">Paso atrás</button><button class="accion primaria" id="gemelo-paso">Siguiente paso</button></div><label class="toggle-row">Reproducir el armado<input type="checkbox" id="gemelo-reproducir"><span class="toggle"></span></label><p class="nota" id="gemelo-paso-actual"></p>')}
        ${seccion('Cámara seleccionada', '<select class="fld" id="gemelo-camara"></select><div id="gemelo-pose"></div><div class="acciones"><button class="accion" id="gemelo-anadir">Añadir cámara</button><button class="accion" id="gemelo-quitar">Quitar</button><button class="accion" id="gemelo-guardar">Guardar configuración</button></div>')}
        ${seccion('Unión seleccionada', '<div id="gemelo-union"></div>')}
        ${seccion('Intérprete', '<div id="gemelo-scala"></div><p class="nota">La validez la decide Scala sobre el programa candidato. Es independiente de la certeza de la lectura visual.</p>')}
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
  $('ejemplo-gemelo').onclick = () => { gemeloCodigoPedido = EJEMPLOS[ejemploElegido].codigo; navegar('gemelo'); };
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
  let motorLectura = null, firmaLectura = '', dictamenLectura = null, tiempoLectura;
  function detenerValidacion() { motorLectura?.terminate(); motorLectura = null; clearTimeout(tiempoLectura); }
  function pintarDictamen(origen, titulo, detalle, color) {
    $('lectura-estado').innerHTML = `<div class="dictamen"><span class="dictamen-origen">${escapar(origen)}</span>`
      + `<span><b class="${color}">${escapar(titulo)}</b>${detalle ? `<div class="nota">${escapar(detalle)}</div>` : ''}</span></div>`;
  }
  function resultadoLectura(principal) {
    const instrucciones = principal?.instrucciones || [];
    const incompleta = !!instrucciones.length && !puedeAplicarLectura({...principal, estable:true});
    if (!puedeAplicarLectura(principal)) {
      detenerValidacion(); firmaLectura = ''; dictamenLectura = null;
      const motivo = principal?.avisos?.join(' ') || (incompleta ? 'Revisa las fichas antes de ejecutar.' : principal ? 'Esperando que la lectura se mantenga quieta.' : 'Selecciona una cámara para el programa.');
      pintarDictamen('mesa', incompleta ? 'Lectura incompleta' : 'Lectura no confirmada', motivo, incompleta ? 'errc' : '');
      return;
    }
    const firma = principal.id + codigoLectura(principal);
    if (firma !== firmaLectura) {
      detenerValidacion(); firmaLectura = firma; dictamenLectura = null;
      motorLectura = new Worker(new URL('../interprete-worker.js', import.meta.url), {type:'module'});
      const terminar = resultado => { if (firmaLectura !== firma) return; detenerValidacion(); dictamenLectura = resultado; };
      motorLectura.onmessage = ({data}) => terminar(data.resultado);
      motorLectura.onerror = () => terminar({valido:false, etapa:'motor', decide:'sistema', mensaje:'No se pudo cargar el intérprete.'});
      tiempoLectura = setTimeout(() => terminar({valido:false, etapa:'tiempo', decide:'sistema', mensaje:'La validación tardó demasiado.'}), 10000);
      motorLectura.postMessage({revision:1, codigo:instrucciones.map(i => [i.token,...i.operandos].join(' ')).join('\n')+'\n'});
    }
    if (!dictamenLectura) { pintarDictamen('mesa', 'Validando…', 'Consultando al intérprete.', ''); return; }
    const v = veredicto({bloques: instrucciones.length, resultado: dictamenLectura, origen: 'camara'});
    pintarDictamen(procedencia(dictamenLectura), v.titulo, v.detalle, v.color);
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
      tarjeta.querySelector('.cam-estado').textContent = `${c.estado}${c.resolucion ? ' · ' + c.resolucion.join(' × ') : ''}${c.estable ? ' · vista quieta' : ''}${estado.configuracion_fusion?.modo === 'individual' && estado.principal === c.id ? ' · fuente del programa, su señal habilita la ejecución' : ''}`;
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
      const f = $('fusion-form').elements; f.modo.value = config.modo; f.paso_mm.value = config.paso_mm; f.paso_2_mm.value = config.paso_2_mm ?? '';
    }
    const fusion = estado.fusion;
    $('fusion-resumen').textContent = config.modo === 'fusion' ? fusion ? `${fusion.piezas.length} piezas en seguimiento · ${fusion.camaras.length} cámaras sincronizadas${fusion.desfase_ms == null ? '' : ' · separación ' + fusion.desfase_ms + ' ms'}` : 'Esperando el estado compartido.' : 'Lectura de una vista: no combina observaciones ni resuelve oclusiones.';
    const nombres = Object.fromEntries(estado.camaras.map(c => [c.id,c.nombre]));
    const estadosPieza = {confirmada:'Leída',ambigua:'Ambigua',oculta:'Oculta',no_observada:'Sin observación reciente'};
    $('fusion-piezas').hidden = config.modo !== 'fusion';
    $('fusion-piezas').innerHTML = (fusion?.piezas || []).map(p => { const leen = p.lectores || p.camaras; return `<div class="pieza-observada"><div><span class="mono">${escapar(estado.etiquetas?.[p.lexema] || p.lexema)}</span><span class="${p.estado === 'confirmada' ? (leen.length === 1 ? 'avisoc' : '') : 'errc'}">${escapar(estadosPieza[p.estado] || p.estado)}${p.estado === 'confirmada' ? ` · ${leen.length === 1 ? 'una sola vista, sin corroboración independiente' : leen.length + ' vistas que coinciden'}` : ''}</span></div><div class="nota">${escapar(p.id)} · ${escapar(leen.map(id => nombres[id] || id).join(', ') || 'ninguna vista la identifica')}${p.candidatos?.length ? ' · similitud ' + p.candidatos[0].puntaje.toFixed(2) : ''}</div></div>`; }).join('');
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
  function rotuloOrigen(s) {
    const renders = s.fotos.length - (s.fotografiadas || 0);
    if (!s.fotos.length) return 'Sin registrar';
    if (!s.fotografiadas) return renders === 1 ? 'render' : `${renders} renders`;
    const reales = `${s.fotografiadas} ${s.fotografiadas === 1 ? 'ficha real' : 'fichas reales'}`;
    return renders ? `${reales} · ${renders} render${renders === 1 ? '' : 's'}` : reales;
  }
  async function ensayoVocabulario(nombre) {
    const caja = $('ensayo-vocabulario');
    try {
      const r = await api('simbolos/ensayo?programa=' + encodeURIComponent(nombre || 'minimo'));
      const grupo = (titulo, items, clase, detalle) => items.length
        ? `<div class="frame-label">${titulo}</div><div class="ensayo-lista">${items.map(s => `<span class="ensayo-item ${clase}"><span class="mono">${escapar(s.lexema)}</span> ${escapar(s.tipo)}${detalle(s) ? ' · ' + escapar(detalle(s)) : ''}</span>`).join('')}</div>` : '';
      caja.innerHTML = `<div class="ensayo-cabecera">
          <select class="fld" id="ensayo-programa">${r.disponibles.map(n => `<option value="${n}" ${n === r.programa ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <span class="nota">${r.declarados} declarados · ${r.con_plantilla} con plantilla · <b class="${r.desde_ficha ? '' : 'errc'}">${r.desde_ficha} desde ficha real</b></span>
        </div>
        <div class="ensayo-cabecera">
          <span class="nota ${r.plantillas_render ? 'avisoc' : ''}">${r.solo_fotos ? 'El clasificador usa solo fotos de fichas reales.'
            : !r.plantillas_foto ? 'El clasificador usa solo renders: ninguna medida de acierto describiría fichas reales.'
            : r.plantillas_render ? `El clasificador mezcla ${r.plantillas_foto} plantilla${r.plantillas_foto === 1 ? '' : 's'} de ficha real con ${r.plantillas_render} de render${r.mixtos.length ? ', y en ' + escapar(r.mixtos.join(', ')) + ' conviven las dos' : ''}. Una tasa de acierto medida así no es el rendimiento con fichas reales.`
            : 'El clasificador usa solo fotos de fichas reales.'}</span>
        </div>
        <pre class="frame code ensayo-codigo">${escapar(r.codigo)}</pre>
        ${grupo('Listos', r.listos, 'okc', () => '')}
        ${grupo('Provisionales, no acreditan lectura física', r.provisionales, 'avisoc', s => s.origen)}
        ${grupo('Falta fotografiar', r.faltan, 'errc', s => s.motivo)}
        <p class="nota">${r.faltan.length ? 'Captura estas fichas antes del ensayo. Consulta CAPTURA_REFERENCIAS.md.' : 'No falta ningún símbolo para este programa.'}</p>`;
      $('ensayo-programa').onchange = e => ensayoVocabulario(e.target.value);
    } catch (error) {
      caja.innerHTML = `<p class="nota errc">No se pudo consultar la preparación: ${escapar(error.message)}</p>`;
    }
  }
  const ROTULO_VISTA = {asociada: 'la fusión usó esta lectura', contradice: 'propone otro símbolo',
    ilegible: 'la detecta pero no la lee', sin_deteccion: 'la encuadra y no detecta nada', fuera: 'fuera de encuadre'};
  const CLASE_VISTA = {asociada: '', contradice: 'errc', ilegible: 'avisoc', sin_deteccion: 'avisoc', fuera: ''};
  const PROCEDENCIA = {
    coincidencia_independiente: ['Coincidencia independiente', 'okc', 'Dos o más cámaras la sitúan y la leen igual.'],
    observacion_unica: ['Observación única', 'avisoc', 'Una sola cámara la sostiene; nadie la desmiente, pero nadie la corrobora.'],
    inferencia_geometrica: ['Inferencia geométrica', 'avisoc', 'Su posición sale de la nube de profundidad, no de dos vistas.'],
    ambigua: ['Ambigua', 'errc', 'Las lecturas no coinciden entre sí.'],
    oculta: ['Oculta comprobada', 'errc', 'La profundidad confirma que algo la tapa.'],
    sin_informacion: ['Sin información', 'errc', 'Ninguna cámara la observó en este paso.'],
  };
  let gemeloUnion = null, gemeloEstado = null, gemeloCamara = null, gemeloMotor = null, gemeloFirma = '', gemeloVeredicto = null, gemeloReloj = null, escena3d = null, gemeloPeticion = 0, gemeloMoviendo = false, gemeloPendiente = null;

  function vistaDe(id) {
    return gemeloEstado?.camaras.find(c => c.id === id) ?? null;
  }

  const PUERTOS = {
    vastago_plano: 'entrada por el extremo plano del vástago',
    vastago_esferico: 'salida por el extremo esférico',
    rama: 'entrada por la rama',
  };

  function pintarUnion() {
    const caja = $('gemelo-union');
    if (!caja) return;
    const t = gemeloUnion;
    if (!t) { caja.innerHTML = '<p class="nota">Toca una unión o una T en la mesa para ver sus puertos.</p>'; return; }
    if (t.ficha) {
      const pieza = gemeloEstado?.fusion.piezas.find(p => p.id === t.ficha);
      caja.innerHTML = pieza
        ? `<div class="prop"><span class="lbl">Ficha</span><div class="fld mono">${escapar(pieza.lexema)}</div></div>
           <p class="nota">${escapar((PROCEDENCIA[pieza.procedencia] || ['', '', ''])[2] || '')}</p>`
        : '<p class="nota">Esa ficha todavía no la ha localizado ninguna cámara.</p>';
      return;
    }
    const u = t.union;
    if (u.tipo === 'te') {
      caja.innerHTML = `<div class="prop"><span class="lbl">Unión</span><div class="fld">Conector en T</div></div>
        <div class="ensayo-lista">${(u.puertos || []).map(p => `<span class="ensayo-item">${escapar(PUERTOS[p] || p)}</span>`).join('')}</div>
        <p class="nota errc">Estado: sin resolver. El lenguaje admite que una T una dos caminos en uno, pero la distancia entre bloques no dice cuál rama entra y cuál sale, así que la lectura queda pendiente.</p>`;
      return;
    }
    caja.innerHTML = `<div class="prop"><span class="lbl">Unión</span><div class="fld">Conector recto</div></div>
      <p class="nota avisoc">Estado: estimada. La distancia entre los dos bloques encaja con un paso medido, pero ninguna cámara detecta el conector, así que la unión no se da por observada.</p>`;
  }

  function pintarMonitor() {
    const c = vistaDe(gemeloCamara);
    $('gemelo-monitor-titulo').textContent = c ? `Monitor · ${c.nombre}` : 'Monitor';
    if (!c) { $('gemelo-monitor').innerHTML = '<p class="nota">Selecciona una cámara en la mesa.</p>'; return; }
    const leidas = c.observaciones.filter(o => o.lexema !== '<sin leer>');
    $('gemelo-monitor').innerHTML = `<img alt="Render desde ${escapar(c.nombre)}" src="${c.imagen}">
      <p class="nota">${c.cobertura.campo_mm} mm de campo · ${c.cobertura.px_por_mm} px/mm · ficha ${c.cobertura.ficha_px} px${c.cobertura.suficiente ? '' : ' <b class="errc">por debajo del mínimo utilizable</b>'}</p>
      <div class="ensayo-lista">${leidas.map(o => `<span class="ensayo-item okc"><span class="mono">${escapar(o.lexema)}</span> ${o.candidatos[0] ? o.candidatos[0].puntaje.toFixed(2) : ''}</span>`).join('') || '<span class="nota">Nada legible desde aquí.</span>'}</div>
      <p class="nota${c.sin_leer ? ' errc' : ''}">${c.sin_leer} región${c.sin_leer === 1 ? '' : 'es'} detectada${c.sin_leer === 1 ? '' : 's'} sin poder leerse</p>`;
    $('gemelo-otras').innerHTML = gemeloEstado.camaras.map(o => `<button data-otra="${escapar(o.id)}" class="${o.id === gemeloCamara ? 'sel' : ''}">
      <img alt="Vista de ${escapar(o.nombre)}" src="${o.imagen}"><span class="cap">${escapar(o.nombre)} · ${o.observaciones.filter(x => x.lexema !== '<sin leer>').length} leídas</span></button>`).join('');
  }

  function pintarGemelo() {
    const g = gemeloEstado;
    if (!g) return;
    $('gemelo-titulo').textContent = `Gemelo digital · ${g.escena} · paso ${g.paso}`;
    $('gemelo-descripcion').textContent = g.descripcion;
    $('gemelo-paso-actual').textContent = `Imágenes sintéticas. Verdad conocida: ${g.verdad.join(', ') || 'ninguna'}.`;
    if ($('gemelo-escena').options.length !== g.escenas.length) {
      $('gemelo-escena').innerHTML = g.escenas.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    $('gemelo-escena').value = g.escena;
    escena3d?.actualizar(g);
    pintarMonitor();
    pintarUnion();
    const f = g.fusion;
    const lecturas = g.camaras.map(c => `<div class="gemelo-lectura"><h4>${escapar(c.nombre)}</h4>
      <div class="ensayo-lista">${c.observaciones.map(o => `<span class="ensayo-item ${o.lexema === '<sin leer>' ? 'errc' : 'okc'}"><span class="mono">${escapar(o.lexema)}</span></span>`).join('') || '<span class="nota">Sin observaciones.</span>'}</div></div>`).join('');
    const piezas = f.piezas.map(p => {
      const [titulo, clase, ayuda] = PROCEDENCIA[p.procedencia] || [p.procedencia, '', ''];
      const vistas = p.vistas || [];
      const por = c => vistas.filter(v => v.clase === c);
      const asociadas = por('asociada'), contradicen = por('contradice');
      const ilegibles = por('ilegible'), ciegas = por('sin_deteccion'), fuera = por('fuera');
      const filas = vistas.filter(v => v.clase !== 'fuera').map(v => `<div class="vista-ficha ${CLASE_VISTA[v.clase] || ''}">
          <span class="vf-camara">${escapar(v.nombre)}</span>
          <span class="vf-lee">${ROTULO_VISTA[v.clase] || v.clase}${v.propone ? `: <b class="mono">${escapar(v.propone)}</b>` : ''}${v.candidatos && v.candidatos[0] ? ' · ' + v.candidatos[0].puntaje.toFixed(2) : ''}</span></div>`).join('');
      const partes = [`${p.respaldo ?? asociadas.length} de ${vistas.length} cámaras la respaldan`];
      if (contradicen.length) partes.push(`${contradicen.length} propone${contradicen.length === 1 ? '' : 'n'} otro símbolo`);
      if (ilegibles.length) partes.push(`${ilegibles.length} la detecta${ilegibles.length === 1 ? '' : 'n'} sin poder leerla`);
      if (ciegas.length) partes.push(`${ciegas.length} la encuadra${ciegas.length === 1 ? '' : 'n'} sin detectar nada`);
      if (fuera.length) partes.push(`${fuera.length} fuera de encuadre`);
      const resumen = partes.join(' · ');
      const motivo = p.estado === 'confirmada'
        ? (asociadas.length > 1 ? 'Se acepta porque dos o más vistas independientes coinciden.' : 'Se acepta con una sola vista: nadie la corrobora ni la desmiente.')
        : 'Queda pendiente: ' + (contradicen.length ? 'las vistas no coinciden.' : ilegibles.length ? 'se detecta pero no se identifica con margen suficiente.' : 'ninguna cámara la observa ahora.');
      return `<div class="pieza-observada"><div><span class="mono">${escapar(p.lexema)}</span><span class="${clase}">${titulo}</span>${p.provisional ? '<span class="avisoc">lectura anterior conservada</span>' : ''}</div>
        <div class="nota">${resumen}. ${escapar(motivo)}</div>
        <div class="vistas-ficha">${filas || '<span class="nota">Ninguna cámara la encuadra en este paso.</span>'}</div></div>`;
    }).join('');
    const est = g.estructura || {};
    const estructura = `<div class="prop"><span class="lbl">Estructura</span><div class="fld">${
      (est.tes || []).length ? `${est.tes.length} unión${est.tes.length === 1 ? '' : 'es'} en T` : 'sin uniones en T'
    } · ${(est.conexiones || []).length} conexión${(est.conexiones || []).length === 1 ? '' : 'es'} de montaje · ${est.soportes || 0} soporte${est.soportes === 1 ? '' : 's'} · ${est.fondos || 0} fondo${est.fondos === 1 ? '' : 's'}</div></div>
      <p class="nota${est.uniones_confirmadas ? '' : ' avisoc'}">Las uniones entre bloques se estiman por la distancia medida; ninguna cámara observa el conector, así que no se dan por confirmadas. Una T une dos caminos en uno, pero la distancia no dice cuál rama entra y cuál sale.</p>`;
    const disponibles = f.piezas.map(p => p.lexema);
    const faltan = [];
    for (const v of g.verdad) {
      const n = disponibles.indexOf(v);
      if (n < 0) faltan.push(v); else disponibles.splice(n, 1);
    }
    const cuenta = faltan.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {});
    const faltanTexto = Object.entries(cuenta).map(([v, n]) => n > 1 ? `${v} (${n})` : v);
    $('gemelo-conjunto').innerHTML = `${gemeloAviso ? `<p class="nota avisoc">${escapar(gemeloAviso)}</p>` : ''}
      <div class="gemelo-lecturas">${lecturas}</div>
      <div class="prop"><span class="lbl">Programa</span><pre class="fld mono">${escapar(g.codigo || '(sin instrucciones)')}</pre></div>
      <div class="prop"><span class="lbl">Fusión</span><div class="fld">${escapar(f.estado)} · revisión ${f.revision} · ${f.habilita_ejecucion ? 'habilita la ejecución' : 'no habilita la ejecución'}</div></div>
      ${estructura}
      ${piezas || '<p class="nota">Ninguna pieza localizada todavía.</p>'}
      ${faltan.length ? `<p class="nota errc">Sin información de: ${escapar(faltanTexto.join(', '))}. Se cuenta ficha a ficha, no por símbolo. No se sustituye por la verdad conocida.</p>` : ''}
      ${f.avisos.map(a => `<p class="nota errc">${escapar(a)}</p>`).join('')}`;
    validarConScala(g.codigo, f.habilita_ejecucion);
  }

  function validarConScala(codigo, habilita) {
    const destino = $('gemelo-scala');
    if (!codigo.trim()) {
      gemeloFirma = ''; gemeloVeredicto = null;
      destino.innerHTML = '<p class="nota">La fusión todavía no propone un programa que validar.</p>';
      return;
    }
    if (codigo !== gemeloFirma) {
      gemeloMotor?.terminate();
      gemeloFirma = codigo; gemeloVeredicto = null;
      gemeloMotor = new Worker(new URL('../interprete-worker.js', import.meta.url), {type: 'module'});
      const firma = codigo;
      gemeloMotor.onmessage = ({data}) => { if (firma !== gemeloFirma) return; gemeloVeredicto = data.resultado; gemeloMotor?.terminate(); gemeloMotor = null; pintarScala(habilita); };
      gemeloMotor.onerror = () => { if (firma !== gemeloFirma) return; gemeloVeredicto = {valido: false, etapa: 'motor', decide: 'sistema', mensaje: 'No se pudo cargar el intérprete.'}; pintarScala(habilita); };
      gemeloMotor.postMessage({revision: 1, codigo: codigo + '\n'});
    }
    pintarScala(habilita);
  }

  function pintarScala(habilita) {
    const destino = $('gemelo-scala');
    if (!gemeloVeredicto) { destino.innerHTML = '<p class="nota">Consultando al intérprete…</p>'; return; }
    const v = veredicto({bloques: 1, resultado: gemeloVeredicto, origen: 'camara'});
    const traza = gemeloVeredicto.traza || [];
    const siguiente = traza.length ? traza[0].siguiente : null;
    const ejecucion = gemeloVeredicto.etapa === 'runtime';
    destino.innerHTML = `<div class="dictamen"><span class="dictamen-origen">${escapar(procedencia(gemeloVeredicto))}</span>
        <span><b class="${v.color}">${escapar(v.titulo)}</b>${v.detalle ? `<div class="nota">${escapar(v.detalle)}</div>` : ''}</span></div>
      <p class="nota${habilita ? '' : ' avisoc'}">${habilita
        ? 'Veredicto sobre el programa que las cámaras ya dan por leído.'
        : 'Veredicto sobre un programa candidato que las cámaras todavía no dan por leído. No valida el montaje.'}</p>
      <p class="nota">${traza.length > 1 ? `Traza de ${traza.length - 1} paso${traza.length === 2 ? '' : 's'}. Siguiente instrucción: ${siguiente == null ? 'fin' : siguiente + 1}.` : 'Sin traza recorrible.'}</p>
      ${ejecucion ? '<p class="nota">Es un error de ejecución del propio programa candidato, no un fallo de lectura: el intérprete llegó a ejecutarlo y se quedó sin valores en la pila. Por ejemplo, <span class="mono">ADD a</span> saca dos valores de <span class="mono">a</span> y solo hay uno.</p>' : ''}
      <div class="dos-preguntas">
        <div><b>¿Qué vieron las cámaras?</b><p class="nota ${habilita ? 'okc' : 'avisoc'}">${habilita
          ? 'La lectura está completa y quieta, así que se puede ejecutar lo leído.'
          : 'La lectura todavía no basta para ejecutar: falta una ficha, algo se mueve o las cámaras no coinciden.'}</p></div>
        <div><b>¿Qué dice el lenguaje?</b><p class="nota">${escapar(v.titulo)}. Scala juzga el programa candidato aunque las cámaras no estén seguras, y las cámaras pueden estar seguras de un programa que Scala rechaza. Son dos preguntas distintas.</p></div>
      </div>`;
  }

  function pintarPoseGemelo() {
    const g = gemeloEstado;
    if (!g) return;
    if ($('gemelo-camara').options.length !== g.camaras.length) {
      $('gemelo-camara').innerHTML = g.camaras.map(c => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('');
    }
    if (!g.camaras.some(c => c.id === gemeloCamara)) gemeloCamara = g.camaras[0]?.id;
    $('gemelo-camara').value = gemeloCamara;
    const c = g.camaras.find(c => c.id === gemeloCamara);
    if (!c) return;
    if ($('gemelo-pose').contains(document.activeElement)) return;
    const eje = (etiqueta, campo, indice, valor) => propiedad(etiqueta, `<input class="fld mono" type="number" step="5" data-pose="${campo}" data-indice="${indice}" value="${Math.round(valor)}">`);
    $('gemelo-pose').innerHTML = eje('Posición X', 'centro', 0, c.centro[0]) + eje('Posición Y', 'centro', 1, c.centro[1]) + eje('Posición Z', 'centro', 2, c.centro[2])
      + eje('Mira a X', 'objetivo', 0, c.objetivo[0]) + eje('Mira a Y', 'objetivo', 1, c.objetivo[1]) + eje('Mira a Z', 'objetivo', 2, c.objetivo[2])
      + propiedad('Campo (°)', `<input class="fld mono" type="number" step="1" min="10" max="120" data-pose="fov" value="${Math.round(c.fov)}">`)
      + `<p class="nota">Dirección ${c.direccion.map(v => v.toFixed(2)).join(', ')}</p>`;
  }

  function abrirEscena3d() {
    if (escena3d) return;
    escena3d = crearEscenaGemelo($('gemelo-escena3d'), {
      alSeleccionar: id => { gemeloCamara = id; pintarMonitor(); pintarPoseGemelo(); },
      alMover: (id, centro) => gemelo('mover', { id, centro }),
      alTocarUnion: tocado => { gemeloUnion = tocado; pintarUnion(); },
    });
  }

  function cerrarEscena3d() {
    escena3d?.destruir();
    escena3d = null;
  }

  async function mover(datos) {
    gemeloPendiente = {...(gemeloPendiente || {}), ...datos};
    if (gemeloMoviendo) return;
    gemeloMoviendo = true;
    try {
      while (gemeloPendiente) {
        const envio = gemeloPendiente; gemeloPendiente = null;
        await gemelo('mover', envio);
      }
    } finally { gemeloMoviendo = false; }
  }

  async function encadenarPaso() {
    if (!$('gemelo-reproducir').checked) return;
    await gemelo('paso', {incremento: 1});
    if (!$('gemelo-reproducir').checked) return;
    gemeloReloj = setTimeout(encadenarPaso, 200);
  }

  async function gemelo(accion, datos) {
    const turno = ++gemeloPeticion;
    try {
      abrirEscena3d();
      const recibido = accion ? await api('gemelo/' + accion, datos || {}) : await api('gemelo');
      if (turno !== gemeloPeticion) return;
      gemeloEstado = recibido;
      if (gemeloCodigoPedido) {
        const pedido = gemeloCodigoPedido.trim(); gemeloCodigoPedido = null;
        const catalogo = gemeloEstado.escenas_programa || {};
        const escena = Object.keys(catalogo).find(n => catalogo[n].join('\n') === pedido);
        if (escena) {
          gemeloAviso = '';
          if (escena !== gemeloEstado.escena) {
            const cargado = await api('gemelo/cargar', { escena });
            if (turno !== gemeloPeticion) return;
            gemeloEstado = cargado;
          }
        } else {
          gemeloAviso = 'El gemelo todavía no tiene una escena para ese ejemplo: su montaje no está representado en la mesa virtual. Se muestra la escena actual.';
        }
      }
      if (!gemeloCamara || !gemeloEstado.camaras.some(c => c.id === gemeloCamara)) {
        gemeloCamara = escena3d?.elegida ?? gemeloEstado.camaras[0]?.id ?? null;
      }
      escena3d?.seleccionar(gemeloCamara);
      pintarGemelo(); pintarPoseGemelo();
      if (!datos) escena3d?.encuadrar();
    } catch (error) { mensaje(error.message, true); }
  }

  async function simbolos() {
    try {
      const lista = await api('simbolos');
      simbolosDatos = lista;
      await ensayoVocabulario($('ensayo-programa')?.value);
      $('simbolos-lista').innerHTML = [['pila','Etiquetas de pila'],['operacion','Operaciones'],['literal','Valores']].map(([tipo,titulo]) => `<div class="frame-label">${titulo}</div><div class="frame ${tipo === 'operacion' ? 'ops-frame' : 'grid-frame'}">${lista.filter(s => s.tipo === tipo).sort((a,b) => tipo === 'operacion' ? ordenOperaciones.indexOf(a.lexema)-ordenOperaciones.indexOf(b.lexema) : 0).map(s => `<button class="${tipo === 'operacion' ? 'ocard ' + familia(s.lexema) : 'scard'}" data-simbolo="${escapar(s.lexema)}">${tipo === 'operacion' ? `<span class="oname">${escapar(s.lexema)}</span>` : `<div class="spad">${s.fotos[0] ? `<img alt="${escapar(s.nombre)}" src="${base}/api/foto/${encodeURIComponent(s.fotos[0])}">` : `<span class="glyph">${escapar(s.nombre)}</span>`}</div><span class="sname mono">${escapar(rotulo(s))}</span>`}<span class="${tipo === 'operacion' ? 'ocap' : 'scap'}${s.fotografiadas ? '' : (s.fotos.length ? ' avisoc' : ' errc')}">${rotuloOrigen(s)}</span></button>`).join('')}</div>`).join('');
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
  $('gemelo-escena').onchange = e => gemelo('cargar', {escena: e.target.value});
  $('gemelo-paso').onclick = () => gemelo('paso', {incremento: 1});
  $('gemelo-atras').onclick = () => gemelo('paso', {incremento: -1});
  $('gemelo-reiniciar').onclick = () => gemelo('reiniciar');
  $('gemelo-camara').onchange = e => { gemeloCamara = e.target.value; escena3d?.seleccionar(gemeloCamara); pintarMonitor(); pintarPoseGemelo(); };
  $('gemelo-otras').addEventListener('click', e => {
    const boton = e.target.closest('[data-otra]');
    if (!boton) return;
    gemeloCamara = boton.dataset.otra;
    escena3d?.seleccionar(gemeloCamara);
    pintarMonitor(); pintarPoseGemelo();
  });
  $('gemelo-quitar').onclick = () => gemelo('quitar', {id: gemeloCamara});
  $('gemelo-guardar').onclick = () => actuar(() => api('gemelo/guardar', {}), 'Configuración de cámaras guardada.');
  $('gemelo-anadir').onclick = () => {
    const usados = new Set((gemeloEstado?.camaras || []).map(c => c.id));
    let n = usados.size + 1;
    while (usados.has('virtual' + n)) n++;
    gemelo('anadir', {id: 'virtual' + n, nombre: 'Virtual ' + n});
  };
  $('gemelo-pose').addEventListener('change', e => {
    const campo = e.target.dataset.pose;
    if (!campo || !gemeloEstado) return;
    const c = gemeloEstado.camaras.find(c => c.id === gemeloCamara);
    if (!c) return;
    if (campo === 'fov') return void mover({id: gemeloCamara, fov: Number(e.target.value)});
    const valores = [...((gemeloPendiente || {})[campo] || c[campo])];
    valores[Number(e.target.dataset.indice)] = Number(e.target.value);
    mover({id: gemeloCamara, [campo]: valores});
  });
  $('gemelo-reproducir').addEventListener('change', e => {
    clearTimeout(gemeloReloj); gemeloReloj = null;
    if (e.target.checked) encadenarPaso();
  });
  $('simbolo-form').onsubmit = e => { e.preventDefault(); actuar(async () => { const f = datosFormulario('simbolo-form'); await api('simbolos/guardar', { nombre: f.nombre, tipo: f.tipo, imagen: await foto() }); await simbolos(); }, 'Referencia guardada y disponible para todas las cámaras.'); };
  $('simbolo-probar').onclick = () => actuar(async () => { const r = await api('simbolos/probar', { imagen: await foto() }); $('simbolo-prueba').innerHTML = r.candidatos.map(c => `<div class="simrow"><span class="mono">${escapar(c.nombre || c.lexema)}</span><span>${c.puntaje.toFixed(3)}</span></div>`).join('') || 'Sin trazo reconocible.'; }, 'Similitudes calculadas. No representan probabilidades.');
  async function ciclo() { await actualizar(); timer = setTimeout(ciclo, 250); }
  ciclo();
  window.addEventListener('pagehide', () => { clearTimeout(timer); cerrarVisor(); cerrarEscena3d(); detenerValidacion(); });
  return {
    mostrar(destino) {
      pagina = destino; const activa = !['mesa', 'ejecucion'].includes(destino); raiz.hidden = !activa;
      for (const s of raiz.querySelectorAll('[data-vista]')) s.hidden = s.dataset.vista !== destino;
      for (const s of raiz.querySelectorAll('[data-prop]')) s.hidden = s.dataset.prop !== destino;
      listaLateral.hidden = !activa;
      listaLateral.innerHTML = '';
      $('servicio-seccion').hidden = ['ejemplos', 'piezas'].includes(destino);
      if (destino === 'ejemplos') seleccionarEjemplo(ejemploElegido);
      if (destino !== 'gemelo') gemeloAviso = '';
      $('servicio-estado').hidden = ['ejemplos', 'piezas'].includes(destino);
      $('servicio-ayuda').hidden = !!estado || !['camaras', 'calibracion', 'simbolos'].includes(destino);
      mensaje(''); cerrarVisor();
      if (destino === 'gemelo') gemelo();
      if (destino !== 'gemelo') { clearTimeout(gemeloReloj); gemeloReloj = null; $('gemelo-reproducir').checked = false; cerrarEscena3d(); }
      if (destino === 'simbolos') simbolos();
      if (destino === 'piezas') { const cantidades = inventario(); $('inventario').innerHTML = propiedad('Piezas', `<div class="fld">${Object.values(cantidades).reduce((a,b) => a+b,0)}</div>`); listaLateral.innerHTML = '<h2>Lista de piezas</h2>' + MODELOS.map(([id,nombre]) => `<button class="layer" data-modelo="${id}"><span>${nombre}</span><span class="right-num">${cantidades[id] || 0}</span></button>`).join(''); miniaturas(); modelo('bloque_1_param'); }
      if (estado) pintarCamaras();
    },
    detenerLectura() { $('lectura-aplicar').checked = false; ultimaLectura = ''; },
  };
}
