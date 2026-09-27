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
