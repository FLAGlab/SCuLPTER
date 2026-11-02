import json
import threading
import time
import uuid
from pathlib import Path

import cv2
import numpy as np

# Política del proyecto: por encima de este error no se guardan los intrínsecos. Un RMS bajo
# tampoco demuestra una buena calibración: con poses parecidas o sin esquinas cerca de los bordes
# se ajusta bien a esas muestras y mal al resto de la imagen.
LIMITE_RMS = 1.0
MINIMO_MUESTRAS = 15
MAXIMO_MUESTRAS = 50
PARECIDA_PX = 12
# Medido el 2026-10-14 con la LifeCam: un tablero plano se aparta 0.47–0.6 px de un plano (la
# distorsión de la lente); las hojas curvadas en la mano, de 1.9 a 12 px.
LIMITE_PLANO = 1.5
PROPORCION_FOCAL = .05
ZONAS = 3


def ventana_refinamiento(puntos, tablero):
    """Media ventana de `cornerSubPix`: menor que la mitad del cuadro más corto en píxeles, para
    que el refinamiento no alcance la esquina vecina, y nunca mayor de 11 ni menor de 3."""
    q = np.asarray(puntos, np.float32).reshape(tablero[1], tablero[0], 2)
    pasos = np.r_[np.linalg.norm(np.diff(q, axis=1), axis=2).ravel(), np.linalg.norm(np.diff(q, axis=0), axis=2).ravel()]
    return int(np.clip(pasos.min() * .4, 3, 11))


def residuo_plano(puntos, objeto):
    """Cuánto se apartan las esquinas de un plano visto en perspectiva, sin intrínsecos.

    Ninguna cámara puede corregir esto: si es alto, el tablero estaba curvado, se movió durante
    la exposición o hay esquinas mal detectadas."""
    p = np.asarray(puntos, np.float32).reshape(-1, 2)
    plano = np.asarray(objeto, np.float32)[:, :2]
    h, _ = cv2.findHomography(plano, p, 0)
    if h is None:
        return None
    proyectados = cv2.perspectiveTransform(plano.reshape(-1, 1, 2), h).reshape(-1, 2)
    return float(np.sqrt(np.mean(np.sum((p - proyectados) ** 2, axis=1))))


def inclinacion(puntos, tablero):
    """Hacia dónde mira el tablero, aproximado por el escorzo de sus lados opuestos.

    Es una heurística en píxeles, sin intrínsecos: sirve para avisar de que todas las vistas se
    parecen, no para medir ángulos."""
    q = np.asarray(puntos, np.float32).reshape(tablero[1], tablero[0], 2)
    izquierda, derecha = np.linalg.norm(q[-1, 0] - q[0, 0]), np.linalg.norm(q[-1, -1] - q[0, -1])
    arriba, abajo = np.linalg.norm(q[0, -1] - q[0, 0]), np.linalg.norm(q[-1, -1] - q[-1, 0])
    horizontal, vertical = max(derecha, 1e-6) / max(izquierda, 1e-6), max(abajo, 1e-6) / max(arriba, 1e-6)
    if max(abs(np.log(horizontal)), abs(np.log(vertical))) < np.log(1.08):
        return 'frontal'
    if abs(np.log(horizontal)) >= abs(np.log(vertical)):
        return 'girado a la derecha' if horizontal < 1 else 'girado a la izquierda'
    return 'inclinado hacia arriba' if vertical < 1 else 'inclinado hacia abajo'


