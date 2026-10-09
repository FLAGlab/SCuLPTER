import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Ejecucion, veredicto, necesitaInterprete, resumenFinal, senalDeCambio, validaElNavegador, veredictoVigente, motivoFisico } from "./modelo/ejecucion.mjs";
import { Validador } from "./modelo/validacion.mjs";
import { dibujarEjecucion, dibujarSeguimiento } from "./interfaz/vista-ejecucion.js";
import { Consola, lineaPeticion, lineasDeResultado, lineaDeNavegacion, lineaDeVeredicto } from "./modelo/consola.mjs";
import { Sonidos } from "./interfaz/sonido.mjs";
import { simbolo, contenidoPila } from "./interfaz/simbolos.js";
import { posicionPosterior, unir, conexionesValidas, pendientesConexiones, ordenarMontaje } from "./modelo/conexiones.mjs";
import { separarOperaciones, crearFichaOperacion, crearFichaOperando, prepararBloque, prepararConector, prepararTuerca, prepararCuna, LARGO_CONECTOR, posicionEncaje } from "./escena/piezas.js";
import { Montaje, OPERACIONES, SIN_LEER, parametroDesdeTexto } from "./modelo/montaje.mjs";
import { crearEditor } from "./interfaz/editor-parametro.js";
import { crearEditorCodigo } from "./interfaz/editor-codigo.js";

import { crearVistas } from "./interfaz/vistas.js";
import { Cadena } from "./fisica/cadena.mjs";
import { montajeEjemplo, montajeDesdeInstrucciones } from "./modelo/ejemplos.mjs";

const $ = id => document.getElementById(id);
const ejecucion = new Ejecucion();
const consola = new Consola();
const sonidos = new Sonidos();
let consolaPintada = 0;
const LIMITE_PASOS = 2000;
let pagina = "mesa", origenPrograma = "manual", proxima = null, ultimoVeredicto = null, finAnunciado = false;
let editorCodigo = null;
let estadoEjecucion = { pendiente: false, mensaje: "Completa el montaje para ejecutar.", origen: "manual" };
const validador = new Validador({
  crearMotor: () => new Worker(new URL("./interprete-worker.js", import.meta.url), { type: "module" }),
  alPedir: codigo => consola.escribir(lineaPeticion(codigo, LIMITE_PASOS)),
  alTerminar: resultado => {
    ejecucion.cargar(resultado); finAnunciado = false;
    consola.todas(lineasDeResultado(resultado));
    estadoEjecucion = { pendiente: false, mensaje: resultado.mensaje || "No se pudo interpretar el programa.", origen: origenPrograma };
    if (!gravedadActiva) reconstruirEscena();
    reconstruirPanel();
  },
});
function invalidarEjecucion(mensaje) {
  if (validador.invalidar() || ejecucion.resultado) { ejecucion.limpiar(); finAnunciado = false; }
  estadoEjecucion = { pendiente: false, mensaje, origen: origenPrograma };
}
let veredictoServicio = null, versionServicio = null, motivoServicio = "";
function fijarVeredictoDelServicio(lectura, veredicto, motivo = "") {
  // Una respuesta tardía nunca activa una versión vieja: solo entra el veredicto cuya versión
  // coincide con la lectura confirmada que el servicio publica ahora.
  const version = lectura?.estado === "confirmada" ? lectura.version : null;
  const util = veredictoVigente(lectura, veredicto);
  const razon = motivo || (version ? "" : lectura?.motivo || "");
  if (version !== versionServicio || util !== veredictoServicio || razon !== motivoServicio) {
    versionServicio = version; veredictoServicio = util; motivoServicio = razon;
    if (origenPrograma === "camara") actualizar();
  }
}
function aplicarVeredictoDelServicio() {
  validador.invalidar();
  if (!veredictoServicio) {
    ejecucion.limpiar(); finAnunciado = false;
    estadoEjecucion = { pendiente: !!versionServicio, mensaje: versionServicio ? "" : motivoServicio, origen: "camara" };
    return;
  }
  if (ejecucion.resultado !== veredictoServicio) {
    ejecucion.cargar(veredictoServicio); finAnunciado = false;
  }
  estadoEjecucion = { pendiente: false, mensaje: "", origen: "camara" };
}
function validarPrograma(codigo) {
  const firma = JSON.stringify([codigo, origenPrograma, montaje.bloques.map(b => b.id)]);
  if (!validador.solicitar(firma, codigo + "\n")) return;
  ejecucion.limpiar(); finAnunciado = false;
  estadoEjecucion = { pendiente: true, mensaje: "", origen: origenPrograma };
}
function mostrarPaso() {
  reconstruirEscena(); reconstruirPanel();
}
function cambiarPagina(destino) {
  if (!listo || arrastre || nuevoArrastre) return;
  if (gravedadActiva) alternarGravedad(false);
  pagina = destino; $("editor-parametro").close();
  document.body.classList.toggle("modo-ejecucion", pagina === "ejecucion");
  document.body.classList.toggle("modo-vistas", !["mesa", "ejecucion"].includes(pagina));
  vistas.mostrar(pagina);
  for (const id of ["panel-ejecucion", "pilas-ejecucion", "barra-ejecucion"]) $(id).hidden = pagina !== "ejecucion";
  for (const nombre of ["mesa", "ejecucion", "ejemplos", "gemelo", "camaras", "calibracion", "simbolos", "piezas"]) {
    const boton = $("pagina-" + nombre); boton.classList.toggle("on", nombre === pagina);
    boton.querySelector(".marca").textContent = nombre === pagina ? "✓" : "";
    boton.setAttribute("aria-current", nombre === pagina ? "page" : "false");
  }
  if (!["mesa", "ejecucion"].includes(pagina)) return;
  ajustarTamano(); mostrarPaso(); encuadrar();
  aviso(pagina === "ejecucion" ? "Avanza para ver cómo cambian las pilas." : "Arrastra las fichas para editar el programa.");
}
$("pagina-mesa").onclick = () => cambiarPagina("mesa");
$("pagina-ejecucion").onclick = () => cambiarPagina("ejecucion");
for (const nombre of ["ejemplos", "gemelo", "camaras", "calibracion", "simbolos", "piezas"]) $("pagina-" + nombre).onclick = () => cambiarPagina(nombre);
const ACCIONES = { reiniciar: "reiniciar", atras: "atrás", siguiente: "siguiente", todo: "ejecutar todo" };
for (const [id, accion] of [["ej-reiniciar", "reiniciar"], ["ej-atras", "atras"], ["ej-siguiente", "siguiente"], ["ej-todo", "todo"]]) {
  $(id).onclick = () => {
    const antes = ejecucion.cursor;
    consola.escribir(lineaDeNavegacion(ejecucion[accion](), montaje.programa(), ACCIONES[accion]));
    if (ejecucion.cursor !== antes && ejecucion.cursor === ejecucion.ultimo && ejecucion.ultimo > 0 && !finAnunciado) {
      finAnunciado = true; sonidos.reproducir("fin");
    }
    mostrarPaso();
  };
}
window.addEventListener("pagehide", () => validador.detener());
const contenedor = $("escena"), resultadoEl = $("resultado");
const escena = new THREE.Scene();
escena.background = new THREE.Color(0xf5f5f5);
const camara = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
contenedor.appendChild(renderizador.domElement);
const canvas = renderizador.domElement;
const controles = new OrbitControls(camara, canvas);
controles.maxPolarAngle = Math.PI / 2 - 0.08;
controles.minDistance = 45;
controles.maxDistance = 1800;
controles.target.set(25, 12, 0);
camara.position.set(95, 180, 170);
escena.add(new THREE.HemisphereLight(0xffffff, 0xd6d6d6, 2.1));
const luz = new THREE.DirectionalLight(0xffffff, 1.5);
luz.position.set(-140, 320, 190);
luz.castShadow = true;
luz.shadow.mapSize.set(2048, 2048);
luz.shadow.radius = 5;
luz.shadow.bias = -0.002;
const c = luz.shadow.camera;
c.left = -600; c.right = 600; c.top = 600; c.bottom = -600; c.near = 1; c.far = 900;
escena.add(luz);

