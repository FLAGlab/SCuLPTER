import numpy as np

from plataforma.escena_virtual import (PASO_CORTO_MM, Camara, Cuerpo, Escena, Fondo, Mano, Soporte, Te,
                                       camaras_por_omision, centro_de)

PROGRAMA_BASE = ['PUSH a 3', 'ADD a']


def _preparar(programa, vocabulario):
    escena = Escena('', programa, [], vocabulario=vocabulario)
    escena.camaras = camaras_por_omision(centro_de(escena.fichas), escena.fichas)
    return escena


PROGRAMA_EJECUTABLE = ['PUSH a 3', 'PUSH a 5', 'ADD a']


def ejecutable(vocabulario):
    return _preparar(PROGRAMA_EJECUTABLE, vocabulario), lambda escena, paso: None


def completa(vocabulario):
    return _preparar(PROGRAMA_BASE, vocabulario), lambda escena, paso: None


def oculta_un_parametro(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    objetivo = next(f for f in escena.fichas if f.lexema == '3')

    def guion(escena, paso):
        escena.manos = [Mano((objetivo.centro[0], objetivo.centro[1], 0.), 26., 95.)] if paso >= 2 else []
    return escena, guion


def mano_en_movimiento(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    inicio = centro_de(escena.fichas)

    def guion(escena, paso):
        escena.manos = [Mano((inicio[0] - 120 + paso * 24, inicio[1], 0.), 34., 110.)]
    return escena, guion


def bloques_repetidos(vocabulario):
    return _preparar(['PUSH a 3', 'PUSH a 3'], vocabulario), lambda escena, paso: None


def retirada_de_bloque(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    objetivos = {f.id for f in escena.fichas if f.centro[0] > 100}

    def guion(escena, paso):
        escena.retiradas = set(objetivos) if paso >= 5 else set()
    return escena, guion


def retirar_una_de_dos(vocabulario):
    escena = _preparar(['PUSH a 3', 'PUSH a 3'], vocabulario)
    segunda = [f for f in escena.fichas if f.lexema == 'a'][1]

    def guion(escena, paso):
        escena.retiradas = {segunda.id} if paso >= 4 else set()
    return escena, guion


def reaparece_una_ficha(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    literal = next(f for f in escena.fichas if f.lexema == '3')

    def guion(escena, paso):
        escena.retiradas = {literal.id} if 4 <= paso < 9 else set()
    return escena, guion


def desacuerdo_entre_camaras(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    escena.camaras[1].centro = escena.camaras[1].centro + [0., 0., -40.]
    escena.camaras[1].objetivo = escena.camaras[1].objetivo + [70., 0., 0.]
    return escena, lambda escena, paso: None


GUIONES = {
    'completa': (completa, True, 'Programa armado y quieto, sin nada delante.'),
    'oclusion': (oculta_un_parametro, False, 'Una mano tapa el literal 3 desde el paso 2.'),
    'movimiento': (mano_en_movimiento, False, 'Una mano cruza la mesa durante toda la sesión.'),
    'repetidos': (bloques_repetidos, True, 'Dos bloques con el mismo símbolo y los mismos parámetros.'),
    'retirada': (retirada_de_bloque, False, 'Se retira el bloque ADD y su parámetro en el paso 5.'),
    'desacuerdo': (desacuerdo_entre_camaras, True, 'Una cámara apunta desviada; las demás la dejan en minoría.'),
}


def _camaras(escena, **extra):
    escena.camaras = camaras_por_omision(centro_de(escena.fichas), escena.fichas, **extra)
    return escena


def cadena_inclinada(vocabulario):
    escena = Escena('', PROGRAMA_BASE, [], vocabulario=vocabulario,
                    trazado={'inclinaciones': [0.0, np.radians(35)]})
    return _camaras(escena), lambda escena, paso: None


def cadena_vertical(vocabulario):
    escena = Escena('', PROGRAMA_BASE, [], vocabulario=vocabulario,
                    trazado={'inclinaciones': [np.radians(80), 0.0]})
    return _camaras(escena), lambda escena, paso: None


def recorrido_que_regresa(vocabulario):
    programa = ['POP a', 'DUP a', 'NEG a', 'POP a', 'DUP a', 'NEG a']
    escena = Escena('', programa, [], vocabulario=vocabulario,
                    trazado={'giros': [0.0] + [np.radians(60)] * 5})
    return _camaras(escena), lambda escena, paso: None


def union_en_te(vocabulario):
    escena = Escena('', ['POP a', 'DUP a'], [], vocabulario=vocabulario)
    rama = Escena('', ['NEG a'], [], angulo=np.radians(90), vocabulario=vocabulario)
    desplazo = np.array([PASO_CORTO_MM, -PASO_CORTO_MM, 0.])
    for ficha in rama.fichas:
        ficha.centro = ficha.centro + desplazo
    for cuerpo in rama.cuerpos:
        cuerpo.centro = cuerpo.centro + desplazo
    escena.fichas += rama.fichas
    escena.cuerpos += rama.cuerpos
    union = np.array([PASO_CORTO_MM, 0., 6.])
    escena.tes = [Te(union, [1., 0., 0.], [0., -1., 0.])]
    escena.conexiones.append({'tipo': 'te', 'centro': union.tolist(),
                              'entradas': ['vastago_plano', 'rama'], 'salida': 'vastago_esferico'})
    return _camaras(escena), lambda escena, paso: None


def montajes_separados(vocabulario):
    escena = Escena('', ['POP a', 'DUP a'], [], vocabulario=vocabulario)
    otro = Escena('', ['NEG a'], [], vocabulario=vocabulario)
    desplazo = np.array([0., 260., 0.])
    for ficha in otro.fichas:
        ficha.centro = ficha.centro + desplazo
    for cuerpo in otro.cuerpos:
        cuerpo.centro = cuerpo.centro + desplazo
    escena.fichas += otro.fichas
    escena.cuerpos += otro.cuerpos
    return _camaras(escena), lambda escena, paso: None


def bloque_tapa_bloque(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    objetivo = next(f for f in escena.fichas if f.lexema == '3')
    estorbo = Cuerpo(objetivo.centro + [0., 0., 46.], largo=60., ancho=34., alto=16.,
                     color=(214, 206, 226))
    escena.cuerpos.append(estorbo)
    return escena, lambda escena, paso: None


def fondo_impreso(vocabulario, dificil=False):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    centro = centro_de(escena.fichas)
    escena.fondos = [Fondo([centro[0], centro[1] + 62., 0.2], 240., 150., textura='hoja', dificil=dificil)]
    return escena, lambda escena, paso: None


def fondo_dificil(vocabulario):
    return fondo_impreso(vocabulario, dificil=True)


def con_soportes(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    escena.soportes = [Soporte([f.centro[0], f.centro[1] + 26., 0.]) for f in escena.fichas[::2]]
    return escena, lambda escena, paso: None


GUIONES.update({
    'inclinada': (cadena_inclinada, False, 'Cadena con el segundo bloque inclinado 35°.'),
    'vertical': (cadena_vertical, False, 'Cadena que sube casi vertical desde el primer bloque.'),
    'regresa': (recorrido_que_regresa, False, 'Seis bloques girando 60° que vuelven sobre sí mismos.'),
    'te': (union_en_te, False, 'Dos ramas que confluyen en un conector en T.'),
    'separados': (montajes_separados, False, 'Dos montajes distintos sobre la misma mesa.'),
    'bloque_tapa': (bloque_tapa_bloque, False, 'Un bloque suelto tapa el literal desde arriba.'),
    'fondo': (fondo_impreso, True, 'Hoja impresa con texto junto al montaje, que no es parte del programa.'),
    'fondo_dificil': (fondo_dificil, False, 'Hoja con recuadros y dígitos impresos que imitan fichas.'),
    'soportes': (con_soportes, True, 'Cuñas y bases junto a los bloques que no computan.'),
    'retirar_una': (retirar_una_de_dos, False, 'Dos fichas "a" iguales; se retira solo la segunda.'),
    'reaparece': (reaparece_una_ficha, False, 'El literal desaparece en el paso 4 y vuelve en el 9.'),
    'ejecutable': (ejecutable, True, 'Programa que Scala sí puede ejecutar: PUSH a 3 · PUSH a 5 · ADD a.'),
})


PROGRAMA_CONDICION = ['PUSH a -1', '? a', 'PUSH b 99', 'PUSH c 7']
PROGRAMA_BUCLE = ['PUSH a 3', 'SUB a 1', 'DUP a', '? a', 'JMP -3']


def ejemplo_condicion(vocabulario):
    return _preparar(PROGRAMA_CONDICION, vocabulario), lambda escena, paso: None


def ejemplo_bucle(vocabulario):
    return _preparar(PROGRAMA_BUCLE, vocabulario), lambda escena, paso: None


GUIONES.update({
    'ejemplo_condicion': (ejemplo_condicion, True,
                          'Ejemplo «condicion»: salto condicional con tres pilas y un literal negativo.'),
    'ejemplo_bucle': (ejemplo_bucle, False,
                      'Ejemplo «bucle»: cinco bloques con un JMP que vuelve atrás.'),
})

EJEMPLOS = {'minimo': 'ejecutable', 'condicion': 'ejemplo_condicion', 'bucle': 'ejemplo_bucle'}
EJEMPLOS_SIN_ESCENA = {'fibonacci': 'Quince instrucciones: no cabe en la mesa que el gemelo representa hoy.'}


def vistas_contradictorias(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    objetivo = escena.fichas[0].centro
    escena.camaras = list(escena.camaras) + [
        Camara('enfrente', 'Enfrente', [objetivo[0], 190., 150.], objetivo, 45.)]
    return escena, lambda escena, paso: None


def cobertura_parcial(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    escena.camaras = [c for c in escena.camaras if c.centro[0] < 60][:3]
    return escena, lambda escena, paso: None


def sin_encuadrar_el_segundo(vocabulario):
    """Campo estrecho sobre el primer bloque: el segundo no deja ni un píxel en ninguna cámara.
    Ninguna mejora del detector puede recuperar evidencia que nunca se capturó, así que este
    caso solo queda pendiente si se comprueba que la continuación de la cadena está cubierta."""
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    primeras = [f for f in escena.fichas if f.centro[0] < 60]
    escena.camaras = camaras_por_omision(centro_de(primeras), primeras, fov=18.0, altura=200.0)
    return escena, lambda escena, paso: None


def dos_webcams(vocabulario):
    escena = _preparar(PROGRAMA_BASE, vocabulario)
    centro = centro_de(escena.fichas)
    escena.camaras = [Camara('web1', 'Webcam izquierda', [centro[0] - 55, -45., 300.], [centro[0] - 20, 0., 30.], 52.),
                      Camara('web2', 'Webcam derecha', [centro[0] + 55, -45., 300.], [centro[0] + 20, 0., 30.], 52.)]
    return escena, lambda escena, paso: None


def dos_webcams_corta(vocabulario):
    """La disposición de dos webcams que sí lee un programa entero, hallada barriendo separación,
    retroceso, altura y campo con `herramientas/ensayo_dos_webcams.py`. Lo que la desbloquea no
    es resolución: es un campo lo bastante ancho para cubrir también los huecos donde la cadena
    podría seguir. Sube a 380 mm y baja a 2.5 px/mm, por debajo de los 3.1 del banco de ocho."""
    escena = _preparar(['PUSH a 3'], vocabulario)
    centro = centro_de(escena.fichas)
    mira = [float(centro[0]), float(centro[1]), 30.]
    escena.camaras = [
        Camara('web1', 'Webcam izquierda', [centro[0] - 30., -45., 380.], mira, 40.),
        Camara('web2', 'Webcam derecha', [centro[0] + 30., -45., 380.], mira, 40.)]
    return escena, lambda escena, paso: None


def una_instruccion(vocabulario):
    return _preparar(['PUSH a 3'], vocabulario), lambda escena, paso: None


def dos_pilas(vocabulario):
    return _preparar(['PUSH a 3', 'PUSH b 5', 'MOV a b'], vocabulario), lambda escena, paso: None


GUIONES.update({
    'contradiccion': (vistas_contradictorias, True,
                      'Una cámara enfrente, al otro lado de la mesa, ve la flecha girada; las demás la dejan en minoría.'),
    'cobertura_parcial': (cobertura_parcial, False,
                          'Tres cámaras a un solo lado; del segundo bloque solo llega evidencia parcial.'),
    'sin_encuadrar': (sin_encuadrar_el_segundo, False,
                      'Campo estrecho sobre el primer bloque: del segundo no se captura ni un píxel.'),
    'dos_webcams': (dos_webcams, False, 'Solo dos webcams sobre la cadena de dos bloques.'),
    'dos_webcams_corta': (dos_webcams_corta, True,
                          'Dos webcams a 380 mm y 40° de campo sobre una sola instrucción.'),
    'una_instruccion': (una_instruccion, True, 'Una sola instrucción: PUSH a 3.'),
    'dos_pilas': (dos_pilas, True, 'Dos pilas: PUSH a 3 · PUSH b 5 · MOV a b.'),
})


EXPECTATIVAS = {
    'una_instruccion': None,
    'completa': None,
    'ejecutable': None,
    'dos_pilas': None,
    'repetidos': None,
    'fondo': None,
    'soportes': None,
    'desacuerdo': None,
    'contradiccion': None,
    'ejemplo_condicion': None,
    'oclusion': 'una mano tapa el literal y las dos filas de cámaras lo pierden a la vez',
    'movimiento': 'la mano cruza la mesa, así que el montaje nunca se queda quieto los 0.8 s',
    'bloque_tapa': 'un bloque suelto tapa el literal desde arriba',
    'retirada': 'falta el segundo bloque entero desde el paso 5',
    'retirar_una': 'de las dos fichas iguales desaparece una',
    'reaparece': 'el literal falta entre los pasos 4 y 8',
    'fondo_dificil': 'la hoja impresa aporta recuadros con dígitos que no son fichas del montaje',
    'cobertura_parcial': 'tres cámaras a un solo lado: del segundo bloque solo hay evidencia parcial',
    'sin_encuadrar': 'ninguna cámara encuadra dónde iría el segundo bloque',
    'dos_webcams': 'con dos webcams el campo no cubre a la vez las dos fichas contiguas y los '
                   'huecos donde la cadena de dos bloques podría seguir',
    'dos_webcams_corta': None,
    'inclinada': 'el bloque inclinado 35° deja los parámetros sin una dirección de lectura inequívoca',
    'vertical': 'la cadena vertical saca las fichas de la banda de planos declarada',
    'regresa': 'de los seis bloques girados solo se localizan dos: se informa como grupos sin '
               'unión y el ciclo no llega a diagnosticarse',
    'te': 'solo se localizan dos de los tres bloques, así que no sale una única cadena de '
          'operaciones; la confluencia en T no llega a diagnosticarse',
    'separados': 'son dos montajes distintos y se informan como grupos sin unión, aunque de los '
                 'tres bloques solo se localicen dos',
    'ejemplo_bucle': 'de los cinco bloques se localizan cuatro y la cadena se parte en grupos sin unión',
}

assert set(EXPECTATIVAS) == set(GUIONES), sorted(set(EXPECTATIVAS) ^ set(GUIONES))
_DISCREPAN = [n for n in GUIONES if GUIONES[n][1] != (EXPECTATIVAS[n] is None)]
assert not _DISCREPAN, f'GUIONES y EXPECTATIVAS no concuerdan en {_DISCREPAN}'

RAPIDAS = ['una_instruccion', 'completa', 'repetidos', 'desacuerdo', 'soportes',
           'dos_webcams_corta', 'cobertura_parcial', 'sin_encuadrar', 'dos_webcams',
           'oclusion', 'retirada', 'separados', 'te', 'fondo_dificil']
assert not set(RAPIDAS) - set(GUIONES)
