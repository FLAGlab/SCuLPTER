import { Montaje, parametroDesdeTexto } from './montaje.mjs';
import { ordenarMontaje, unirArticulado } from './conexiones.mjs';

export const EJEMPLOS = [
  { nombre: 'Sumar dos valores', categoria: 'Aritmética', descripcion: 'Apila 3 y 5; ADD deja un único 8.', codigo: 'PUSH a 3\nPUSH a 5\nADD a', esperado: { a: [8] } },
  { nombre: 'Mover entre pilas', categoria: 'Pilas', descripcion: 'Duplica un valor y mueve la copia de b hacia a.', codigo: 'PUSH a 3\nPUSH b 5\nDUP b\nMOV a b', esperado: { a: [5, 3], b: [5] } },
  { nombre: 'Etiquetas propias', categoria: 'Parámetros', descripcion: 'Una estrella también puede identificar una pila.', codigo: 'PUSH ★ 7\nDUP ★\nADD ★', esperado: { sculpt_label_2605: [14] } },
  { nombre: 'Decidir con una condición', categoria: 'Control', descripcion: '? consume el negativo y omite PUSH b 99.', codigo: 'PUSH a -1\n? a\nPUSH b 99\nPUSH c 7', esperado: { a: [], c: [7] } },
  { nombre: 'Saltar una instrucción', categoria: 'Control', descripcion: 'JMP 2 avanza dos posiciones desde el salto.', codigo: 'PUSH a 1\nJMP 2\nPUSH a 99\nPUSH a 2', esperado: { a: [2, 1] } },
  { nombre: 'Cuenta regresiva', categoria: 'Bucle', descripcion: 'Resta uno y duplica el resultado para evaluarlo; un negativo permite salir del ciclo.', codigo: 'PUSH a 3\nSUB a 1\nDUP a\n? a\nJMP -3', forma: 'Herradura', giros: [0, 45, 45, 45, 45], esperado: { a: [-1] } },
  { nombre: 'El valor vacío', categoria: 'Valores', descripcion: 'Dividir por cero produce #, representado por nil en el texto.', codigo: 'PUSH a 2\nDIV a 0', esperado: { a: [null] } },
  { nombre: 'Un error con historia', categoria: 'Diagnóstico', descripcion: 'Sumar sobre # detiene la ejecución y conserva el paso anterior.', codigo: 'PUSH a nil\nADD a 2', esperado: { a: [null] }, error: true },
  { nombre: 'Acumulador en arco', categoria: 'Bucle y dos pilas', descripcion: 'Suma 4 + 3 + 2 + 1 + 0. El contador conserva su valor mediante DUP y sale al volverse negativo.', codigo: 'PUSH suma 0\nPUSH n 4\nDUP n\nMOV suma n\nADD suma\nSUB n 1\nDUP n\n? n\nJMP -6', forma: 'Arco', giros: [0, 22, 22, 22, 22, 22, 22, 22, 22], esperado: { suma: [10], n: [-1] } },
  { nombre: 'Dos pilas en zigzag', categoria: 'Aritmética y transferencia', descripcion: 'Calcula 6 × 2, conserva una copia, divide otra entre 3 y suma 5 al resultado original.', codigo: 'PUSH a 6\nPUSH a 2\nMUL a\nDUP a\nMOV b a\nDIV b 3\nADD a 5', forma: 'Zigzag', giros: [0, 45, -45, -45, 45, 45, -45, -45], esperado: { a: [17], b: [4] } },
];

export function montajeEjemplo(ejemplo) {
  const montaje = new Montaje();
  for (const linea of ejemplo.codigo.split('\n')) {
    const [token, ...operandos] = linea.split(' ');
    const b = montaje.agregarBloque(token, operandos.length);
    operandos.forEach((texto, slot) => {
      const p = montaje.agregarParametro(parametroDesdeTexto(texto));
      montaje.acoplar(p.id, b.id, slot);
    });
  }
  ordenarMontaje(montaje);
  if (ejemplo.giros) {
    montaje.conexiones = [];
    for (let i = 1; i < montaje.bloques.length; i++) unirArticulado(montaje, montaje.bloques[i - 1], montaje.bloques[i], ejemplo.giros[i] * Math.PI / 180);
  }
  return montaje;
}
