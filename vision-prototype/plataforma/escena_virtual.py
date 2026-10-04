import json
from pathlib import Path

import cv2
import numpy as np

from adjacency import ARIDAD_BLOQUE

PASO_CORTO_MM = 95.0
PASO_LARGO_MM = 115.0
LADO_FICHA_MM = 15.0
ALTO_OPERACION_MM = 37.0
ALTO_PARAMETRO_MM = 23.0
PASO_PARAMETRO_MM = 20.0
ANCHO_BLOQUE_MM = 21.0
HUECO_CONECTOR_MM = 29.5
LARGO_CUERPO = {1: 65.5, 2: 85.5}
COLOR_MESA = (208, 208, 208)
COLOR_CUERPO = {'bin': (236, 226, 246), 'una': (230, 243, 250), 'ari': (245, 226, 238)}
COLOR_BORDE = {'bin': (255, 97, 123), 'una': (0, 199, 255), 'ari': (141, 54, 240)}
FAMILIA = {'PUSH': 'bin', 'MOV': 'bin', 'ADD': 'ari', 'SUB': 'ari', 'MUL': 'ari', 'DIV': 'ari', 'MOD': 'ari'}
COLOR_MANO = (150, 170, 205)

RAIZ = Path(__file__).resolve().parents[1]
PLANO_FICHA_MIN_MM = 22.0
PLANO_FICHA_MAX_MM = 56.0
CONFIGURACION_PASOS = {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM, 'paso_2_mm': PASO_LARGO_MM, 'medido': True,
                       'plano_min_mm': PLANO_FICHA_MIN_MM, 'plano_max_mm': PLANO_FICHA_MAX_MM}


def intrinsecos(fov_grados, resolucion):
    ancho, alto = resolucion
    f = (ancho / 2) / np.tan(np.radians(fov_grados) / 2)
    return {'camera_matrix': [[f, 0, ancho / 2], [0, f, alto / 2], [0, 0, 1]],
            'dist_coeffs': [0.] * 5, 'image_size': [ancho, alto]}


def pose(centro, objetivo):
    centro = np.asarray(centro, float)
    frente = np.asarray(objetivo, float) - centro
    norma = np.linalg.norm(frente)
    if norma < 1e-6:
        raise ValueError('La cámara no puede mirar a su propio centro.')
    frente = frente / norma
    referencia = np.array([0., 0., 1.]) if abs(frente[1]) > .99 else np.array([0., 1., 0.])
    derecha = np.cross(frente, referencia)
    derecha = derecha / np.linalg.norm(derecha)
    abajo = np.cross(frente, derecha)
    rot = np.array([derecha, abajo, frente])
    return {'rot': rot.tolist(), 'tras': (-rot @ centro).tolist()}


class Camara:
    def __init__(self, id, nombre, centro, objetivo=(0., 0., 20.), fov=55., resolucion=(640, 480), rol='simbolos'):
        self.id, self.nombre, self.rol = id, nombre, rol
        self.centro = np.asarray(centro, float)
        self.objetivo = np.asarray(objetivo, float)
        self.fov, self.resolucion = float(fov), tuple(resolucion)

    def intrinsecos(self):
        return intrinsecos(self.fov, self.resolucion)

    def pose(self):
        return pose(self.centro, self.objetivo)

    def modelo(self):
        from plataforma.geometria_fusion import modelo
        return modelo(self.intrinsecos(), self.pose(), list(self.resolucion))

    def resumen(self):
        direccion = self.objetivo - self.centro
        direccion = direccion / max(np.linalg.norm(direccion), 1e-9)
        return {'id': self.id, 'nombre': self.nombre, 'centro': self.centro.tolist(),
                'objetivo': self.objetivo.tolist(), 'direccion': direccion.tolist(),
                'fov': self.fov, 'resolucion': list(self.resolucion), 'rol': self.rol, 'virtual': True}

    @classmethod
    def desde(cls, datos):
        return cls(datos['id'], datos.get('nombre', datos['id']), datos['centro'],
                   datos.get('objetivo', (0., 0., 20.)), datos.get('fov', 55.),
                   tuple(datos.get('resolucion', (640, 480))), datos.get('rol', 'simbolos'))


