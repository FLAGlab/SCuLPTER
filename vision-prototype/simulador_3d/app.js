import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sculptEjecutar } from "./interprete.js";
import { separarOperaciones, crearFichaOperacion, crearFichaOperando, prepararBloque, posicionEncaje } from "./piezas.js";
import { Montaje, OPERACIONES, SIN_LEER, parametroDesdeTexto } from "./montaje.mjs";
import { crearEditor } from "./editor-parametro.js";

const $ = id => document.getElementById(id);
const contenedor = $("escena"), resultadoEl = $("resultado");
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x171c1c);
const camara = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
contenedor.appendChild(renderizador.domElement);
const canvas = renderizador.domElement;
const controles = new OrbitControls(camara, canvas);
controles.maxPolarAngle = Math.PI / 2 - 0.08;
controles.minDistance = 45;
controles.maxDistance = 1800;
controles.target.set(25, 12, 0);
camara.position.set(95, 180, 170);
escena.add(new THREE.HemisphereLight(0xffffff, 0x485454, 2));
const luz = new THREE.DirectionalLight(0xffffff, 2.2);
luz.position.set(-80, 200, 100); escena.add(luz);
const mesa = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x252c2b, roughness: 1 }));
mesa.rotation.x = -Math.PI / 2; mesa.position.y = -0.1; escena.add(mesa);
const rejilla = new THREE.GridHelper(1400, 70, 0x34443f, 0x2b3532); rejilla.position.y = 0.02; escena.add(rejilla);

