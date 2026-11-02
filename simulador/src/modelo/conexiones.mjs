export const LARGO_BLOQUE = { 1: 30, 2: 50 };
export const ENTRADA_BLOQUE = -35.5;
export const HUECO_CONECTOR = 29.5;
export function posicionPosterior(bloque) {
  const distancia = LARGO_BLOQUE[bloque.capacidad] + HUECO_CONECTOR - ENTRADA_BLOQUE;
  return [bloque.posicion[0] + Math.cos(bloque.angulo) * distancia, bloque.posicion[1], bloque.posicion[2] - Math.sin(bloque.angulo) * distancia];
}
export function alineados(a, b) {
  const objetivo = posicionPosterior(a);
  const angulo = Math.atan2(Math.sin(a.angulo - b.angulo), Math.cos(a.angulo - b.angulo));
  return Math.hypot(...objetivo.map((v, i) => v - b.posicion[i])) <= 1 && Math.abs(angulo) <= Math.PI / 180;
}
export function unir(montaje, a, b) {
  b.posicion = posicionPosterior(a); b.angulo = a.angulo;
  montaje.conexiones = montaje.conexiones.filter(c => c.origen !== a.id && c.destino !== b.id);
  montaje.conexiones.push({ origen: a.id, destino: b.id });
}
export function conexionesValidas(montaje) {
  return montaje.conexiones.filter(c => {
    const a = montaje.bloque(c.origen), b = montaje.bloque(c.destino);
    if (!a || !b) return false;
    if (c.giro == null) return alineados(a, b);
    const objetivo = posicionArticulada(a, c.giro);
    const giro = Math.atan2(Math.sin(b.angulo - a.angulo - c.giro), Math.cos(b.angulo - a.angulo - c.giro));
    return Number.isFinite(c.giro) && Math.abs(c.giro) <= Math.PI / 3 && Math.abs(giro) < Math.PI / 180
      && Math.hypot(...objetivo.map((v, i) => v - b.posicion[i])) <= 1;
  });
}
export function pendientesConexiones(montaje) {
  const bloques = montaje.bloques.filter(b => !b.virtual);
  const validas = conexionesValidas(montaje);
  return bloques.slice(1).flatMap((b, i) => validas.some(c => c.origen === bloques[i].id && c.destino === b.id)
    ? [] : [`Falta unir los bloques ${i + 1} y ${i + 2}.`]);
}
export function ordenarMontaje(montaje) {
  montaje.conexiones = [];
  const bloques = montaje.bloques.filter(b => !b.virtual);
  for (let i = 1; i < bloques.length; i++) unir(montaje, bloques[i - 1], bloques[i]);
}

export function posicionArticulada(a, giro) {
  const angulo = a.angulo + giro;
  const tramo = LARGO_BLOQUE[a.capacidad] + HUECO_CONECTOR;
  return [a.posicion[0] + Math.cos(a.angulo) * tramo - Math.cos(angulo) * ENTRADA_BLOQUE,
    a.posicion[1], a.posicion[2] - Math.sin(a.angulo) * tramo + Math.sin(angulo) * ENTRADA_BLOQUE];
}
export function unirArticulado(montaje, a, b, giro) {
  if (!Number.isFinite(giro) || Math.abs(giro) > Math.PI / 3) throw new Error('El giro debe estar entre −60° y 60°.');
  b.posicion = posicionArticulada(a, giro); b.angulo = a.angulo + giro;
  montaje.conexiones = montaje.conexiones.filter(c => c.origen !== a.id && c.destino !== b.id);
  montaje.conexiones.push({ origen: a.id, destino: b.id, giro });
}