def normalizar_vector(v):
    v = np.asarray(v, float)
    n = float(np.linalg.norm(v))
    if n < 1e-9:
        raise ValueError('Un eje de la escena no puede ser nulo.')
    return v / n


def marco_desde_avance(avance):
    avance = normalizar_vector(avance)
    referencia = np.array([0., 1., 0.]) if abs(avance[2]) > .95 else np.array([0., 0., 1.])
    lateral = normalizar_vector(np.cross(referencia, avance))
    normal = normalizar_vector(np.cross(avance, lateral))
    return avance, lateral, normal


def marco_horizontal(angulo):
    return marco_desde_avance([np.cos(angulo), np.sin(angulo), 0.])


class Pieza:
    computa = False

    def esquinas(self):
        raise NotImplementedError


class Ficha(Pieza):
    computa = True
    _contador = 0

    def __init__(self, lexema, centro, angulo=0.0, lado=LADO_FICHA_MM, avance=None, normal=None, id=None):
        Ficha._contador += 1
        self.id = id or f'f{Ficha._contador}'
        self.lexema, self.lado = lexema, float(lado)
        self.centro = np.asarray(centro, float)
        if avance is None:
            self.avance, self.lateral, self.normal = marco_horizontal(float(angulo))
        else:
            self.avance, self.lateral, self.normal = marco_desde_avance(avance)
            if normal is not None:
                self.normal = normalizar_vector(normal)
                self.lateral = normalizar_vector(np.cross(self.normal, self.avance))
        self.angulo = float(angulo)

    def esquinas(self):
        u = self.avance * self.lado / 2
        w = self.lateral * self.lado / 2
        return np.array([self.centro - u + w, self.centro + u + w, self.centro + u - w, self.centro - u - w])


class Cuerpo(Pieza):
    def __init__(self, centro, angulo=0.0, largo=65.5, ancho=ANCHO_BLOQUE_MM, alto=20.,
                 color=(230, 230, 230), borde=None, avance=None, normal=None):
        self.centro = np.asarray(centro, float)
        self.largo, self.ancho, self.alto = float(largo), float(ancho), float(alto)
        self.color, self.borde, self.angulo = color, borde, float(angulo)
        if avance is None:
            self.avance, self.lateral, self.normal = marco_horizontal(float(angulo))
        else:
            self.avance, self.lateral, self.normal = marco_desde_avance(avance)
            if normal is not None:
                self.normal = normalizar_vector(normal)
                self.lateral = normalizar_vector(np.cross(self.normal, self.avance))

    def esquinas(self):
        u = self.avance * self.largo / 2
        v = self.lateral * self.ancho / 2
        cara = self.centro + self.normal * self.alto
        return np.array([cara - u - v, cara + u - v, cara + u + v, cara - u + v])


class Soporte(Pieza):
    def __init__(self, centro, lado=26., alto=12., color=(196, 186, 170)):
        self.centro = np.asarray(centro, float)
        self.lado, self.alto, self.color, self.borde = float(lado), float(alto), color, None

    def esquinas(self):
        c = self.centro + np.array([0., 0., self.alto])
        u, v = np.array([self.lado / 2, 0., 0.]), np.array([0., self.lado / 2, 0.])
        return np.array([c - u - v, c + u - v, c + u + v, c - u + v])


class Conector(Pieza):
    def __init__(self, centro, avance, largo=HUECO_CONECTOR_MM, ancho=9., color=(238, 238, 238)):
        self.centro = np.asarray(centro, float)
        self.avance, self.lateral, self.normal = marco_desde_avance(avance)
        self.largo, self.ancho, self.color, self.borde = float(largo), float(ancho), color, None

    def esquinas(self):
        u, v = self.avance * self.largo / 2, self.lateral * self.ancho / 2
        c = self.centro + self.normal * 2.0
        return np.array([c - u - v, c + u - v, c + u + v, c - u + v])


