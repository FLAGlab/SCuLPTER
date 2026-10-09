import base64
import itertools
import json
import re
import threading
import unicodedata
import uuid
from pathlib import Path

import cv2
import numpy as np
import clasificador_simbolos as clasif


OPERACIONES = {"PUSH", "MOV", "POP", "DUP", "NEG", "?", "JMP", "CMP", "ADD", "SUB", "MUL", "DIV", "MOD"}
PRIORIDAD_ORIGEN = ("foto", "sintetico", "render")
_revisiones = itertools.count(1)

PROGRAMAS = {
    "minimo": "PUSH a 3\nPUSH a 5\nADD a",
    "condicion": "PUSH a -1\n? a\nPUSH b 99\nPUSH c 7",
    "bucle": "PUSH a 3\nSUB a 1\nDUP a\n? a\nJMP -3",
    "fibonacci": "PUSH a 0\nPUSH b 1\nPUSH n 5\nDUP a\nMOV fib a\nDUP b\nMOV a b\nADD a\n"
                 "MOV tmp a\nMOV a b\nMOV b tmp\nSUB n 1\nDUP n\n? n\nJMP -11",
}


def clase(nombre):
    if nombre in OPERACIONES:
        return "operacion"
    if nombre == "nil" or re.fullmatch(r"-?\d+(\.\d+)?", nombre):
        return "literal"
    return "pila"


def requeridos(programa):
    pedidos = {}
    for linea in programa.strip().splitlines():
        for nombre in linea.split():
            pedidos.setdefault(nombre, clase(nombre))
    return pedidos


def lexema(nombre, tipo):
    nombre = unicodedata.normalize("NFC", nombre.strip())
    if not nombre or len(nombre) > 80:
        raise ValueError("Escribe una etiqueta de 1 a 80 caracteres.")
    if tipo == "operacion":
        if nombre not in OPERACIONES:
            raise ValueError("Operación desconocida.")
        return nombre
    if tipo == "literal":
        if nombre != "nil" and not re.fullmatch(r"-?\d+(\.\d+)?", nombre):
            raise ValueError("El literal debe ser un número o nil.")
        return nombre
    if tipo != "pila":
        raise ValueError("Tipo de símbolo desconocido.")
    reservadas = OPERACIONES | {n.lower() for n in OPERACIONES} | {"nil", "NIL"}
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", nombre) and nombre not in reservadas and not nombre.startswith("sculpt_label_"):
        return nombre
    return "sculpt_label_" + "_".join(format(ord(c), "x") for c in nombre)


