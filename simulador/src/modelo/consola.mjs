import { mostrarPila } from "./ejecucion.mjs";

export const ORIGENES = ["scala", "puente", "mesa", "traza", "sistema"];
const SISTEMA = new Set(["motor", "tiempo", "worker"]);

export class Consola {
  constructor(maximo = 300) { this.maximo = maximo; this.lineas = []; this.escritas = 0; }
  escribir(linea) {
    const ultima = this.lineas.at(-1);
    if (!linea || (ultima && ultima.origen === linea.origen && ultima.texto === linea.texto)) return false;
    this.lineas.push({ tono: "", ...linea });
    this.escritas++;
    if (this.lineas.length > this.maximo) this.lineas.splice(0, this.lineas.length - this.maximo);
    return true;
  }
  todas(lineas) { return lineas.reduce((cambio, l) => this.escribir(l) || cambio, false); }
  desde(escritas) {
    const nuevas = Math.min(this.escritas - escritas, this.lineas.length);
    return nuevas <= 0 ? [] : this.lineas.slice(this.lineas.length - nuevas);
  }
  limpiar() { this.lineas = []; this.escritas++; }
}

export const lineaPeticion = (codigo, limite) =>
  ({ origen: "mesa", texto: `sculptEjecutar · ${codigo.split("\n").filter(l => l.trim()).length} instrucciones · límite ${limite}` });

export function procedencia(resultado) {
  if (!resultado) return "mesa";
  if (SISTEMA.has(resultado.etapa)) return "sistema";
  return resultado.decide === "puente" ? "puente" : "scala";
}

export function lineasDeResultado(resultado) {
  if (!resultado) return [];
  if (SISTEMA.has(resultado.etapa))
    return [{ origen: "sistema", tono: "errc", texto: `fallo etapa=${resultado.etapa} · ${resultado.mensaje}` }];
  const origen = procedencia(resultado);
  const pasos = resultado.pasos ? ` pasos=${resultado.pasos.length}` : "";
  if (resultado.valido && resultado.etapa === "ok") return [{ origen, tono: "okc", texto: `valido etapa=ok${pasos}` }];
  const donde = resultado.error ? ` instruccion=${resultado.error.instruccion + 1}` : "";
  const estado = resultado.valido ? "valido" : "invalido";
  return [{ origen, tono: "errc", texto: `${estado} etapa=${resultado.etapa}${donde}${pasos} · ${resultado.mensaje}` }];
}

export function lineaDeNavegacion(fotograma, programa, accion) {
  if (!fotograma) return null;
  const pilas = Object.entries(fotograma.pilas).map(([n, v]) => `${n}=${mostrarPila(v)}`).join(" ");
  if (fotograma.instruccion == null) return { origen: "traza", texto: `${accion} · paso 0 · sin instrucciones ejecutadas` };
  const instruccion = programa[fotograma.instruccion];
  const nombre = instruccion ? [instruccion.token, ...instruccion.operandos].join(" ") : "?";
  const omite = fotograma.omitida != null ? ` · omite ${fotograma.omitida + 1}` : "";
  return { origen: "traza", texto: `${accion} · paso ${fotograma.paso} · ${fotograma.instruccion + 1} ${nombre}${omite}${pilas ? " · " + pilas : ""}` };
}

export const lineaDeVeredicto = veredicto => veredicto.seguible || veredicto.clase === "validando" ? null
  : { origen: "mesa", tono: veredicto.color, texto: veredicto.titulo.toLowerCase() + (veredicto.detalle ? " · " + veredicto.detalle.replace(/\n/g, " · ") : "") };