function geometriaMesa(ancho, fondo, radio) {
  const forma = new THREE.Shape();
  const x = ancho / 2, z = fondo / 2, r = Math.min(radio, x, z);
  forma.moveTo(-x + r, -z);
  forma.lineTo(x - r, -z); forma.quadraticCurveTo(x, -z, x, -z + r);
  forma.lineTo(x, z - r);  forma.quadraticCurveTo(x, z, x - r, z);
  forma.lineTo(-x + r, z); forma.quadraticCurveTo(-x, z, -x, z - r);
  forma.lineTo(-x, -z + r); forma.quadraticCurveTo(-x, -z, -x + r, -z);
  const g = new THREE.ShapeGeometry(forma);
  g.rotateX(-Math.PI / 2);
  return g;
}
const mesa = new THREE.Mesh(geometriaMesa(900, 460, 28), new THREE.MeshLambertMaterial({ color: 0xebebeb }));
mesa.position.y = -0.1; mesa.receiveShadow = true; escena.add(mesa);
function ajustarMesa() {
  const caja = new THREE.Box3().setFromObject(objetos);
  const ancho = caja.isEmpty() ? 900 : Math.max(900, caja.max.x - caja.min.x + 260);
  const fondo = caja.isEmpty() ? 460 : Math.max(460, caja.max.z - caja.min.z + 260);
  mesa.geometry.dispose();
  mesa.geometry = geometriaMesa(ancho, fondo, 28);
  mesa.position.x = caja.isEmpty() ? 0 : (caja.min.x + caja.max.x) / 2;
  mesa.position.z = caja.isEmpty() ? 0 : (caja.min.z + caja.max.z) / 2;
}

let fijaciones = [];
let montaje = new Montaje(), listo = false, seleccionado = null, bloqueActivo = null, arrastre = null, nuevoArrastre = null;
let objetos = new THREE.Group(); escena.add(objetos);
let geometrias = {}, operaciones = {}, conector = null, tuerca = null, cuna = null, mallasPiezas = new Map(), mallasBloques = new Map(), encajes = [];
const LARGO = { 1: 30, 2: 50 };
const ENTRADA = -35.5;

const ALTURA_CONEXION = 15;
const ALTURA_CUNA = 10.5;

function extremo(b, local) {
  return new THREE.Vector3(local, ALTURA_CONEXION, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), b.angulo)
    .add(new THREE.Vector3(...b.posicion));
}
const raycaster = new THREE.Raycaster();
let ultimoAviso = "";
const aviso = mensaje => {
  if (mensaje === ultimoAviso) return;
  ultimoAviso = mensaje;
  $("aviso").textContent = mensaje;
};
const alturaLibre = p => p.tipo === "operacion" ? 7.5 : 1.5;
let incertidumbreCamara = '';
function manual() { incertidumbreCamara = ''; if (gravedadActiva) alternarGravedad(false); $("camara-activa").checked = false; vistas.detenerLectura(); }
function bloqueSiguiente() { return montaje.bloques[ejecucion.actual?.siguiente]?.id ?? null; }
function atenuar(objeto, bloqueId) {
  if (pagina !== "ejecucion" || bloqueId === bloqueSiguiente()) return;
  objeto.traverse(o => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.map) { m.transparent = true; m.opacity = .45; m.depthWrite = false; }
      else m.color?.lerp(new THREE.Color(0xf5f5f5), .55);
    }
  });
}
const marco = $("marco-seleccion"), etiquetaMarco = $("etiqueta-seleccion");
const CAJA = new THREE.Box3(), ESQUINA = new THREE.Vector3();
function dibujarSeleccion() {
  if (gravedadActiva) { marco.hidden = true; return; }
  const idVisible = pagina === "ejecucion" ? bloqueSiguiente() : bloqueActivo;
  const malla = mallasBloques.get(idVisible);
  if (!malla || arrastre?.movido || nuevoArrastre?.movido) { marco.hidden = true; return; }
  const bloque = montaje.bloque(idVisible);
  CAJA.setFromObject(malla);
  const pieza = mallasPiezas.get(bloque?.operacion);
  if (pieza) CAJA.expandByObject(pieza);
  for (const id of bloque?.parametros ?? []) {
    const p = id && mallasPiezas.get(id);
    if (p) CAJA.expandByObject(p);
  }
  const r = canvas.getBoundingClientRect();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    ESQUINA.set(i & 1 ? CAJA.max.x : CAJA.min.x, i & 2 ? CAJA.max.y : CAJA.min.y, i & 4 ? CAJA.max.z : CAJA.min.z);
    ESQUINA.project(camara);
    x0 = Math.min(x0, ESQUINA.x); x1 = Math.max(x1, ESQUINA.x);
    y0 = Math.min(y0, ESQUINA.y); y1 = Math.max(y1, ESQUINA.y);
  }
  const izquierda = (x0 + 1) / 2 * r.width, derecha = (x1 + 1) / 2 * r.width;
  const arriba = (1 - y1) / 2 * r.height, abajo = (1 - y0) / 2 * r.height;
  marco.hidden = false;
  marco.style.left = `${izquierda}px`;
  marco.style.top = `${arriba}px`;
  marco.style.width = `${derecha - izquierda}px`;
  marco.style.height = `${abajo - arriba}px`;
  const instruccion = montaje.programa()[montaje.bloques.indexOf(bloque)];
  const etiquetas = montaje.etiquetas();
  etiquetaMarco.textContent = instruccion
    ? (pagina === "ejecucion" ? "Siguiente: " : "") + [instruccion.token, ...instruccion.operandos.map(o => o === SIN_LEER ? "\u2026" : etiquetas.get(o) || o)].join(" ")
    : "";
}
function ajustarTamano() {
  if (!["mesa", "ejecucion"].includes(pagina)) return;
  const ancho = contenedor.clientWidth, alto = contenedor.clientHeight;
  camara.aspect = ancho / alto; camara.updateProjectionMatrix(); renderizador.setSize(ancho, alto);
}
window.addEventListener("resize", ajustarTamano);
function areaVisible() {
  const r = canvas.getBoundingClientRect();
  const izquierda = $("paleta").getBoundingClientRect().right;
  const derecha = $("panel").getBoundingClientRect().left;
  return { ancho: Math.max(240, derecha - izquierda), centro: (izquierda + derecha) / 2 - (r.left + r.width / 2) };
}
function encuadrar() {
  const caja = new THREE.Box3().setFromObject(objetos);
  if (caja.isEmpty()) return;
  const centro = caja.getCenter(new THREE.Vector3()), tamano = caja.getSize(new THREE.Vector3());
  const visible = areaVisible();
  const proporcion = visible.ancho / canvas.clientHeight;
  const media = 2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
  const distancia = Math.max(tamano.x / proporcion, tamano.z, tamano.y, 95) / media * 1.6;
  controles.target.copy(centro);
  camara.position.copy(centro).add(new THREE.Vector3(0.28, 0.88, 0.82).normalize().multiplyScalar(distancia));
  // Los paneles flotan sobre el lienzo: desplaza la cámara para que el
  // programa quede centrado en el hueco que dejan, no en el lienzo entero.
  const porPixel = media * distancia / canvas.clientHeight;
  const lateral = new THREE.Vector3().subVectors(camara.position, controles.target).cross(camara.up).normalize();
  const desplazamiento = lateral.multiplyScalar(visible.centro * porPixel);
  camara.position.add(desplazamiento); controles.target.add(desplazamiento);
  controles.update();
}
$("encuadrar").onclick = encuadrar;

