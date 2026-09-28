import { Montaje, parametroDesdeTexto } from './montaje.mjs';
import { ordenarMontaje, unirArticulado } from './conexiones.mjs';

export const TRAZOS = {
  espiral: [[[.52, .5], [.62, .44], [.66, .56], [.56, .66], [.4, .62], [.34, .42], [.48, .26], [.7, .3], [.8, .52]]],
  triangulo: [[[.5, .2], [.8, .76], [.2, .76], [.5, .2]]],
  cuadrado: [[[.26, .26], [.74, .26], [.74, .74], [.26, .74], [.26, .26]]],
  barras: [[[.3, .24], [.3, .76]], [[.5, .24], [.5, .76]], [[.7, .24], [.7, .76]]],
  arco: [[[.22, .68], [.3, .38], [.5, .26], [.7, .38], [.78, .68]]],
  cruz: [[[.28, .28], [.72, .72]], [[.72, .28], [.28, .72]]],
  rombo: [[[.5, .22], [.78, .5], [.5, .78], [.22, .5], [.5, .22]]],
  onda: [[[.18, .5], [.34, .32], [.5, .5], [.66, .68], [.82, .5]]],
  gota: [[[.5, .22], [.72, .54], [.6, .74], [.4, .74], [.28, .54], [.5, .22]]],
  raya: [[[.24, .5], [.76, .5]]],
};

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
  {
    nombre: 'Sucesión de Fibonacci', categoria: 'Bucle con dibujos',
    descripcion: 'Cinco pilas dibujadas a mano. Cada vuelta guarda un término en la espiral y desplaza la pareja con una pila auxiliar. Termina en 74 pasos y deja los seis primeros términos.',
    codigo: 'PUSH a 0\nPUSH b 1\nPUSH n 5\nDUP a\nMOV fib a\nDUP b\nMOV a b\nADD a\nMOV tmp a\nMOV a b\nMOV b tmp\nSUB n 1\nDUP n\n? n\nJMP -11',
    forma: 'Espiral', giros: [0, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
    dibujos: { fib: 'espiral', a: 'triangulo', b: 'cuadrado', n: 'barras', tmp: 'arco' },
    esperado: { fib: [5, 3, 2, 1, 1, 0], n: [-1], a: [8], tmp: [], b: [13] },
  },
  {
    nombre: 'El mayor de dos', categoria: 'Decisión con dibujos',
    descripcion: 'Guarda una copia de cada valor, resta para conocer el signo y usa ? con dos JMP para quedarse solo con el mayor. La rama que no se toma nunca se ejecuta.',
    codigo: 'PUSH x 7\nPUSH y 4\nDUP x\nDUP y\nMOV t y\nMOV t x\nSUB t\n? t\nJMP 3\nMOV mayor y\nJMP 2\nMOV mayor x',
    forma: 'Bifurcación', giros: [0, 0, 0, 0, 30, 30, 0, 0, -30, -30, 0, 0],
    dibujos: { x: 'cruz', y: 'rombo', t: 'onda', mayor: 'triangulo' },
    esperado: { x: [], y: [4], t: [], mayor: [7] },
  },
  {
    nombre: 'Rastro de un valor vacío', categoria: 'Diagnóstico con dibujos',
    descripcion: 'Cinco pasos antes del fallo. La división por cero deja #, la copia lo propaga y la suma final detiene la ejecución. Sirve para recorrer hacia atrás y ver dónde apareció el #.',
    codigo: 'PUSH serie 0\nPUSH serie 12\nDIV serie\nDUP serie\nMOV registro serie\nADD serie 1',
    forma: 'Codo', giros: [0, 0, 0, 40, 0, 0],
    dibujos: { serie: 'gota', registro: 'raya' },
    esperado: { serie: [null], registro: [null] }, error: true,
  },
];

export function montajeEjemplo(ejemplo) {
  const montaje = new Montaje();
  for (const linea of ejemplo.codigo.split('\n')) {
    const [token, ...operandos] = linea.split(' ');
    const b = montaje.agregarBloque(token, operandos.length);
    operandos.forEach((texto, slot) => {
      const contenido = parametroDesdeTexto(texto);
      const trazos = TRAZOS[ejemplo.dibujos?.[texto]];
      if (trazos && contenido.tipo === 'etiqueta') contenido.trazos = structuredClone(trazos);
      const p = montaje.agregarParametro(contenido);
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