class Vocabulario:
    def __init__(self, raiz, datos, solo_fotos=False):
        self.raiz, self.datos = Path(raiz), Path(datos)
        self.solo_fotos = bool(solo_fotos)
        self.lock = threading.RLock()
        self.recargar()

    def recargar(self):
        self.revision = next(_revisiones)
        self.base = json.loads((self.raiz / "simbolos.json").read_text())["simbolos"]
        ruta = self.datos / "simbolos.json"
        self.propios = json.loads(ruta.read_text()) if ruta.exists() else []
        self.nombres = {s["lexema"]: s["nombre"] for s in self.listar()}
        plantillas, procedencia = {}, {}
        for item in self.listar():
            for referencia in item["referencias"]:
                if self.solo_fotos and referencia["origen"] != "foto":
                    continue
                imagen = cv2.imread(str(self.ruta_foto(referencia["foto"])), cv2.IMREAD_GRAYSCALE)
                if imagen is None:
                    continue
                variantes = [clasif.normalizar(clasif.rotar(imagen, a)) for a in clasif.ANGULOS]
                utiles = [v for v in variantes if v is not None]
                if not utiles:
                    continue
                plantillas.setdefault(item["lexema"], []).extend(utiles)
                cuenta = procedencia.setdefault(item["lexema"], {"foto": 0, "sintetico": 0, "render": 0})
                cuenta[referencia["origen"]] = cuenta.get(referencia["origen"], 0) + 1
        self.plantillas = {k: v for k, v in plantillas.items() if v}
        self.rasgos = {k: [clasif.rasgos(v) for v in variantes] for k, variantes in self.plantillas.items()}
        self.procedencia = {k: v for k, v in procedencia.items() if k in self.plantillas}

    def ruta_foto(self, nombre):
        if not re.fullmatch(r"[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(png|jpg|jpeg)", nombre, re.IGNORECASE):
            raise ValueError("Nombre de foto inválido.")
        return (self.datos / "referencias" / nombre) if nombre.startswith("ref_") else self.raiz / "referencias" / nombre

    def listar(self):
        resultado = {}
        for entrada in self.base:
            declarado = entrada.get("origen") or "render"
            refs = [{"foto": p.name, "origen": declarado}
                    for p in sorted((self.raiz / "referencias").glob(entrada["archivo"] + ".*"))
                    if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
            resultado[entrada["lexema"]] = {**entrada, "nombre": entrada.get("escrito") or entrada["lexema"], "referencias": refs}
        for entrada in self.propios:
            item = resultado.setdefault(entrada["lexema"], {**entrada, "referencias": []})
            item.setdefault("referencias", []).append({"foto": entrada["foto"], "origen": entrada.get("origen") or "foto"})
        for item in resultado.values():
            origenes = [r["origen"] for r in item["referencias"]]
            item["fotos"] = [r["foto"] for r in item["referencias"]]
            item["origen"] = next((o for o in PRIORIDAD_ORIGEN if o in origenes), None)
            item["fotografiadas"] = origenes.count("foto")
            item["sinteticas"] = origenes.count("sintetico")
        return list(resultado.values())

    def ensayo(self, programa):
        entradas = {s["lexema"]: s for s in self.listar()}
        faltan, provisionales, listos = [], [], []
        for nombre, tipo in sorted(requeridos(programa).items()):
            entrada = entradas.get(nombre)
            if entrada is None:
                faltan.append({"lexema": nombre, "tipo": tipo, "motivo": "no declarado"})
            elif nombre not in self.plantillas:
                faltan.append({"lexema": nombre, "tipo": tipo, "motivo": "declarado sin foto utilizable"})
            elif entrada.get("origen") != "foto":
                provisionales.append({"lexema": nombre, "tipo": tipo, "origen": entrada.get("origen") or "desconocido"})
            else:
                listos.append({"lexema": nombre, "tipo": tipo})
        mixtos = sorted(k for k, v in self.procedencia.items() if v.get("foto") and v.get("render"))
        return {"declarados": len(entradas), "con_plantilla": len(self.plantillas),
                "solo_fotos": self.solo_fotos, "mixtos": mixtos,
                "plantillas_sintetico": sum(v.get("sintetico", 0) for v in self.procedencia.values()),
                "plantillas_foto": sum(v.get("foto", 0) for v in self.procedencia.values()),
                "plantillas_render": sum(v.get("render", 0) for v in self.procedencia.values()),
                "desde_ficha": sum(1 for e in entradas.values() if e.get("origen") == "foto" and e["lexema"] in self.plantillas),
                "listos": listos, "provisionales": provisionales, "faltan": faltan}

    def puntuar(self, imagen):
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY) if imagen.ndim == 3 else imagen
        normal = clasif.normalizar(gris)
        if normal is None:
            return []
        with self.lock:
            valores = clasif.puntuar_contra(clasif.rasgos(normal), self.rasgos)
        return [{"lexema": k, "nombre": self.nombres.get(k, k), "puntaje": v} for k, v in sorted(valores, key=lambda par: par[1], reverse=True)[:4]]

    def imagen(self, codificada):
        if not isinstance(codificada, str) or len(codificada) > 8_000_000:
            raise ValueError("La foto debe pesar menos de 6 MB.")
        contenido = base64.b64decode(codificada.split(",")[-1], validate=True)
        img = cv2.imdecode(np.frombuffer(contenido, np.uint8), cv2.IMREAD_COLOR)
        if img is None or min(img.shape[:2]) < 8 or max(img.shape[:2]) > 6000:
            raise ValueError("Usa una foto PNG o JPEG de entre 8 y 6000 píxeles.")
        return img

    def guardar(self, datos):
        nombre = str(datos["nombre"]).strip()
        tipo = datos["tipo"]
        token = lexema(nombre, tipo)
        img = self.imagen(datos["imagen"])
        if clasif.normalizar(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)) is None:
            raise ValueError("La foto no contiene un trazo reconocible. Recorta una ficha sobre fondo claro.")
        with self.lock:
            carpeta = self.datos / "referencias"
            carpeta.mkdir(parents=True, exist_ok=True)
            foto = "ref_" + uuid.uuid4().hex + ".png"
            if not cv2.imwrite(str(carpeta / foto), img):
                raise ValueError("No se pudo guardar la imagen.")
            self.propios.append({"lexema": token, "nombre": nombre, "tipo": tipo, "foto": foto, "confirmado": True, "origen": "foto"})
            ruta = self.datos / "simbolos.json"
            temporal = ruta.with_suffix('.tmp'); temporal.write_text(json.dumps(self.propios, ensure_ascii=False)); temporal.replace(ruta)
            self.recargar()
        return token