class Calibracion:
    """Muestras de un tablero para una cámara, guardadas en disco si se da `carpeta`.

    `muestras` son los puntos de cada captura, en orden; `registro` lleva lo demás de cada una:
    número, imagen original, exclusión e historial. Una muestra excluida se conserva y no
    entra en el cálculo.
    """

    def __init__(self, columnas=9, filas=6, mm=25, carpeta=None, camara=None):
        if not 3 <= columnas <= 20 or not 3 <= filas <= 20 or not 1 <= mm <= 200:
            raise ValueError("Tablero fuera de rango.")
        self.tablero = (columnas, filas)
        self.mm = mm
        self.muestras = []
        self.registro = []
        self.tamano = None
        self.diagnostico = None
        self.diagnosticos = []
        self.carpeta = Path(carpeta) if carpeta else None
        self.camara = camara
        self.id = self.carpeta.name if self.carpeta else uuid.uuid4().hex[:10]
        self.creada = time.strftime('%Y-%m-%d %H:%M:%S')
        self.lock = threading.RLock()
        self.objeto = np.zeros((columnas * filas, 3), np.float32)
        self.objeto[:, :2] = np.mgrid[0:columnas, 0:filas].T.reshape(-1, 2) * mm

    def esperadas(self):
        return self.tablero[0] * self.tablero[1]

    def detectar(self, imagen, rapida=False):
        """Esquinas del tablero en un cuadro, sin lanzar errores: para la vista en directo."""
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY) if imagen.ndim == 3 else imagen
        bandera = cv2.CALIB_CB_ADAPTIVE_THRESH + cv2.CALIB_CB_NORMALIZE_IMAGE + (cv2.CALIB_CB_FAST_CHECK if rapida else 0)
        ok, puntos = cv2.findChessboardCorners(gris, self.tablero, bandera)
        if not ok:
            return {'encontrado': False, 'esperadas': self.esperadas(), 'puntos': None, 'ventana': None}
        ventana = ventana_refinamiento(puntos, self.tablero)
        puntos = cv2.cornerSubPix(gris, puntos, (ventana, ventana), (-1, -1),
                                  (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .001))
        return {'encontrado': True, 'esperadas': self.esperadas(), 'puntos': puntos, 'ventana': ventana}

    def esquinas(self, imagen):
        deteccion = self.detectar(imagen)
        if not deteccion['encontrado']:
            raise ValueError(f"No se encontraron las {self.esperadas()} esquinas interiores del tablero. "
                             "Revisa que se vea entero, la luz y el tamaño configurado.")
        return deteccion['puntos']

    def incluidas(self):
        return [n for n in range(len(self.muestras))
                if not (n < len(self.registro) and self.registro[n].get('excluida'))]

    def capturar(self, imagen, puntos=None):
        """Guarda una muestra. `puntos` son las esquinas ya halladas en este mismo cuadro."""
        with self.lock:
            tamano = (imagen.shape[1], imagen.shape[0])
            if self.tamano and self.tamano != tamano:
                raise ValueError(f"Rechazada: la imagen es de {tamano[0]}x{tamano[1]} y las capturas de esta "
                                 f"sesión son de {self.tamano[0]}x{self.tamano[1]}. Reinicia las capturas.")
            puntos = self.esquinas(imagen) if puntos is None else np.asarray(puntos, np.float32)
            plano = residuo_plano(puntos, self.objeto)
            if plano is not None and plano > LIMITE_PLANO:
                raise ValueError(f"Rechazada: el tablero no está plano; sus esquinas se apartan {plano:.1f} px de un "
                                 f"plano (límite {LIMITE_PLANO:g} px). Pega la hoja sobre algo rígido o déjala sobre "
                                 "la mesa y mueve la cámara.")
            for n in self.incluidas():
                distancia = float(np.linalg.norm(puntos - self.muestras[n], axis=2).mean())
                if distancia < PARECIDA_PX:
                    raise ValueError(f"Repetida: se parece a la captura {self._numero(n)} (las esquinas se mueven "
                                     f"{distancia:.1f} px de media). Cambia el ángulo o la posición del tablero.")
            if len(self.incluidas()) >= MAXIMO_MUESTRAS:
                raise ValueError(f"Ya hay {MAXIMO_MUESTRAS} capturas. Calcula la calibración o reinicia la sesión.")
            self.tamano = tamano
            numero = max([r['n'] for r in self.registro], default=len(self.muestras)) + 1
            archivo = None
            if self.carpeta:
                (self.carpeta / 'muestras').mkdir(parents=True, exist_ok=True)
                archivo = f'muestras/{numero:03d}.png'
                cv2.imwrite(str(self.carpeta / archivo), imagen)
            while len(self.registro) < len(self.muestras):
                self.registro.append({'n': len(self.registro) + 1, 'archivo': None, 'excluida': False, 'historial': []})
            self.muestras.append(puntos)
            self.registro.append({'n': numero, 'archivo': archivo, 'excluida': False,
                                  'fecha': time.strftime('%Y-%m-%d %H:%M:%S'),
                                  'inclinacion': inclinacion(puntos, self.tablero),
                                  'residuo_plano': None if plano is None else round(plano, 3), 'historial': []})
            self.guardar()
            return len(self.incluidas())

    def _numero(self, n):
        return self.registro[n]['n'] if n < len(self.registro) else n + 1

    def _indice(self, numero):
        for n in range(len(self.muestras)):
            if self._numero(n) == numero:
                return n
        raise ValueError(f'No hay ninguna captura {numero}.')

    def excluir(self, numero, motivo, excluida=True):
        with self.lock:
            n = self._indice(numero)
            while len(self.registro) <= n:
                self.registro.append({'n': len(self.registro) + 1, 'archivo': None, 'excluida': False, 'historial': []})
            self.registro[n]['excluida'] = excluida
            self.registro[n]['historial'].append({'fecha': time.strftime('%Y-%m-%d %H:%M:%S'),
                                                  'accion': 'excluida' if excluida else 'incluida', 'motivo': motivo})
            self.guardar()

    def cobertura(self):
        """Zonas de la imagen con esquinas y variedad de inclinaciones de las muestras incluidas."""
        if not self.tamano or not self.muestras:
            return {'zonas': 0, 'de': ZONAS * ZONAS, 'inclinaciones': {}}
        ancho, alto = self.tamano
        zonas = set()
        inclinaciones = {}
        for n in self.incluidas():
            for x, y in self.muestras[n].reshape(-1, 2):
                zonas.add((min(ZONAS - 1, int(x / ancho * ZONAS)), min(ZONAS - 1, int(y / alto * ZONAS))))
            tipo = inclinacion(self.muestras[n], self.tablero)
            inclinaciones[tipo] = inclinaciones.get(tipo, 0) + 1
        return {'zonas': len(zonas), 'de': ZONAS * ZONAS, 'inclinaciones': inclinaciones}

    def calcular(self):
        """Ajusta los intrínsecos con las muestras incluidas y deja el diagnóstico, se acepte o no."""
        with self.lock:
            indices = self.incluidas()
            if len(indices) < MINIMO_MUESTRAS:
                raise ValueError(f"Se necesitan al menos {MINIMO_MUESTRAS} capturas incluidas y hay {len(indices)}.")
            puntos = [self.muestras[n] for n in indices]
            numeros = [self._numero(n) for n in indices]
            tamano = self.tamano
        error, matriz, dist, rotaciones, traslaciones = cv2.calibrateCamera([self.objeto] * len(puntos), puntos, tamano, None, None)
        errores = []
        for p, r, t in zip(puntos, rotaciones, traslaciones):
            proy, _ = cv2.projectPoints(self.objeto, r, t, matriz, dist)
            errores.append(float(np.sqrt(np.mean(np.sum((p - proy) ** 2, axis=2)))))
        rms = float(error) if np.isfinite(error) else None
        resultado = {"camera_matrix": matriz.tolist(), "dist_coeffs": dist.ravel().tolist(), "image_size": list(tamano),
                     "rms": float(error), "errores": errores, "capturas": len(puntos), "tablero": list(self.tablero),
                     "mm": self.mm, "origen": "tablero", "sesion": self.id, "muestras": numeros}
        peores = sorted(zip(errores, numeros), reverse=True)[:3]
        avisos = []
        if abs(matriz[0, 0] / matriz[1, 1] - 1) > PROPORCION_FOCAL:
            avisos.append(f"fx y fy difieren un {abs(matriz[0, 0] / matriz[1, 1] - 1) * 100:.0f} %: con píxeles casi "
                          "cuadrados indica muestras poco variadas, aunque el error sea bajo.")
        curvadas = [self._numero(n) for n in indices if (residuo_plano(self.muestras[n], self.objeto) or 0) > LIMITE_PLANO]
        if curvadas:
            avisos.append(f"Capturas que no están en un plano (> {LIMITE_PLANO:g} px): {curvadas}. Revisa si la hoja estaba curvada.")
        cobertura = self.cobertura()
        if cobertura['zonas'] < cobertura['de']:
            avisos.append(f"Hay esquinas en {cobertura['zonas']} de {cobertura['de']} zonas de la imagen: faltan vistas cerca de los bordes.")
        if len(cobertura['inclinaciones']) < 4 or max(cobertura['inclinaciones'].values()) > .5 * len(indices):
            avisos.append("Las inclinaciones están desequilibradas: añade vistas giradas a ambos lados e inclinadas arriba y abajo.")
        with self.lock:
            self.diagnostico = {"estado": "candidata" if rms is not None and rms < LIMITE_RMS else "rechazada",
                                "rms": rms, "limite": LIMITE_RMS,
                                "errores": [e if np.isfinite(e) else None for e in errores], "muestras": numeros,
                                "peores": [{"captura": c, "error": round(e, 3)} for e, c in peores],
                                "capturas": len(puntos), "cobertura": cobertura, "avisos": avisos,
                                "fecha": time.strftime('%Y-%m-%d %H:%M:%S')}
            self.diagnosticos.append(self.diagnostico)
            self.guardar()
        return resultado

    def aceptar(self):
        with self.lock:
            if self.diagnostico:
                self.diagnostico['estado'] = 'aceptada'
                self.guardar()

    def resumen(self):
        with self.lock:
            errores = dict(zip(self.diagnostico['muestras'], self.diagnostico['errores'])) if self.diagnostico else {}
            return {'sesion': self.id, 'tablero': list(self.tablero), 'mm': self.mm, 'resolucion': list(self.tamano) if self.tamano else None,
                    'incluidas': len(self.incluidas()), 'cobertura': self.cobertura(), 'diagnostico': self.diagnostico,
                    'muestras': [{'n': self._numero(n), 'excluida': bool(n < len(self.registro) and self.registro[n].get('excluida')),
                                  'imagen': bool(n < len(self.registro) and self.registro[n].get('archivo')),
                                  'inclinacion': inclinacion(self.muestras[n], self.tablero),
                                  'residuo_plano': (lambda r: None if r is None else round(r, 3))(residuo_plano(self.muestras[n], self.objeto)),
                                  'error': errores.get(self._numero(n))} for n in range(len(self.muestras))]}

    def imagen(self, numero):
        n = self._indice(numero)
        archivo = self.registro[n].get('archivo') if n < len(self.registro) else None
        if not archivo or not self.carpeta:
            raise ValueError(f'La captura {numero} no tiene imagen guardada.')
        return self.carpeta / archivo

    def guardar(self):
        if not self.carpeta:
            return
        self.carpeta.mkdir(parents=True, exist_ok=True)
        datos = {'version': 1, 'id': self.id, 'camara': self.camara, 'creada': self.creada,
                 'tablero': list(self.tablero), 'mm': self.mm, 'resolucion': list(self.tamano) if self.tamano else None,
                 'muestras': [{**(self.registro[n] if n < len(self.registro) else {'n': n + 1, 'archivo': None, 'excluida': False, 'historial': []}),
                               'puntos': np.asarray(self.muestras[n], float).reshape(-1, 2).round(4).tolist()}
                              for n in range(len(self.muestras))],
                 'diagnosticos': self.diagnosticos}
        temporal = self.carpeta / 'sesion.tmp'
        temporal.write_text(json.dumps(datos, ensure_ascii=False))
        temporal.replace(self.carpeta / 'sesion.json')

    @classmethod
    def cargar(cls, carpeta):
        carpeta = Path(carpeta)
        datos = json.loads((carpeta / 'sesion.json').read_text())
        cal = cls(*datos['tablero'], datos['mm'], carpeta=carpeta, camara=datos.get('camara'))
        cal.creada = datos.get('creada', cal.creada)
        cal.tamano = tuple(datos['resolucion']) if datos.get('resolucion') else None
        for m in datos['muestras']:
            cal.muestras.append(np.asarray(m['puntos'], np.float32).reshape(-1, 1, 2))
            cal.registro.append({k: v for k, v in m.items() if k != 'puntos'})
        cal.diagnosticos = datos.get('diagnosticos', [])
        cal.diagnostico = cal.diagnosticos[-1] if cal.diagnosticos else None
        return cal

    def pose(self, imagen, intr):
        if list((imagen.shape[1], imagen.shape[0])) != intr["image_size"]:
            raise ValueError("La resolución no coincide con los intrínsecos guardados.")
        puntos = self.esquinas(imagen)
        k, d = np.array(intr["camera_matrix"]), np.array(intr["dist_coeffs"])
        ok, r, t = cv2.solvePnP(self.objeto, puntos, k, d)
        if not ok:
            raise ValueError("No se pudo calcular la pose de la cámara.")
        proyectados, _ = cv2.projectPoints(self.objeto, r, t, k, d)
        error = float(np.sqrt(np.mean(np.sum((puntos - proyectados) ** 2, axis=2))))
        rot, _ = cv2.Rodrigues(r)
        return {"rot": rot.tolist(), "tras": t.ravel().tolist(), "rms": error}
