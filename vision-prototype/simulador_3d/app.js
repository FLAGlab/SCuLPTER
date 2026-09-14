import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sculptEjecutar } from "./interprete.js";

const DEFINICION_OPERACIONES = {
  PUSH: { minOperandos: 2, maxOperandos: 2 },
  MOV: { minOperandos: 2, maxOperandos: 2 },
  POP: { minOperandos: 1, maxOperandos: 1 },
  DUP: { minOperandos: 1, maxOperandos: 1 },
  NEG: { minOperandos: 1, maxOperandos: 1 },
  "?": { minOperandos: 1, maxOperandos: 1 },
  JMP: { minOperandos: 1, maxOperandos: 1 },
  CMP: { minOperandos: 1, maxOperandos: 2 },
  ADD: { minOperandos: 1, maxOperandos: 2 },
  SUB: { minOperandos: 1, maxOperandos: 2 },
  MUL: { minOperandos: 1, maxOperandos: 2 },
  DIV: { minOperandos: 1, maxOperandos: 2 },
  MOD: { minOperandos: 1, maxOperandos: 2 },
};

const contenedorEscena = document.getElementById("escena");
const listaProgramaEl = document.getElementById("lista-programa");
const vacioEl = document.getElementById("vacio");
const codigoGeneradoEl = document.getElementById("codigo-generado");
const resultadoEl = document.getElementById("resultado");

const escena = new THREE.Scene();
escena.background = new THREE.Color(0x111111);

const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const renderizador = new THREE.WebGLRenderer({ antialias: true });
contenedorEscena.appendChild(renderizador.domElement);

const controles = new OrbitControls(camara, renderizador.domElement);
controles.target.set(0, 0, 0);

escena.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.4));
const luzDireccional = new THREE.DirectionalLight(0xffffff, 1.2);
luzDireccional.position.set(200, 300, 200);
escena.add(luzDireccional);

const mesa = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshStandardMaterial({ color: 0x1c1c1c })
);
mesa.rotation.x = -Math.PI / 2;
escena.add(mesa);

function ajustarTamano() {
  const ancho = contenedorEscena.clientWidth;
  const alto = contenedorEscena.clientHeight;
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
  renderizador.setSize(ancho, alto);
}
window.addEventListener("resize", ajustarTamano);

const cargador = new STLLoader();
const geometrias = {};

async function cargarGeometria(nombre, ruta) {
  const geometria = await cargador.loadAsync(ruta);
  geometria.computeVertexNormals();
  geometria.center();
  geometria.computeBoundingBox();
  geometrias[nombre] = geometria;
}

function escalaObjetivo(geometria, tamanoDeseado) {
  const tamano = new THREE.Vector3();
  geometria.boundingBox.getSize(tamano);
  const mayor = Math.max(tamano.x, tamano.y, tamano.z) || 1;
  return tamanoDeseado / mayor;
}

function crearEtiqueta(texto) {
  const lienzo = document.createElement("canvas");
  lienzo.width = 256;
  lienzo.height = 128;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = "rgba(0,0,0,0)";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.font = "bold 56px system-ui, sans-serif";
  contexto.fillStyle = "#ffffff";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(texto, lienzo.width / 2, lienzo.height / 2);
  const textura = new THREE.CanvasTexture(lienzo);
  const material = new THREE.SpriteMaterial({ map: textura, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(60, 30, 1);
  return sprite;
}

function crearPiezaVisual(nombreGeometria, colorHex, tamano) {
  const geometria = geometrias[nombreGeometria];
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.1 });
  const malla = new THREE.Mesh(geometria, material);
  malla.scale.setScalar(escalaObjetivo(geometria, tamano));
  return malla;
}

let programa = [];
let objetosColocados = [];

function esOperandoValido(texto) {
  const limpio = texto.trim();
  if (limpio === "") return false;
  if (limpio === "nil") return true;
  if (/^-?\d+(\.\d+)?$/.test(limpio)) return true;
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(limpio)) return true;
  return false;
}