function liberar() {
  const materiales = new Set(), texturas = new Set(), geometriaTemporal = new Set();
  objetos.traverse(o => {
    if (o.geometry && !o.geometry.userData.compartida) geometriaTemporal.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiales.add(m);
  });
  for (const m of materiales) { if (m.map) texturas.add(m.map); m.dispose(); }
  for (const t of texturas) t.dispose();
  for (const g of geometriaTemporal) g.dispose();
  escena.remove(objetos); objetos = new THREE.Group(); escena.add(objetos);
}
function transformacionBloque(b) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...b.posicion), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.angulo), new THREE.Vector3(1, 1, 1));
}
function puntoEncaje(b, slot) { return posicionEncaje(slot).applyMatrix4(transformacionBloque(b)); }
function crearMarcador(b, slot) {
  const aro = new THREE.Mesh(new THREE.RingGeometry(slot === -1 ? 7 : 5, slot === -1 ? 9 : 7, 32), new THREE.MeshBasicMaterial({ color: 0xb3b3b3, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  aro.rotation.x = -Math.PI / 2; aro.position.copy(puntoEncaje(b, slot)); aro.position.y += 0.12;
  aro.userData.encaje = { bloqueId: b.id, slot }; aro.userData.bloqueId = b.id;
  objetos.add(aro); encajes.push({ bloqueId: b.id, slot, posicion: puntoEncaje(b, slot), aro });
}
function reconstruirEscena() {
  liberar(); mallasPiezas = new Map(); mallasBloques = new Map(); encajes = [];
  for (const b of montaje.bloques) {
    if (b.virtual) continue;
    const instruccion = montaje.programa()[montaje.bloques.indexOf(b)];
    const base = new THREE.Mesh(geometrias[b.capacidad], new THREE.MeshLambertMaterial({
      color: COLOR_FAMILIA[FAMILIA[instruccion?.token]] ?? 0xb3b3b3, flatShading: true,
    }));
    base.castShadow = true; base.receiveShadow = true;
    base.position.fromArray(b.posicion); base.rotation.y = b.angulo; base.userData.bloqueId = b.id;
    atenuar(base, b.id);
    objetos.add(base); mallasBloques.set(b.id, base);
    if (tuerca) {
      const nudo = new THREE.Mesh(tuerca, new THREE.MeshLambertMaterial({ color: 0xffc700, flatShading: true }));
      nudo.position.copy(new THREE.Vector3(-30, ALTURA_CONEXION, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.angulo).add(new THREE.Vector3(...b.posicion)));
      nudo.rotation.y = b.angulo; nudo.userData.bloqueId = b.id;
      nudo.castShadow = true;
      atenuar(nudo, b.id); objetos.add(nudo);
    }
    if (pagina === "mesa") for (let slot = -1; slot < b.capacidad; slot++) crearMarcador(b, slot);
  }
  for (const p of montaje.piezas.values()) {
    const raiz = new THREE.Group();
    raiz.userData.piezaId = p.id;
    raiz.add(p.tipo === "operacion" ? crearFichaOperacion(operaciones[p.token]) : crearFichaOperando(p.contenido));
    if (p.union) {
      const b = montaje.bloque(p.union.bloqueId);
      raiz.position.copy(p.observada ? new THREE.Vector3(...p.observada) : puntoEncaje(b, p.union.slot)); raiz.rotation.y = b.angulo;
    } else raiz.position.fromArray(p.posicion);
    atenuar(raiz, p.union?.bloqueId);
    objetos.add(raiz); mallasPiezas.set(p.id, raiz);
  }
  fijaciones.forEach((f, i) => {
    if (!cuna) return;
    const pieza = new THREE.Mesh(cuna, new THREE.MeshLambertMaterial({ color: 0xffc700, flatShading: true }));
    pieza.position.fromArray(f.posicion);
    pieza.rotation.y = f.angulo;
    pieza.castShadow = true;
    pieza.userData.fijacion = i;
    objetos.add(pieza);
  });

  for (const conexion of conexionesValidas(montaje)) {
    if (!conector) continue;
    const a = montaje.bloque(conexion.origen), b = montaje.bloque(conexion.destino);
    const salida = extremo(a, LARGO[a.capacidad]), entrada = extremo(b, ENTRADA);
    const pieza = new THREE.Mesh(conector, new THREE.MeshLambertMaterial({ color: 0xf0f0f0, flatShading: true }));
    pieza.castShadow = true; pieza.position.copy(salida).lerp(entrada, 0.5);
    pieza.rotation.y = a.angulo; pieza.userData.bloqueId = a.id; atenuar(pieza, a.id); objetos.add(pieza);
  }

  // Preserve the calibrated pipeline's virtual loop edges.
  montaje.bloques.forEach((b, i) => {
    if (!b.virtual || b.instruccion.destino == null) return;
    const previo = montaje.bloques.slice(0, i).reverse().find(x => !x.virtual);
    const destino = montaje.bloques[b.instruccion.destino];
    if (!previo || !destino || destino.virtual) return;
    const a = new THREE.Vector3(...previo.posicion).add(new THREE.Vector3(0, 55, 0));
    const c = new THREE.Vector3(...destino.posicion).add(new THREE.Vector3(0, 55, 0));
    const curva = new THREE.CatmullRomCurve3([a, a.clone().lerp(c, 0.5).add(new THREE.Vector3(0, 35, 0)), c]);
    objetos.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curva.getPoints(30)), new THREE.LineBasicMaterial({ color: 0xffc83d })));
  });
  ajustarMesa();
  actualizarEncajes();
  if (gravedadActiva) prepararGravedad();
}
function actualizarEncajes(candidato = null) {
  for (const e of encajes) {
    const b = montaje.bloque(e.bloqueId);
    e.aro.visible = !montaje.ocupante(b, e.slot);
    e.aro.material.color.setHex(candidato === e ? 0x0d99ff : 0xb3b3b3);
    e.aro.scale.setScalar(candidato === e ? 1.18 : 1);
  }
}
const FAMILIA = { PUSH: "bin", MOV: "bin", POP: "una", DUP: "una", NEG: "una", "?": "una", JMP: "una", CMP: "una", ADD: "ari", SUB: "ari", MUL: "ari", DIV: "ari", MOD: "ari" };
const COLOR_FAMILIA = { bin: 0x7b61ff, una: 0xffc700, ari: 0xf0368d };
const ROTULOS = {
  PUSH: ["Pila", "Valor"], MOV: ["Destino", "Origen"],
  POP: ["Pila"], DUP: ["Pila"], NEG: ["Pila"], "?": ["Pila"], JMP: ["Desplazamiento"],
  CMP: ["Pila", "Valor"], ADD: ["Pila", "Valor"], SUB: ["Pila", "Valor"],
  MUL: ["Pila", "Valor"], DIV: ["Pila", "Valor"], MOD: ["Pila", "Valor"],
};
const DESCRIPCIONES = {
  PUSH: (a, b) => `Pone ${b} encima de ${a}.`,
  MOV: (a, b) => `Saca el tope de ${b} y lo pone encima de ${a}.`,
  POP: a => `Quita el tope de ${a}.`,
  DUP: a => `Duplica el tope de ${a}.`,
  NEG: a => `Cambia de signo el tope de ${a}.`,
  "?": a => `Saca el tope de ${a}; si es negativo o vacío (#), salta la instrucción siguiente.`,
  JMP: a => `Mueve la ejecución ${a} instrucciones.`,
  CMP: (a, b) => b ? `Compara el tope de ${a} con ${b} y apila 1, 0 o -1.` : `Compara los dos topes de ${a} y apila 1, 0 o -1.`,
  ADD: (a, b) => b ? `Suma ${b} al tope de ${a}.` : `Suma los dos topes de ${a}.`,
  SUB: (a, b) => b ? `Resta ${b} al tope de ${a}.` : `Resta los dos topes de ${a}.`,
  MUL: (a, b) => b ? `Multiplica el tope de ${a} por ${b}.` : `Multiplica los dos topes de ${a}.`,
  DIV: (a, b) => b ? `Divide el tope de ${a} entre ${b}.` : `Divide los dos topes de ${a}.`,
  MOD: (a, b) => b ? `Resto del tope de ${a} entre ${b}.` : `Resto de los dos topes de ${a}.`,
};

