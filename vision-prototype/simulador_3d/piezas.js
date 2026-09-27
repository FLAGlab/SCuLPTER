import * as THREE from "three";

// Parameter v4.stl is a printing layout, not a single parameter. These are
// the individual 20 mm tiles in its original (uncentred) XY coordinates.
const FICHAS = {
  POP: [0, -22], MOV: [25, 25], DUP: [0, 60], JMP: [0, 30],
  CMP: [25, 0], "?": [30, -25], MOD: [30, -50],
  MUL: [0, -69], ADD: [24, -75], SUB: [0, -45],
  NEG: [0, -95], DIV: [25, -100],
};

export function separarOperaciones(lamina) {
  const posiciones = lamina.getAttribute("position");
  const resultado = {};
  for (const [token, [x, y]] of Object.entries(FICHAS)) {
    const cuerpo = [];
    const grabado = [];
    for (let i = 0; i < posiciones.count; i += 3) {
      const vertices = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(posiciones, i + j));
      if (!vertices.every(v => v.x >= x - 0.001 && v.x <= x + 20.001 && v.y >= y - 0.001 && v.y <= y + 20.001)) continue;
      // The symbol is recessed 1 mm into the front face (z = 5).
      const destino = vertices.every(v => v.z >= 3.999) && vertices.some(v => v.z < 4.999) ? grabado : cuerpo;
      for (const v of vertices) destino.push(v.x, v.y, v.z);
    }
    if (!cuerpo.length || !grabado.length) throw new Error(`No se encontró la ficha ${token} en parametro.stl`);
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.Float32BufferAttribute([...cuerpo, ...grabado], 3));
    geometria.addGroup(0, cuerpo.length / 3, 0);
    geometria.addGroup(cuerpo.length / 3, grabado.length / 3, 1);
    geometria.computeVertexNormals();
    geometria.translate(-x - 10, -y - 10, 0);
    if (["MOV", "JMP", "NEG"].includes(token)) geometria.rotateZ(Math.PI);
    geometria.computeBoundingBox();
    geometria.userData.compartida = true;
    resultado[token] = geometria;
  }
  // PUSH uses the same arrow as POP, pointing down instead of up.
  resultado.PUSH = resultado.POP.clone().rotateZ(Math.PI);
  resultado.PUSH.computeBoundingBox();
  return resultado;
}

// Native millimetres: the STL is upside down (its mounting faces have -Y
// normals). Rotate it without reflecting it; the operation socket is the origin
// in X/Z and the bottom of the structural block rests on the table.
export function prepararBloque(geometria, capacidad) {
  const zOperacion = capacidad === 2 ? 50 : 30;
  geometria.applyMatrix4(new THREE.Matrix4().set(
    0, 0, -1, zOperacion,
    0, -1, 0, 25,
    -1, 0, 0, 10,
    0, 0, 0, 1,
  ));
  geometria.computeBoundingBox();
  geometria.computeVertexNormals();
  geometria.userData.compartida = true;
  return geometria;
}

export function posicionEncaje(slot) {
  // Operation: ball tip y=29.5, neck in the open slot, plate base y=37.
  // Parameters: magnets on the lower surface (raw STL y=2), 20 mm pitch.
  return new THREE.Vector3(slot === -1 ? 0 : 20 * (slot + 1), slot === -1 ? 37 : 23, 0);
}

export function crearFichaOperacion(geometria) {
  const ficha = new THREE.Mesh(geometria, [
    new THREE.MeshStandardMaterial({ color: 0x439b9e, roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ color: 0x082936, roughness: 0.85 }),
  ]);
  ficha.rotation.x = -Math.PI / 2;
  return ficha;
}

export function crearFichaOperando(contenido) {
  const { texto, tipo, trazos = [] } = contenido;
  const fondo = tipo === "numero" ? "#dbba80" : tipo === "etiqueta" ? "#a4c6d2" : "#bbb9b0";
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 512;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = fondo;
  contexto.fillRect(0, 0, 512, 512);
  contexto.fillStyle = "#203139";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  if (trazos.length) {
    contexto.strokeStyle = "#203139";
    contexto.lineWidth = 14;
    contexto.lineCap = contexto.lineJoin = "round";
    for (const trazo of trazos) {
      contexto.beginPath();
      trazo.forEach(([x, y], i) => contexto[i ? "lineTo" : "moveTo"](x * 460 + 26, y * 460 + 26));
      contexto.stroke();
    }
  } else {
    let fuente = 290;
    do {
      contexto.font = `bold ${fuente}px system-ui, sans-serif`;
      if (contexto.measureText(texto).width <= 440) break;
      fuente -= 2;
    } while (fuente > 18);
    contexto.fillText(texto, 256, 265, 440);
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  const cara = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.85 });
  const lateral = new THREE.MeshStandardMaterial({ color: fondo, roughness: 0.85 });
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 18), [lateral, lateral, cara, lateral, lateral, lateral]);
  cuerpo.position.y = 6;
  grupo.add(cuerpo);
  const iman = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 2, 24), new THREE.MeshStandardMaterial({color: 0x657477, metalness: 0.8, roughness: 0.25}));
  iman.position.y = -0.5;
  grupo.add(iman);
  return grupo;
}
