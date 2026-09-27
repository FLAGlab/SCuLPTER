import copy
import itertools
import json
import threading

import numpy as np

from adjacency import instrucciones as reconstruir_3d, separar, grafo, recorridos, repartir
from plataforma.geometria_fusion import modelo, triangular, proyectar, nube, situar_en_nube, oculto
from plataforma.vocabulario import OPERACIONES


ARIDADES = {op: (1, 2) if op in {'CMP', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD'} else (2, 2) if op in {'PUSH', 'MOV'} else (1, 1) for op in OPERACIONES}
CONFIGURACION = {'modo': 'fusion', 'paso_mm': 60., 'medido': False}


def ganador(candidatos):
    orden = sorted(candidatos, key=lambda c: c['puntaje'], reverse=True)
    if not orden or orden[0]['puntaje'] <= .45 or (len(orden) > 1 and orden[0]['puntaje']-orden[1]['puntaje'] < .08):
        return None
    return orden[0]['lexema']


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


def reconstruir(piezas, paso):
    puntos = [(p['lexema'], p['posicion']) for p in piezas]
    ops = [p for p in piezas if p['lexema'] in OPERACIONES]
    avisos = []
    if not ops:
        return [], ['Todavía no hay operaciones localizadas.']
    grados = [sum(abs(np.linalg.norm(np.subtract(p['posicion'], q['posicion']))-paso) <= paso*.2 for q in ops if q['id'] != p['id']) for p in ops]
    if len(ops) > 1 and (any(g == 0 or g > 2 for g in grados) or grados.count(1) != 2):
        return [], ['El orden de los bloques es ambiguo o hay conjuntos separados. Revisa el paso medido y las conexiones.']
    operaciones, parametros, _ = separar(puntos)
    alternativas = sorted((repartir(operaciones, orden, destino, parametros)[1], orden) for orden, destino in recorridos(grafo(operaciones, paso)))
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
            self.resultado = {'id':'fusion', 'estado':'incompleta', 'estable':False, 'compatible':False, 'instrucciones':[], 'piezas':[], 'avisos':['Esperando observaciones de las cámaras.'], 'sin_localizar':0, 'camaras':[], 'desfase_ms':None, 'firma':'', 'conexiones_confirmadas':False}
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
            self.resultado.update(estable=False, compatible=False, estado='incompleta', avisos=['No se pudo fusionar esta captura. Revisa la calibración y las imágenes.'])

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
            for ca, cb in itertools.combinations(modelos, 2):
                aa = [i for i, o in enumerate(obs) if o['camara'] == ca and i not in usadas]
                bb = [i for i, o in enumerate(obs) if o['camara'] == cb and i not in usadas]
                costes = np.full((len(aa), len(bb)), np.inf)
                pares = {}
                for i, na in enumerate(aa):
                    for j, nb in enumerate(bb):
                        a, b = obs[na], obs[nb]
                        ga, gb = ganador(a['candidatos']), ganador(b['candidatos'])
                        if ga and gb and (ga in OPERACIONES) != (gb in OPERACIONES):
                            continue
                        par = triangular(modelos[ca], [a['x'], a['y']], modelos[cb], [b['x'], b['y']])
                        if par is not None:
                            costes[i, j] = par[1] + (2 if ga and gb and ga != gb else 0)
                            pares[i, j] = par[0]
                for i, j in asociar_unicos(costes, 3, 1):
                    na, nb = aa[i], bb[j]
                    medidas.append({'posicion': pares[i, j], 'obs': [na, nb], 'sensores': {ca, cb}, 'metodo': 'triangulacion'})
                    usadas.update([na, nb])
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
        else:
            pendientes = getattr(self, 'sin_localizar', 0)
        piezas = []
        for pista in self.pistas.values():
            edad = ahora-pista.get('ultima', -10)
            actual = pista['id'] in getattr(self, 'vistas_ahora', set()) and any(c['id'] in pista.get('sensores', []) for c in cuadros) and 0 <= edad <= .35
            estado = pista.get('estado', 'ambigua') if actual else 'no_observada'
            if not actual and any(oculto(c['modelo'], pista['posicion'], c['profundidad']) for c in cuadros):
                estado = 'oculta'
            piezas.append({'id': pista['id'], 'lexema': pista['lexema'], 'posicion': pista['posicion'].tolist(), 'estado': estado,
                           'candidatos': pista.get('candidatos', []), 'camaras': sorted(pista['lecturas']), 'metodo': pista.get('metodo'),
                           'edad_ms': max(0, round(edad*1000))})
        instrucciones, problemas = reconstruir(piezas, config['paso_mm']) if piezas else ([], ['Esperando piezas localizables en las cámaras.'])
        if piezas and any(p['estado'] != 'confirmada' for p in piezas):
            problemas.append('Hay piezas ocultas, ambiguas o sin observación reciente. Se conserva la última lectura como provisional.')
        if pendientes:
            problemas.append(f'{pendientes} observaciones aún no tienen una posición compartida inequívoca.')
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
        contenido = {'id': 'fusion', 'estado': estado, 'estable': estable, 'compatible': not problemas, 'instrucciones': instrucciones,
                     'piezas': piezas, 'avisos': list(dict.fromkeys(problemas)), 'sin_localizar': pendientes,
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
        puntajes = [{'lexema': token, 'puntaje': round(sum(peso*next((max(0., c['puntaje']) for c in o['candidatos'] if c['lexema'] == token), 0.) for o, peso in zip(lecturas, pesos))/sum(pesos), 4)} for token in tokens]
        puntajes.sort(key=lambda c: c['puntaje'], reverse=True)
        pista['candidatos'] = puntajes[:4]
        elegido = ganador(puntajes) if len(votos) <= 1 else None
        pista['estado'] = 'confirmada' if elegido else 'ambigua'
        if elegido:
            pista['lexema'] = elegido
