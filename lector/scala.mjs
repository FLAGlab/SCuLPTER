// Puente entre Python y el intérprete de Scala compilado a JS (npm run build:simulator).
// Recibe un programa por línea en stdin, como JSON {"codigo": "..."}, y responde una línea
// JSON con {valido, etapa, mensaje}.
import { createInterface } from "node:readline";
import { sculptAnalizar } from "../simulador/generado/interprete.js";

// Scala escribe sus errores con println; se mandan a stderr para no romper el protocolo.
console.log = (...partes) => console.error(...partes);

const lineas = createInterface({ input: process.stdin });
for await (const linea of lineas) {
  const { codigo } = JSON.parse(linea);
  const resultado = sculptAnalizar(codigo);
  const respuesta = { valido: resultado.valido, etapa: resultado.etapa, mensaje: resultado.mensaje ?? "" };
  process.stdout.write(JSON.stringify(respuesta) + "\n");
}