function pedirOperando(mensaje) {
  while (true) {
    const valor = window.prompt(mensaje);
    if (valor === null) return null;
    if (esOperandoValido(valor)) return valor.trim();
    window.alert("Valor inválido. Usa un número, un nombre de pila (letras) o 'nil'.");
  }
}

function pedirOperandosPara(token) {
  const definicion = DEFINICION_OPERACIONES[token];
  const operandos = [];
  for (let i = 0; i < definicion.minOperandos; i++) {
    const valor = pedirOperando(`${token}: operando ${i + 1} de ${definicion.minOperandos}`);
    if (valor === null) return null;
    operandos.push(valor);
  }
  if (definicion.maxOperandos > definicion.minOperandos) {
    if (window.confirm(`${token}: ¿agregar un segundo operando (forma binaria)?`)) {
      const valor = pedirOperando(`${token}: segundo operando`);
      if (valor === null) return null;
      operandos.push(valor);
    }
  }
  return operandos;
}

function agregarInstruccion(token, operandos) {
  programa.push({ token, operandos });
  reconstruirTodo();
}

function reemplazarProgramaDesdeCamara(instrucciones) {
  // reconstruir.py (2D) manda solo token/operandos; triangulate.py (3D) añade
  // dónde está cada bloque en la mesa, en mm, y el JMP virtual de un loop físico.
  programa = instrucciones.map((i) => ({
    token: i.token,
    operandos: i.operandos,
    posicion: i.posicion || null,
    direccion: i.direccion || null,
    posicionesOperandos: i.posiciones_operandos || [],
    virtual: Boolean(i.virtual),
    destino: i.destino ?? null,
  }));
  reconstruirTodo();
}

function eliminarInstruccion(indice) {
  programa.splice(indice, 1);
  reconstruirTodo();
}

function moverInstruccion(indice, delta) {
  const destino = indice + delta;
  if (destino < 0 || destino >= programa.length) return;
  const temp = programa[indice];
  programa[indice] = programa[destino];
  programa[destino] = temp;
  reconstruirTodo();
}

function limpiarObjetosColocados() {
  for (const objeto of objetosColocados) {
    escena.remove(objeto);
  }
  objetosColocados = [];
}

// Marco de mesa (z hacia arriba, mm) -> escena three.js (y hacia arriba).
// (x, y, z)_mesa -> (x, z, -y)_escena conserva la orientación de los ejes.
function aEscena(p, origen) {
  return new THREE.Vector3(p[0] - origen.x, p[2] - origen.z + 15, -(p[1] - origen.y));
}

function colocar(objeto, posicion) {
  objeto.position.copy(posicion);
  escena.add(objeto);
  objetosColocados.push(objeto);
}

function colocarInstruccionEnCuadricula(instruccion, z, x0) {
  const nombreGeometria = instruccion.operandos.length === 2 ? "bloque_2_param" : "bloque_1_param";
  colocar(crearPiezaVisual(nombreGeometria, 0x2a6f6a, 60), new THREE.Vector3(x0, 15, z));
  colocar(crearEtiqueta(instruccion.token), new THREE.Vector3(x0, 55, z));
  instruccion.operandos.forEach((valor, indiceOperando) => {
    const x = x0 + (indiceOperando + 1) * 90;
    colocar(crearPiezaVisual("parametro", 0x8a5a2a, 40), new THREE.Vector3(x, 15, z));
    colocar(crearEtiqueta(valor), new THREE.Vector3(x, 45, z));
  });
}