function boton(texto, accion, clase = "") {
  const b = document.createElement("button"); b.textContent = texto; b.className = clase; b.onclick = accion; return b;
}
function nodo(etiqueta, clase = "", texto = "") {
  const e = document.createElement(etiqueta);
  if (clase) e.className = clase;
  if (texto) e.textContent = texto;
  return e;
}
function filaPrograma(b, i, programa, etiquetas) {
  const instruccion = programa[i];
  const abierta = pagina === "mesa" && b.id === bloqueActivo;
  const siguiente = proxima === i;
  const fila = nodo("div", "layer" + (abierta ? " sel open" : "") + (siguiente ? " next" : ""));
  fila.append(nodo("span", "caret" + (siguiente ? " pc" : ""), siguiente ? "▶" : abierta ? "\u25be" : "\u203a"), nodo("span", "num", String(i + 1)));
  if (!b.virtual) fila.append(nodo("span", `sw ${FAMILIA[instruccion.token] || "una"}`));
  fila.append(nodo("span", "txt", instruccion.token));
  for (const operando of instruccion.operandos) {
    if (operando === SIN_LEER) fila.append(nodo("span", "miss-txt", "Sin leer"));
    else fila.append(simbolo(operando === "nil" ? { texto: "nil", tipo: "nil" } : contenidoPila(operando, montaje)));
  }
  fila.onclick = () => { if (pagina !== "mesa") return; manual(); bloqueActivo = b.id; seleccionado = b.operacion; actualizar(); };
  return fila;
}
function filasHijas(b, instruccion) {
  if (b.virtual) return [];
  const hijas = [];
  const op = nodo("div", "layer child");
  op.append(nodo("span", "tok" + (b.operacion ? "" : " miss")));
  op.append(b.operacion ? nodo("span", "txt", instruccion.token) : nodo("span", "miss-txt", "Sin leer"));
  op.onclick = () => { manual(); bloqueActivo = b.id; seleccionado = b.operacion; actualizar(); };
  hijas.push(op);
  b.parametros.forEach((id, j) => {
    const pieza = id && montaje.piezas.get(id);
    const fila = nodo("div", "layer child");
    fila.append(nodo("span", "tok" + (pieza ? "" : " miss")));
    fila.append(pieza ? simbolo(pieza.contenido, true) : nodo("span", "miss-txt", "Sin leer"));
    fila.onclick = () => { manual(); bloqueActivo = b.id; if (pieza) editar(id); else abrirEditor({ bloqueId: b.id, slot: j }); };
    hijas.push(fila);
  });
  hijas[hijas.length - 1].classList.add("last");
  return hijas;
}
function propiedades(b, i, programa, etiquetas) {
  const seccion = $("sec-seleccion");
  seccion.hidden = !b;
  const caja = $("seleccion");
  caja.replaceChildren();
  if (!b) return;
  const instruccion = programa[i];
  const cabecera = nodo("div", "sec-head", `Instrucción ${i + 1}`);
  const herramientas = nodo("div", "tools");
  for (const [signo, delta] of [["\u2191", -1], ["\u2193", 1]]) herramientas.append(boton(signo, ev => {
    ev.stopPropagation();
    const j = i + delta; if (j < 0 || j >= montaje.bloques.length) return;
    manual(); origenPrograma = "manual"; [montaje.bloques[i], montaje.bloques[j]] = [montaje.bloques[j], montaje.bloques[i]]; ordenarMontaje(montaje); limpiarObservadas(); actualizar(); encuadrar();
  }));
  herramientas.append(boton("\u232b", ev => { ev.stopPropagation(); manual(); montaje.eliminarBloque(b.id); seleccionado = null; bloqueActivo = null; actualizar(); }));
  if (montaje.bloques.some(b => b.virtual)) for (const boton of herramientas.querySelectorAll("button")) boton.disabled = true;
  cabecera.append(herramientas);
  caja.append(cabecera);

  const operacion = nodo("div", "prop");
  operacion.append(nodo("span", "lbl", "Operación"));
  const campo = nodo("div", "fld");
  if (!b.virtual) campo.append(nodo("span", `sw ${FAMILIA[instruccion.token] || "una"}`));
  campo.append(nodo("span", "", instruccion.token));
  operacion.append(campo);
  caja.append(operacion);
  if (i > 0 && !b.virtual && !montaje.bloques[i - 1].virtual && origenPrograma === "manual") {
    const anterior = montaje.bloques[i - 1];
    if (!conexionesValidas(montaje).some(c => c.origen === anterior.id && c.destino === b.id)) caja.append(boton("Unir al anterior", () => {
      manual(); unir(montaje, anterior, b); limpiarObservadas(); actualizar(); encuadrar(); sonidos.reproducir("encaje");
    }, "accion primaria"));
  }

  if (!b.virtual) {
    const rotulos = ROTULOS[instruccion.token] || [];
    b.parametros.forEach((id, j) => {
      const pieza = id && montaje.piezas.get(id);
      const fila = nodo("div", "prop");
      fila.append(nodo("span", "lbl", rotulos[j] || `Parámetro ${j + 1}`));
      const valor = nodo("div", "fld accion-fld");
      valor.append(pieza ? simbolo(pieza.contenido, true) : nodo("span", "miss-txt", "Sin leer"));
      valor.onclick = () => { manual(); bloqueActivo = b.id; if (pieza) editar(id); else abrirEditor({ bloqueId: b.id, slot: j }); };
      fila.append(valor);
      caja.append(fila);
    });
  }

  const describir = DESCRIPCIONES[instruccion.token];
  if (describir) {
    const nombres = instruccion.operandos.map(o => o === SIN_LEER ? "\u2026" : etiquetas.get(o) || o);
    if (nombres.every(n => n !== "\u2026") && nombres.length) caja.append(nodo("div", "nota", describir(...nombres)));
  }

  const pieza = montaje.piezas.get(seleccionado);
  if (!pieza) return;
  const acciones = nodo("div", "acciones-ficha");
  if (!pieza.union) acciones.append(boton("Encajar", () => {
    const destino = encajes.find(e => e.bloqueId === bloqueActivo && montaje.puedeAcoplar(pieza.id, e.bloqueId, e.slot)) || encajes.find(e => montaje.puedeAcoplar(pieza.id, e.bloqueId, e.slot));
    if (!destino) { aviso("No hay un encaje libre compatible con esta ficha."); return; }
    manual(); montaje.acoplar(pieza.id, destino.bloqueId, destino.slot); delete pieza.observada; sonidos.reproducir("encaje"); actualizar(); aviso("Ficha encajada.");
  }, "accion primaria"));
  if (pieza.union) acciones.append(boton("Retirar", () => {
    manual();
    const pos = mallasPiezas.get(pieza.id).position.clone(); pos.z += 40; pos.y = alturaLibre(pieza);
    montaje.desacoplar(pieza.id, pos.toArray()); delete pieza.observada; actualizar();
    aviso("Ficha retirada. Puedes arrastrarla a otro encaje.");
  }, "accion"));
  acciones.append(boton("Eliminar ficha", () => {
    manual(); montaje.desacoplar(pieza.id); montaje.piezas.delete(pieza.id); seleccionado = null; actualizar();
  }, "accion"));
  caja.append(acciones);
}
function estado(marca, clase, titulo, detalle) {
  const caja = nodo("div", "status");
  caja.append(nodo("span", `marca ${clase}`, marca));
  const texto = nodo("div");
  texto.append(nodo("div", "t1", titulo));
  if (detalle) texto.append(nodo("div", "t2", detalle));
  caja.append(texto);
  return caja;
}
function reconstruirPanel() {
  const programa = montaje.programa(), etiquetas = montaje.etiquetas();
  const codigo = programa.map(i => [i.token, ...i.operandos].join(" ")).join("\n");
  $("codigo-generado").textContent = codigo.replaceAll(SIN_LEER, "\u2026") || "(vacío)";
  $("alias").textContent = [...etiquetas].filter(([id, nombre]) => id !== nombre).map(([id, nombre]) => `${nombre} \u2192 ${id}`).join("\n");

  const hechos = {
    bloques: codigo ? montaje.bloques.length : 0,
    pendientes: [...montaje.pendientes(), ...(origenPrograma === "manual" ? pendientesConexiones(montaje) : [])],
    incertidumbre: origenPrograma === "camara"
      ? incertidumbreCamara || motivoFisico({ veredicto: veredictoServicio, version: versionServicio, motivo: motivoServicio })
      : "",
    moviendo: !!(arrastre?.movido || nuevoArrastre?.movido),
    origen: origenPrograma,
  };
  // Autoridad única: el programa leído de las cámaras lo valida el servicio y su veredicto llega
  // con la versión del montaje. La página no vuelve a decidir si es válido; solo recorre la traza
  // que el servicio le entrega. El worker se reserva para programas construidos a mano.
  if (!validaElNavegador(hechos)) aplicarVeredictoDelServicio();
  else if (necesitaInterprete(hechos)) validarPrograma(codigo);
  else invalidarEjecucion(veredicto(hechos).detalle);
  const fallo = veredicto({ ...hechos, validando: estadoEjecucion.pendiente, resultado: ejecucion.resultado });
  const resumen = fallo.clase === "valido" ? resumenFinal(ejecucion.resultado, etiquetas) : "";
  resultadoEl.replaceChildren(estado(fallo.marca, fallo.color, fallo.titulo,
    resumen ? "Al terminar, " + resumen + "." : fallo.detalle));
  proxima = fallo.seguible ? ejecucion.actual?.siguiente ?? null : null;
  consola.escribir(lineaDeVeredicto(fallo));
  if (senalDeCambio(ultimoVeredicto, fallo)) sonidos.reproducir("error");
  ultimoVeredicto = fallo;
  dibujarSeguimiento(ejecucion, montaje, fallo, etiquetas);
  editorCodigo?.actualizarPasos(ejecucion);
  dibujarConsola();

  const lista = $("lista-programa"); lista.replaceChildren();
  $("vacio").hidden = montaje.bloques.length > 0;
  montaje.bloques.forEach((b, i) => {
    lista.append(filaPrograma(b, i, programa, etiquetas));
    if (pagina === "mesa" && b.id === bloqueActivo) for (const hija of filasHijas(b, programa[i])) lista.append(hija);
  });

  if (pagina === "ejecucion") dibujarEjecucion(ejecucion, montaje, estadoEjecucion);

  propiedades(montaje.bloque(bloqueActivo), montaje.bloques.findIndex(b => b.id === bloqueActivo), programa, etiquetas);
}
function dibujarConsola() {
  const caja = $("consola-lineas");
  if ($("consola").hidden || consolaPintada === consola.escritas) return;
  const nuevas = consola.desde(consolaPintada);
  consolaPintada = consola.escritas;
  if (!consola.lineas.length) { caja.replaceChildren(nodo("p", "consola-vacia", "Aquí aparece cada llamada al intérprete y su respuesta.")); return; }
  caja.querySelector(".consola-vacia")?.remove();
  for (const linea of nuevas) {
    const fila = nodo("div", "consola-linea");
    fila.append(nodo("span", "consola-origen", linea.origen), nodo("span", linea.tono, linea.texto));
    caja.append(fila);
  }
  while (caja.childElementCount > consola.maximo) caja.firstElementChild.remove();
  caja.scrollTop = caja.scrollHeight;
}
$("ver-consola").onclick = () => {
  const caja = $("consola"); caja.hidden = !caja.hidden;
  $("ver-consola").setAttribute("aria-pressed", String(!caja.hidden));
  document.body.classList.toggle("con-consola", !caja.hidden);
  if (!caja.hidden) { $("consola-lineas").replaceChildren(); consolaPintada = consola.escritas - consola.lineas.length; dibujarConsola(); }
};
$("limpiar-consola").onclick = () => {
  consola.limpiar(); $("consola-lineas").replaceChildren(); consolaPintada = -1; dibujarConsola();
  aviso("Consola vaciada.");
};
$("mesa-ver-ejecucion").onclick = () => cambiarPagina("ejecucion");
$("ver-sonido").setAttribute("aria-pressed", String(sonidos.activo));
$("ver-sonido").textContent = sonidos.activo ? "Sonidos" : "Sin sonido";
$("ver-sonido").onclick = () => {
  const activo = sonidos.alternar();
  $("ver-sonido").setAttribute("aria-pressed", String(activo));
  $("ver-sonido").textContent = activo ? "Sonidos" : "Sin sonido";
  if (activo) sonidos.reproducir("encaje");
  aviso(activo ? "Sonidos activados." : "Sonidos silenciados.");
};
function actualizar() { reconstruirEscena(); reconstruirPanel(); }
function posicionSuelta() {
  const b = montaje.bloque(bloqueActivo) || montaje.bloques.find(b => !b.virtual);
  const n = [...montaje.piezas.values()].filter(p => !p.union).length;
  return [(b?.posicion[0] || 0) + 80 + (n % 4) * 24, 1.5, (b?.posicion[2] || 0) + Math.floor(n / 4) * 26];
}
const editor = crearEditor((contenido, destino) => {
  manual();
  if (destino.piezaId) {
    const p = montaje.piezas.get(destino.piezaId); if (!p) return; p.contenido = contenido; seleccionado = p.id;
  } else {
    const p = montaje.agregarParametro(contenido, posicionSuelta()); seleccionado = p.id;
    if (destino.bloqueId) { montaje.acoplar(p.id, destino.bloqueId, destino.slot); sonidos.reproducir("encaje"); }
  }
  actualizar(); aviso("Parámetro listo. Arrástralo para moverlo o cambiarlo de encaje."); encuadrar();
});
function situarEditor(objetivo = {}) {
  const dialogo = $("editor-parametro");
  let ancla = null;
  if (objetivo.piezaId) ancla = mallasPiezas.get(objetivo.piezaId)?.position.clone();
  else if (objetivo.bloqueId != null) {
    const b = montaje.bloque(objetivo.bloqueId);
    if (b) ancla = puntoEncaje(b, objetivo.slot ?? 0);
  }
  const r = canvas.getBoundingClientRect();
  const margen = 12, ancho = 272, alto = dialogo.offsetHeight || 420;
  let x = r.left + r.width / 2 + 40, y = r.top + r.height / 2 - alto / 2;
  if (ancla) {
    const p = ancla.clone().project(camara);
    x = r.left + (p.x + 1) / 2 * r.width + 28;
    y = r.top + (1 - p.y) / 2 * r.height - alto / 2;
  }
  const limiteDerecho = $("panel").getBoundingClientRect().left - margen - ancho;
  const limiteIzquierdo = $("paleta").getBoundingClientRect().right + margen;
  dialogo.style.left = `${Math.max(limiteIzquierdo, Math.min(x, limiteDerecho))}px`;
  dialogo.style.top = `${Math.max(margen, Math.min(y, window.innerHeight - alto - margen))}px`;
}
function abrirEditor(objetivo, contenido) {
  editor.abrir(objetivo, contenido);
  situarEditor(objetivo);
}
function editar(id) { const p = montaje.piezas.get(id); if (p?.tipo === "parametro") { manual(); abrirEditor({ piezaId: id }, p.contenido); } }
$("nuevo-parametro").onclick = () => { if (listo) { manual(); abrirEditor(); } };
function limpiarObservadas() { for (const p of montaje.piezas.values()) delete p.observada; }
function siguientePosicion() {
  const previos = montaje.bloques.filter(b => !b.virtual);
  if (!previos.length) return [0, 0, 0];
  const ultimo = previos[previos.length - 1];
  return posicionPosterior(ultimo);
}
function capacidadDe(token) {
  const [min, max] = OPERACIONES[token];
  return min === max ? min : Number($("capacidad-mixtas").value);
}
function agregarOperacion(token, objetivo = null, posicion = null, conectar = false) {
  if (!listo || !OPERACIONES[token]) return;
  manual();
  if (objetivo && objetivo.slot === -1) {
    const p = { id: montaje.id(), tipo: "operacion", token, union: null, posicion: [0, 7.5, 0] };
    montaje.piezas.set(p.id, p);
    if (!montaje.acoplar(p.id, objetivo.bloqueId, -1)) { montaje.piezas.delete(p.id); aviso("Esta operación necesita un bloque de otro tamaño o un encaje vacío."); return; }
    seleccionado = p.id; bloqueActivo = objetivo.bloqueId;
  } else {
    const anterior = montaje.bloques.filter(b => !b.virtual).at(-1);
    const b = montaje.agregarBloque(token, capacidadDe(token), posicion || siguientePosicion());
    if (anterior && (!posicion || conectar)) unir(montaje, anterior, b);
    bloqueActivo = b.id; seleccionado = b.operacion;
  }
  actualizar();
  if (!posicion) encuadrar();
  aviso("Operación encajada. Añade parámetros libres o pulsa un P vacío para completarla.");
}
function crearFantasmaFijacion() {
  const grupo = new THREE.Group();
  const pieza = new THREE.Mesh(cuna, new THREE.MeshLambertMaterial({
    color: 0xffc700, flatShading: true, transparent: true, opacity: 0.6, depthWrite: false,
  }));
  grupo.add(pieza);
  grupo.renderOrder = 10;
  escena.add(grupo);
  return grupo;
}
function crearFantasma(token) {
  const capacidad = capacidadDe(token);
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Mesh(geometrias[capacidad], new THREE.MeshStandardMaterial({
    color: COLOR_FAMILIA[FAMILIA[token]] ?? 0x2a6f6a, roughness: 0.65,
    transparent: true, opacity: 0.6, depthWrite: false,
  }));
  grupo.add(cuerpo);
  const ficha = crearFichaOperacion(operaciones[token]);
  ficha.position.copy(posicionEncaje(-1));
  const translucido = m => {
    const c = m.clone();
    c.transparent = true; c.opacity = 0.85; c.depthWrite = false;
    return c;
  };
  ficha.traverse(o => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(translucido) : translucido(o.material);
  });
  grupo.add(ficha);
  grupo.renderOrder = 10;
  escena.add(grupo);
  return grupo;
}
function encajeLibreCercano(token, evento) {
  const [min, max] = OPERACIONES[token];
  const r = canvas.getBoundingClientRect();
  let mejor = null, distancia = 1;
  for (const e of encajes) {
    if (e.slot !== -1) continue;
    const b = montaje.bloque(e.bloqueId);
    if (!b || b.operacion || b.capacidad < min || b.capacidad > max) continue;
    const centro = e.posicion.clone().project(camara);
    if (centro.z < -1 || centro.z > 1) continue;
    const x = r.left + (centro.x + 1) * r.width / 2, y = r.top + (1 - centro.y) * r.height / 2;
    const d = Math.hypot(evento.clientX - x, evento.clientY - y) / 55;
    if (d < distancia) { mejor = e; distancia = d; }
  }
  return mejor;
}
function sobreLienzo(evento) {
  const r = canvas.getBoundingClientRect();
  if (evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom) return false;
  for (const selector of ["#paleta", "#panel", ".barra"]) {
    const caja = document.querySelector(selector).getBoundingClientRect();
    if (evento.clientX >= caja.left && evento.clientX <= caja.right && evento.clientY >= caja.top && evento.clientY <= caja.bottom) return false;
  }
  return true;
}
const PLANO_MESA = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function terminarNuevo(cancelar = false) {
  if (!nuevoArrastre) return;
  const a = nuevoArrastre;
  nuevoArrastre = null;
  if (a.fantasma) {
    escena.remove(a.fantasma);
    a.fantasma.traverse(o => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
  }
  a.pieza.classList.remove("arrastrando");
  if (a.pieza.hasPointerCapture(a.puntero)) a.pieza.releasePointerCapture(a.puntero);
  actualizarEncajes(null);
  if (cancelar) { reconstruirPanel(); aviso("Arrastre cancelado."); return; }
  if (a.fijacion) {
    if (!a.movido || !a.punto) { aviso("Arrastra la cuña hasta la mesa para colocarla."); return; }
    manual();
    fijaciones.push({ posicion: [a.punto.x, ALTURA_CUNA, a.punto.z], angulo: 0 });
    actualizar();
    aviso("Cuña colocada. Doble clic para quitarla.");
    return;
  }
  if (!a.movido) { agregarOperacion(a.token); return; }
  if (a.candidato) agregarOperacion(a.token, { bloqueId: a.candidato.bloqueId, slot: -1 });
  else if (a.punto) agregarOperacion(a.token, null, [a.punto.x, 0, a.punto.z], a.conectar);
  else { reconstruirPanel(); aviso("Suelta el bloque sobre la mesa."); }
}
for (const pieza of document.querySelectorAll(".pieza-paleta")) {
  pieza.tabIndex = 0; pieza.setAttribute("role", "button"); pieza.setAttribute("aria-label", `Añadir ${pieza.dataset.token || "cuña"}`);
  pieza.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (pieza.dataset.fijacion) { manual(); fijaciones.push({ posicion: [posicionSuelta()[0], ALTURA_CUNA, posicionSuelta()[2]], angulo: 0 }); actualizar(); }
    else agregarOperacion(pieza.dataset.token);
  });
  pieza.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !listo || nuevoArrastre) return;
    e.preventDefault();
    manual();
    nuevoArrastre = { token: pieza.dataset.token, fijacion: pieza.dataset.fijacion || null, pieza, puntero: e.pointerId, inicio: [e.clientX, e.clientY], movido: false, candidato: null, punto: null, fantasma: null, destino: null, giro: 0 };
    pieza.setPointerCapture(e.pointerId);
  });
  pieza.addEventListener("pointermove", e => {
    const a = nuevoArrastre;
    if (!a || a.puntero !== e.pointerId) return;
    if (!a.movido && Math.hypot(e.clientX - a.inicio[0], e.clientY - a.inicio[1]) < 4) return;
    if (!a.movido) {
      a.movido = true;
      a.fantasma = a.fijacion ? crearFantasmaFijacion() : crearFantasma(a.token);
      pieza.classList.add("arrastrando");
      rayo(e);
      const inicial = raycaster.ray.intersectPlane(PLANO_MESA, new THREE.Vector3());
      if (inicial) a.fantasma.position.set(inicial.x, 0, inicial.z);
      reconstruirPanel();
    }
    if (!sobreLienzo(e)) { a.fantasma.visible = false; a.punto = null; a.candidato = null; actualizarEncajes(null); aviso("Suelta sobre la mesa para colocar el bloque."); return; }
    a.fantasma.visible = true;
    rayo(e);
    const punto = raycaster.ray.intersectPlane(PLANO_MESA, new THREE.Vector3());
    if (!punto) return;
    a.punto = punto;
    a.candidato = a.fijacion ? null : encajeLibreCercano(a.token, e);
    if (a.candidato) {
      const b = montaje.bloque(a.candidato.bloqueId);
      a.destino = new THREE.Vector3(...b.posicion); a.giro = b.angulo;
    } else {
      a.destino = new THREE.Vector3(punto.x, 0, punto.z); a.giro = 0;
      const ultimo = montaje.bloques.filter(b => !b.virtual).at(-1);
      a.conectar = false;
      if (!a.fijacion && ultimo) {
        const destino = new THREE.Vector3(...posicionPosterior(ultimo));
        const pantalla = destino.clone().project(camara), r = canvas.getBoundingClientRect();
        if (Math.hypot(e.clientX - r.left - (pantalla.x + 1) * r.width / 2, e.clientY - r.top - (1 - pantalla.y) * r.height / 2) < 65) {
          a.destino = destino; a.giro = ultimo.angulo; a.conectar = true;
        }
      }
    }
    actualizarEncajes(a.candidato);
    aviso(a.fijacion ? "Suelta para dejar la cuña en la mesa."
      : a.candidato ? "Suelta para encajar la operación en este bloque."
      : a.conectar ? "Suelta para unir este bloque al anterior." : `Suelta para dejar ${a.token} en la mesa.`);
  });
  pieza.addEventListener("pointerup", e => { if (nuevoArrastre?.puntero === e.pointerId) terminarNuevo(); });
  pieza.addEventListener("pointercancel", () => terminarNuevo(true));
}
function rayo(evento) {
  const r = canvas.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((evento.clientX - r.left) / r.width * 2 - 1, 1 - (evento.clientY - r.top) / r.height * 2), camara);
}
function objetivo(evento) {
  rayo(evento);
  for (const hit of raycaster.intersectObjects(objetos.children, true)) {
    let o = hit.object;
    while (o && o !== objetos) {
      if (o.userData.piezaId || o.userData.encaje || o.userData.bloqueId || o.userData.fijacion != null) return { ...o.userData, objeto: o };
      o = o.parent;
    }
  }
  return null;
}
function mejorEncaje(id, evento) {
  // Pick in screen space: the loose piece and the socket sit at different
  // heights, so a horizontal drag plane alone misses elevated sockets.
  const r = canvas.getBoundingClientRect();
  let mejor = null, distancia = 1;
  for (const e of encajes) {
    if (!montaje.puedeAcoplar(id, e.bloqueId, e.slot)) continue;
    const centro = e.posicion.clone().project(camara);
    if (centro.z < -1 || centro.z > 1) continue;
    const borde = e.posicion.clone().add(new THREE.Vector3(12, 0, 0)).project(camara);
    const radio = Math.max(20, Math.min(55, Math.hypot((borde.x - centro.x) * r.width / 2, (borde.y - centro.y) * r.height / 2)));
    const x = r.left + (centro.x + 1) * r.width / 2, y = r.top + (1 - centro.y) * r.height / 2;
    const d = Math.hypot(evento.clientX - x, evento.clientY - y) / radio;
    if (d < distancia) { mejor = e; distancia = d; }
  }
  return mejor;
}
canvas.addEventListener("pointerdown", e => {
  if (e.button !== 0 || !listo || pagina !== "mesa") return;
  if (gravedadActiva) { tomarGravedad(e); return; }
  const hit = objetivo(e);
  if (hit?.piezaId) {
    manual(); seleccionado = hit.piezaId;
    const p = montaje.piezas.get(seleccionado), malla = mallasPiezas.get(seleccionado);
    if (p.union) bloqueActivo = p.union.bloqueId;
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -malla.position.y);
    const punto = raycaster.ray.intersectPlane(plano, new THREE.Vector3());
    if (!punto) return;
    arrastre = { id: p.id, puntero: e.pointerId, inicio: [e.clientX, e.clientY], original: [...p.posicion], union: p.union && { ...p.union }, observada: p.observada, plano, offset: malla.position.clone().sub(punto), movido: false, candidato: null };
    controles.enabled = false; canvas.setPointerCapture(e.pointerId); e.stopImmediatePropagation(); reconstruirPanel();
  } else if (hit?.encaje) {
    e.stopImmediatePropagation(); manual(); bloqueActivo = hit.encaje.bloqueId;
    if (hit.encaje.slot >= 0) abrirEditor(hit.encaje);
    else aviso("Arrastra una operación de la paleta a este encaje.");
  } else if (hit?.bloqueId) { bloqueActivo = hit.bloqueId; seleccionado = null; reconstruirPanel(); }
}, true);
canvas.addEventListener("pointermove", e => {
  if (sujecion) { moverGravedad(e); return; }
  if (!arrastre || arrastre.puntero !== e.pointerId) return;
  if (!arrastre.movido && Math.hypot(e.clientX - arrastre.inicio[0], e.clientY - arrastre.inicio[1]) < 4) return;
  if (!arrastre.movido) {
    arrastre.movido = true; montaje.desacoplar(arrastre.id); delete montaje.piezas.get(arrastre.id).observada; reconstruirPanel();
  }
  rayo(e); const punto = raycaster.ray.intersectPlane(arrastre.plano, new THREE.Vector3()); if (!punto) return;
  punto.add(arrastre.offset);
  const candidato = mejorEncaje(arrastre.id, e), malla = mallasPiezas.get(arrastre.id);
  arrastre.candidato = candidato; malla.position.copy(candidato ? candidato.posicion : punto); malla.position.y = (candidato?.posicion.y ?? -arrastre.plano.constant) + 2;
  if (candidato) malla.rotation.y = montaje.bloque(candidato.bloqueId).angulo;
  actualizarEncajes(candidato); aviso(candidato ? "Suelta para encajar aquí." : "Acerca la ficha a un encaje libre; si la sueltas fuera, quedará sobre la mesa.");
});
function terminarArrastre(cancelar = false) {
  if (!arrastre) return;
  const a = arrastre, p = montaje.piezas.get(a.id);
  if (p && a.movido) {
    if (cancelar) {
      p.posicion = a.original; p.observada = a.observada;
      if (a.union) montaje.acoplar(p.id, a.union.bloqueId, a.union.slot);
    } else if (a.candidato) { montaje.acoplar(p.id, a.candidato.bloqueId, a.candidato.slot); sonidos.reproducir("encaje"); }
    else { const pos = mallasPiezas.get(p.id).position.clone(); pos.y = alturaLibre(p); p.posicion = pos.toArray(); }
  }
  arrastre = null; controles.enabled = true;
  if (canvas.hasPointerCapture(a.puntero)) canvas.releasePointerCapture(a.puntero);
  actualizar();
  if (a.movido) aviso(cancelar ? "Movimiento cancelado." : p.union ? "Ficha encajada." : "Ficha suelta: no forma parte del programa hasta encajarla.");
}
canvas.addEventListener("pointerup", e => { if (sujecion?.puntero === e.pointerId) soltarGravedad(); else terminarArrastre(); });
canvas.addEventListener("pointercancel", e => { if (sujecion?.puntero === e.pointerId) soltarGravedad(); else terminarArrastre(true); });
canvas.addEventListener("lostpointercapture", e => { if (sujecion?.puntero === e.pointerId) soltarGravedad(); else terminarArrastre(true); });
window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const dialogo = $("editor-parametro");
  if (dialogo.open) { e.preventDefault(); dialogo.close(); return; }
  if (sujecion) { e.preventDefault(); soltarGravedad(); }
  if (arrastre) { e.preventDefault(); terminarArrastre(true); }
  if (nuevoArrastre) { e.preventDefault(); terminarNuevo(true); }
});
canvas.addEventListener("dblclick", e => {
  if (pagina !== "mesa") return;
  const hit = objetivo(e);
  if (hit?.piezaId) editar(hit.piezaId);
  else if (hit?.fijacion != null) { manual(); fijaciones.splice(hit.fijacion, 1); actualizar(); aviso("Cuña retirada."); }
});

