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