function colocarInstruccionFisica(instruccion, origen) {
  const posicion = aEscena(instruccion.posicion, origen);
  const nombreGeometria = instruccion.operandos.length === 2 ? "bloque_2_param" : "bloque_1_param";
  const bloque = crearPiezaVisual(nombreGeometria, 0x2a6f6a, 60);
  if (instruccion.direccion) {
    // El modelo se extiende a lo largo de +x; giramos ese eje hacia la dirección del flujo.
    const d = instruccion.direccion;
    bloque.rotation.y = Math.atan2(d[1], d[0]);
  }
  colocar(bloque, posicion);
  colocar(crearEtiqueta(instruccion.token), posicion.clone().add(new THREE.Vector3(0, 40, 0)));

  instruccion.operandos.forEach((valor, indiceOperando) => {
    let posicionOperando;
    if (instruccion.posicionesOperandos[indiceOperando]) {
      posicionOperando = aEscena(instruccion.posicionesOperandos[indiceOperando], origen);
    } else {
      const d = instruccion.direccion || [1, 0, 0];
      posicionOperando = posicion.clone().add(new THREE.Vector3(d[0], 0, -d[1]).multiplyScalar(20 * (indiceOperando + 1)));
    }
    colocar(crearPiezaVisual("parametro", 0x8a5a2a, 25), posicionOperando);
    colocar(crearEtiqueta(valor), posicionOperando.clone().add(new THREE.Vector3(0, 30, 0)));
  });
  return posicion;
}

function dibujarRetornoDeLoop(desde, hasta, texto) {
  const alto = new THREE.Vector3(0, 45, 0);
  const puntos = [desde.clone().add(alto), desde.clone().add(alto).lerp(hasta.clone().add(alto), 0.5).add(new THREE.Vector3(0, 40, 0)), hasta.clone().add(alto)];
  const curva = new THREE.CatmullRomCurve3(puntos);
  const geometria = new THREE.BufferGeometry().setFromPoints(curva.getPoints(24));
  const linea = new THREE.Line(geometria, new THREE.LineBasicMaterial({ color: 0xffc83d }));
  escena.add(linea);
  objetosColocados.push(linea);
  colocar(crearEtiqueta(texto), puntos[1].clone().add(new THREE.Vector3(0, 25, 0)));
}

function reconstruirEscena3D() {
  limpiarObjetosColocados();
  const fisicas = programa.filter((i) => i.posicion);

  if (fisicas.length === 0) {
    const separacionFilas = 140;
    const inicioZ = -((programa.length - 1) * separacionFilas) / 2;
    programa.forEach((instruccion, indice) => colocarInstruccionEnCuadricula(instruccion, inicioZ + indice * separacionFilas, 0));
    return;
  }

  // Centro de la escultura en la mesa y su punto más bajo como suelo.
  const origen = {
    x: fisicas.reduce((s, i) => s + i.posicion[0], 0) / fisicas.length,
    y: fisicas.reduce((s, i) => s + i.posicion[1], 0) / fisicas.length,
    z: Math.min(...fisicas.map((i) => i.posicion[2])),
  };

  const posicionesEscena = [];
  let filaManual = 0;
  programa.forEach((instruccion, indice) => {
    if (instruccion.posicion) {
      posicionesEscena[indice] = colocarInstruccionFisica(instruccion, origen);
    } else if (instruccion.virtual && instruccion.destino !== null && indice > 0) {
      const ultimaFisica = posicionesEscena.slice(0, indice).filter(Boolean).pop();
      const destino = posicionesEscena[instruccion.destino];
      if (ultimaFisica && destino) {
        dibujarRetornoDeLoop(ultimaFisica, destino, [instruccion.token, ...instruccion.operandos].join(" "));
      }
    } else {
      // Instrucciones añadidas a mano mientras hay una lectura física: a un lado, en cuadrícula.
      colocarInstruccionEnCuadricula(instruccion, filaManual * 140, -300);
      filaManual += 1;
    }
  });
}

function reconstruirListaHTML() {
  listaProgramaEl.innerHTML = "";
  vacioEl.style.display = programa.length === 0 ? "block" : "none";
  programa.forEach((instruccion, indice) => {
    const fila = document.createElement("div");
    fila.className = "linea-programa";

    const texto = document.createElement("span");
    texto.textContent = [instruccion.token, ...instruccion.operandos].join(" ");
    fila.appendChild(texto);

    const subir = document.createElement("button");
    subir.textContent = "↑";
    subir.onclick = () => moverInstruccion(indice, -1);
    fila.appendChild(subir);

    const bajar = document.createElement("button");
    bajar.textContent = "↓";
    bajar.onclick = () => moverInstruccion(indice, 1);
    fila.appendChild(bajar);

    const eliminar = document.createElement("button");
    eliminar.textContent = "✕";
    eliminar.onclick = () => eliminarInstruccion(indice);
    fila.appendChild(eliminar);

    listaProgramaEl.appendChild(fila);
  });
}

