import json
import subprocess
import threading
from pathlib import Path

PUENTE = Path(__file__).with_name("scala.mjs")
INTERPRETE = Path(__file__).parents[1] / "simulador" / "generado" / "interprete.js"


class Lenguaje:
    """El lenguaje lo decide Scala, no Python.

    Se abre un solo proceso de node con el intérprete compilado y se le pregunta en serie:
    el Lexer y el Parser de Scala guardan estado global y no aceptan llamadas en paralelo.
    """

    def __init__(self):
        if not INTERPRETE.exists():
            raise RuntimeError(f"Falta {INTERPRETE}. Ejecuta: npm run build:simulator")
        self.proceso = subprocess.Popen(
            ["node", str(PUENTE)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        self.candado = threading.Lock()
        self.validas = {}

    def analizar(self, codigo):
        # El Parser rechaza "ADD a" como última línea si no termina en salto de línea.
        if not codigo.endswith("\n"):
            codigo += "\n"
        with self.candado:
            self.proceso.stdin.write(json.dumps({"codigo": codigo}) + "\n")
            self.proceso.stdin.flush()
            return json.loads(self.proceso.stdout.readline())

    def es_valida(self, nombres):
        texto = " ".join(nombres)
        if texto not in self.validas:
            self.validas[texto] = self.analizar(texto)["valido"]
        return self.validas[texto]

    def cerrar(self):
        self.proceso.stdin.close()
        self.proceso.wait(timeout=2)


def codigo(programa):
    lineas = []
    for nombres in programa:
        lineas.append(" ".join(nombres))
    return "\n".join(lineas) + "\n"
