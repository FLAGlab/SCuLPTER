export const SIN_LEER = "<sin leer>";
export const OPERACIONES = {
  PUSH: [2, 2], MOV: [2, 2], POP: [1, 1], DUP: [1, 1], NEG: [1, 1],
  "?": [1, 1], JMP: [1, 1], CMP: [1, 2], ADD: [1, 2], SUB: [1, 2],
  MUL: [1, 2], DIV: [1, 2], MOD: [1, 2],
};
const RESERVADAS = new Set([...Object.keys(OPERACIONES).flatMap(t => [t, t.toLowerCase()]), "NIL", "nil"]);

export function parametroDesdeTexto(texto) {
  return { tipo: texto === "nil" ? "nil" : /^-?\d+(\.\d+)?$/.test(texto) ? "numero" : "etiqueta", texto, trazos: [] };
}

export function validarParametro(p) {
  if (!p.texto.trim()) return "Escribe un valor o un nombre para identificar esta pila.";
  if (p.texto === SIN_LEER) return "Esta etiqueta está reservada para una lectura pendiente.";
  if (p.tipo === "numero" && !/^-?\d+(\.\d+)?$/.test(p.texto)) return "Escribe un número, por ejemplo 2 o -3.";
  return null;
}

export function lexemaParametro(p) {
  if (p.tipo === "nil") return "nil";
  if (p.tipo === "numero" || p.texto === SIN_LEER) return p.texto;
  const nombre = p.texto.trim().normalize("NFC");
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombre) && !RESERVADAS.has(nombre) && !nombre.startsWith("sculpt_label_")) return nombre;
  // A deterministic, collision-free identity for drawings/Unicode labels,
  // while leaving Scala's lexer and semantics unchanged.
  return "sculpt_label_" + Array.from(nombre, c => c.codePointAt(0).toString(16)).join("_");
}

export class Montaje {
  constructor() { this.bloques = []; this.piezas = new Map(); this.secuencia = 0; this.conexiones = []; }
  id() { return `pieza_${++this.secuencia}`; }
  agregarBloque(token, capacidad = OPERACIONES[token]?.[0] || 1, posicion = [0, 0, 0]) {
    const rango = OPERACIONES[token];
    if (rango && (capacidad < rango[0] || capacidad > rango[1])) throw new Error("Capacidad incompatible");
    const bloque = { id: this.id(), capacidad, posicion, angulo: 0, operacion: null, parametros: Array(capacidad).fill(null) };
    this.bloques.push(bloque);
    if (token !== SIN_LEER) {
      const operacion = { id: this.id(), tipo: "operacion", token, union: null, posicion: [...posicion] };
      this.piezas.set(operacion.id, operacion);
      this.acoplar(operacion.id, bloque.id, -1);
    }
    return bloque;
  }
  agregarParametro(contenido, posicion = [100, 0, 0]) {
    const error = validarParametro(contenido);
    if (error) throw new Error(error);
    const pieza = { id: this.id(), tipo: "parametro", contenido, union: null, posicion: [...posicion] };
    this.piezas.set(pieza.id, pieza);
    return pieza;
  }
  bloque(id) { return this.bloques.find(b => b.id === id); }
  ocupante(bloque, slot) { return slot === -1 ? bloque.operacion : bloque.parametros[slot]; }
  puedeAcoplar(piezaId, bloqueId, slot) {
    const p = this.piezas.get(piezaId), b = this.bloque(bloqueId);
    if (!p || !b || b.virtual || slot < -1 || slot >= b.capacidad) return false;
    if ((slot === -1) !== (p.tipo === "operacion")) return false;
    const ocupado = this.ocupante(b, slot);
    if (ocupado && ocupado !== piezaId) return false;
    if (p.tipo === "operacion") {
      const rango = OPERACIONES[p.token];
      if (!rango || b.capacidad < rango[0] || b.capacidad > rango[1]) return false;
    }
    return true;
  }
  desacoplar(piezaId, posicion) {
    const p = this.piezas.get(piezaId);
    if (!p) return;
    if (p.union) {
      const b = this.bloque(p.union.bloqueId);
      if (b) {
        if (p.union.slot === -1) b.operacion = null;
        else b.parametros[p.union.slot] = null;
      }
    }
    p.union = null;
    if (posicion) p.posicion = [...posicion];
  }
  acoplar(piezaId, bloqueId, slot) {
    if (!this.puedeAcoplar(piezaId, bloqueId, slot)) return false;
    this.desacoplar(piezaId);
    const p = this.piezas.get(piezaId), b = this.bloque(bloqueId);
    p.union = { bloqueId, slot };
    if (slot === -1) b.operacion = piezaId;
    else b.parametros[slot] = piezaId;
    return true;
  }
  eliminarBloque(id) {
    this.conexiones = this.conexiones.filter(c => c.origen !== id && c.destino !== id);
    for (const [piezaId, p] of this.piezas) if (p.union?.bloqueId === id) this.piezas.delete(piezaId);
    this.bloques = this.bloques.filter(b => b.id !== id);
  }
  programa() {
    return this.bloques.map(b => b.virtual ? b.instruccion : ({
      token: this.piezas.get(b.operacion)?.token || SIN_LEER,
      operandos: b.parametros.map(id => {
        const p = this.piezas.get(id);
        return p ? lexemaParametro(p.contenido) : SIN_LEER;
      }),
    }));
  }
  pendientes() {
    const pendientes = [];
    this.programa().forEach((i, n) => {
      if (i.token === SIN_LEER) pendientes.push(`Bloque ${n + 1}: falta encajar la operación.`);
      i.operandos.forEach((p, j) => { if (p === SIN_LEER) pendientes.push(`Bloque ${n + 1}: falta el parámetro ${j + 1}.`); });
    });
    return pendientes;
  }
  etiquetas() {
    return new Map([...this.piezas.values()].filter(p => p.tipo === "parametro" && p.contenido.tipo === "etiqueta")
      .map(p => [lexemaParametro(p.contenido), p.contenido.texto]));
  }
}
