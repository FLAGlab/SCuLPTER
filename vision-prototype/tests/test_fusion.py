import copy
import json
import unittest

import numpy as np

from plataforma.fusion import Fusion, CONFIGURACION, reconstruir
from plataforma.geometria_fusion import modelo, proyectar, triangular


K = [[500., 0, 320], [0, 500., 240], [0, 0, 1]]
INTR = {'camera_matrix': K, 'dist_coeffs': [0.]*5, 'image_size': [640, 480]}
CONFIG = {**CONFIGURACION, 'medido': True, 'paso_mm': 80.}


def fuente(id, centro, puntos, t=10., profundidad=False, secuencia=1):
    r = np.diag([1., -1., -1.])
    pose = {'rot': r.tolist(), 'tras': (-r @ np.array(centro)).tolist()}
    m = modelo(INTR, pose, [640, 480])
    obs = []
    for token, xyz in puntos:
        uv = proyectar(m, [xyz])[0][0]
        obs.append({'x': float(uv[0]), 'y': float(uv[1]), 'caja': [uv[0]-8, uv[1]-8, 16., 16.], 'lexema': token, 'candidatos': [{'lexema': token, 'puntaje': .95}]})
    cuadro = {'secuencia': secuencia, 'instante': t, 'resolucion': [640, 480], 'observaciones': obs, 'profundidad': np.full((480, 640), centro[2]-20., np.float32) if profundidad else None}
    return {'id': id, 'nombre': id, 'estado': 'conectada', 'pose': pose, 'intrinsecos': INTR, 'historial': [cuadro]}


