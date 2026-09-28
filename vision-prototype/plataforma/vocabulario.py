import base64
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
    def __init__(self, raiz, datos):
        self.raiz, self.datos = Path(raiz), Path(datos)
        self.lock = threading.RLock()
        self.recargar()

    def recargar(self):
        self.base = json.loads((self.raiz / "simbolos.json").read_text())["simbolos"]
        ruta = self.datos / "simbolos.json"
        self.propios = json.loads(ruta.read_text()) if ruta.exists() else []
        self.nombres = {s["lexema"]: s["nombre"] for s in self.listar()}
        plantillas = {}
        for item in self.listar():
            for foto in item["fotos"]:
                imagen = cv2.imread(str(self.ruta_foto(foto)), cv2.IMREAD_GRAYSCALE)
                if imagen is None:
                    continue
                variantes = [clasif.normalizar(clasif.rotar(imagen, a)) for a in clasif.ANGULOS]
                plantillas.setdefault(item["lexema"], []).extend(v for v in variantes if v is not None)
        self.plantillas = {k: v for k, v in plantillas.items() if v}

    def ruta_foto(self, nombre):
        if not re.fullmatch(r"[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(png|jpg|jpeg)", nombre, re.IGNORECASE):
            raise ValueError("Nombre de foto inválido.")
        return (self.datos / "referencias" / nombre) if nombre.startswith("ref_") else self.raiz / "referencias" / nombre

    def listar(self):
        resultado = {}
        for entrada in self.base:
            fotos = [p.name for p in (self.raiz / "referencias").glob(entrada["archivo"] + ".*") if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
            resultado[entrada["lexema"]] = {**entrada, "nombre": entrada.get("escrito") or entrada["lexema"], "fotos": fotos}
        for entrada in self.propios:
            item = resultado.setdefault(entrada["lexema"], {**entrada, "fotos": []})
            item["fotos"].append(entrada["foto"])
        return list(resultado.values())

    def puntuar(self, imagen):
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY) if imagen.ndim == 3 else imagen
        normal = clasif.normalizar(gris)
        if normal is None:
            return []
        with self.lock:
            valores = [(k, max(float(cv2.matchTemplate(normal, v, cv2.TM_CCOEFF_NORMED).max()) for v in variantes)) for k, variantes in self.plantillas.items()]
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
            self.propios.append({"lexema": token, "nombre": nombre, "tipo": tipo, "foto": foto, "confirmado": True})
            ruta = self.datos / "simbolos.json"
            temporal = ruta.with_suffix('.tmp'); temporal.write_text(json.dumps(self.propios, ensure_ascii=False)); temporal.replace(ruta)
            self.recargar()
        return token