function reemplazarProgramaDesdeCamara(instrucciones, etiquetas = {}) {
  if (arrastre || nuevoArrastre || $("editor-parametro").open) return;
  origenPrograma = "camara";
  incertidumbreCamara = "";
  const nuevo = new Montaje();
  const fisicas = instrucciones.filter(i => i.posicion);
  const origen = fisicas.length ? [fisicas.reduce((s, i) => s + i.posicion[0], 0) / fisicas.length, fisicas.reduce((s, i) => s + i.posicion[1], 0) / fisicas.length, Math.min(...fisicas.map(i => i.posicion[2]))] : [0, 0, 0];
  const convertir = p => [p[0] - origen[0], p[2] - origen[2], -(p[1] - origen[1])];
  instrucciones.forEach((i, n) => {
    if (i.virtual) { nuevo.bloques.push({ id: nuevo.id(), virtual: true, instruccion: i }); return; }
    const capacidad = Math.max(OPERACIONES[i.token]?.[0] || 1, Math.min(2, i.operandos.length));
    const b = nuevo.agregarBloque(i.token, capacidad, i.posicion ? convertir(i.posicion) : [0, 0, n * 80]);
    if (i.direccion) b.angulo = Math.atan2(i.direccion[1], i.direccion[0]);
    i.operandos.slice(0, capacidad).forEach((valor, j) => {
      if (valor === SIN_LEER) return;
      const p = nuevo.agregarParametro(parametroDesdeTexto(etiquetas[valor] || valor)); nuevo.acoplar(p.id, b.id, j);
      if (i.posiciones_operandos?.[j]) { p.observada = convertir(i.posiciones_operandos[j]); p.observada[1] += 23; }
    });
  });
  montaje = nuevo; seleccionado = null; bloqueActivo = null;
  actualizar();
}
let websocketCamara = null;
function conectarCamara() {
  if (!$("camara-activa").checked || (websocketCamara && websocketCamara.readyState < 2)) return;
  const ws = new WebSocket("ws://localhost:8765");
  websocketCamara = ws;
  ws.onopen = () => { $("estado-camara").textContent = "Cámara: conectada"; $("estado-camara").className = "conectado"; };
  ws.onclose = () => { $("estado-camara").textContent = "Cámara: desconectada"; $("estado-camara").className = "desconectado"; setTimeout(conectarCamara, 2000); };
  ws.onerror = () => ws.close();
  ws.onmessage = e => {
    if (!$("camara-activa").checked || !listo) return;
    try { const mensaje = JSON.parse(e.data); if (mensaje.tipo === "programa") reemplazarProgramaDesdeCamara(mensaje.instrucciones); }
    catch (error) { aviso(`No se pudo reconstruir la lectura: ${error.message}`); }
  };
}
let gravedadActiva = false, cuerposGravedad = [], instanteGravedad = 0, sujecion = null;
function prepararGravedad() {
  cuerposGravedad = []; instanteGravedad = performance.now();
  const bloques = montaje.bloques.filter(b => !b.virtual);
  const grupos = new Map(bloques.map(b => {
    const grupo = new THREE.Group();
    grupo.position.copy(extremo(b, ENTRADA));
    objetos.add(grupo);
    return [b.id, grupo];
  }));
  const gruposNuevos = new Set(grupos.values());
  for (const objeto of [...objetos.children]) {
    if (objeto.isLine || objeto.userData.encaje) { objeto.visible = false; continue; }
    if (gruposNuevos.has(objeto)) continue;
    const pieza = montaje.piezas.get(objeto.userData.piezaId);
    const bloque = objeto.userData.bloqueId || pieza?.union?.bloqueId;
    if (grupos.has(bloque)) grupos.get(bloque).attach(objeto);
  }
  const sucesor = new Map(), destinos = new Set();
  for (const conexion of conexionesValidas(montaje)) {
    sucesor.set(conexion.origen, conexion.destino);
    destinos.add(conexion.destino);
  }
  const visitados = new Set();
  for (const inicio of bloques.filter(b => !destinos.has(b.id)).concat(bloques)) {
    if (visitados.has(inicio.id)) continue;
    const secuencia = [];
    let actual = inicio;
    while (actual && !visitados.has(actual.id)) {
      secuencia.push(actual); visitados.add(actual.id);
      actual = montaje.bloque(sucesor.get(actual.id));
    }
    const puntos = secuencia.map(b => extremo(b, ENTRADA).toArray());
    puntos.push(extremo(secuencia.at(-1), LARGO[secuencia.at(-1).capacidad]).toArray());
    const cadena = new Cadena(puntos);
    const tramos = secuencia.map((b, i) => ({ grupo: grupos.get(b.id), referencia: new THREE.Vector3().fromArray(puntos[i + 1]).sub(new THREE.Vector3().fromArray(puntos[i])) }));
    const cuerpo = { cadena, tramos };
    tramos.forEach((tramo, i) => { tramo.grupo.userData.cuerpo = cuerpo; tramo.grupo.userData.tramo = i; });
    cuerposGravedad.push(cuerpo);
  }
}
function colocarTramos(cuerpo) {
  const { puntos } = cuerpo.cadena;
  cuerpo.tramos.forEach((tramo, i) => {
    const a = new THREE.Vector3().fromArray(puntos[i]);
    const direccion = new THREE.Vector3().fromArray(puntos[i + 1]).sub(a);
    tramo.grupo.position.copy(a);
    if (direccion.lengthSq() > .0001) tramo.grupo.quaternion.setFromUnitVectors(tramo.referencia.clone().normalize(), direccion.normalize());
  });
}
function avanzarGravedad(segundos) {
  for (const cuerpo of cuerposGravedad) {
    cuerpo.cadena.integrar(segundos);
    for (let vuelta = 0; vuelta < 8; vuelta++) {
      colocarTramos(cuerpo);
      const ajustes = cuerpo.cadena.puntos.map(() => 0);
      cuerpo.tramos.forEach((tramo, i) => {
        const minimo = new THREE.Box3().setFromObject(tramo.grupo).min.y;
        if (minimo < -.05) { ajustes[i] = Math.max(ajustes[i], .1 - minimo); ajustes[i + 1] = Math.max(ajustes[i + 1], .1 - minimo); }
      });
      if (!ajustes.some(Boolean)) break;
      cuerpo.cadena.contactos(ajustes);
      cuerpo.cadena.resolver(4);
    }
    colocarTramos(cuerpo);
  }
  if (sujecion) sujecion.marca.position.fromArray(sujecion.cuerpo.cadena.puntos[sujecion.indice]);
}
function tomarGravedad(e) {
  rayo(e);
  for (const hit of raycaster.intersectObjects(objetos.children, true)) {
    let nodo = hit.object;
    while (nodo && nodo !== objetos && !nodo.userData.cuerpo) nodo = nodo.parent;
    const cuerpo = nodo?.userData.cuerpo;
    if (!cuerpo) continue;
    const tramo = nodo.userData.tramo;
    const indice = hit.point.distanceTo(new THREE.Vector3().fromArray(cuerpo.cadena.puntos[tramo])) <= hit.point.distanceTo(new THREE.Vector3().fromArray(cuerpo.cadena.puntos[tramo + 1])) ? tramo : tramo + 1;
    const extremoActual = new THREE.Vector3().fromArray(cuerpo.cadena.puntos[indice]);
    const marca = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: 0x0d99ff }));
    marca.position.copy(extremoActual); objetos.add(marca);
    cuerpo.cadena.sujetar(indice, extremoActual.toArray());
    const normal = camara.getWorldDirection(new THREE.Vector3()); normal.y = 0;
    if (normal.lengthSq() < .0001) normal.set(0, 0, 1);
    sujecion = { cuerpo, indice, marca, puntero: e.pointerId, plano: new THREE.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), hit.point), offset: extremoActual.sub(hit.point) };
    controles.enabled = false; canvas.setPointerCapture(e.pointerId);
    document.body.classList.add('sujetando');
    e.stopImmediatePropagation();
    aviso('Levanta el extremo: cada bloque gira en su unión y se apoya sobre la mesa al soltarlo.');
    return;
  }
}
function moverGravedad(e) {
  if (!sujecion || sujecion.puntero !== e.pointerId) return;
  rayo(e);
  const punto = raycaster.ray.intersectPlane(sujecion.plano, new THREE.Vector3());
  if (!punto) return;
  sujecion.cuerpo.cadena.mover(punto.add(sujecion.offset).toArray());
}
function soltarGravedad() {
  if (!sujecion) return;
  const { cuerpo, marca, puntero } = sujecion;
  sujecion = null;
  cuerpo.cadena.soltar();
  objetos.remove(marca); marca.geometry.dispose(); marca.material.dispose();
  instanteGravedad = performance.now();
  controles.enabled = true;
  if (canvas.hasPointerCapture(puntero)) canvas.releasePointerCapture(puntero);
  document.body.classList.remove('sujetando');
  aviso('La cadena cae y sus tramos se apoyan sobre el tablero.');
}
function repetirGravedad() {
  if (sujecion) soltarGravedad();
  for (const cuerpo of cuerposGravedad) { cuerpo.cadena.elevar(180); colocarTramos(cuerpo); }
  instanteGravedad = performance.now();
}
function alternarGravedad(activa = !gravedadActiva) {
  if (!listo || arrastre || nuevoArrastre) return;
  if (sujecion) soltarGravedad();
  gravedadActiva = activa; document.body.classList.toggle('modo-gravedad', activa);
  $('ver-gravedad').textContent = activa ? 'Salir de gravedad' : 'Ver con gravedad';
  $('ver-gravedad').setAttribute('aria-pressed', String(activa)); $('repetir-gravedad').hidden = !activa;
  if (activa) { vistas.detenerLectura(); $('camara-activa').checked = false; }
  reconstruirEscena();
  if (activa) encuadrar();
  aviso(activa ? 'Agarra un extremo del programa, levántalo y suéltalo para ver cómo cae cada tramo.' : 'Posiciones originales restauradas.');
}
$('ver-gravedad').onclick = () => alternarGravedad();
$('repetir-gravedad').onclick = () => { if (gravedadActiva) repetirGravedad(); };
let montajeGuardado = null;
const vistas = crearVistas({
  navegar: cambiarPagina,
  verGravedad: () => alternarGravedad(true),
  cargarEjemplo(ejemplo, destino) {
    if (!listo || arrastre || nuevoArrastre) return false;
    if (!montajeGuardado) montajeGuardado = { montaje, fijaciones, origenPrograma };
    vistas.detenerLectura(); $("camara-activa").checked = false;
    montaje = montajeEjemplo(ejemplo); fijaciones = []; origenPrograma = "manual";
    seleccionado = null; bloqueActivo = null; invalidarEjecucion("Cargando ejemplo.");
    cambiarPagina(destino); return true;
  },
  restaurar() {
    if (!montajeGuardado || !listo || arrastre || nuevoArrastre) return false;
    vistas.detenerLectura(); $("camara-activa").checked = false;
    ({ montaje, fijaciones, origenPrograma } = montajeGuardado); montajeGuardado = null;
    seleccionado = null; bloqueActivo = null; invalidarEjecucion("Montaje restaurado.");
    cambiarPagina("mesa"); return true;
  },
  inventario() {
    const b = montaje.bloques.filter(b => !b.virtual);
    const p = [...montaje.piezas.values()];
    return { bloque_1_param: b.filter(b => b.capacidad === 1).length, bloque_2_param: b.filter(b => b.capacidad === 2).length,
      parametro: p.filter(p => p.tipo === 'operacion').length, ficha_parametro: p.filter(p => p.tipo === 'parametro').length,
      conector: conexionesValidas(montaje).length, tuerca: b.length, cuna: fijaciones.length };
  },
  incertidumbre(texto) {
    if (origenPrograma !== 'camara') return;
    incertidumbreCamara = texto;
    invalidarEjecucion(texto);
    reconstruirPanel();
    reconstruirEscena();
  },
  recibir(instrucciones, etiquetas) {
    if (!listo || arrastre || nuevoArrastre || $("editor-parametro").open) return false;
    reemplazarProgramaDesdeCamara(instrucciones, etiquetas); return true;
  },
  veredictoFisico(lectura, veredicto, motivo) { fijarVeredictoDelServicio(lectura, veredicto, motivo); },
});
editorCodigo = crearEditorCodigo({
  codigoMesa: () => montaje.pendientes().length ? null : montaje.programa().map(i => [i.token, ...i.operandos].join(" ")).join("\n"),
  construir(instrucciones) {
    if (instrucciones[0]?.token !== "PUSH" || !/^-?\d+(\.\d+)?$/.test(instrucciones[0].operandos[1] || ""))
      throw new Error("El programa debe comenzar con PUSH, una pila y un valor numérico, por ejemplo PUSH a 3.");
    if (!listo || arrastre || nuevoArrastre || $("editor-parametro").open)
      throw new Error("Espera a que la mesa esté lista para construir los bloques.");
    const nuevo = montajeDesdeInstrucciones(instrucciones);
    manual(); origenPrograma = "manual"; montajeGuardado = null;
    montaje = nuevo; fijaciones = []; seleccionado = null; bloqueActivo = null;
    invalidarEjecucion("Construyendo bloques desde el texto.");
    cambiarPagina("mesa"); actualizar(); encuadrar();
    aviso("Programa convertido en bloques. Puedes recorrer su ejecución paso a paso.");
    return `${instrucciones.length} ${instrucciones.length === 1 ? "bloque construido" : "bloques construidos"} de izquierda a derecha.`;
  },
  navegar: accion => $("ej-" + accion).click(),
});
$("abrir-camaras").onclick = () => cambiarPagina("camaras");
$("camara-activa").addEventListener("change", () => { if ($("camara-activa").checked) conectarCamara(); else websocketCamara?.close(); });

