import { EJEMPLOS, montajeEjemplo } from '../modelo/ejemplos.mjs';

const $ = id => document.getElementById(id);
const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function familia(token) {
  if (['PUSH', 'MOV'].includes(token)) return 'bin';
  if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(token)) return 'ari';
  return 'una';
}

function plano(montaje) {
  const programa = montaje.programa();
  const etiquetas = montaje.etiquetas();
  const xs = montaje.bloques.map(b => b.posicion[0]);
  const ys = montaje.bloques.map(b => -b.posicion[2]);
  const x = Math.min(...xs) - 65;
  const y = Math.min(...ys) - 55;
  const ancho = Math.max(...xs) - x + 100;
  const alto = Math.max(...ys) - y + 75;
  const uniones = montaje.conexiones.map(c => {
    const a = montaje.bloque(c.origen);
    const b = montaje.bloque(c.destino);
    return `<line x1="${a.posicion[0]}" y1="${-a.posicion[2]}" x2="${b.posicion[0]}" y2="${-b.posicion[2]}" class="diagrama-union"/>`;
  });
  const bloques = montaje.bloques.map((b, i) => {
    const instruccion = programa[i];
    const parametros = instruccion.operandos.map((p, j) => {
      const texto = etiquetas.get(p) || p;
      let clase = 'etiqueta';
      if (/^(-?\d|nil)/.test(p)) clase = 'numero';
      let visible = texto;
      if (texto.length > 5) visible = '…';
      return `<rect x="${14 + j * 20}" y="-9" width="17" height="18" rx="2" class="ficha-${clase}"/><text x="${22 + j * 20}" y="3" text-anchor="middle" class="diagrama-param">${escapar(visible)}</text>`;
    });
    let largo = 60;
    if (b.capacidad === 2) largo = 80;
    return `<g transform="translate(${b.posicion[0]},${-b.posicion[2]}) rotate(${b.angulo * 180 / Math.PI})"><rect x="-24" y="-18" width="${largo}" height="36" rx="5" class="bloque-${familia(instruccion.token)}"/><rect x="-20" y="-13" width="29" height="26" rx="3" class="ficha-operacion"/><text x="-5" y="3" text-anchor="middle" class="diagrama-op">${escapar(instruccion.token)}</text>${parametros.join('')}</g>`;
  });
  return `<svg viewBox="${x} ${y} ${ancho} ${alto}" role="img" aria-label="Distribución del ejemplo vista desde arriba">${uniones.join('')}${bloques.join('')}</svg>`;
}

export function crearEjemplos({ cargarEjemplo, restaurar, verGravedad }) {
  const raiz = $('vistas');
  const lista = document.createElement('div');
  lista.id = 'vistas-lista';
  lista.hidden = true;
  $('paleta').append(lista);
  let elegido = 0;

  raiz.innerHTML = `
    <div id="vistas-lienzo">
      <div class="frame-label" id="ejemplo-nombre"></div>
      <div class="frame" id="ejemplo-plano"></div>
      <div class="frame-label">Texto SCuLPT</div>
      <pre class="frame code" id="ejemplo-codigo"></pre>
    </div>
    <aside id="vistas-propiedades" class="panel">
      <div class="sec"><div class="sec-head">Ejemplo</div>
        <div id="ejemplo-descripcion"></div><p class="nota" id="ejemplo-forma"></p>
        <div class="acciones"><button class="accion" id="ejemplo-mesa">Cargar en mesa</button><button class="accion primaria" id="ejemplo-ejecucion">Ver ejecución</button></div>
      </div>
      <div class="sec"><div class="sec-head">Montaje</div>
        <button class="accion" id="ejemplo-gravedad">Ver con gravedad</button>
        <p class="nota">Sujeta un extremo del montaje y levántalo. Cada bloque gira en su conector y se apoya en la mesa al soltarlo.</p>
        <button class="accion" id="ejemplo-restaurar" disabled>Restaurar mi montaje</button>
      </div>
    </aside>`;

  function elegir(indice) {
    elegido = indice;
    const ejemplo = EJEMPLOS[indice];
    lista.innerHTML = '<h2>Ejemplos</h2>' + EJEMPLOS.map((e, i) => {
      let clase = 'layer';
      if (i === indice) clase += ' sel';
      return `<button class="${clase}" data-ejemplo="${i}">${e.nombre}</button>`;
    }).join('');
    $('ejemplo-nombre').textContent = ejemplo.nombre;
    $('ejemplo-codigo').textContent = ejemplo.codigo;
    $('ejemplo-descripcion').textContent = ejemplo.descripcion;
    if (ejemplo.forma) {
      $('ejemplo-forma').textContent = 'Montaje en ' + ejemplo.forma.toLowerCase() + '. Los conectores permiten giros en el plano de la mesa.';
    } else {
      $('ejemplo-forma').textContent = 'Montaje recto.';
    }
    $('ejemplo-plano').innerHTML = plano(montajeEjemplo(ejemplo));
  }

  lista.addEventListener('click', e => {
    const boton = e.target.closest('[data-ejemplo]');
    if (boton) elegir(Number(boton.dataset.ejemplo));
  });
  for (const [id, destino] of [['ejemplo-mesa', 'mesa'], ['ejemplo-ejecucion', 'ejecucion'], ['ejemplo-gravedad', 'mesa']]) {
    $(id).onclick = () => {
      if (!cargarEjemplo(EJEMPLOS[elegido], destino)) return;
      $('ejemplo-restaurar').disabled = false;
      if (id === 'ejemplo-gravedad') verGravedad();
    };
  }
  $('ejemplo-restaurar').onclick = () => {
    if (restaurar()) $('ejemplo-restaurar').disabled = true;
  };

  return {
    mostrar(destino) {
      const activa = destino === 'ejemplos';
      raiz.hidden = !activa;
      lista.hidden = !activa;
      if (activa) elegir(elegido);
    },
  };
}
