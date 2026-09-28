import { Despacho } from "./ejecucion.mjs";

export const CADUCADO = { valido: false, etapa: "tiempo", decide: "sistema", mensaje: "La ejecución tardó demasiado y se detuvo. Reduce el programa y vuelve a intentarlo." };
export const SIN_MOTOR = { valido: false, etapa: "motor", decide: "sistema", mensaje: "No se pudo cargar el intérprete. Revisa su compilación y recarga la página." };

export class Validador {
  constructor({ crearMotor, alPedir, alTerminar, limiteMs = 10000, temporizar = (fn, ms) => setTimeout(fn, ms), cancelar = id => clearTimeout(id) }) {
    Object.assign(this, { crearMotor, alPedir, alTerminar, limiteMs, temporizar, cancelar });
    this.despacho = new Despacho();
    this.motor = null;
    this.reloj = null;
    this.servida = 0;
    this.abandonados = 0;
  }
  get pendiente() { return this.despacho.pendiente; }
  get revision() { return this.despacho.revision; }
  solicitar(firma, codigo) {
    const enVuelo = this.despacho.pendiente;
    const revision = this.despacho.solicitar(firma);
    if (!revision) return 0;
    if (enVuelo) { this.abandonados++; this.detener(); }
    this.cancelar(this.reloj);
    this.reloj = this.temporizar(() => { this.detener(); this.publicar(revision, CADUCADO); }, this.limiteMs);
    this.alPedir?.(codigo, revision);
    const motor = this.arrancar();
    this.servida = revision;
    motor.postMessage({ revision, codigo });
    return revision;
  }
  publicar(revision, resultado) {
    if (!this.despacho.resolver(revision)) return false;
    this.cancelar(this.reloj); this.reloj = null;
    this.alTerminar(resultado, revision);
    return true;
  }
  invalidar() {
    const enVuelo = this.despacho.pendiente;
    const cambio = this.despacho.invalidar();
    if (enVuelo) { this.abandonados++; this.detener(); }
    this.cancelar(this.reloj); this.reloj = null;
    return cambio;
  }
  arrancar() {
    if (this.motor) return this.motor;
    const motor = this.crearMotor();
    motor.onmessage = ({ data }) => { if (motor === this.motor) this.publicar(data.revision, data.resultado); };
    motor.onerror = () => {
      if (motor !== this.motor) return;
      this.motor = null;
      this.publicar(this.servida, SIN_MOTOR);
    };
    this.motor = motor;
    return motor;
  }
  detener() {
    this.motor?.terminate();
    this.motor = null;
    this.cancelar(this.reloj); this.reloj = null;
  }
}
