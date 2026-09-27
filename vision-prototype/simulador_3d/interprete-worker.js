import { sculptEjecutar } from "./interprete.js";
self.onmessage = ({ data: { revision, codigo } }) => {
  try { self.postMessage({ revision, resultado: sculptEjecutar(codigo, 2000) }); }
  catch (error) { self.postMessage({ revision, resultado: { valido: false, etapa: "runtime", mensaje: error.message } }); }
};