class FusionTest(unittest.TestCase):
    def setUp(self):
        self.fusion = Fusion()
        self.puntos = [('PUSH', [-40, 0, 20]), ('a', [-20, 0, 20]), ('2', [0, 0, 20])]

    def escena(self, t, secuencia=1):
        return [fuente('arriba', [-100, -70, 600], self.puntos, t, secuencia=secuencia), fuente('lado', [100, 70, 600], self.puntos, t, secuencia=secuencia)]

    def estable(self):
        for n in range(11):
            t = 10.+n*.1
            r = self.fusion.actualizar(self.escena(t, n+1), CONFIG, t)
        return r

    def test_triangulacion_y_escala_metrica(self):
        a, b = self.escena(10.)
        ma, mb = [modelo(c['intrinsecos'], c['pose'], [640, 480]) for c in [a,b]]
        for token, p in self.puntos:
            pa, pb = [proyectar(m, [p])[0][0] for m in [ma,mb]]
            xyz, error = triangular(ma, pa, mb, pb)
            np.testing.assert_allclose(xyz, p, atol=1e-6)
            self.assertLess(error, 1e-5)
        self.assertIsNone(triangular(ma, pa, ma, pa))

    def test_reconstruye_programa_y_publica_copia(self):
        r = self.estable()
        self.assertTrue(r['estable'], r)
        self.assertEqual(r['instrucciones'][0]['operandos'], ['a', '2'])
        self.assertEqual(len(r['piezas']), 3)
        r['piezas'][0]['lexema'] = 'ALTERADO'
        self.assertNotEqual(self.fusion.resultado['piezas'][0]['lexema'], 'ALTERADO')
        json.dumps(r, allow_nan=False)

    def test_vistas_complementarias_con_sensor_de_profundidad(self):
        a = fuente('izquierda', [-100,-70,600], self.puntos[:1])
        b = fuente('arriba', [100,70,600], self.puntos[1:])
        d = fuente('kinect', [0,0,600], [], profundidad=True)
        r = self.fusion.actualizar([a,b,d], CONFIG, 10.)
        self.assertEqual(len(r['piezas']), 3, r)
        self.assertEqual(r['sin_localizar'], 0)
        self.assertEqual(r['instrucciones'][0]['operandos'], ['a', '2'])
        self.assertTrue(all(p['metodo'] == 'profundidad' for p in r['piezas']))

    def test_oclusion_con_otra_vista_y_profundidad_conserva_identidad(self):
        r = self.estable()
        ids = [p['id'] for p in r['piezas']]
        a = fuente('arriba', [-100,-70,600], self.puntos, 11.1, secuencia=12)
        b = fuente('lado', [100,70,600], [], 11.1, secuencia=12)
        d = fuente('kinect', [0,0,600], [], 11.1, profundidad=True, secuencia=12)
        r = self.fusion.actualizar([a,b,d], CONFIG, 11.1)
        self.assertEqual(ids, [p['id'] for p in r['piezas']])
        self.assertTrue(r['estable'], r)

    def test_perder_todas_las_vistas_no_borra_piezas(self):
        r = self.estable()
        ids = [p['id'] for p in r['piezas']]
        vistas = [fuente('arriba', [-100,-70,600], [], 11.1, secuencia=12), fuente('lado', [100,70,600], [], 11.1, secuencia=12)]
        r = self.fusion.actualizar(vistas, CONFIG, 11.1)
        self.assertFalse(r['estable'])
        self.assertEqual(ids, [p['id'] for p in r['piezas']])
        self.assertTrue(all(p['estado'] == 'no_observada' for p in r['piezas']))
        r = self.fusion.actualizar(vistas, CONFIG, 20.)
        self.assertFalse(r['estable'])
        self.assertEqual(len(r['piezas']), 3)

    def test_conflicto_entre_camaras_no_se_resuelve_por_mayoria(self):
        p = [('PUSH', [0,0,20])]
        a = fuente('a', [-100,-70,600], p, profundidad=True)
        b = fuente('b', [100,70,600], [('MOV', [0,0,20])], profundidad=True)
        c = fuente('c', [0,0,600], p, profundidad=True)
        r = self.fusion.actualizar([a,b,c], CONFIG, 10.)
        self.assertEqual(len(r['piezas']), 1, r)
        self.assertEqual(r['piezas'][0]['estado'], 'ambigua')
        self.assertFalse(r['compatible'])

    def test_movimiento_lento_acumulado_reinicia_estabilidad(self):
        self.estable()
        for n in range(1,6):
            self.puntos = [(s, [p[0]+1,p[1],p[2]]) for s,p in self.puntos]
            t = 11.+n*.1
            r = self.fusion.actualizar(self.escena(t,n+11), CONFIG, t)
        self.assertFalse(r['estable'])
        self.assertEqual(len(r['piezas']),3)

    def test_imagenes_atrasadas_y_desconectadas(self):
        r = self.estable()
        escenas = self.escena(11.,2)
        escenas[0]['estado'] = 'desconectada'
        escenas[1]['historial'][0]['instante'] = 10.
        r = self.fusion.actualizar(escenas, CONFIG, 11.1)
        self.assertFalse(r['estable'])
        self.assertEqual(r['camaras'], [])

    def test_no_triangula_tiempos_incompatibles(self):
        a,b = self.escena(10.)
        b['historial'][0]['instante'] = 10.3
        r = self.fusion.actualizar([a,b], CONFIG, 10.3)
        self.assertEqual(len(r['piezas']), 0)
        self.assertGreater(r['sin_localizar'],0)
        self.assertTrue(any('sincronización' in a for a in r['avisos']))

    def test_calibracion_y_paso_obligatorios(self):
        a,b = self.escena(10.)
        a['historial'][0]['resolucion'] = [1280,720]
        r = self.fusion.actualizar([a,b], CONFIG, 10.)
        self.assertFalse(r['compatible'])
        self.fusion.reiniciar()
        r = self.fusion.actualizar(self.escena(10.), CONFIGURACION,10.)
        self.assertTrue(any('Mide' in a for a in r['avisos']))

    def test_puntos_repetidos_epipolares_quedan_pendientes(self):
        p = [('a', [-20,0,20]),('a',[20,0,20])]
        a = fuente('a', [-100,0,600], p)
        b = fuente('b', [100,0,600], p)
        r = self.fusion.actualizar([a,b],CONFIG,10.)
        self.assertEqual(len(r['piezas']),0)
        self.assertEqual(r['sin_localizar'],4)

    def test_reinicio_elimina_memoria_y_estabilidad(self):
        self.estable()
        revision = self.fusion.revision
        self.fusion.reiniciar()
        r = self.fusion.actualizar([],CONFIG,12.)
        self.assertFalse(r['estable'])
        self.assertEqual(r['piezas'],[])
        self.assertGreater(r['revision'], revision)

    def test_cadena_curva_y_sentido_por_parametros(self):
        datos = [('PUSH', [0,0,20]), ('a', [20,0,20]), ('2',[40,0,20]), ('PUSH',[80,0,20]),('b',[90,17.32,20]),('3',[100,34.64,20]),('ADD',[120,69.28,20]),('a',[130,86.6,20])]
        piezas = [{'id':str(n),'lexema':s,'posicion':p} for n,(s,p) in enumerate(datos)]
        instrucciones, avisos = reconstruir(piezas,80)
        self.assertEqual(avisos, [])
        self.assertEqual([(i['token'],i['operandos']) for i in instrucciones],[('PUSH',['a','2']),('PUSH',['b','3']),('ADD',['a'])])

    def test_parametros_sin_orden_inequivoco_no_se_ejecutan(self):
        piezas = [{'id':str(n),'lexema':s,'posicion':p} for n,(s,p) in enumerate([('MOV',[0,0,20]),('a',[20,0,20]),('b',[0,20,20])])]
        _, avisos = reconstruir(piezas,80)
        self.assertTrue(avisos)

    def test_polling_no_sustituye_evidencia_nueva(self):
        escenas = self.escena(10.)
        self.fusion.actualizar(escenas,CONFIG,10.)
        r = self.fusion.actualizar(escenas,CONFIG,11.)
        self.assertFalse(r['estable'])

    def test_cmp_admite_uno_o_dos_operandos(self):
        for parametros in [[('a',[20,0,20])],[('a',[20,0,20]),('2',[40,0,20])]]:
            piezas = [{'id':str(n),'lexema':s,'posicion':p} for n,(s,p) in enumerate([('CMP',[0,0,20])]+parametros)]
            _, avisos = reconstruir(piezas,80)
            self.assertEqual(avisos,[])

    def test_oclusion_de_profundidad_identificada(self):
        self.estable()
        d = fuente('depth', [0,0,600], [], 11.1, profundidad=True, secuencia=12)
        d['historial'][0]['profundidad'][:] = 500
        r = self.fusion.actualizar([d],CONFIG,11.1)
        self.assertTrue(all(p['estado'] == 'oculta' for p in r['piezas']))
        self.assertFalse(r['estable'])


if __name__ == '__main__':
    unittest.main()
