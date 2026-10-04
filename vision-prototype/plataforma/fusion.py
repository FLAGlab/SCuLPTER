import copy
import itertools
import json
import threading

import numpy as np

from adjacency import instrucciones as reconstruir_3d, separar, grafo, recorridos, repartir, pasos_admisibles, recorridos_coherentes, coherencia_con_parametros
from plataforma.geometria_fusion import modelo, triangular, proyectar, nube, situar_en_nube, oculto
from plataforma.vocabulario import OPERACIONES
from clasificador_simbolos import aceptar_candidatos


SIN_LEER = '<sin leer>'
ARIDADES = {op: (1, 2) if op in {'CMP', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD'} else (2, 2) if op in {'PUSH', 'MOV'} else (1, 1) for op in OPERACIONES}
CONFIGURACION = {'modo': 'fusion', 'paso_mm': 60., 'paso_2_mm': None, 'medido': False}


def ganador(candidatos):
    return aceptar_candidatos(candidatos)


RADIO_RACIMO = 9.0
ALCANCE_MISMO_SIMBOLO = 45.0
RESPALDO_MINIMO = 0.5


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
            self.vistas_ahora = set()
            self.sin_localizar = 0
            self.sin_localizar_leidas = 0
            self.resultado = {'id':'fusion', 'ambito':'programa', 'estado':'incompleta', 'estable':False, 'compatible':False, 'instrucciones':[], 'piezas':[], 'avisos':['Esperando observaciones de las cámaras.'], 'sin_localizar':0, 'camaras':[], 'desfase_ms':None, 'firma':'', 'conexiones_confirmadas':False}
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
            self.resultado.update(ambito='programa', estable=False, compatible=False, estado='incompleta', avisos=['No se pudo fusionar esta captura. Revisa la calibración y las imágenes.'])

    def actualizar(self, fuentes, config, ahora):
        with self.lock:
            return copy.deepcopy(self._actualizar(fuentes, config, ahora))

    def _actualizar(self, fuentes, config, ahora):
        disponibles, avisos = [], []
        for fuente in fuentes:
            if fuente['estado'] != 'conectada' or not fuente['historial']:
                continue
            ultimo = fuente['historial'][-1]
            m = modelo(fuente.get('intrinsecos') or ultimo.get('intrinsecos'), fuente.get('pose'), ultimo['resolucion'])
            if m is None:
                avisos.append(f"{fuente['nombre']}: falta calibración común o cambió la resolución.")
            elif 0 <= ahora-ultimo['instante'] <= .75:
                disponibles.append({**fuente, 'modelo': m})
        cuadros = []
        if disponibles:
            objetivo = max(f['historial'][-1]['instante'] for f in disponibles)
            for f in disponibles:
                cuadro = min(f['historial'], key=lambda c: abs(c['instante']-objetivo))
                if abs(cuadro['instante']-objetivo) <= .12:
                    cuadros.append({**cuadro, 'id': f['id'], 'modelo': f['modelo']})
                else:
                    avisos.append(f"{f['nombre']}: imagen fuera de la ventana de sincronización.")
        banda = (config.get('plano_min_mm'), config.get('plano_max_mm'))
        def en_volumen(punto):
            return None in banda or banda[0] <= float(punto[2]) <= banda[1]
        instante = max((c['instante'] for c in cuadros), default=ahora)
        discontinuo = self.ultimo_instante is None or instante-self.ultimo_instante > .35
        self.ultimo_instante = instante
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
        else:
            pendientes = getattr(self, 'sin_localizar', 0)
        leidas_sueltas = getattr(self, 'sin_localizar_leidas', 0)
        def encuadran(punto):
            cuantas = 0
            for c in cuadros:
                uv, z = proyectar(c['modelo'], [punto])
                ancho, alto = c['resolucion']
                if z[0] > 0 and 0 <= uv[0][0] < ancho and 0 <= uv[0][1] < alto:
                    cuantas += 1
            return cuantas

        piezas, fuera_de_plano, sin_lectura, hardware = [], 0, 0, 0
        for pista in self.pistas.values():
            if not en_volumen(pista['posicion']):
                fuera_de_plano += 1
                continue
            if pista['lexema'] == SIN_LEER:
                vistas = encuadran(pista['posicion'])
                if vistas and len(pista.get('sensores', [])) / vistas < RESPALDO_MINIMO:
                    hardware += 1
                    continue
                sin_lectura += 1
            edad = ahora-pista.get('ultima', -10)
            actual = pista['id'] in getattr(self, 'vistas_ahora', set()) and any(c['id'] in pista.get('sensores', []) for c in cuadros) and 0 <= edad <= .35
            estado = pista.get('estado', 'ambigua') if actual else 'no_observada'
            if not actual and any(oculto(c['modelo'], pista['posicion'], c['profundidad']) for c in cuadros):
                estado = 'oculta'
            lectores = sorted(c for c, o in pista['lecturas'].items() if o['lexema'] == pista['lexema']
                              and pista['lexema'] != SIN_LEER)
            piezas.append({'id': pista['id'], 'lexema': pista['lexema'], 'posicion': pista['posicion'].tolist(), 'estado': estado,
                           'candidatos': pista.get('candidatos', []), 'camaras': sorted(pista['lecturas']),
                           'lectores': lectores, 'metodo': pista.get('metodo'),
                           'edad_ms': max(0, round(edad*1000))})
        instrucciones, problemas = reconstruir(piezas, pasos_medidos(config)) if piezas else ([], ['Esperando piezas localizables en las cámaras.'])
        if piezas and any(p['estado'] != 'confirmada' for p in piezas):
            problemas.append('Hay piezas ocultas, ambiguas o sin observación reciente. Se conserva la última lectura como provisional.')
        if leidas_sueltas:
            problemas.append(f'{leidas_sueltas} símbolos leídos aún no tienen una posición compartida inequívoca.')
        if not config.get('medido'):
            problemas.append('Mide y guarda el paso entre bloques antes de reconstruir el orden.')
        if avisos:
            problemas.extend(avisos)
        firma = json.dumps([[(p['id'], p['lexema'], p['estado']) for p in piezas], [(i['token'], i['operandos']) for i in instrucciones]], ensure_ascii=False)
        posiciones = {p['id']: np.asarray(p['posicion']) for p in piezas}
        movido = set(posiciones) != set(self.ancla) or any(np.linalg.norm(x-self.ancla[id]) > 3 for id, x in posiciones.items() if id in self.ancla)
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
                     'camaras': [c['id'] for c in cuadros], 'desfase_ms': round((max(c['instante'] for c in cuadros)-min(c['instante'] for c in cuadros))*1000) if cuadros else None,
                     'firma': json.dumps([[(i['token'], i['operandos']) for i in instrucciones], [(id, np.round(p, 1).tolist()) for id, p in self.ancla.items()]], sort_keys=True), 'conexiones_confirmadas': False}
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
