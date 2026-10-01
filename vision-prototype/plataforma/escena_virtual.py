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
CONFIGURACION_PASOS = {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM, 'paso_2_mm': PASO_LARGO_MM, 'medido': True}


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


def render(escena, camara):
    m = camara.modelo()
    if m is None:
        raise ValueError(f'La cámara {camara.id} no tiene una pose utilizable.')
    ancho, alto = camara.resolucion
    lienzo = np.full((alto, ancho, 3), COLOR_MESA, np.uint8)
    from plataforma.geometria_fusion import proyectar
    dibujables = []
    for objeto in escena.objetos():
        esquinas = objeto.esquinas()
        pixeles, z = proyectar(m, esquinas)
        if np.any(z <= 1) or not np.isfinite(pixeles).all():
            continue
        if np.max(np.abs(pixeles)) > 20000:
            continue
        dibujables.append((float(np.mean(z)), objeto, pixeles))
    for _, objeto, pixeles in sorted(dibujables, key=lambda d: (-d[0], isinstance(d[1], Ficha))):
        if isinstance(objeto, Ficha):
            area = abs(cv2.contourArea(np.rint(pixeles).astype(np.int32)))
            if area < 60:
                continue
            _pintar_ficha(lienzo, pixeles, escena.plantilla(objeto.lexema))
        elif isinstance(objeto, Fondo) and objeto.imagen is not None:
            _pintar_ficha(lienzo, pixeles, objeto.imagen)
        elif isinstance(objeto, Mano):
            _pintar_quad(lienzo, pixeles, COLOR_MANO)
        else:
            _pintar_quad(lienzo, pixeles, objeto.color, objeto.borde)
    return lienzo


def cuadro(escena, camara, vocabulario, instante, secuencia):
    from plataforma.lectura import leer_cuadro
    imagen = render(escena, camara)
    _, lecturas = leer_cuadro(imagen, vocabulario)
    return imagen, {'secuencia': secuencia, 'instante': instante, 'resolucion': list(camara.resolucion),
                    'observaciones': [l['observacion'] for l in lecturas], 'profundidad': None}


def fuentes(escena, vocabulario, instante, secuencia):
    salida, imagenes = [], {}
    for camara in escena.camaras:
        imagen, marco = cuadro(escena, camara, vocabulario, instante, secuencia)
        imagenes[camara.id] = imagen
        salida.append({'id': camara.id, 'nombre': camara.nombre, 'estado': 'conectada', 'virtual': True,
                       'pose': camara.pose(), 'intrinsecos': camara.intrinsecos(), 'historial': [marco]})
    return salida, imagenes


def centro_de(fichas):
    if not fichas:
        return np.array([0., 0., 20.])
    puntos = np.array([f.centro for f in fichas])
    return np.array([float(puntos[:, 0].mean()), float(puntos[:, 1].mean()), 20.])


def camaras_por_omision(centro=(60., 0., 20.), fichas=None, fov=47., altura=138., separacion=35.):
    centro = np.asarray(centro, float)
    xs = sorted(f.centro[0] for f in fichas) if fichas else [centro[0]]
    campo = 2 * altura * np.tan(np.radians(fov) / 2)
    extension = xs[-1] - xs[0]
    if extension <= campo / 2:
        focos = [float(np.mean(xs))]
    else:
        cuantos = int(np.ceil(extension / (campo * .75)))
        primero, ultimo = xs[0] + campo / 4, xs[-1] - campo / 4
        focos = [float(primero + (ultimo - primero) * k / max(1, cuantos - 1)) for k in range(max(2, cuantos))]
    camaras = []
    for k, x in enumerate(focos):
        mira = np.array([float(x), centro[1], centro[2]])
        for j, dy in enumerate((-separacion, separacion)):
            camaras.append(Camara('par%d%s' % (k + 1, 'ab'[j]), 'Par %d %s' % (k + 1, 'izquierda' if j == 0 else 'derecha'),
                                  mira + [0., dy, altura], mira, fov))
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
