import { sculptAnalizar, sculptEjecutar } from "../generado/interprete.js";
self.onmessage = ({ data: { revision, codigo, modo } }) => {
  try { self.postMessage({ revision, resultado: modo === "analizar" ? sculptAnalizar(codigo) : sculptEjecutar(codigo, 2000) }); }
  catch (error) { self.postMessage({ revision, resultado: { valido: false, etapa: "worker", decide: "sistema", mensaje: error.message } }); }
};
