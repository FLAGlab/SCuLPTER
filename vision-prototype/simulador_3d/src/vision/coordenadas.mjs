const cero = v => v + 0;

export function aTres(punto) {
  const [x, y, z] = punto;
  return [cero(x), cero(z), cero(-y)];
}

export function aPython(punto) {
  const [x, y, z] = punto;
  return [cero(x), cero(-z), cero(y)];
}

export function anguloATres(angulo) {
  return -angulo;
}

export function anguloAPython(giro) {
  return -giro;
}

export function direccionATres(direccion) {
  return aTres(direccion);
}

export function baseDeCamara(pose) {
  const [derecha, abajo, frente] = pose.rot;
  return { derecha: aTres(derecha), arriba: aTres(abajo).map(v => cero(-v)), frente: aTres(frente) };
}

export function centroDeCamara(pose) {
  const [r0, r1, r2] = pose.rot;
  const [tx, ty, tz] = pose.tras;
  const centro = [
    -(r0[0] * tx + r1[0] * ty + r2[0] * tz),
    -(r0[1] * tx + r1[1] * ty + r2[1] * tz),
    -(r0[2] * tx + r1[2] * ty + r2[2] * tz),
  ];
  return aTres(centro);
}
