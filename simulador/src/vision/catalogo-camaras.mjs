const previstas = [
  { id: 'cenital', nombre: 'Webcam cenital', tipo: 'webcam', aporte: 'Lee las caras superiores y los parámetros.', ubicacion: 'Encima de la mesa', plano: [190, 35], prevista: true },
  { id: 'lateral', nombre: 'Webcam lateral', tipo: 'webcam', aporte: 'Lee caras que quedan ocultas desde arriba.', ubicacion: 'A un lado de la mesa', plano: [46, 112], prevista: true },
  { id: 'profundidad', nombre: 'Sensor de profundidad', tipo: 'sensor', aporte: 'Sitúa las fichas en 3D si se añade un Kinect v2 o una RealSense.', ubicacion: 'Posición por definir', plano: [326, 112], prevista: true },
];

export function centroDesdePose(pose) {
  if (!pose?.rot || !pose?.tras) return null;
  const r = pose.rot, t = pose.tras;
  if (r.length !== 3 || t.length !== 3 || r.some(f => f.length !== 3)) return null;
  const centro = [0, 1, 2].map(j => -r.reduce((s, fila, i) => s + fila[j] * t[i], 0));
  return centro.every(Number.isFinite) ? centro : null;
}

export function catalogoCamaras(camaras = []) {
  if (!camaras.length) return previstas;
  return camaras.map(c => {
    const centro = centroDesdePose(c.pose);
    const ancho = (c.pose?.tablero?.[0] - 1) * c.pose?.mm;
    const alto = (c.pose?.tablero?.[1] - 1) * c.pose?.mm;
    const plano = centro && ancho > 0 && alto > 0
      ? [Math.max(18, Math.min(342, 110 + centro[0] / ancho * 160)), Math.max(20, Math.min(180, 54 + centro[1] / alto * 104))]
      : null;
    const ubicacion = centro ? `Respecto al tablero: x ${centro[0].toFixed(0)}, y ${centro[1].toFixed(0)}, z ${centro[2].toFixed(0)} mm` : 'Posición aún sin registrar';
    const aporte = c.rol === 'profundidad' ? 'Aporta profundidad para situar fichas.' : c.rol === 'ambos' ? 'Aporta símbolos y profundidad.' : 'Aporta lecturas de símbolos.';
    return { ...c, plano, ubicacion, aporte, prevista: false };
  });
}
