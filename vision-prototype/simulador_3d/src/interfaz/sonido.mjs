const TONOS = {
  encaje: { onda: "triangle", de: 620, a: 1180, duracion: .15, volumen: .16 },
  error: { onda: "sine", de: 440, a: 230, duracion: .24, volumen: .11 },
  fin: { onda: "sine", de: 620, a: 1020, duracion: .28, volumen: .09 },
};
const CLAVE = "sculpt.sonido";

function preferencia() {
  try { return localStorage.getItem(CLAVE) !== "silencio"; } catch { return true; }
}

export class Sonidos {
  constructor() { this.activo = preferencia(); this.audio = null; }
  alternar() {
    this.activo = !this.activo;
    try { localStorage.setItem(CLAVE, this.activo ? "suena" : "silencio"); } catch {}
    return this.activo;
  }
  reproducir(nombre) {
    const tono = TONOS[nombre];
    if (!this.activo || !tono) return false;
    try {
      this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === "suspended") this.audio.resume();
      const t = this.audio.currentTime;
      const oscilador = this.audio.createOscillator(), volumen = this.audio.createGain();
      oscilador.type = tono.onda;
      oscilador.frequency.setValueAtTime(tono.de, t);
      oscilador.frequency.exponentialRampToValueAtTime(tono.a, t + tono.duracion * .35);
      volumen.gain.setValueAtTime(0.0001, t);
      volumen.gain.exponentialRampToValueAtTime(tono.volumen, t + .008);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + tono.duracion * .85);
      oscilador.connect(volumen).connect(this.audio.destination);
      oscilador.start(t); oscilador.stop(t + tono.duracion);
      return true;
    } catch { return false; }
  }
}
