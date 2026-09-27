import { mostrarPila, mostrarValor } from "./ejecucion.mjs";
import { simbolo, contenidoPila } from "./simbolos.js";

const $ = id => document.getElementById(id);
function nodo(tag, clase = "", texto = "") {
  const e = document.createElement(tag); e.className = clase; e.textContent = texto; return e;
}
function instruccion(i, montaje) {
  const fila = nodo("span", "instruccion-traza");
  if (!i) return fila;
  fila.append(nodo("span", "mono", i.token));
  for (const valor of i.operandos) fila.append(simbolo(valor === "nil" ? { tipo: "nil", texto: "nil" } : contenidoPila(valor, montaje)));
  return fila;
}
export function dibujarEjecucion(ejecucion, montaje, estado) {
  const { actual, cursor, ultimo, resultado, traza } = ejecucion;
  const programa = montaje.programa();
  const terminal = actual && cursor === ultimo;
  const error = terminal && resultado?.error;
  const limitada = terminal && resultado?.etapa === "limite";
  const disponible = !!actual && !estado.pendiente;
  $("ej-reiniciar").disabled = !disponible || cursor === 0;
  $("ej-atras").disabled = !disponible || cursor === 0;
  $("ej-siguiente").disabled = !disponible || cursor === ultimo;
  $("ej-todo").disabled = !disponible || cursor === ultimo;
  $("ej-contador").textContent = disponible ? `Paso ${cursor} de ${ultimo}${resultado.etapa === "limite" ? " registrados" : ""}` : "Paso 0";
  const aviso = $("ej-estado");
  aviso.textContent = estado.pendiente ? "Preparando la ejecución…" : !actual ? estado.mensaje || "Completa el montaje para ejecutar." : error ? `Error en la instrucción ${error.instruccion + 1}: ${error.mensaje}` : limitada ? resultado.mensaje : terminal ? "Ejecución terminada." : `Se han ejecutado ${cursor} pasos.`;
  aviso.className = "nota" + (error || limitada ? " errc" : "");
  $("ej-origen").textContent = estado.origen === "camara" ? "Programa reconstruido por cámaras. Las uniones físicas están por confirmar." : "";
  const siguiente = $("ej-instruccion"); siguiente.replaceChildren();
  if (actual?.siguiente != null) {
    siguiente.append(nodo("span", "pc", error ? "!" : "▶"), nodo("span", "mono", String(actual.siguiente + 1)), instruccion(programa[actual.siguiente], montaje));
  } else siguiente.append(nodo("span", "", actual ? "Fin del programa" : "Sin ejecución"));
  const nombres = [...new Set(traza.flatMap(f => Object.keys(f.pilas)))].sort();
  const torres = $("torres"); torres.replaceChildren();
  if (!disponible) torres.append(nodo("p", "nota", estado.pendiente ? "Preparando las pilas…" : "Las pilas aparecerán al ejecutar un programa completo."));
  else if (!nombres.length) torres.append(nodo("p", "nota", "Este programa no contiene pilas."));
  else for (const nombre of nombres) {
    const torre = nodo("div", "torre");
    const pila = nodo("div", "valores-pila");
    const valores = actual.pilas[nombre] ?? [];
    if (!valores.length) pila.append(nodo("div", "pila-vacia", "Vacía"));
    for (const [i, valor] of [...valores].reverse().entries()) pila.append(nodo("div", `valor-pila${i === valores.length - 1 ? " tope" : ""}${valor === null ? " nil" : ""}`, mostrarValor(valor)));
    const etiqueta = nodo("div", "nombre-pila"); etiqueta.append(simbolo(contenidoPila(nombre, montaje), true));
    torre.append(pila, nodo("div", "base-pila"), etiqueta); torres.append(torre);
  }
  const tabla = $("ej-traza"); tabla.replaceChildren();
  const head = nodo("thead"), fila = nodo("tr");
  fila.append(nodo("th", "", "Paso"), nodo("th", "", "Instrucción"));
  for (const nombre of nombres) { const th = nodo("th"); th.append(simbolo(contenidoPila(nombre, montaje), true)); fila.append(th); }
  head.append(fila); tabla.append(head);
  const body = nodo("tbody");
  for (const f of traza.slice(Math.max(1, cursor - 79), cursor + 1)) {
    const row = nodo("tr", f.paso === cursor ? "actual" : "");
    const celda = nodo("td"); celda.append(nodo("span", "num", `${f.instruccion + 1}. `), instruccion(programa[f.instruccion], montaje));
    if (f.omitida != null && f.omitida < programa.length) celda.append(nodo("small", "", `Omite la instrucción ${f.omitida + 1}`));
    row.append(nodo("td", "mono", String(f.paso)), celda);
    for (const nombre of nombres) row.append(nodo("td", "mono", mostrarPila(f.pilas[nombre] ?? [])));
    body.append(row);
  }
  tabla.append(body);
  $("ej-traza-nota").textContent = cursor === 0 ? "Todavía no se ha ejecutado ninguna instrucción." : cursor > 80 ? "Se muestran los últimos 80 pasos del estado elegido. El último valor de cada lista es el tope." : "El último valor de cada lista es el tope. Los resultados futuros se muestran al avanzar.";
}