class Te(Pieza):
    def __init__(self, centro, avance, rama, largo=HUECO_CONECTOR_MM, ancho=9., color=(224, 232, 238)):
        self.centro = np.asarray(centro, float)
        self.avance, self.lateral, self.normal = marco_desde_avance(avance)
        self.rama = normalizar_vector(rama)
        self.largo, self.ancho, self.color, self.borde = float(largo), float(ancho), color, None

    def puertos(self):
        return {'vastago_plano': self.centro - self.avance * self.largo / 2,
                'vastago_esferico': self.centro + self.avance * self.largo / 2,
                'rama': self.centro + self.rama * self.largo / 2}

    def esquinas(self):
        u, v = self.avance * self.largo / 2, self.lateral * self.ancho / 2
        c = self.centro + self.normal * 2.0
        return np.array([c - u - v, c + u - v, c + u + v, c - u + v])

    def piezas(self):
        brazo = Conector(self.centro + self.rama * self.largo / 4, self.rama, self.largo / 2, self.ancho, self.color)
        return [self, brazo]


def hoja_impresa(ancho_px, alto_px, dificil=False):
    hoja = np.full((alto_px, ancho_px, 3), 246, np.uint8)
    tinta = (70, 70, 70)
    lineas = ['SCuLPT - hoja de operaciones', 'PUSH  MOV  POP  DUP  NEG',
              'ADD   SUB  MUL  DIV  MOD', 'referencia de taller, no es programa']
    for n, texto in enumerate(lineas):
        cv2.putText(hoja, texto, (14, 30 + n * 26), cv2.FONT_HERSHEY_SIMPLEX, .52, tinta, 1, cv2.LINE_AA)
    if dificil:
        lado, hueco = int(ancho_px * .075), int(ancho_px * .1)
        y = alto_px // 2
        for k, glifo in enumerate('3a5'):
            x = int(ancho_px * .12) + k * hueco
            cv2.rectangle(hoja, (x, y), (x + lado, y + lado), tinta, max(2, lado // 22), cv2.LINE_AA)
            cv2.putText(hoja, glifo, (x + lado // 4, y + int(lado * .78)), cv2.FONT_HERSHEY_SIMPLEX,
                        lado / 46, tinta, max(3, lado // 14), cv2.LINE_AA)
    return hoja


class Fondo(Pieza):
    def __init__(self, centro, ancho, alto, textura=None, color=(236, 236, 232), dificil=False):
        self.centro = np.asarray(centro, float)
        self.ancho, self.alto, self.textura, self.color, self.borde = float(ancho), float(alto), textura, color, None
        self.dificil = bool(dificil)
        self.imagen = hoja_impresa(int(ancho * 4), int(alto * 4), dificil) if textura == 'hoja' else None

    def esquinas(self):
        u, v = np.array([self.ancho / 2, 0., 0.]), np.array([0., self.alto / 2, 0.])
        return np.array([self.centro - u + v, self.centro + u + v, self.centro + u - v, self.centro - u - v])


class Mano(Pieza):
    def __init__(self, centro, radio=38., alto=70.):
        self.centro = np.asarray(centro, float)
        self.radio, self.alto = float(radio), float(alto)

    def esquinas(self):
        c = np.array([self.centro[0], self.centro[1], self.alto])
        u = np.array([self.radio, 0., 0.])
        v = np.array([0., self.radio, 0.])
        return np.array([c - u - v, c + u - v, c + u + v, c - u + v])


def paso_de(token, parametros):
    tamano = ARIDAD_BLOQUE.get(token)
    if tamano is None:
        tamano = 2 if parametros >= 2 else 1
    return PASO_CORTO_MM if tamano == 1 else PASO_LARGO_MM


def rumbos(programa, angulo=0.0, giros=None, inclinaciones=None):
    avance, _, normal = marco_horizontal(angulo)
    salida = []
    for n in range(len(programa)):
        giro = float((giros or [])[n]) if giros and n < len(giros) else 0.0
        inclina = float((inclinaciones or [])[n]) if inclinaciones and n < len(inclinaciones) else 0.0
        if giro:
            eje = normal
            avance = normalizar_vector(avance * np.cos(giro) + np.cross(eje, avance) * np.sin(giro))
        if inclina:
            _, _, hacia_arriba = marco_desde_avance(avance)
            avance = normalizar_vector(avance * np.cos(inclina) + hacia_arriba * np.sin(inclina))
            _, _, normal = marco_desde_avance(avance)
        salida.append(avance.copy())
    return salida


def montar(programa, angulo=0.0, origen=(0., 0., 0.), giros=None, inclinaciones=None, camino=None):
    fichas, cuerpos, conexiones = [], [], []
    caminos = camino if camino is not None else rumbos(programa, angulo, giros, inclinaciones)
    x = np.asarray(origen, float)
    _, lateral_inicial, _ = marco_desde_avance(caminos[0] if len(caminos) else [1., 0., 0.])
    for n, linea in enumerate(programa):
        token, *operandos = linea.split() if isinstance(linea, str) else linea
        avance = normalizar_vector(caminos[min(n, len(caminos) - 1)])
        _, lateral, normal = marco_desde_avance(avance)
        tamano = ARIDAD_BLOQUE.get(token) or (2 if len(operandos) >= 2 else 1)
        familia = FAMILIA.get(token, 'una')
        cuerpos.append(Cuerpo(x + avance * (LARGO_CUERPO[tamano] / 2 - 35.5), largo=LARGO_CUERPO[tamano],
                              color=COLOR_CUERPO[familia], avance=avance, normal=normal))
        fichas.append(Ficha(token, x + normal * ALTO_OPERACION_MM, avance=avance, normal=normal))
        for k, operando in enumerate(operandos):
            centro = x + avance * PASO_PARAMETRO_MM * (k + 1) + normal * ALTO_PARAMETRO_MM
            fichas.append(Ficha(operando, centro, avance=avance, normal=normal))
        siguiente = x + avance * paso_de(token, len(operandos))
        if n + 1 < len(programa):
            conexiones.append({'tipo': 'conector', 'desde': n, 'hacia': n + 1,
                               'centro': ((x + siguiente) / 2).tolist(), 'avance': avance.tolist()})
        x = siguiente
    return fichas, cuerpos, lateral_inicial, conexiones


class Escena:
    def __init__(self, nombre, programa, camaras, angulo=0.0, sintetica=True, vocabulario=None, trazado=None):
        self.nombre, self.programa, self.sintetica = nombre, list(programa), sintetica
        self.camaras = list(camaras)
        self.vocabulario = vocabulario
        self.fichas, self.cuerpos, self.lateral, self.conexiones = montar(self.programa, angulo, **(trazado or {}))
        self.soportes, self.fondos, self.tes = [], [], []
        self.manos = []
        self.retiradas = set()
        self.plantillas = {}

    def verdad(self):
        return [f.lexema for f in self.visibles()]

    def visibles(self):
        return [f for f in self.fichas if f.id not in self.retiradas and f.lexema not in self.retiradas]

    def retirar(self, *ids):
        self.retiradas |= set(ids)

    def devolver(self, *ids):
        self.retiradas -= set(ids)

    def objetos(self):
        conectores = [Conector(np.asarray(c['centro'], float), c['avance']) for c in self.conexiones
                      if c['tipo'] == 'conector']
        ramas = [p for t in self.tes for p in t.piezas()]
        return (list(self.fondos) + list(self.soportes) + conectores + ramas +
                list(self.cuerpos) + self.visibles() + list(self.manos))

    def piezas_del_programa(self):
        return [p for p in self.objetos() if p.computa]

    def plantilla(self, lexema):
        if lexema in self.plantillas:
            return self.plantillas[lexema]
        imagen = None
        if self.vocabulario is not None:
            for entrada in self.vocabulario.listar():
                if entrada['lexema'] != lexema or not entrada['referencias']:
                    continue
                ruta = self.vocabulario.ruta_foto(entrada['referencias'][0]['foto'])
                imagen = cv2.imread(str(ruta))
                break
        if imagen is None:
            imagen = np.full((160, 160, 3), 245, np.uint8)
            texto = lexema if len(lexema) <= 4 else lexema[:4]
            escala = 2.2 if len(texto) <= 2 else 1.3
            (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, escala, 6)
            cv2.putText(imagen, texto, ((160 - tw) // 2, (160 + th) // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, escala, (30, 30, 30), 6, cv2.LINE_AA)
        self.plantillas[lexema] = imagen
        return imagen


def _pintar_quad(lienzo, esquinas2d, color, borde=None):
    puntos = np.rint(esquinas2d).astype(np.int32)
    cv2.fillConvexPoly(lienzo, puntos, color, cv2.LINE_AA)
    if borde is not None:
        cv2.polylines(lienzo, [puntos], True, borde, 2, cv2.LINE_AA)


def _ajustar_detalle(plantilla, esquinas2d):
    lados = [float(np.linalg.norm(esquinas2d[i] - esquinas2d[(i + 1) % 4])) for i in range(4)]
    objetivo = max(8, int(round(max(lados))))
    alto, ancho = plantilla.shape[:2]
    if objetivo >= max(alto, ancho):
        return plantilla
    factor = objetivo / max(alto, ancho)
    return cv2.resize(plantilla, (max(8, int(round(ancho * factor))), max(8, int(round(alto * factor)))),
                      interpolation=cv2.INTER_AREA)


def _pintar_ficha(lienzo, esquinas2d, plantilla):
    plantilla = _ajustar_detalle(plantilla, esquinas2d)
    alto, ancho = plantilla.shape[:2]
    origen = np.float32([[0, 0], [ancho - 1, 0], [ancho - 1, alto - 1], [0, alto - 1]])
    destino = np.float32(esquinas2d)
    matriz = cv2.getPerspectiveTransform(origen, destino)
    tamano = (lienzo.shape[1], lienzo.shape[0])
    proyectada = cv2.warpPerspective(plantilla, matriz, tamano, flags=cv2.INTER_LINEAR,
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(250, 250, 250))
    cobertura = cv2.warpPerspective(np.full(plantilla.shape[:2], 255, np.uint8), matriz, tamano,
                                    flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    mascara = cobertura > 127
    lienzo[mascara] = proyectada[mascara]


LADO_CAJA_PARAMETRO_MM = 18.0
ALTO_CAJA_PARAMETRO_MM = 12.0
COLOR_OPERACION = (158, 155, 67)
COLOR_GRABADO = (54, 41, 8)
COLOR_CONECTOR_PIEZA = (236, 236, 236)
COLOR_TE_PIEZA = (238, 232, 224)
COLOR_SOPORTE_PIEZA = (170, 186, 196)
FONDO_PARAMETRO = {'numero': (128, 186, 219), 'etiqueta': (210, 198, 164), 'otro': (176, 185, 187)}


def _ejes(avance, lateral, normal, orden):
    base = {'a': avance, 'l': lateral, 'n': normal}
    return np.stack([base[k] for k in orden])


def _colocar(triangulos, origen, avance, lateral, normal, orden='aln'):
    return triangulos @ _ejes(avance, lateral, normal, orden) + np.asarray(origen, float)


def _caja(centro, avance, lateral, normal, largo, ancho, alto):
    u, v, w = avance * largo / 2, lateral * ancho / 2, normal * alto
    base = np.asarray(centro, float)
    p = [base - u - v, base + u - v, base + u + v, base - u + v,
         base - u - v + w, base + u - v + w, base + u + v + w, base - u + v + w]
    caras = [(0, 1, 2, 3), (4, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    tris = []
    for cara in caras:
        if len(cara) == 4:
            a, b, c, d = cara
            tris += [[p[a], p[b], p[c]], [p[a], p[c], p[d]]]
        else:
            a, b, c = cara
            tris += [[p[a], p[b], p[c]]]
    return np.array(tris)


def _cilindro(centro, radio, alto, lados=18):
    base = np.asarray(centro, float)
    angulos = np.linspace(0, 2 * np.pi, lados, endpoint=False)
    aro = np.stack([radio * np.cos(angulos), radio * np.sin(angulos), np.zeros(lados)], axis=1)
    bajo, arriba = base + aro, base + aro + np.array([0., 0., alto])
    tapa = base + np.array([0., 0., alto])
    tris = []
    for i in range(lados):
        j = (i + 1) % lados
        tris += [[bajo[i], bajo[j], arriba[j]], [bajo[i], arriba[j], arriba[i]], [arriba[i], arriba[j], tapa]]
    return np.array(tris)


def _clase_parametro(lexema):
    if lexema.lstrip('-').isdigit() or lexema == 'nil':
        return 'numero'
    return 'etiqueta' if lexema.isalpha() else 'otro'


def escenario_de(escena, detalle=None):
    from plataforma import malla
    from plataforma.rasterizador import Escenario
    rejilla = (detalle or {}).get('rejilla', 0.6)
    fino = (detalle or {}).get('rejilla_grabado', 0.3)
    mundo = Escenario()
    centro_mesa = centro_de(escena.fichas)
    lado = 900.0
    u = np.array([lado, 0., 0.])
    v = np.array([0., lado, 0.])
    raiz = np.array([centro_mesa[0], centro_mesa[1], 0.])
    mundo.agregar(np.array([[raiz - u - v, raiz + u - v, raiz + u + v], [raiz - u - v, raiz + u + v, raiz - u + v]]),
                  COLOR_MESA)
    for fondo in escena.fondos:
        if fondo.imagen is not None:
            mundo.agregar_textura(fondo.esquinas(), fondo.imagen)
        else:
            e = fondo.esquinas()
            mundo.agregar(np.array([[e[0], e[1], e[2]], [e[0], e[2], e[3]]]), fondo.color)
    for cuerpo in escena.cuerpos:
        capacidad = 2 if cuerpo.largo > 75 else 1
        origen = cuerpo.centro - cuerpo.avance * (cuerpo.largo / 2 - 35.5)
        mundo.agregar(_colocar(malla.bloque(capacidad, rejilla), origen,
                               cuerpo.avance, cuerpo.lateral, cuerpo.normal, 'anl'), cuerpo.color)
    for conexion in escena.conexiones:
        if conexion['tipo'] != 'conector':
            continue
        avance = normalizar_vector(conexion['avance'])
        _, lateral, normal = marco_desde_avance(avance)
        asiento = np.asarray(conexion['centro'], float) + normal * 10.5
        mundo.agregar(_colocar(malla.conector(), asiento, avance, lateral, normal, 'anl'), COLOR_CONECTOR_PIEZA)
    for te in escena.tes:
        _, lateral, normal = marco_desde_avance(te.avance)
        asiento = te.centro + normal * 10.5
        mundo.agregar(_colocar(malla.conector(), asiento, te.avance, lateral, normal, 'anl'), COLOR_TE_PIEZA)
        rama = normalizar_vector(te.rama)
        _, lr, nr = marco_desde_avance(rama)
        mundo.agregar(_colocar(malla.conector(), asiento + rama * malla.LARGO_CONECTOR_MM / 2,
                               rama, lr, nr, 'anl'), COLOR_TE_PIEZA)
    for soporte in escena.soportes:
        mundo.agregar(_colocar(malla.cuna(rejilla), soporte.centro,
                               np.array([1., 0., 0.]), np.array([0., 1., 0.]), np.array([0., 0., 1.]), 'anl'),
                      COLOR_SOPORTE_PIEZA)
    for ficha in escena.visibles():
        piezas = malla.operacion(ficha.lexema, rejilla_grabado=fino)
        if piezas is not None:
            cuerpo, grabado = piezas
            mundo.agregar(_colocar(cuerpo, ficha.centro, ficha.avance, ficha.lateral, ficha.normal), COLOR_OPERACION)
            mundo.agregar(_colocar(grabado, ficha.centro, ficha.avance, ficha.lateral, ficha.normal), COLOR_GRABADO)
            continue
        color = FONDO_PARAMETRO[_clase_parametro(ficha.lexema)]
        mundo.agregar(_caja(ficha.centro, ficha.avance, ficha.lateral, ficha.normal,
                            LADO_CAJA_PARAMETRO_MM, LADO_CAJA_PARAMETRO_MM, ALTO_CAJA_PARAMETRO_MM), color)
        cara = ficha.centro + ficha.normal * (ALTO_CAJA_PARAMETRO_MM + 0.12)
        u = ficha.avance * LADO_CAJA_PARAMETRO_MM / 2
        w = ficha.lateral * LADO_CAJA_PARAMETRO_MM / 2
        mundo.agregar_textura([cara - u + w, cara + u + w, cara + u - w, cara - u - w],
                              escena.plantilla(ficha.lexema))
    for mano in escena.manos:
        mundo.agregar(_cilindro(mano.centro, mano.radio, mano.alto), COLOR_MANO)
    return mundo


def render(escena, camara, detalle=None, mundo=None):
    m = camara.modelo()
    if m is None:
        raise ValueError(f'La cámara {camara.id} no tiene una pose utilizable.')
    lienzo, _, _ = (mundo or escenario_de(escena, detalle)).rasterizar(m, camara.resolucion, COLOR_MESA)
    return lienzo


def cuadro(escena, camara, vocabulario, instante, secuencia, mundo=None):
    from plataforma.lectura import leer_cuadro
    imagen = render(escena, camara, mundo=mundo)
    _, lecturas = leer_cuadro(imagen, vocabulario)
    return imagen, {'secuencia': secuencia, 'instante': instante, 'resolucion': list(camara.resolucion),
                    'observaciones': [l['observacion'] for l in lecturas], 'profundidad': None}


def fuentes(escena, vocabulario, instante, secuencia):
    salida, imagenes = [], {}
    mundo = escenario_de(escena)
    for camara in escena.camaras:
        imagen, marco = cuadro(escena, camara, vocabulario, instante, secuencia, mundo=mundo)
        imagenes[camara.id] = imagen
        salida.append({'id': camara.id, 'nombre': camara.nombre, 'estado': 'conectada', 'virtual': True,
                       'pose': camara.pose(), 'intrinsecos': camara.intrinsecos(), 'historial': [marco]})
    return salida, imagenes


def centro_de(fichas):
    if not fichas:
        return np.array([0., 0., 20.])
    puntos = np.array([f.centro for f in fichas])
    return np.array([float(puntos[:, 0].mean()), float(puntos[:, 1].mean()), 20.])


ALTURA_CAMARA_MM = 280.0
FOV_CAMARA = 40.0
PASO_CAMARA_MM = 46.0
DESVIOS_CAMARA_MM = (-15.0, -70.0)
CAMARAS_MAXIMAS = 16


def camaras_por_omision(centro=(60., 0., 20.), fichas=None, fov=FOV_CAMARA, altura=ALTURA_CAMARA_MM,
                        separacion=PASO_CAMARA_MM):
    centro = np.asarray(centro, float)
    if fichas:
        puntos = np.array([f.centro for f in fichas], float)
        minimo, maximo = puntos.min(axis=0), puntos.max(axis=0)
    else:
        minimo = maximo = centro
    altura_mesa = float(maximo[2]) if fichas else float(centro[2])

    def rejilla(a, b):
        extension = float(b - a)
        cuantos = max(1, int(np.ceil(extension / separacion)) + 1)
        if cuantos == 1:
            return [float((a + b) / 2)]
        return [float(a + extension * k / (cuantos - 1)) for k in range(cuantos)]

    xs, ys = rejilla(minimo[0], maximo[0]), rejilla(minimo[1], maximo[1])
    while len(xs) * len(ys) * len(DESVIOS_CAMARA_MM) > CAMARAS_MAXIMAS and (len(xs) > 2 or len(ys) > 2):
        if len(xs) >= len(ys) and len(xs) > 2:
            xs = xs[::2]
        elif len(ys) > 2:
            ys = ys[::2]
        else:
            break
    camaras = []
    for desvio in DESVIOS_CAMARA_MM:
        for y in ys:
            for x in xs:
                mira = np.array([x, y, altura_mesa])
                n = len(camaras) + 1
                camaras.append(Camara('c%d' % n, 'Cámara %d' % n,
                                      mira + [0., desvio, altura], mira, fov))
    return camaras


def cobertura(camara, lado_ficha=LADO_FICHA_MM, ancho_trabajo=640):
    distancia = float(np.linalg.norm(camara.objetivo - camara.centro))
    campo_mm = 2 * distancia * np.tan(np.radians(camara.fov) / 2)
    px_por_mm = ancho_trabajo / campo_mm
    return {'distancia_mm': round(float(distancia), 1), 'campo_mm': round(float(campo_mm), 1),
            'px_por_mm': round(float(px_por_mm), 2), 'ficha_px': round(float(lado_ficha * px_por_mm), 1),
            'suficiente': bool(lado_ficha * px_por_mm >= 35)}


def guardar_camaras(camaras, ruta):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps([c.resumen() for c in camaras], ensure_ascii=False, indent=2), encoding='utf-8')


def cargar_camaras(ruta):
    return [Camara.desde(d) for d in json.loads(Path(ruta).read_text(encoding='utf-8'))]
