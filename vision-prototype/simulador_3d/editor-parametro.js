import { validarParametro } from "./montaje.mjs";

export function crearEditor(alGuardar) {
  const dialogo = document.getElementById("editor-parametro");
  const tipo = document.getElementById("tipo-parametro");
  const texto = document.getElementById("texto-parametro");
  const canvas = document.getElementById("dibujo");
  const ctx = canvas.getContext("2d");
  let trazos = [], trazo = null, destino = null;
  function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#203139"; ctx.lineWidth = 7; ctx.lineCap = ctx.lineJoin = "round";
    for (const puntos of trazos) {
      ctx.beginPath();
      puntos.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * canvas.width, y * canvas.height));
      ctx.stroke();
    }
  }
  function punto(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))];
  }
  canvas.onpointerdown = e => { trazo = [punto(e), punto(e)]; trazos.push(trazo); canvas.setPointerCapture(e.pointerId); dibujar(); };
  canvas.onpointermove = e => { if (trazo) { trazo.push(punto(e)); dibujar(); } };
  canvas.onpointerup = canvas.onpointercancel = () => { trazo = null; };
  document.getElementById("limpiar-dibujo").onclick = () => { trazos = []; dibujar(); };
  function actualizarTipo() {
    const etiqueta = tipo.value === "etiqueta";
    document.getElementById("zona-dibujo").hidden = !etiqueta;
    document.getElementById("ayuda-identidad").hidden = !etiqueta;
    document.getElementById("nombre-campo").textContent = etiqueta ? "Etiqueta o nombre del dibujo" : "Valor";
    texto.disabled = tipo.value === "nil";
    if (tipo.value === "nil") texto.value = "nil";
  }
  tipo.onchange = actualizarTipo;
  document.getElementById("cancelar-parametro").onclick = () => dialogo.close();
  document.getElementById("form-parametro").onsubmit = e => {
    e.preventDefault();
    const contenido = { tipo: tipo.value, texto: texto.value.trim(), trazos: tipo.value === "etiqueta" ? structuredClone(trazos) : [] };
    const error = validarParametro(contenido);
    document.getElementById("error-parametro").textContent = error || "";
    if (error) return;
    alGuardar(contenido, destino);
    dialogo.close();
  };
  return {
    abrir(objetivo = {}, contenido = { tipo: "etiqueta", texto: "", trazos: [] }) {
      destino = objetivo; tipo.value = contenido.tipo; texto.value = contenido.texto;
      trazos = structuredClone(contenido.trazos || []); trazo = null;
      document.getElementById("error-parametro").textContent = "";
      actualizarTipo(); dibujar(); if (!dialogo.open) dialogo.show(); texto.focus();
    },
  };
}