let montaje = new Montaje(), listo = false, seleccionado = null, bloqueActivo = null, arrastre = null;
let objetos = new THREE.Group(); escena.add(objetos);
let geometrias = {}, operaciones = {}, mallasPiezas = new Map(), mallasBloques = new Map(), encajes = [];
const raycaster = new THREE.Raycaster();
const aviso = mensaje => { $("aviso").textContent = mensaje; };
const alturaLibre = p => p.tipo === "operacion" ? 7.5 : 1.5;
function manual() { $("camara-activa").checked = false; }
function ajustarTamano() {
  const ancho = contenedor.clientWidth, alto = contenedor.clientHeight;
  camara.aspect = ancho / alto; camara.updateProjectionMatrix(); renderizador.setSize(ancho, alto);
}
window.addEventListener("resize", ajustarTamano);
function encuadrar() {
  const caja = new THREE.Box3().setFromObject(objetos);
  if (caja.isEmpty()) return;
  const centro = caja.getCenter(new THREE.Vector3()), tamano = caja.getSize(new THREE.Vector3());
  const distancia = Math.max(tamano.x / camara.aspect, tamano.z, tamano.y, 95) / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2))) * 1.6;
  controles.target.copy(centro);
  camara.position.copy(centro).add(new THREE.Vector3(0.28, 0.88, 0.82).normalize().multiplyScalar(distancia));
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
  const aro = new THREE.Mesh(new THREE.RingGeometry(slot === -1 ? 7 : 5, slot === -1 ? 9 : 7, 32), new THREE.MeshBasicMaterial({ color: 0x80cbb9, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  aro.rotation.x = -Math.PI / 2; aro.position.copy(puntoEncaje(b, slot)); aro.position.y += 0.12;
  aro.userData.encaje = { bloqueId: b.id, slot };
  objetos.add(aro); encajes.push({ bloqueId: b.id, slot, posicion: puntoEncaje(b, slot), aro });
}
function reconstruirEscena() {
  liberar(); mallasPiezas = new Map(); mallasBloques = new Map(); encajes = [];
  for (const b of montaje.bloques) {
    if (b.virtual) continue;
    const base = new THREE.Mesh(geometrias[b.capacidad], new THREE.MeshStandardMaterial({ color: b.id === bloqueActivo ? 0x3d8880 : 0x2a6f6a, roughness: 0.65 }));
    base.position.fromArray(b.posicion); base.rotation.y = b.angulo; base.userData.bloqueId = b.id;
    objetos.add(base); mallasBloques.set(b.id, base);
    for (let slot = -1; slot < b.capacidad; slot++) crearMarcador(b, slot);
  }
  for (const p of montaje.piezas.values()) {
    const raiz = new THREE.Group();
    raiz.userData.piezaId = p.id;
    raiz.add(p.tipo === "operacion" ? crearFichaOperacion(operaciones[p.token]) : crearFichaOperando(p.contenido));
    if (p.union) {
      const b = montaje.bloque(p.union.bloqueId);
      raiz.position.copy(p.observada ? new THREE.Vector3(...p.observada) : puntoEncaje(b, p.union.slot)); raiz.rotation.y = b.angulo;
    } else raiz.position.fromArray(p.posicion);
    objetos.add(raiz); mallasPiezas.set(p.id, raiz);
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
  actualizarEncajes();
}
function actualizarEncajes(candidato = null) {
  for (const e of encajes) {
    const b = montaje.bloque(e.bloqueId);
    e.aro.visible = !montaje.ocupante(b, e.slot);
    e.aro.material.color.setHex(candidato === e ? 0xffd36b : 0x80cbb9);
    e.aro.scale.setScalar(candidato === e ? 1.18 : 1);
  }
}
function boton(texto, accion, clase = "") {
  const b = document.createElement("button"); b.textContent = texto; b.className = clase; b.onclick = accion; return b;
}
function reconstruirPanel() {
  const programa = montaje.programa(), etiquetas = montaje.etiquetas();
  const lista = $("lista-programa"); lista.replaceChildren();
  $("vacio").hidden = montaje.bloques.length > 0;
  montaje.bloques.forEach((b, i) => {
    const fila = document.createElement("div"); fila.className = "linea-programa" + (b.id === bloqueActivo ? " seleccionada" : "");
    const texto = document.createElement("span");
    texto.textContent = [programa[i].token, ...programa[i].operandos.map(p => etiquetas.get(p) || p)].join(" ").replaceAll(SIN_LEER, "…");
    fila.append(texto);
    for (const [signo, delta] of [["↑", -1], ["↓", 1]]) fila.append(boton(signo, () => {
      const j = i + delta; if (j < 0 || j >= montaje.bloques.length) return;
      manual(); [montaje.bloques[i], montaje.bloques[j]] = [montaje.bloques[j], montaje.bloques[i]]; actualizar();
    }));
    fila.append(boton("✕", () => { manual(); montaje.eliminarBloque(b.id); seleccionado = null; actualizar(); }));
    if (!b.virtual) {
      const slots = document.createElement("div"); slots.className = "encajes";
      slots.append(boton(b.operacion ? "OP ✓" : "OP vacío", () => { bloqueActivo = b.id; seleccionado = b.operacion; actualizar(); }, "encaje"));
      b.parametros.forEach((id, j) => slots.append(boton(`P${j + 1} ${id ? "✓" : "vacío"}`, () => {
        manual(); bloqueActivo = b.id;
        if (id) editar(id); else editor.abrir({ bloqueId: b.id, slot: j });
      }, "encaje")));
      fila.append(slots);
    }
    lista.append(fila);
  });
  const codigo = programa.map(i => [i.token, ...i.operandos].join(" ")).join("\n");
  $("codigo-generado").textContent = codigo.replaceAll(SIN_LEER, "…") || "(vacío)";
  $("alias").textContent = [...etiquetas].filter(([id, nombre]) => id !== nombre).map(([id, nombre]) => `${nombre} → ${id}`).join("\n");
  resultadoEl.className = "";
  const pendientes = montaje.pendientes();
  if (arrastre?.movido || pendientes.length) {
    resultadoEl.className = "pendiente";
    resultadoEl.textContent = ["EN CONSTRUCCIÓN · no se ejecuta", ...(arrastre?.movido ? ["Hay una ficha en movimiento."] : []), ...pendientes].join("\n");
  } else if (!codigo) resultadoEl.textContent = "(sin instrucciones todavía)";
  else {
    const resultado = sculptEjecutar(codigo + "\n");
    resultadoEl.className = resultado.valido ? "valido" : "invalido";
    resultadoEl.textContent = resultado.valido ? ["VÁLIDO", ...resultado.pasos.map((pilas, i) => `paso ${i + 1}: ` + (Object.entries(pilas).map(([id, valores]) => `${etiquetas.get(id) || id}=[${valores.join(",")}]`).join(" ") || "(sin pilas)"))].join("\n") : `INVÁLIDO (${resultado.etapa})\n${resultado.mensaje || ""}`;
  }
  const seleccion = $("seleccion"); seleccion.replaceChildren();
  const p = montaje.piezas.get(seleccionado);
  if (p) {
    const descripcion = document.createElement("div");
    descripcion.textContent = `${p.tipo === "operacion" ? p.token : p.contenido.texto} · ${p.union ? "encajado" : "suelto"}`;
    seleccion.append(descripcion);
    if (p.tipo === "parametro") seleccion.append(boton("Editar", () => editar(p.id), "accion secundaria"));
    if (!p.union) seleccion.append(boton("Encajar", () => {
      const destino = encajes.find(e => e.bloqueId === bloqueActivo && montaje.puedeAcoplar(p.id, e.bloqueId, e.slot)) || encajes.find(e => montaje.puedeAcoplar(p.id, e.bloqueId, e.slot));
      if (!destino) { aviso("No hay un encaje libre compatible con esta ficha."); return; }
      manual(); montaje.acoplar(p.id, destino.bloqueId, destino.slot); delete p.observada; actualizar(); aviso("Ficha encajada.");
    }, "accion"));
    if (p.union) seleccion.append(boton("Retirar", () => {
      manual(); const pos = mallasPiezas.get(p.id).position.clone(); pos.z += 40; pos.y = alturaLibre(p);
      montaje.desacoplar(p.id, pos.toArray()); delete p.observada; actualizar(); aviso("Ficha retirada. Puedes arrastrarla a otro encaje.");
    }, "accion secundaria"));
    seleccion.append(boton("Eliminar ficha", () => { manual(); montaje.desacoplar(p.id); montaje.piezas.delete(p.id); seleccionado = null; actualizar(); }, "accion secundaria"));
  }
}
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
    if (destino.bloqueId) montaje.acoplar(p.id, destino.bloqueId, destino.slot);
  }
  actualizar(); aviso("Parámetro listo. Arrástralo para moverlo o cambiarlo de encaje."); encuadrar();
});
function editar(id) { const p = montaje.piezas.get(id); if (p?.tipo === "parametro") { manual(); editor.abrir({ piezaId: id }, p.contenido); } }
$("nuevo-parametro").onclick = () => { if (listo) { manual(); editor.abrir(); } };
function agregarOperacion(token, objetivo = null) {
  if (!listo || !OPERACIONES[token]) return;
  manual();
  if (objetivo && objetivo.slot === -1) {
    const p = { id: montaje.id(), tipo: "operacion", token, union: null, posicion: [0, 7.5, 0] };
    montaje.piezas.set(p.id, p);
    if (!montaje.acoplar(p.id, objetivo.bloqueId, -1)) { montaje.piezas.delete(p.id); aviso("Esta operación necesita un bloque de otro tamaño o un encaje vacío."); return; }
    seleccionado = p.id; bloqueActivo = objetivo.bloqueId;
  } else {
    const [min, max] = OPERACIONES[token];
    const capacidad = min === max ? min : Number($("capacidad-mixtas").value);
    const b = montaje.agregarBloque(token, capacidad, [0, 0, montaje.bloques.filter(b => !b.virtual).length * 80]);
    bloqueActivo = b.id; seleccionado = b.operacion;
  }
  actualizar(); encuadrar(); aviso("Operación encajada. Añade parámetros libres o pulsa un P vacío para completarla.");
}
for (const pieza of document.querySelectorAll(".pieza-paleta")) {
  pieza.tabIndex = 0; pieza.setAttribute("role", "button"); pieza.setAttribute("aria-label", `Añadir ${pieza.dataset.token}`);
  pieza.addEventListener("click", () => agregarOperacion(pieza.dataset.token));
  pieza.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agregarOperacion(pieza.dataset.token); } });
  pieza.addEventListener("dragstart", e => {
    e.dataTransfer.setData("token", pieza.dataset.token); e.dataTransfer.effectAllowed = "copy";
    const imagen = pieza.querySelector("img"); if (imagen?.complete) e.dataTransfer.setDragImage(imagen, 24, 24);
  });
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
      if (o.userData.piezaId || o.userData.encaje || o.userData.bloqueId) return { ...o.userData, objeto: o };
      o = o.parent;
    }
  }
  return null;
}
contenedor.addEventListener("dragover", e => e.preventDefault());
contenedor.addEventListener("drop", e => { e.preventDefault(); agregarOperacion(e.dataTransfer.getData("token"), objetivo(e)?.encaje); });
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
  if (e.button !== 0 || !listo) return;
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
    if (hit.encaje.slot >= 0) editor.abrir(hit.encaje);
    else aviso("Arrastra una operación de la paleta a este encaje.");
  } else if (hit?.bloqueId) { bloqueActivo = hit.bloqueId; seleccionado = null; reconstruirPanel(); }
}, true);
canvas.addEventListener("pointermove", e => {
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
    } else if (a.candidato) montaje.acoplar(p.id, a.candidato.bloqueId, a.candidato.slot);
    else { const pos = mallasPiezas.get(p.id).position.clone(); pos.y = alturaLibre(p); p.posicion = pos.toArray(); }
  }
  arrastre = null; controles.enabled = true;
  if (canvas.hasPointerCapture(a.puntero)) canvas.releasePointerCapture(a.puntero);
  actualizar();
  if (a.movido) aviso(cancelar ? "Movimiento cancelado." : p.union ? "Ficha encajada." : "Ficha suelta: no forma parte del programa hasta encajarla.");
}
canvas.addEventListener("pointerup", () => terminarArrastre());
canvas.addEventListener("pointercancel", () => terminarArrastre(true));
canvas.addEventListener("lostpointercapture", () => terminarArrastre(true));
window.addEventListener("keydown", e => { if (e.key === "Escape" && arrastre) { e.preventDefault(); terminarArrastre(true); } });
canvas.addEventListener("dblclick", e => { const hit = objetivo(e); if (hit?.piezaId) editar(hit.piezaId); });

