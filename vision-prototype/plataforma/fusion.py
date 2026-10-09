import copy
import itertools
import json
import threading

import numpy as np

from adjacency import ARIDAD_BLOQUE, instrucciones as reconstruir_3d, separar, grafo, recorridos, repartir, pasos_admisibles, recorridos_coherentes, coherencia_con_parametros
from plataforma.geometria_fusion import modelo, triangular, proyectar, nube, situar_en_nube, oculto
from plataforma.vocabulario import OPERACIONES
from clasificador_simbolos import SIN_LEER, aceptar_candidatos


ARIDADES = {op: (1, 2) if op in {'CMP', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD'} else (2, 2) if op in {'PUSH', 'MOV'} else (1, 1) for op in OPERACIONES}
CONFIGURACION = {'modo': 'fusion', 'paso_mm': 60., 'paso_2_mm': None, 'medido': False,
                 'plano_min_mm': None, 'plano_max_mm': None, 'area_trabajo': None}


def ganador(candidatos):
    return aceptar_candidatos(candidatos)


def observada(o):
    """La observación concreta que la fusión usó, tal como la entregó la cámara. El panel por
    cámara se dibuja desde aquí: ni el lexema ni los puntajes se rellenan desde el resultado
    fusionado ni desde la región más cercana."""
    return {'lexema': o['lexema'], 'x': float(o['x']), 'y': float(o['y']),
            'secuencia': o.get('secuencia'), 'caja': [float(v) for v in o['caja']],
            'calidad': round(float(o.get('calidad', 1.)), 3),
            'candidatos': [{'lexema': c['lexema'], 'nombre': c.get('nombre', c['lexema']),
                            'puntaje': round(float(c['puntaje']), 3)} for c in o['candidatos'][:3]]}


RADIO_RACIMO = 9.0
ALCANCE_MISMO_SIMBOLO = 45.0
FRESCURA_S = .75
VENTANA_SINCRONIA_S = .12
TOLERANCIA_HUECO_S = .35
RESPALDO_MINIMO = 0.5
OLVIDO_S = 1.5
HUELLA_MM = 24.0
REJILLA_HUELLA = 3
PX_POR_MM_TESTIGO = 2.0


def sincronizar(fuentes, ahora):
    """Cámaras utilizables en esta captura, con un cuadro por cámara.

    Entra una cámara conectada, con calibración común y con imagen de menos de FRESCURA_S. De su
    historial se elige el cuadro más cercano a la captura más nueva, y solo si cae dentro de
    VENTANA_SINCRONIA_S: una vista rezagada se deja fuera con su aviso en vez de sustituirla por
    un cuadro viejo, porque fusionar instantes distintos mueve las piezas.

    Devuelve (cuadros, avisos).
    """
    disponibles, avisos = [], []
    for fuente in fuentes:
        if fuente['estado'] != 'conectada' or not fuente['historial']:
            continue
        ultimo = fuente['historial'][-1]
        m = modelo(fuente.get('intrinsecos') or ultimo.get('intrinsecos'), fuente.get('pose'), ultimo['resolucion'])
        if m is None:
            avisos.append(f"{fuente['nombre']}: falta calibración común o cambió la resolución.")
        elif 0 <= ahora-ultimo['instante'] <= FRESCURA_S:
            disponibles.append({**fuente, 'modelo': m})
    cuadros = []
    if disponibles:
        objetivo = max(f['historial'][-1]['instante'] for f in disponibles)
        for f in disponibles:
            cuadro = min(f['historial'], key=lambda c: abs(c['instante']-objetivo))
            if abs(cuadro['instante']-objetivo) <= VENTANA_SINCRONIA_S:
                cuadros.append({**cuadro, 'id': f['id'], 'modelo': f['modelo']})
            else:
                avisos.append(f"{f['nombre']}: imagen fuera de la ventana de sincronización.")
    return cuadros, avisos


def asociar_unicos(costes, limite, margen):
    candidatos = []
    for i in range(costes.shape[0]):
        orden = np.argsort(costes[i])
        if not len(orden) or costes[i, orden[0]] > limite:
            continue
        j = int(orden[0])
        if len(orden) > 1 and costes[i, orden[1]]-costes[i, j] < margen:
            continue
        columna = np.argsort(costes[:, j])
        if columna[0] != i or (len(columna) > 1 and costes[columna[1], j]-costes[i, j] < margen):
            continue
        candidatos.append((i, j))
    return candidatos


def puede_ejecutar(resultado):
    if not resultado or not resultado.get('estable') or not resultado.get('compatible'):
        return False
    instrucciones = resultado.get('instrucciones') or []
    if not instrucciones:
        return False
    for i in instrucciones:
        rango = ARIDADES.get(i.get('token'))
        operandos = i.get('operandos')
        if not rango or not isinstance(operandos, list) or SIN_LEER in operandos:
            return False
        if not rango[0] <= len(operandos) <= rango[1]:
            return False
    return True


def componentes(enlaces):
    vistos, grupos = set(), []
    for inicio in enlaces:
        if inicio in vistos:
            continue
        pila, grupo = [inicio], []
        while pila:
            actual = pila.pop()
            if actual in vistos:
                continue
            vistos.add(actual)
            grupo.append(actual)
            pila.extend(v for v in enlaces[actual] if v not in vistos)
        grupos.append(sorted(grupo))
    return grupos


def diagnosticar_grafo(operaciones, enlaces):
    grados = {i: len(v) for i, v in enlaces.items()}
    grupos = componentes(enlaces)
    problemas = []
    if len(grupos) > 1:
        tamanos = ', '.join(str(len(g)) for g in grupos)
        problemas.append(f'Hay {len(grupos)} grupos de bloques sin unión entre sí ({tamanos} bloques). '
                         'Si son montajes distintos, sepáralos; si deberían ir unidos, revisa las conexiones.')
    ramificados = [i for i, g in grados.items() if g > 2]
    if ramificados:
        detalle = '; '.join(f'{operaciones[i][0]} con {grados[i]} vecinos' for i in ramificados)
        problemas.append(f'Confluyen más de dos bloques en un punto ({detalle}). Puede ser un conector en T, '
                         'que el lenguaje admite para unir dos caminos en uno, pero la distancia entre bloques '
                         'no dice cuál rama entra y cuál sale. La lectura queda pendiente.')
    sueltos = [i for i, g in grados.items() if g == 0]
    if sueltos and len(operaciones) > 1:
        problemas.append(f'{len(sueltos)} bloque' + ('' if len(sueltos) == 1 else 's') +
                         ' sin ninguna unión a la cadena.')
    if not problemas and list(grados.values()).count(1) != 2:
        problemas.append('El recorrido se cierra sobre sí mismo o no tiene extremos claros. '
                         'Un ciclo físico es válido en el lenguaje, pero sin evidencia de por dónde empieza '
                         'la lectura queda pendiente.')
    return problemas


def huella(centro, rumbo, lado=HUELLA_MM, rejilla=REJILLA_HUELLA):
    """Puntos que cubren el sitio que ocuparía la ficha de operación de un bloque más.

    Se devuelve una rejilla y no solo las esquinas porque la cobertura se acredita por **unión**
    de vistas: a cada punto le basta una cámara que lo encuadre con resolución suficiente y no
    vea nada ahí. Exigir que una sola cámara abarque la huella entera descartaría dos vistas
    parciales que juntas la cubren."""
    rumbo = np.asarray(rumbo, float)
    plano = np.array([rumbo[0], rumbo[1], 0.])
    plano = plano/np.linalg.norm(plano) if np.linalg.norm(plano) > 1e-6 else np.array([1., 0., 0.])
    lateral = np.cross(np.array([0., 0., 1.]), plano)
    pasos = np.linspace(-lado/2, lado/2, rejilla)
    return [centro + plano*a + lateral*b for a in pasos for b in pasos]


def continuaciones(instrucciones, pasos):
    """Dónde iría un bloque más, en cada extremo libre de la cadena leída.

    Devuelve un grupo de puntos por extremo, no uno solo, porque el sitio exacto no se conoce:
    el paso puede ser el corto o el largo, y la dirección de una cadena de un único bloque se
    estima desde sus fichas de parámetro, que están más bajas que la ficha de operación y la
    inclinan hacia abajo. Se muestrea también la dirección aplanada y la altura de la propia
    ficha de operación. Un extremo cuenta como cubierto si alguna cámara encuadra alguno de sus
    puntos, y como ocupado si hay tinta sin resolver sobre alguno: ante la duda, pendiente.

    Si la cadena se cierra sobre sí misma no hay extremos libres y no hay nada que comprobar."""
    if any(i.get('virtual') and i.get('destino') is not None for i in instrucciones):
        return []
    reales = [i for i in instrucciones
              if not i.get('virtual') and i.get('posicion') and i.get('direccion')]
    if not reales:
        return []
    admisibles = sorted({float(p) for p in (pasos if np.ndim(pasos) else [pasos])})

    def pasos_del_bloque(instruccion):
        """El tamaño del bloque del extremo fija a qué distancia se engancharía el siguiente.
        Para CMP y las aritméticas la aridad no lo dice, pero el número de parámetros observados
        sí: un ADD con un parámetro es un bloque corto. Es evidencia, no suposición."""
        if len(admisibles) < 2:
            return admisibles
        tamano = ARIDAD_BLOQUE.get(instruccion['token'])
        if tamano is None:
            cuantos = len(instruccion.get('operandos') or [])
            tamano = 2 if cuantos >= 2 else 1 if cuantos == 1 else None
        if tamano is None:
            return admisibles
        return [admisibles[0] if tamano == 1 else admisibles[-1]]

    grupos = []
    for instruccion, signo in ((reales[0], -1.), (reales[-1], 1.)):
        origen = np.asarray(instruccion['posicion'], float)
        recta = np.asarray(instruccion['direccion'], float)
        rumbos = [recta]
        plano = np.array([recta[0], recta[1], 0.])
        if abs(recta[2]) > .05 and np.linalg.norm(plano) > 1e-6:
            rumbos.append(plano/np.linalg.norm(plano))
        sitios = []
        for rumbo in rumbos:
            for paso in pasos_del_bloque(instruccion):
                destino = origen + signo*rumbo*paso
                for punto in (destino, np.array([destino[0], destino[1], origen[2]])):
                    if not any(np.linalg.norm(punto - previo) < 1.0 for previo, _ in sitios):
                        sitios.append((punto, rumbo))
        grupos.append(sitios)
    return grupos


def pasos_medidos(config):
    return pasos_admisibles([config.get('paso_mm'), config.get('paso_2_mm')])


def reconstruir(piezas, paso):
    puntos = [(p['lexema'], p['posicion']) for p in piezas]
    ops = [p for p in piezas if p['lexema'] in OPERACIONES]
    avisos = []
    if not ops:
        return [], ['Todavía no hay operaciones localizadas.']
    operaciones, parametros, _ = separar(puntos)
    enlaces = grafo(operaciones, paso)
    grados = [len(v) for v in enlaces.values()]
    if len(ops) > 1:
        diagnostico = diagnosticar_grafo(operaciones, enlaces)
        if diagnostico:
            return [], diagnostico
    todos = recorridos(enlaces)
    coherentes = recorridos_coherentes(operaciones, todos, paso)
    if not coherentes:
        return [], ['Las distancias no encajan con el tamaño de los bloques en ningún sentido de lectura. Revisa los dos pasos medidos y las uniones.']
    evaluadas = []
    for orden, destino in coherentes:
        grupos, puntaje, _ = repartir(operaciones, orden, destino, parametros)
        encaja, dudosas = coherencia_con_parametros(operaciones, orden, destino,
                                                    {i: len(grupos[i]) for i in orden}, paso)
        if encaja:
            evaluadas.append((puntaje, orden, dudosas))
    if not evaluadas:
        return [], ['Las distancias no corresponden a los parámetros observados en ningún sentido de lectura. Revisa los dos pasos medidos, las fichas y las uniones.']
    evaluadas.sort(key=lambda e: e[0])
    alternativas = [(puntaje, orden) for puntaje, orden, _ in evaluadas]
    sin_confirmar = evaluadas[0][2]
    if len(coherentes) < len(todos):
        libre = min((repartir(operaciones, orden, destino, parametros)[1], orden) for orden, destino in todos)
        if libre[1] != alternativas[0][1]:
            avisos.append('El tamaño de los bloques contradice la disposición de las fichas: en el sentido que sugieren los parámetros, una distancia no corresponde al bloque que iría delante.')
    if len(alternativas) > 1:
        a, b = alternativas[:2]
        if a[1] != b[1] and a[0][:2] == b[0][:2] and abs(a[0][2]-b[0][2]) < 5:
            avisos.append('La dirección de lectura tiene dos alternativas demasiado parecidas.')
    instrucciones, advertencias = reconstruir_3d(puntos, paso_mm=paso)
    if len(ops) == 1 and parametros:
        origen = np.asarray(ops[0]['posicion'])
        vectores = [p-origen for _, p in parametros]
        eje = max(vectores, key=np.linalg.norm)
        if np.linalg.norm(eje) > 1:
            eje = eje/np.linalg.norm(eje)
            distancias = sorted(float(np.dot(v, eje)) for v in vectores)
            if any(d < 5 for d in distancias) or any(np.linalg.norm(v-np.dot(v, eje)*eje) > 8 for v in vectores) or any(b-a < 5 for a, b in zip(distancias, distancias[1:])):
                avisos.append('Los parámetros no definen una dirección de lectura inequívoca.')
            instrucciones[0]['direccion'] = eje.tolist()
    if sin_confirmar:
        avisos.append(f'{len(sin_confirmar)} unión' + ('' if len(sin_confirmar) == 1 else 'es') +
                      ' sin confirmar: no se observaron parámetros suficientes para saber el tamaño del bloque que va delante.')
    if advertencias:
        avisos.append('No se puede confirmar la dirección, la unión de un parámetro o la continuidad del montaje.')
    if len([i for i in instrucciones if not i['virtual']]) != len(ops) or any(i['virtual'] for i in instrucciones):
        avisos.append('No se ha reconstruido una única cadena de operaciones.')
    for n, i in enumerate(instrucciones, 1):
        minimo, maximo = ARIDADES.get(i['token'], (1, 2))
        if not minimo <= len(i['operandos']) <= maximo:
            avisos.append(f'Instrucción {n}: faltan parámetros o su asociación es ambigua.')
        i['conexion_estimada'] = True
    return instrucciones, avisos


def localizar(obs, modelos, cuadros, en_volumen):
    """Sitúa cada observación en 3D y agrupa las que son la misma pieza vista por varias cámaras.

    Dos vías, en este orden: la nube de profundidad de un sensor RGB-D y la triangulación de
    pares de observaciones compatibles entre dos cámaras. Los pares se agrupan en racimos por
    cercanía, se prefiere el racimo con más cámaras de respaldo y se exige al menos dos vistas
    por pieza. `en_volumen` descarta lo que cae fuera de la banda del plano de las fichas.

    Devuelve (grupos, usadas): los grupos localizados y los índices de `obs` ya consumidos.
    """
    medidas, usadas = [], set()
    nubes = [(c['id'], nube(c['modelo'], c['profundidad'])) for c in cuadros if c['profundidad'] is not None]
    proyecciones = {(cid, cam): proyectar(m, pts) for cid, pts in nubes if len(pts) for cam, m in modelos.items()}
    for n, o in enumerate(obs):
        puntos = []
        sensores = set()
        for cid, pts in nubes:
            if not len(pts):
                continue
            p = situar_en_nube(modelos[o['camara']], o, pts, proyecciones[cid, o['camara']])
            if p is not None:
                puntos.append(p)
                sensores.add(cid)
        if puntos and max(np.linalg.norm(p-np.mean(puntos, axis=0)) for p in puntos) <= 8:
            medidas.append({'posicion': np.mean(puntos, axis=0), 'obs': [n], 'sensores': sensores, 'metodo': 'profundidad'})
            usadas.add(n)
    sueltos = []
    for ca, cb in itertools.combinations(modelos, 2):
        for na in [i for i, o in enumerate(obs) if o['camara'] == ca and i not in usadas]:
            for nb in [i for i, o in enumerate(obs) if o['camara'] == cb and i not in usadas]:
                a, b = obs[na], obs[nb]
                ga, gb = ganador(a['candidatos']), ganador(b['candidatos'])
                if ga and gb and (ga in OPERACIONES) != (gb in OPERACIONES):
                    continue
                if ga and gb and ga != gb:
                    continue
                par = triangular(modelos[ca], [a['x'], a['y']], modelos[cb], [b['x'], b['y']])
                if par is not None and en_volumen(par[0]):
                    sueltos.append({'posicion': par[0], 'obs': (na, nb), 'error': par[1]})
    racimos = []
    for voto in sorted(sueltos, key=lambda v: v['error']):
        for r in racimos:
            if np.linalg.norm(r['centro']-voto['posicion']) < RADIO_RACIMO:
                r['votos'].append(voto)
                r['centro'] = np.median([v['posicion'] for v in r['votos']], axis=0)
                break
        else:
            racimos.append({'centro': voto['posicion'], 'votos': [voto]})
    def respaldo(r):
        return len({obs[n]['camara'] for v in r['votos'] for n in v['obs']})
    for r in sorted(racimos, key=lambda r: (-respaldo(r), np.median([v['error'] for v in r['votos']]))):
        propios = [n for v in r['votos'] for n in v['obs'] if n not in usadas]
        por_camara = {}
        for n in propios:
            por_camara.setdefault(obs[n]['camara'], n)
        if len(por_camara) < 2:
            continue
        elegidos = sorted(por_camara.values())
        centro = np.median([v['posicion'] for v in r['votos']
                            if all(n in elegidos for n in v['obs'])] or [r['centro']], axis=0)
        medidas.append({'posicion': centro, 'obs': elegidos,
                        'sensores': set(por_camara), 'metodo': 'triangulacion'})
        usadas.update(elegidos)
    grupos = []
    for med in medidas:
        camaras = {obs[i]['camara'] for i in med['obs']}
        cercanos = [g for g in grupos if np.linalg.norm(g['posicion']-med['posicion']) < 8 and not camaras & {obs[i]['camara'] for i in g['obs']}]
        if len(cercanos) == 1:
            g = cercanos[0]
            g['posicion'] = (g['posicion']*len(g['obs'])+med['posicion']*len(med['obs']))/(len(g['obs'])+len(med['obs']))
            g['obs'] += med['obs']
            g['sensores'] |= med['sensores']
        else:
            grupos.append(med)
    return grupos, usadas


def asociar_restantes(grupos, usadas, obs, modelos):
    """Añade a los grupos ya localizados las observaciones que quedaron sin usar.

    Primero por reproyección, exigiendo correspondencia única y con margen (`asociar_unicos`).
    Después, para las que siguen libres y sí tienen lexema, por coincidencia de símbolo dentro
    de ALCANCE_MISMO_SIMBOLO y solo si el segundo candidato queda lo bastante lejos: una ficha
    repetida y ambigua se deja suelta antes que asignarla mal.

    Modifica `grupos` y `usadas` en el sitio.
    """
    for cam, m in modelos.items():
        indices = [i for i, o in enumerate(obs) if i not in usadas and o['camara'] == cam]
        elegibles = [g for g in grupos if cam not in {obs[i]['camara'] for i in g['obs']}]
        costes = np.full((len(elegibles), len(indices)), np.inf)
        for i, g in enumerate(elegibles):
            uv, z = proyectar(m, [g['posicion']])
            if z[0] > 0:
                for j, n in enumerate(indices):
                    costes[i, j] = np.linalg.norm(uv[0]-[obs[n]['x'], obs[n]['y']])
        for i, j in asociar_unicos(costes, 5, 2):
            elegibles[i]['obs'].append(indices[j])
            usadas.add(indices[j])
    for cam, m in modelos.items():
        libres = [i for i, o in enumerate(obs)
                  if i not in usadas and o['camara'] == cam and o['lexema'] != SIN_LEER]
        for n in libres:
            mejores = []
            for g in grupos:
                if cam in {obs[i]['camara'] for i in g['obs']}:
                    continue
                leidos = [obs[i]['lexema'] for i in g['obs'] if obs[i]['lexema'] != SIN_LEER]
                if not leidos or max(set(leidos), key=leidos.count) != obs[n]['lexema']:
                    continue
                uv, z = proyectar(m, [g['posicion']])
                if z[0] <= 0:
                    continue
                mejores.append((float(np.linalg.norm(uv[0]-[obs[n]['x'], obs[n]['y']])), g))
            mejores.sort(key=lambda par: par[0])
            if not mejores or mejores[0][0] > ALCANCE_MISMO_SIMBOLO:
                continue
            if len(mejores) > 1 and mejores[1][0]-mejores[0][0] < ALCANCE_MISMO_SIMBOLO:
                continue
            mejores[0][1]['obs'].append(n)
            usadas.add(n)

# Qué acreditan las cámaras sobre un sitio de la mesa. Las tres se responden solo con los
# cuadros de esta captura: ninguna usa el estado del seguimiento.
def encuadran(cuadros, punto):
    cuantas = 0
    for c in cuadros:
        uv, z = proyectar(c['modelo'], [punto])
        ancho, alto = c['resolucion']
        if z[0] > 0 and 0 <= uv[0][0] < ancho and 0 <= uv[0][1] < alto:
            cuantas += 1
    return cuantas

def ocupacion(c):
    if 'ocupacion' not in c:
        cajas = [[float(v) for v in caja] for caja in (c.get('tinta') or [])]
        cajas += [[float(v) for v in o['caja']] for o in c['observaciones'] if o.get('caja')]
        c['ocupacion'] = cajas
    return c['ocupacion']

def acredita_vacio(cuadros, punto, rumbo):
    """¿Las cámaras acreditan que ese sitio está vacío?

    No basta con muestrear un punto y no encontrar tinta: eso también pasa cuando ninguna
    cámara mira ahí, cuando cae fuera del cuadro o cuando está tan lejos que una ficha no
    se resolvería. Cada punto de la huella necesita **una** cámara que lo encuadre, lo
    vea con resolución suficiente y no tenga ningún contorno encima —ni leído ni sin
    resolver—. La cobertura se acredita por unión de vistas.

    Devuelve (cubierta, ocupada): cubierta solo si todos los puntos tienen testigo
    limpio; ocupada si algún punto lo ve una cámara competente y tiene algo encima."""
    puntos = huella(punto, rumbo)
    limpios = [False]*len(puntos)
    ocupada = False
    for c in cuadros:
        uv, z = proyectar(c['modelo'], puntos)
        ancho, alto = c['resolucion']
        k = float(np.asarray(c['modelo']['k'], float)[0, 0])
        for n in range(len(puntos)):
            if z[n] <= 0 or not (0 <= uv[n][0] < ancho and 0 <= uv[n][1] < alto):
                continue
            if k / float(z[n]) < PX_POR_MM_TESTIGO:
                continue
            x, y = float(uv[n][0]), float(uv[n][1])
            encima = any(bx <= x < bx + bw and by <= y < by + bh
                         for bx, by, bw, bh in ocupacion(c))
            if encima:
                ocupada = True
            else:
                limpios[n] = True
    return all(limpios), ocupada

def tinta_encima(cuadros, punto):
    """Cámaras que ven tinta sin resolver justo donde cae ese punto. No dice qué hay:
    dice que hay algo que el detector no ha conseguido convertir en fichas."""
    testigos = []
    for c in cuadros:
        uv, z = proyectar(c['modelo'], [punto])
        if z[0] <= 0:
            continue
        x, y = float(uv[0][0]), float(uv[0][1])
        for cx, cy, cw, ch in c.get('tinta') or []:
            if cx <= x < cx + cw and cy <= y < cy + ch:
                testigos.append(c['id'])
                break
    return testigos


class Fusion:
    def __init__(self):
        self.lock = threading.RLock()
        self.revision = 0
        self.reiniciar()

    def reiniciar(self):
        with self.lock:
            self.pistas = {}
            self.siguiente = 1
            self.clave = None
            self.firma_estable = None
            self.desde = None
            self.ancla = {}
            self.ultimo_instante = None
            self.cadencias = []
            self.vistas_ahora = set()
            self.sin_localizar = 0
            self.sin_localizar_leidas = 0
            self.sueltas = {}
            self.resultado = {'id':'fusion', 'ambito':'programa', 'estado':'incompleta', 'estable':False, 'compatible':False, 'instrucciones':[], 'piezas':[], 'avisos':['Esperando observaciones de las cámaras.'], 'sin_localizar':0, 'camaras':[], 'desfase_ms':None, 'firma':'', 'conexiones_confirmadas':False, 'vistas_camara':{}, 'cuadro_camara':{}}
            self.revision += 1
            self.resultado['revision'] = self.revision

    def resumen(self):
        with self.lock:
            return copy.deepcopy(self.resultado)

    def fallar(self):
        with self.lock:
            self.desde = None
            self.revision += 1
            self.resultado['revision'] = self.revision
            self.resultado.update(ambito='programa', estable=False, compatible=False, estado='incompleta', avisos=['No se pudo fusionar esta captura. Revisa la calibración y las imágenes.'], vistas_camara={}, cuadro_camara={})

    def actualizar(self, fuentes, config, ahora):
        with self.lock:
            return copy.deepcopy(self._actualizar(fuentes, config, ahora))

    def _discontinuidad(self, instante):
        """¿El hueco contra la captura anterior rompe el flujo? Avanza el instante de referencia.

        El hueco solo cuenta como corte si rompe la cadencia observada. Un ciclo lento pero
        regular —dos webcams en este equipo tardan medio segundo— no es una discontinuidad, y
        tratarlo como tal reiniciaba la espera de quietud en cada captura, de modo que la lectura
        nunca llegaba a confirmarse.
        """
        hueco = None if self.ultimo_instante is None else instante-self.ultimo_instante
        if hueco is not None and hueco > 0:
            self.cadencias = (self.cadencias + [hueco])[-9:]
        cadencia = float(np.median(self.cadencias)) if self.cadencias else None
        tolerancia = max(TOLERANCIA_HUECO_S, 3*cadencia) if cadencia else TOLERANCIA_HUECO_S
        self.ultimo_instante = instante
        return hueco is None or hueco > tolerancia

    def _actualizar(self, fuentes, config, ahora):
        cuadros, avisos = sincronizar(fuentes, ahora)
        banda = (config.get('plano_min_mm'), config.get('plano_max_mm'))
        def en_volumen(punto):
            return None in banda or banda[0] <= float(punto[2]) <= banda[1]
        instante = max((c['instante'] for c in cuadros), default=ahora)
        discontinuo = self._discontinuidad(instante)
        clave = tuple((c['id'], c['secuencia']) for c in cuadros)
        modelos = {c['id']: c['modelo'] for c in cuadros}
        pendientes = 0
        if clave != self.clave:
            self.clave = clave
            vistas_ahora = set()
            descartadas = 0
            obs = []
            for c in cuadros:
                for o in c['observaciones']:
                    obs.append({**o, 'camara': c['id'], 'secuencia': c['secuencia'], 'instante': c['instante']})
            grupos, usadas = localizar(obs, modelos, cuadros, en_volumen)
            asociar_restantes(grupos, usadas, obs, modelos)
            pistas = list(self.pistas.values())
            costes = np.full((len(grupos), len(pistas)), np.inf)
            for i, g in enumerate(grupos):
                for j, p in enumerate(pistas):
                    costes[i, j] = np.linalg.norm(g['posicion']-p['posicion'])
            matches = dict(asociar_unicos(costes, 25, 6))
            for i, g in enumerate(grupos):
                if i in matches:
                    pista = pistas[matches[i]]
                else:
                    if len(pistas) and np.min(costes[i]) < 25:
                        descartadas += len(g['obs'])
                        continue
                    if len(self.pistas) >= 256:
                        descartadas += len(g['obs'])
                        avisos.append('Se alcanzó el límite de piezas. Reinicia el seguimiento con la mesa despejada.')
                        continue
                    pista = {'id': f'p{self.siguiente}', 'posicion': g['posicion'], 'lexema': '<sin leer>', 'lecturas': {}}
                    self.siguiente += 1
                    self.pistas[pista['id']] = pista
                vistas_ahora.add(pista['id'])
                pista['posicion'] = g['posicion']
                pista['ultima'] = max(obs[n]['instante'] for n in g['obs'])
                pista['metodo'] = g['metodo']
                pista['sensores'] = sorted(g['sensores'])
                pista['lecturas'] = {obs[n]['camara']: obs[n] for n in g['obs']}
                self._votar(pista)
            self.vistas_ahora = vistas_ahora
            pendientes = len(obs)-len(usadas)+descartadas
            self.sin_localizar = pendientes
            self.sin_localizar_leidas = sum(1 for n, o in enumerate(obs)
                                            if n not in usadas and o['lexema'] != SIN_LEER) + descartadas
            self.sueltas = {}
            for n, o in enumerate(obs):
                if n not in usadas:
                    self.sueltas.setdefault(o['camara'], []).append(observada(o))
        else:
            pendientes = self.sin_localizar
        leidas_sueltas = self.sin_localizar_leidas

        for ident, pista in list(self.pistas.items()):
            if ident in self.vistas_ahora:
                pista['ausente_desde'] = None
                continue
            if encuadran(cuadros, pista['posicion']) >= 2 and not tinta_encima(cuadros, pista['posicion']):
                if pista.get('ausente_desde') is None:
                    pista['ausente_desde'] = ahora
                elif ahora - pista['ausente_desde'] >= OLVIDO_S:
                    del self.pistas[ident]
            else:
                pista['ausente_desde'] = None

        piezas, fuera_de_plano, sin_lectura, hardware = [], 0, 0, 0
        for pista in self.pistas.values():
            if not en_volumen(pista['posicion']):
                fuera_de_plano += 1
                continue
            if pista['lexema'] == SIN_LEER:
                vistas = encuadran(cuadros, pista['posicion'])
                if vistas and len(pista.get('sensores', [])) / vistas < RESPALDO_MINIMO:
                    hardware += 1
                    continue
                sin_lectura += 1
            edad = ahora-pista.get('ultima', -10)
            actual = pista['id'] in self.vistas_ahora and any(c['id'] in pista.get('sensores', []) for c in cuadros) and 0 <= edad <= .35
            estado = pista.get('estado', 'ambigua') if actual else 'no_observada'
            if not actual and any(oculto(c['modelo'], pista['posicion'], c['profundidad']) for c in cuadros):
                estado = 'oculta'
            lectores = sorted(c for c, o in pista['lecturas'].items() if o['lexema'] == pista['lexema']
                              and pista['lexema'] != SIN_LEER)
            piezas.append({'id': pista['id'], 'lexema': pista['lexema'], 'posicion': pista['posicion'].tolist(), 'estado': estado,
                           'candidatos': pista.get('candidatos', []), 'camaras': sorted(pista['lecturas']),
                           'lectores': lectores, 'metodo': pista.get('metodo'),
                           'lecturas': {c: observada(o) for c, o in pista['lecturas'].items()},
                           'edad_ms': max(0, round(edad*1000))})
        pasos = pasos_medidos(config)
        instrucciones, problemas = reconstruir(piezas, pasos) if piezas else ([], ['Esperando piezas localizables en las cámaras.'])
        area = config.get('area_trabajo')

        def alcanzable(punto):
            """Un sitio fuera del área de trabajo declarada no necesita testigo: ahí no cabe un
            bloque. El área es un dato de la instalación —dónde está la mesa—, no del programa,
            así que no se puede ajustar por escena para que una lectura salga adelante."""
            if not area:
                return True
            return (area['x_min'] <= float(punto[0]) <= area['x_max']
                    and area['y_min'] <= float(punto[1]) <= area['y_max'])

        sin_testigo, ocupados, fuera_del_area = 0, 0, 0
        for grupo in continuaciones(instrucciones, pasos):
            dentro = [(punto, rumbo) for punto, rumbo in grupo if alcanzable(punto)]
            if not dentro:
                fuera_del_area += 1
                continue
            cubierta, ocupada = True, False
            for punto, rumbo in dentro:
                limpia, estorbada = acredita_vacio(cuadros, punto, rumbo)
                cubierta = cubierta and limpia
                ocupada = ocupada or estorbada
            if ocupada:
                ocupados += 1
            elif not cubierta:
                sin_testigo += 1
        if sin_testigo:
            problemas.append(
                f'Ninguna cámara acredita que esté vacío el sitio del bloque siguiente en '
                f'{sin_testigo} ' + ('extremo' if sin_testigo == 1 else 'extremos')
                + ' de la cadena: hace falta una vista que lo encuadre entero y con resolución '
                  'suficiente, así que no se puede descartar que el programa siga.')
        if ocupados:
            problemas.append(
                f'Hay algo donde iría el bloque siguiente en {ocupados} '
                + ('extremo' if ocupados == 1 else 'extremos')
                + ' de la cadena, y no se ha podido leer: el programa puede continuar ahí.')
        if piezas and any(p['estado'] != 'confirmada' for p in piezas):
            problemas.append('Hay piezas ocultas, ambiguas o sin observación reciente. Se conserva la última lectura como provisional.')
        if leidas_sueltas:
            problemas.append(f'{leidas_sueltas} símbolos leídos aún no tienen una posición compartida inequívoca.')
        if not config.get('medido'):
            problemas.append('Mide y guarda el paso entre bloques antes de reconstruir el orden.')
        if avisos:
            problemas.extend(avisos)
        # Solo las observaciones de la captura que se está publicando. Las pistas conservan su
        # última lectura para no perder la identidad de una ficha tapada, pero esa lectura es de
        # un cuadro anterior: dibujarla encima de la imagen de ahora sería superponer capturas.
        actuales = {c['id']: c['secuencia'] for c in cuadros}
        vistas = {cid: [] for cid in actuales}

        def del_cuadro(cid, observada_):
            return cid in actuales and observada_.get('secuencia') == actuales[cid]

        for pieza in piezas:
            for cid, observada_ in (pieza.get('lecturas') or {}).items():
                if not del_cuadro(cid, observada_):
                    continue
                clase = ('asociada' if cid in pieza['lectores']
                         else 'ilegible' if observada_['lexema'] == SIN_LEER else 'contradice')
                vistas[cid].append({**observada_, 'clase': clase, 'pieza': pieza['id'],
                                    'lexema_pieza': pieza['lexema']})
        for cid, libres in self.sueltas.items():
            for observada_ in libres:
                if not del_cuadro(cid, observada_):
                    continue
                vistas[cid].append({**observada_, 'clase': 'sin_asociar',
                                    'pieza': None, 'lexema_pieza': None})

        firma = json.dumps([[(p['id'], p['lexema'], p['estado']) for p in piezas], [(i['token'], i['operandos']) for i in instrucciones]], ensure_ascii=False)
        posiciones = {p['id']: np.asarray(p['posicion']) for p in piezas}
        movido = set(posiciones) != set(self.ancla) or any(np.linalg.norm(x-self.ancla[pid]) > 3 for pid, x in posiciones.items() if pid in self.ancla)
        if problemas or firma != self.firma_estable or movido or discontinuo:
            self.desde = ahora
            self.firma_estable = firma
            self.ancla = posiciones
        estable = bool(instrucciones) and not problemas and self.desde is not None and ahora-self.desde >= .8
        estado = 'estable' if estable else 'incompleta' if problemas else 'estabilizando'
        contenido = {'id': 'fusion', 'ambito': 'programa', 'estado': estado, 'estable': estable, 'compatible': not problemas, 'instrucciones': instrucciones,
                     'piezas': piezas, 'avisos': list(dict.fromkeys(problemas)), 'sin_localizar': pendientes,
                     'fuera_de_plano': fuera_de_plano, 'sin_lectura': sin_lectura, 'hardware': hardware,
                     'sin_leer_sueltas': pendientes - leidas_sueltas,
                     'sueltas': {c: list(v) for c, v in self.sueltas.items()},
                     'vistas_camara': vistas, 'cuadro_camara': dict(actuales),
                     'camaras': [c['id'] for c in cuadros], 'desfase_ms': round((max(c['instante'] for c in cuadros)-min(c['instante'] for c in cuadros))*1000) if cuadros else None,
                     'firma': json.dumps([[(i['token'], i['operandos']) for i in instrucciones], [(pid, np.round(p, 1).tolist()) for pid, p in self.ancla.items()]], sort_keys=True), 'conexiones_confirmadas': False}
        self.revision += 1
        contenido['revision'] = self.revision
        self.resultado = contenido
        return contenido

    def _votar(self, pista):
        lecturas = list(pista['lecturas'].values())
        votos = {ganador(o['candidatos']) for o in lecturas} - {None}
        tokens = {c['lexema'] for o in lecturas for c in o['candidatos']}
        pesos = [float(np.clip(o.get('calidad', 1.), .2, 1.)) for o in lecturas]
        puntajes = []
        for token in tokens:
            vistos = [(peso, next((max(0., c['puntaje']) for c in o['candidatos'] if c['lexema'] == token), None))
                      for o, peso in zip(lecturas, pesos)]
            aportan = [(peso, valor) for peso, valor in vistos if valor is not None]
            puntajes.append({'lexema': token, 'camaras': len(aportan),
                             'puntaje': sum(peso*valor for peso, valor in aportan)/sum(peso for peso, _ in aportan)})
        puntajes.sort(key=lambda c: c['puntaje'], reverse=True)
        pista['candidatos'] = puntajes[:4]
        elegido = next(iter(votos)) if len(votos) == 1 else None
        pista['estado'] = 'confirmada' if elegido else 'ambigua'
        if elegido:
            pista['lexema'] = elegido
