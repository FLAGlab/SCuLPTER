import { createInterface } from "node:readline";
import { sculptAnalizar } from "../simulador/generado/interprete.js";

console.log = (...partes) => console.error(...partes);

const lineas = createInterface({ input: process.stdin });
for await (const linea of lineas) {
  const { codigo } = JSON.parse(linea);
  const resultado = sculptAnalizar(codigo);
  const respuesta = { valido: resultado.valido, etapa: resultado.etapa, mensaje: resultado.mensaje ?? "" };
  process.stdout.write(JSON.stringify(respuesta) + "\n");
}