function reemplazarProgramaDesdeCamara(instrucciones) {
  if (arrastre) return;
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
      const p = nuevo.agregarParametro(parametroDesdeTexto(valor)); nuevo.acoplar(p.id, b.id, j);
      if (i.posiciones_operandos?.[j]) { p.observada = convertir(i.posiciones_operandos[j]); p.observada[1] += 23; }
    });
  });
  montaje = nuevo; seleccionado = null; bloqueActivo = null;
  actualizar();
}
function conectarCamara() {
  const ws = new WebSocket("ws://localhost:8765");
  ws.onopen = () => { $("estado-camara").textContent = "Cámara: conectada"; $("estado-camara").className = "conectado"; };
  ws.onclose = () => { $("estado-camara").textContent = "Cámara: desconectada"; $("estado-camara").className = "desconectado"; setTimeout(conectarCamara, 2000); };
  ws.onerror = () => ws.close();
  ws.onmessage = e => {
    if (!$("camara-activa").checked || !listo) return;
    try { const mensaje = JSON.parse(e.data); if (mensaje.tipo === "programa") reemplazarProgramaDesdeCamara(mensaje.instrucciones); }
    catch (error) { aviso(`No se pudo reconstruir la lectura: ${error.message}`); }
  };
}
async function iniciar() {
  const cargador = new STLLoader();
  const [uno, dos, lamina] = await Promise.all(["bloque_1_param", "bloque_2_param", "parametro"].map(n => cargador.loadAsync(`./modelos/${n}.stl`)));
  geometrias = { 1: prepararBloque(uno, 1), 2: prepararBloque(dos, 2) };
  operaciones = separarOperaciones(lamina); lamina.dispose(); listo = true;
  ajustarTamano(); actualizar(); controles.update(); conectarCamara();
  renderizador.setAnimationLoop(() => { controles.update(); renderizador.render(escena, camara); });
}
iniciar().catch(error => { resultadoEl.textContent = `No se pudo cargar el simulador: ${error.message}`; resultadoEl.className = "invalido"; });
