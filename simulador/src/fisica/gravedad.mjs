export class CaidaVertical {
  constructor(altura = 80) { this.altura = altura; this.velocidad = 0; this.reposo = false; }
  avanzar(segundos) {
    let tiempo = Math.min(Math.max(segundos, 0), .1);
    while (tiempo > 0 && !this.reposo) {
      const dt = Math.min(tiempo, 1 / 120);
      this.velocidad -= 9810 * dt;
      this.altura += this.velocidad * dt;
      if (this.altura <= 0) {
        this.altura = 0;
        this.velocidad *= -.12;
        if (this.velocidad < 25) { this.velocidad = 0; this.reposo = true; }
      }
      tiempo -= dt;
    }
    return this.altura;
  }
}
export function conjuntosRigidos(montaje, conexiones) {
  const padres = new Map(montaje.bloques.filter(b => !b.virtual).map(b => [b.id, b.id]));
  const raiz = id => { while (padres.get(id) !== id) id = padres.get(id); return id; };
  for (const c of conexiones) if (padres.has(c.origen) && padres.has(c.destino)) padres.set(raiz(c.destino), raiz(c.origen));
  return new Map([...padres.keys()].map(id => [id, raiz(id)]));
}
export class Balanceo {
  constructor() { this.velocidad = [0, 0, 0]; }
  avanzar(brazo, segundos) {
    const dt = Math.min(Math.max(segundos, 0), .05);
    const longitud = Math.max(20, Math.hypot(...brazo));
    const impulso = 9810 / (longitud * longitud);
    const amortiguacion = Math.exp(-2.5 * dt);
    this.velocidad[0] = Math.max(-8, Math.min(8, (this.velocidad[0] + brazo[2] * impulso * dt) * amortiguacion));
    this.velocidad[1] *= amortiguacion;
    this.velocidad[2] = Math.max(-8, Math.min(8, (this.velocidad[2] - brazo[0] * impulso * dt) * amortiguacion));
    return this.velocidad.map(v => v * dt);
  }
}
