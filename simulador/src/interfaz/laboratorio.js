const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numero = valor => Number.isFinite(valor) ? valor.toFixed(1) : '—';

export function crearLaboratorio(contenedor, { api, base }) {
  contenedor.className = 'laboratorio';
  contenedor.innerHTML = `
    <header><h2>Cámaras</h2></header>
    <p class="lab-mensaje" role="status" aria-live="polite"></p>
    <details class="lab-identificar"><summary>Añadir o identificar cámara</summary>
      <details class="lab-ayuda"><summary>Ayuda con el iPhone</summary><p>Activa Cámara de continuidad y deja el iPhone bloqueado. Si no aparece, conéctalo por USB y acepta Confiar.</p></details>
      <button class="accion lab-buscar" type="button">Buscar cámaras</button><p>Desconecta las cámaras para buscar. Puede tardar 48 s.</p><div class="lab-dispositivos"></div><div class="lab-camaras"></div>
    </details>
    <details><summary>Ajustes</summary>
      <form class="lab-detector"><label>Método RGB <select name="ruta"><option value="caras">Caras</option><option value="contornos">Contornos</option></select></label>
      <button class="accion" type="submit">Aplicar método</button></form>
      <p class="lab-ruta"></p><details class="lab-ayuda"><summary>Acerca del método</summary><p>Cámaras desconectadas para cambiar. Reinicia el seguimiento y se mantiene hasta reiniciar el servicio. RGB-D usa profundidad.</p></details>
      <div class="lab-preparacion"></div>
      <p>Calibración y referencias: menú Herramientas y página Calibración.</p>
    </details>
    <details><summary>Inspeccionar imagen</summary>
      <form class="lab-inspeccion"><label>Cámara <select name="id" class="lab-selector"></select></label><button class="accion" type="submit">Inspeccionar</button></form>
      <p>Una muestra, paso a paso.</p>
      <div class="lab-traza"></div>
    </details>
    <details><summary>Guardar prueba</summary>
      <form class="lab-captura">
        <label>Sesión <input name="sesion" required pattern="[a-zA-Z0-9_-]{1,64}" maxlength="64" value="prueba-${new Date().toISOString().slice(0,10)}"></label>
        <label>Escena <select name="escena"><option value="libre">Montaje en movimiento</option><option value="cadena">Cadena completa</option><option value="ficha_sola">Ficha sola</option><option value="mesa_vacia">Mesa vacía</option><option value="oclusion_mano">Mano que tapa fichas</option><option value="union_te">Unión en T</option><option value="ciclo">Ciclo</option><option value="salto">Salto</option><option value="negativo_objetos">Objetos sin fichas</option></select></label>
        <label>Duración en segundos <input name="duracion" type="number" min="1" max="120" value="10" required></label>
        <fieldset><legend>Cámaras de esta prueba</legend><div class="lab-seleccion"></div></fieldset>
        <label>Programa esperado (opcional)<textarea name="esperado" rows="4" maxlength="10000" placeholder="Escribe el programa que estás construyendo"></textarea></label>
        <button class="accion" type="submit">Iniciar prueba</button><button class="accion lab-detener" type="button">Detener prueba</button>
      </form>
      <p class="lab-trabajo"></p><div class="lab-descargas"></div>
      <details class="lab-ayuda"><summary>Archivos y formato</summary><p class="lab-carpeta"></p><p>Hasta 2 muestras/s, sin revisar. No es video completo. El esperado sirve solo para evaluar.</p></details>
    </details>
    <details><summary>Registro</summary><button class="accion lab-exportar" type="button">Exportar</button>
      <details class="lab-ayuda"><summary>Formato</summary><p>Últimas 100 acciones. Comandos para el puerto 8766. Registro completo en acciones.jsonl.</p></details><ol class="lab-eventos"></ol></details>`;
  const buscar = s => contenedor.querySelector(s);
  const paneles = [...contenedor.children].filter(n => n.tagName === 'DETAILS');
  const barra = document.createElement('nav');
  barra.className = 'lab-barra';
  barra.setAttribute('aria-label', 'Herramientas de cámaras');
  const nombres = ['＋ Añadir cámara', '⚙ Ajustes', '◫ Inspeccionar', '● Guardar prueba', '↗ Registro'];
  function abrirPanel(indice) {
    paneles.forEach((p, i) => { p.hidden = i !== indice; p.open = i === indice; });
    [...barra.children].forEach((b, i) => b.setAttribute('aria-expanded', String(i === indice)));
  }
  paneles.forEach((p, i) => {
    p.classList.add('lab-panel'); p.id = `lab-panel-${i}`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'accion';
    b.textContent = nombres[i]; b.setAttribute('aria-controls', p.id);
    b.onclick = () => abrirPanel(p.hidden ? i : -1);
    barra.append(b);
  });
  contenedor.querySelector('header').append(barra);
  abrirPanel(-1);
  let estado = null, firma = '', informeMostrado = '', ocupado = false, metodoPendiente = false, firmaPreparacion = '';
  buscar('.lab-detector select').onchange = () => { metodoPendiente = true; };
  const aviso = texto => { buscar('.lab-mensaje').textContent = texto; };
  async function actuar(accion, datos) {
    if (ocupado) return;
    ocupado = true;
    aviso('Procesando solicitud…');
    try {
      await api('laboratorio/' + accion, datos);
      if (accion === 'detector') metodoPendiente = false;
      aviso(accion === 'confirmar' ? 'Cámara identificada.' : 'Solicitud registrada.');
      actualizar(await api('estado'));
    } catch (e) { aviso(e.message); }
    finally { ocupado = false; }
  }
  buscar('.lab-detector').onsubmit = e => { e.preventDefault(); actuar('detector', Object.fromEntries(new FormData(e.currentTarget))); };
  buscar('.lab-inspeccion').onsubmit = e => { e.preventDefault(); actuar('traza', Object.fromEntries(new FormData(e.currentTarget))); };
  buscar('.lab-captura').onsubmit = e => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    datos.camaras = [...buscar('.lab-seleccion').querySelectorAll('input:checked')].map(i => i.value);
    actuar('capturar', datos);
  };
  buscar('.lab-buscar').onclick = () => actuar('identificar', {});
  buscar('.lab-dispositivos').onsubmit = async e => {
    e.preventDefault();
    try {
      const datos = Object.fromEntries(new FormData(e.target));
      await api('camaras/agregar', {...datos, tipo:'webcam', rol:'simbolos'});
      actualizar(await api('estado'));
      aviso('Cámara añadida. Pulsa Conectar junto a su imagen.');
    } catch (error) { aviso(error.message); }
  };
  buscar('.lab-detener').onclick = () => actuar('detener', {});
  buscar('.lab-camaras').onclick = e => {
    const boton = e.target.closest('[data-confirmar]');
    if (boton) actuar('confirmar', {id: boton.dataset.confirmar});
  };
  buscar('.lab-exportar').onclick = () => {
    const registro = (estado?.laboratorio?.eventos || []).map(e => `${e.fecha} · ${e.accion}\n${JSON.stringify(e.solicitud)}\n${e.comando}\n`).join('\n');
    const url = URL.createObjectURL(new Blob([registro], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'sculpter-acciones.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const archivo = ruta => `${base}/api/laboratorio/archivo/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  async function cargarTraza(ruta) {
    try {
      const respuesta = await fetch(archivo(ruta));
      if (!respuesta.ok) throw new Error('No se pudo abrir la inspección.');
      const traza = await respuesta.json();
      const carpeta = ruta.split('/')[0];
      buscar('.lab-traza').innerHTML = `<p><strong>Cuadro ${escapar(traza.vista.secuencia)} · ${escapar(traza.ruta_rgb)}</strong></p>
        <details><summary>Acerca de esta inspección</summary><p>${escapar(traza.nota)}</p></details><p>${escapar(traza.diagnostico.motivo || 'Consulta los candidatos de cada cara. Los puntajes son similitudes, no probabilidades.')}</p>
        <div class="lab-pasos">${traza.pasos.map(p => `<figure><img loading="lazy" src="${archivo(carpeta + '/' + p.archivo)}" alt="${escapar(p.titulo)}"><figcaption>${escapar(p.titulo)}</figcaption></figure>`).join('')}</div>
        <h3>Reconocimiento por cara</h3><ol>${traza.lecturas.map(l => `<li><strong>${escapar(l.lexema)}</strong> · ${escapar(l.motivo)} · ${escapar((l.candidatos || []).slice(0,3).map(c => c.lexema + ': ' + Number(c.puntaje).toFixed(3)).join(' · ') || 'Sin candidatos comparables')}</li>`).join('') || '<li>No se localizaron caras legibles en esta muestra.</li>'}</ol>
        <details><summary>Diagnóstico del detector</summary><pre>${escapar(JSON.stringify(traza.diagnostico, null, 2))}</pre></details>
        <details><summary>Fusión, programa y veredicto Scala al finalizar la inspección</summary><pre>${escapar(JSON.stringify({fusion:traza.estado_servicio.fusion, lectura:traza.estado_servicio.lectura, veredicto:traza.estado_servicio.veredicto}, null, 2))}</pre></details>
        <a href="${archivo(ruta)}" download="traza.json">Descargar diagnóstico</a>`;
    } catch (e) { informeMostrado = ''; aviso(e.message); }
  }
  function actualizar(nuevo) {
    estado = nuevo;
    const lab = estado?.laboratorio;
    if (!lab) {
      aviso('Servicio sin conexión o pendiente de reiniciar con el laboratorio.');
      contenedor.querySelectorAll('button').forEach(b => { b.disabled = true; });
      return;
    }
    contenedor.querySelectorAll('button').forEach(b => { b.disabled = false; });
    const camaras = estado.camaras;
    const nuevaFirma = JSON.stringify(camaras.map(c => [c.id,c.nombre,c.fuente]));
    if (firma !== nuevaFirma) {
      const elegidas = new Set([...buscar('.lab-seleccion').querySelectorAll('input:checked')].map(i => i.value));
      const anterior = buscar('.lab-selector').value;
      buscar('.lab-selector').innerHTML = camaras.map(c => `<option value="${escapar(c.id)}">${escapar(c.nombre)}</option>`).join('');
      if (camaras.some(c => c.id === anterior)) buscar('.lab-selector').value = anterior;
      buscar('.lab-seleccion').innerHTML = camaras.map(c => `<label><input type="checkbox" value="${escapar(c.id)}" ${elegidas.has(c.id) ? 'checked' : ''}>${escapar(c.nombre)}</label>`).join('') || 'Añade una cámara con Añadir cámara.';
      buscar('.lab-camaras').innerHTML = camaras.map(c => `<article data-lab-camara="${escapar(c.id)}"><h3>${escapar(c.nombre)}</h3><p>${escapar(c.tipo)} · fuente ${escapar(c.fuente)}</p><img alt="Vista para identificar ${escapar(c.nombre)}" hidden><p class="lab-estado"></p><p class="lab-error"></p><details><summary>Detalles</summary><p class="lab-rendimiento"></p><p class="lab-identidad"></p></details><button class="accion" data-confirmar="${escapar(c.id)}">Confirmar cámara</button></article>`).join('') || '<p>Añade y conecta una cámara con Añadir cámara.</p>';
      firma = nuevaFirma;
    }
    for (const c of camaras) {
      const l = lab.camaras.find(x => x.id === c.id);
      const tarjeta = [...buscar('.lab-camaras').children].find(x => x.dataset.labCamara === c.id);
      const r = c.rendimiento || {};
      const imagen = tarjeta.querySelector('img');
      if (l?.imagen_reciente && contenedor.offsetParent !== null && buscar('.lab-identificar').open) {
        const sello = `${estado.sesion}:${c.secuencia}`;
        if (imagen.dataset.sello !== sello) {
          imagen.src = `${base}/api/imagen/${encodeURIComponent(c.id)}/limpio?v=${c.secuencia}`;
          imagen.dataset.sello = sello;
        }
        imagen.hidden = false;
      } else imagen.hidden = true;
      tarjeta.querySelector('.lab-estado').textContent = `${c.estado}${c.estado === 'conectada' && !l?.imagen_reciente ? ' · sin imagen reciente' : ''} · ${(c.resolucion || []).join(' × ')} · edad ${numero(l?.edad_s)} s`;
      const reciente = l?.imagen_reciente;
      tarjeta.querySelector('.lab-rendimiento').textContent = `Última ventana: captura ${reciente ? numero(r.captura_hz) : '—'} /s · proceso ${reciente ? numero(r.proceso_hz) : '—'} /s · ${r.descartados ?? 0} cuadros sustituidos · ${r.errores_proceso ?? 0} errores`;
      tarjeta.querySelector('.lab-error').textContent = c.error || '';
      tarjeta.querySelector('.lab-identidad').textContent = l?.identidad_confirmada ? 'Identificada visualmente.' : 'Confirma la vista; el índice puede cambiar al reconectar.';
      tarjeta.querySelector('button').disabled = !reciente;
    }
    buscar('.lab-ruta').textContent = `Método RGB activo: ${lab.ruta_rgb}.`;
    if (!metodoPendiente) buscar('.lab-detector select').value = lab.ruta_rgb;
    const nuevaPreparacion = JSON.stringify([lab.paso_medido, lab.camaras.map(c => [c.id,c.intrinsecos,c.pose,c.mesa]), lab.referencias]);
    if (nuevaPreparacion !== firmaPreparacion) {
    firmaPreparacion = nuevaPreparacion;
    buscar('.lab-preparacion').innerHTML = `<p>Paso entre bloques: <strong>${lab.paso_medido ? 'guardado como medido' : 'pendiente de medir'}</strong></p><ul>${lab.camaras.map(c => `<li>${escapar(camaras.find(x => x.id === c.id)?.nombre)}: intrínsecos ${c.intrinsecos ? 'sí' : 'pendientes'}; posición común ${c.pose ? 'sí' : 'pendiente'}; referencia de mesa ${c.mesa ? 'sí' : 'no disponible'}.</li>`).join('')}</ul><details><summary>Referencias de símbolos (${lab.referencias.filter(r => r.utilizable).length} utilizables)</summary><ul>${lab.referencias.map(r => `<li>${escapar(r.lexema)}: ${r.fotos} fotos reales; ${r.utilizable ? 'referencia utilizable' : 'sin referencia utilizable'}.</li>`).join('')}</ul></details><details><summary>Sobre las referencias</summary><p>Las webcams no tienen profundidad. Revisa las referencias de cada símbolo que uses.</p></details>`;
    }
    const t = lab.trabajo;
    buscar('.lab-trabajo').textContent = t ? `${t.tipo}: ${t.estado} · ${t.grupos} grupos guardados. ${t.error || ''}` : 'No hay una prueba en curso.';
    buscar('.lab-carpeta').textContent = t?.carpeta || `Carpeta de pruebas: ${lab.carpeta}`;
    buscar('.lab-descargas').innerHTML = t && t.tipo !== 'identificar' ? `<a href="${archivo(t.id + '/sesion.json')}" download="sesion.json">Configuración de la prueba</a>${t.tipo === 'capturar' ? ` · <a href="${archivo(t.id + '/cuadros.jsonl')}" download="cuadros.jsonl">Registro de cuadros</a>` : ''}` : '';
    const activo = t?.estado === 'en curso';
    if (t?.tipo === 'identificar') {
      const destino = buscar('.lab-dispositivos');
      const sello = t.id + ':' + t.dispositivos.length;
      if (destino.dataset.sello !== sello) {
        destino.dataset.sello = sello;
        destino.innerHTML = t.dispositivos.map(d => d.disponible ? `<form><img src="${archivo(d.imagen)}" alt="Vista del índice ${d.indice}"><p>Índice ${d.indice} · ${d.resolucion.join(' × ')}</p><input type="hidden" name="fuente" value="${d.indice}"><label>Nombre que tú reconoces<input name="nombre" required maxlength="80" placeholder="iPhone, LifeCam…"></label><button class="accion" type="submit" ${camaras.some(c => c.tipo === 'webcam' && String(c.fuente) === String(d.indice)) || activo ? 'disabled' : ''}>Añadir esta cámara</button></form>` : `<p>Índice ${d.indice}: sin imagen disponible.</p>`).join('');
      }
      destino.querySelectorAll('form').forEach(f => { f.querySelector('button').disabled = activo || camaras.some(c => c.tipo === 'webcam' && String(c.fuente) === f.elements.fuente.value); });
    }
    buscar('.lab-buscar').disabled = activo || camaras.some(c => ['conectada','conectando','deteniendo'].includes(c.estado));
    buscar('.lab-detener').disabled = !activo;
    buscar('.lab-captura button[type=submit]').disabled = activo;
    buscar('.lab-inspeccion button').disabled = activo;
    buscar('.lab-detector button').disabled = activo || camaras.some(c => ['conectada','conectando','deteniendo'].includes(c.estado));
    if (t?.informe && t.informe !== informeMostrado) { informeMostrado = t.informe; cargarTraza(t.informe); }
    buscar('.lab-eventos').innerHTML = [...lab.eventos].reverse().slice(0,20).map(e => `<li>${escapar(e.fecha)} · ${escapar(e.accion)}${e.id ? ' · ' + escapar(camaras.find(c => c.id === e.id)?.nombre || e.id) : ''}</li>`).join('') || '<li>Aún no hay acciones registradas.</li>';
  }
  return { actualizar, inspeccionar(id) {
    abrirPanel(2);
    buscar('.lab-selector').value = id;
    contenedor.scrollIntoView({block:'start', behavior:'smooth'});
    actuar('traza', {id});
  } };
}
