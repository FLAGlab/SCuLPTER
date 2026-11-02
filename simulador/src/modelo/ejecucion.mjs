export class Ejecucion {
  constructor() { this.limpiar(); }
  limpiar() { this.resultado = null; this.cursor = 0; }
  cargar(resultado) { this.resultado = resultado; this.cursor = 0; }
  get traza() { return this.resultado?.traza ?? []; }
  get ultimo() { return Math.max(0, this.traza.length - 1); }
  get actual() { return this.traza[this.cursor] ?? null; }
  ir(paso) { this.cursor = Math.max(0, Math.min(this.ultimo, paso)); return this.actual; }
  siguiente() { return this.ir(this.cursor + 1); }
  atras() { return this.ir(this.cursor - 1); }
  reiniciar() { return this.ir(0); }
  todo() { return this.ir(this.ultimo); }
}
export const mostrarValor = valor => valor === null ? "#" : String(valor);
export const mostrarPila = valores => `[${[...valores].reverse().map(mostrarValor).join(", ")}]`;

export function necesitaInterprete({ bloques = 0, pendientes = [], incertidumbre = "", moviendo = false } = {}) {
  return bloques > 0 && !moviendo && !incertidumbre && pendientes.length === 0;
}

// Autoridad única sobre el programa físico: el navegador solo valida lo que se construye a mano.
// Lo que viene de las cámaras lo decide el servicio, y la página se limita a recorrer su traza.
export function validaElNavegador({ origen = "manual" } = {}) {
  return origen !== "camara";
}

// Un veredicto solo vale para la versión confirmada que el servicio publica ahora. Una respuesta
// tardía de Scala, o una de una versión anterior, no puede activar nada.
export function veredictoVigente(lectura, veredicto) {
  const version = lectura && lectura.estado === "confirmada" ? lectura.version : null;
  if (!version || !veredicto || veredicto.version !== version) return null;
  return veredicto;
}

// Motivo por el que la ejecución física está deshabilitada. Sin veredicto vigente y sin versión
// confirmada no se ejecuta nada venido de las cámaras, ni siquiera cuando el servicio todavía no
// ha publicado una lectura.
export function motivoFisico({ veredicto = null, version = null, motivo = "" } = {}) {
  if (veredicto || version) return "";
  return motivo || "La lectura de las cámaras no está confirmada.";
}

export function veredicto(entrada = {}) {
  const { pendientes = [], incertidumbre = "", moviendo = false, validando = false, resultado = null, origen = "manual" } = entrada;
  if (moviendo) return marcar("moviendo", "En construcción", "Hay una ficha en movimiento. La ejecución anterior ya no corresponde a esta mesa.");
  if (incertidumbre) return marcar("incierto", "Lectura pendiente de confirmar", incertidumbre);
  if (!necesitaInterprete(entrada)) {
    if (pendientes.length) return marcar("incompleto", "Montaje incompleto", pendientes.join("\n"));
    return marcar("vacio", "Sin instrucciones", "Añade instrucciones a la mesa.");
  }
  if (validando || !resultado) return marcar("validando", "Validando…", "Preparando la traza del programa.");
  const recorrible = (resultado.traza?.length ?? 0) > 1;
  if (SISTEMA.has(resultado.etapa)) return marcar("sistema", "No se pudo ejecutar", resultado.mensaje);
  if (!resultado.valido) {
    if (resultado.etapa === "runtime") return marcar("fallo", "Error de ejecución",
      resultado.decide === "puente" ? resultado.mensaje + "\nLo comprueba el puente del simulador, no el intérprete." : resultado.mensaje, recorrible);
    return marcar("invalido", "Programa inválido", resultado.mensaje);
  }
  if (resultado.etapa === "limite") return marcar("limite", "Ejecución detenida por límite", resultado.mensaje, recorrible);
  return marcar("valido", origen === "camara" ? "Texto válido · uniones por confirmar" : "Programa válido", "", recorrible);
}

export const SISTEMA = new Set(["motor", "tiempo", "worker"]);

const MARCAS = { valido: ["✓", "okc"], vacio: ["○", ""], validando: ["○", ""], moviendo: ["◦", ""] };
const SEGUIBLES = new Set(["valido", "fallo", "limite"]);

function marcar(clase, titulo, detalle, recorrible = false) {
  const [marca, color] = MARCAS[clase] ?? ["!", "errc"];
  return { clase, titulo, detalle: detalle || "", marca, color, seguible: SEGUIBLES.has(clase) && recorrible };
}

export function resumenFinal(resultado, etiquetas = new Map()) {
  if (!resultado?.valido || !resultado.pasos?.length) return "";
  const usadas = Object.entries(resultado.pasos.at(-1)).filter(([, valores]) => valores.length);
  if (!usadas.length) return "todas las pilas quedan vacías";
  return usadas.map(([id, valores]) => `${etiquetas.get(id) || id} queda en ${mostrarPila(valores)}`).join("\n");
}

export class Despacho {
  constructor() { this.revision = 0; this.firma = null; this.pendiente = false; }
  solicitar(firma) {
    if (firma === this.firma) return 0;
    this.firma = firma; this.pendiente = true;
    return ++this.revision;
  }
  vigente(revision) { return this.pendiente && revision === this.revision; }
  resolver(revision) {
    if (!this.vigente(revision)) return false;
    this.pendiente = false;
    return true;
  }
  invalidar() {
    const habia = this.pendiente || this.firma !== null;
    this.firma = null; this.pendiente = false;
    if (habia) this.revision++;
    return habia;
  }
}

const RECHAZOS = new Set(["invalido", "fallo"]);

export function senalDeCambio(anterior, actual) {
  if (!actual || !RECHAZOS.has(actual.clase)) return null;
  if (anterior?.clase === actual.clase && anterior?.detalle === actual.detalle) return null;
  return "error";
}