function generarCodigoScuLPT() {
  return programa.map((instruccion) => [instruccion.token, ...instruccion.operandos].join(" ")).join("\n");
}

function renderizarResultado(codigo) {
  if (codigo.trim() === "") {
    resultadoEl.className = "";
    resultadoEl.textContent = "(sin instrucciones todavía)";
    return;
  }
  const resultado = sculptEjecutar(codigo + "\n");
  if (resultado.valido) {
    resultadoEl.className = "valido";
    const lineas = resultado.pasos.map((pilas, indice) => {
      const texto = Object.entries(pilas)
        .map(([nombre, valores]) => `${nombre}=[${valores.join(",")}]`)
        .join(" ");
      return `paso ${indice + 1}: ${texto || "(sin pilas)"}`;
    });
    resultadoEl.textContent = ["VÁLIDO", ...lineas].join("\n");
  } else {
    resultadoEl.className = "invalido";
    const motivo = { lexer: "error léxico", parser: "error de sintaxis", runtime: "error en ejecución" }[resultado.etapa] || resultado.etapa;
    resultadoEl.textContent = `INVÁLIDO (${motivo})${resultado.mensaje ? "\n" + resultado.mensaje : ""}`;
  }
}

function reconstruirTodo() {
  reconstruirEscena3D();
  reconstruirListaHTML();
  const codigo = generarCodigoScuLPT();
  codigoGeneradoEl.textContent = codigo || "(vacío)";
  renderizarResultado(codigo);
}

function manejarSoltar(evento) {
  evento.preventDefault();
  const token = evento.dataTransfer.getData("token");
  if (!token || !DEFINICION_OPERACIONES[token]) return;
  const operandos = pedirOperandosPara(token);
  if (operandos === null) return;
  agregarInstruccion(token, operandos);
}

contenedorEscena.addEventListener("dragover", (evento) => evento.preventDefault());
contenedorEscena.addEventListener("drop", manejarSoltar);

for (const pieza of document.querySelectorAll(".pieza-paleta")) {
  pieza.addEventListener("dragstart", (evento) => {
    evento.dataTransfer.setData("token", pieza.dataset.token);
  });
}

function animar() {
  requestAnimationFrame(animar);
  controles.update();
  renderizador.render(escena, camara);
}

const estadoCamaraEl = document.getElementById("estado-camara");
const camaraActivaEl = document.getElementById("camara-activa");

function conectarConCamara() {
  const conexion = new WebSocket("ws://localhost:8765");
  conexion.onopen = () => {
    estadoCamaraEl.textContent = "Cámara: conectada";
    estadoCamaraEl.className = "conectado";
  };
  conexion.onclose = () => {
    estadoCamaraEl.textContent = "Cámara: desconectada, reintentando...";
    estadoCamaraEl.className = "desconectado";
    setTimeout(conectarConCamara, 2000);
  };
  conexion.onerror = () => conexion.close();
  conexion.onmessage = (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.tipo === "programa" && camaraActivaEl.checked) {
      reemplazarProgramaDesdeCamara(mensaje.instrucciones);
    }
  };
}

async function iniciar() {
  await Promise.all([
    cargarGeometria("bloque_1_param", "./modelos/bloque_1_param.stl"),
    cargarGeometria("bloque_2_param", "./modelos/bloque_2_param.stl"),
    cargarGeometria("parametro", "./modelos/parametro.stl"),
  ]);
  ajustarTamano();
  camara.position.set(260, 260, 400);
  controles.update();
  reconstruirTodo();
  animar();
  conectarConCamara();
}

iniciar();
