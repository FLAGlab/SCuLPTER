const $ = id => document.getElementById(id);

export function crearEditorCodigo({ codigoMesa, construir, navegar }) {
  const textoEditor = $("editor-codigo-texto");
  let revision = 0, workerActivo = null, espera = null;

  function cancelar() {
    revision++;
    workerActivo?.terminate(); workerActivo = null;
    clearTimeout(espera); espera = null;
  }

  function estado(mensaje, error = false) {
    $("editor-codigo-estado").textContent = mensaje;
    $("editor-codigo-estado").classList.toggle("errc", error);
  }

  function textoCambiado() {
    cancelar();
    $("editor-lexemas").textContent = "Haz clic en Lex.";
    $("editor-arbol").textContent = "Haz clic en Parse.";
    estado("Texto cambiado. Analízalo o construye sus bloques.");
  }

  textoEditor.addEventListener("input", textoCambiado);
  $("editor-limpiar").onclick = () => {
    textoEditor.value = ""; textoCambiado(); textoEditor.focus();
  };
  $("editor-desde-mesa").onclick = () => {
    const codigo = codigoMesa();
    if (codigo === null) { estado("Completa los bloques antes de copiar su texto.", true); return; }
    textoEditor.value = codigo; textoCambiado();
    estado(codigo ? "Texto de la mesa copiado. Puedes editarlo." : "La mesa está vacía.");
  };

  function analizar(accion) {
    cancelar();
    const turno = revision, codigo = textoEditor.value;
    if (!codigo.trim()) { estado("Escribe al menos una instrucción, por ejemplo PUSH a 3.", true); return; }
    estado("Analizando el texto…");
    const worker = new Worker(new URL("../interprete-worker.js", import.meta.url), { type: "module" });
    workerActivo = worker;
    const terminar = () => { clearTimeout(espera); worker.terminate(); if (workerActivo === worker) workerActivo = null; };
    espera = setTimeout(() => {
      if (turno !== revision) return;
      terminar(); estado("El análisis tardó demasiado. Revisa el texto y prueba de nuevo.", true);
    }, 10000);
    worker.onerror = () => {
      if (turno !== revision) return;
      terminar(); estado("No se pudo iniciar el analizador del lenguaje.", true);
    };
    worker.onmessage = ({ data }) => {
      if (turno !== revision || codigo !== textoEditor.value) { terminar(); return; }
      terminar();
      const respuesta = data.resultado;
      $("editor-lexemas").textContent = (respuesta.lexemas || [])
        .map(t => `Línea ${t.linea}: ${t.tipo} ${JSON.stringify(t.texto)} ${t.literal}`.trim()).join("\n") || "Sin tokens.";
      if (accion === "lex") {
        $("editor-lexemas").parentElement.open = true;
        estado(respuesta.etapa === "lexer" ? respuesta.mensaje : "Análisis léxico listo.", respuesta.etapa === "lexer");
        return;
      }
      $("editor-arbol").textContent = respuesta.valido ? respuesta.arbol : respuesta.mensaje || "No se pudo analizar el texto.";
      $("editor-arbol").parentElement.open = true;
      if (!respuesta.valido) { estado(respuesta.mensaje || "Programa inválido.", true); return; }
      if (accion === "parse") { estado(`${respuesta.instrucciones.length} instrucciones analizadas.`); return; }
      try { estado(construir(respuesta.instrucciones)); }
      catch (error) { estado(error.message, true); }
    };
    worker.postMessage({ revision: turno, codigo, modo: "analizar" });
  }

  $("editor-lex").onclick = () => analizar("lex");
  $("editor-parse").onclick = () => analizar("parse");
  $("editor-construir").onclick = () => analizar("construir");
  for (const accion of ["reiniciar", "atras", "siguiente", "todo"]) {
    $("editor-" + accion).onclick = () => navegar(accion);
  }
  window.addEventListener("pagehide", cancelar);

  return {
    actualizarPasos(ejecucion) {
      $("editor-reiniciar").disabled = ejecucion.cursor === 0;
      $("editor-atras").disabled = ejecucion.cursor === 0;
      $("editor-siguiente").disabled = ejecucion.cursor >= ejecucion.ultimo;
      $("editor-todo").disabled = ejecucion.cursor >= ejecucion.ultimo;
    },
  };
}
