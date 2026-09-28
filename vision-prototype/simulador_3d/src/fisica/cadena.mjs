export class Cadena {
  constructor(puntos) {
    if (puntos.length < 2) throw new Error('Una cadena necesita dos extremos.');
    this.puntos = puntos.map(p => [...p]);
    this.anteriores = puntos.map(p => [...p]);
    this.longitudes = puntos.slice(1).map((p, i) => Math.hypot(...p.map((v, j) => v - puntos[i][j])));
    this.referencias = puntos.slice(2).map((p, i) => p.map((v, j) => v - puntos[i][j]));
    this.agarre = null;
  }
  sujetar(indice, destino) {
    this.agarre = { indice, destino: [...destino] };
    this.puntos[indice] = [...destino];
    this.anteriores[indice] = [...destino];
  }
  mover(destino) {
    if (this.agarre) this.agarre.destino = [...destino];
  }
  soltar() {
    if (this.agarre) this.anteriores[this.agarre.indice] = [...this.puntos[this.agarre.indice]];
    this.agarre = null;
  }
  elevar(altura) {
    this.puntos.forEach((p, i) => {
      p[1] += altura;
      this.anteriores[i] = [...p];
    });
    if (this.agarre) this.agarre.destino[1] += altura;
  }
  integrar(segundos) {
    const dt = Math.min(Math.max(segundos, 0), .033);
    for (let i = 0; i < this.puntos.length; i++) {
      if (this.agarre?.indice === i) continue;
      const p = this.puntos[i], anterior = this.anteriores[i];
      const velocidad = p.map((v, j) => (v - anterior[j]) * .94);
      const rapidez = Math.hypot(...velocidad);
      if (rapidez > 35) velocidad.forEach((v, j) => { velocidad[j] = v * 35 / rapidez; });
      this.anteriores[i] = [...p];
      p[0] += velocidad[0];
      p[1] += velocidad[1] - 9810 * dt * dt;
      p[2] += velocidad[2];
    }
    this.resolver();
  }
  resolver(iteraciones = 12) {
    for (let vuelta = 0; vuelta < iteraciones; vuelta++) {
      for (let i = 0; i < this.longitudes.length; i++) {
        const a = this.puntos[i], b = this.puntos[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const distancia = Math.hypot(dx, dy, dz);
        if (distancia < .0001) continue;
        const error = (distancia - this.longitudes[i]) / distancia;
        const fijoA = this.agarre?.indice === i;
        const fijoB = this.agarre?.indice === i + 1;
        const pesoA = fijoA ? 0 : fijoB ? 1 : .5;
        const pesoB = fijoB ? 0 : fijoA ? 1 : .5;
        for (let eje = 0; eje < 3; eje++) {
          const delta = [dx, dy, dz][eje] * error;
          a[eje] += delta * pesoA;
          b[eje] -= delta * pesoB;
        }
      }
      for (let i = 0; i < this.puntos.length - 2; i++) {
        const a = this.puntos[i], b = this.puntos[i + 2];
        const diferencia = b.map((v, j) => v - a[j]);
        const distancia = Math.hypot(...diferencia);
        const minimo = .65 * (this.longitudes[i] + this.longitudes[i + 1]);
        if (distancia >= minimo) continue;
        const direccion = distancia > .0001 ? diferencia.map(v => v / distancia) : this.referencias[i].map(v => v / Math.max(.0001, Math.hypot(...this.referencias[i])));
        const fijoA = this.agarre?.indice === i;
        const fijoB = this.agarre?.indice === i + 2;
        const pesoA = fijoA ? 0 : fijoB ? 1 : .5;
        const pesoB = fijoB ? 0 : fijoA ? 1 : .5;
        for (let eje = 0; eje < 3; eje++) {
          const ajuste = direccion[eje] * (minimo - distancia);
          a[eje] -= ajuste * pesoA;
          b[eje] += ajuste * pesoB;
        }
      }
      if (this.agarre) this.puntos[this.agarre.indice] = [...this.agarre.destino];
    }
    if (this.agarre) this.anteriores[this.agarre.indice] = [...this.agarre.destino];
  }
  contacto(indice, penetracion) {
    if (penetracion <= 0) return;
    const ajustes = this.puntos.map(() => 0);
    ajustes[indice] = penetracion;
    ajustes[indice + 1] = penetracion;
    this.contactos(ajustes);
  }
  contactos(ajustes) {
    ajustes.forEach((penetracion, i) => {
      if (penetracion <= 0) return;
      this.puntos[i][1] += penetracion;
      this.anteriores[i][1] = this.puntos[i][1];
      this.anteriores[i][0] += (this.puntos[i][0] - this.anteriores[i][0]) * .65;
      this.anteriores[i][2] += (this.puntos[i][2] - this.anteriores[i][2]) * .65;
      if (this.agarre?.indice === i) this.agarre.destino[1] += penetracion;
    });
  }
}
