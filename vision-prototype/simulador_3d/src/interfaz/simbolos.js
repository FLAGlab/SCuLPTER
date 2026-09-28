import { lexemaParametro } from "../modelo/montaje.mjs";
export function contenidoPila(id, montaje) {
  const fichas = [...montaje.piezas.values()].filter(p => p.tipo === "parametro" && p.contenido.tipo === "etiqueta" && lexemaParametro(p.contenido) === id);
  return fichas.find(p => p.contenido.trazos?.length)?.contenido ?? fichas[0]?.contenido ?? { texto: id, trazos: [] };
}
export function simbolo(contenido, nombre = false) {
  const raiz = document.createElement("span");
  raiz.className = "simbolo";
  raiz.title = contenido.texto;
  if (contenido.trazos?.length) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1 1");
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", contenido.texto);
    for (const trazo of contenido.trazos) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", trazo.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" "));
      path.setAttribute("fill", "none"); path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", ".05"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
      svg.append(path);
    }
    raiz.append(svg);
  }
  if (nombre || !contenido.trazos?.length) {
    const texto = document.createElement("span"); texto.textContent = contenido.tipo === "nil" ? "#" : contenido.texto; raiz.append(texto);
  }
  return raiz;
}
