import { sculptEjecutar } from "../generado/interprete.js";
self.onmessage = ({ data: { revision, codigo } }) => {
  try { self.postMessage({ revision, resultado: sculptEjecutar(codigo, 2000) }); }
  catch (error) { self.postMessage({ revision, resultado: { valido: false, etapa: "worker", decide: "sistema", mensaje: error.message } }); }
};
