import { OPERACIONES } from './montaje.mjs';

export function puedeAplicarLectura(lectura) {
  return !!lectura?.estable && !!lectura.compatible && !!lectura.instrucciones?.length && lectura.instrucciones.every(i => {
    const aridad = OPERACIONES[i.token];
    return aridad && Array.isArray(i.operandos) && !i.operandos.includes('<sin leer>') && i.operandos.length >= aridad[0] && i.operandos.length <= aridad[1];
  });
}

export function codigoLectura(lectura) {
  return (lectura?.instrucciones || []).map(i => [i.token, ...i.operandos].join(' ')).join('\n');
}

export function esEstadoActual(nuevo, anterior) {
  return !anterior || nuevo.sesion !== anterior.sesion || (nuevo.fusion?.revision ?? 0) >= (anterior.fusion?.revision ?? 0);
}