async function iniciar() {
  const cargador = new STLLoader();
  const nombres = ["bloque_1_param", "bloque_2_param", "parametro", "conector", "tuerca", "cuna"];
  const [uno, dos, lamina, laminaConector, laminaTuerca, laminaCuna] = await Promise.all(nombres.map(n => cargador.loadAsync(`./modelos/${n}.stl`)));
  geometrias = { 1: prepararBloque(uno, 1), 2: prepararBloque(dos, 2) };
  operaciones = separarOperaciones(lamina); lamina.dispose();
  conector = prepararConector(laminaConector); laminaConector.dispose();
  tuerca = prepararTuerca(laminaTuerca);
  cuna = prepararCuna(laminaCuna);
  listo = true;
  ajustarTamano(); actualizar(); controles.update();
  renderizador.setAnimationLoop(() => {
    if (!["mesa", "ejecucion"].includes(pagina)) return;
    controles.update();
    if (gravedadActiva) {
      const ahora = performance.now(), dt = (ahora - instanteGravedad) / 1000; instanteGravedad = ahora;
      avanzarGravedad(dt);
    }
    // Suavizar el fantasma: seguir el puntero al instante se siente nervioso.
    if (nuevoArrastre?.fantasma && nuevoArrastre.destino) {
      nuevoArrastre.fantasma.position.lerp(nuevoArrastre.destino, 0.35);
      const giro = nuevoArrastre.giro ?? 0;
      nuevoArrastre.fantasma.rotation.y += (giro - nuevoArrastre.fantasma.rotation.y) * 0.35;
    }
    renderizador.render(escena, camara);
    dibujarSeleccion();
  });
}
iniciar().catch(error => { resultadoEl.textContent = `No se pudo cargar el simulador: ${error.message}`; resultadoEl.className = "invalido"; });
