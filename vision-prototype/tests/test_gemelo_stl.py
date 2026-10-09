import unittest

import numpy as np

from plataforma import malla
from plataforma.escena_virtual import (Mano, cuadro, escenario_de, fuentes, olvidar_vistas,
                                       render)
from plataforma.fusion import puede_ejecutar
from plataforma.recorrido import recorrer as pasar
from plataforma.guiones import GUIONES
from plataforma.lectura import leer_cuadro
from plataforma.geometria_fusion import proyectar

from tests.entorno import vocabulario


def recorrer(nombre, voc, pasos=12):
    escena, guion = GUIONES[nombre][0](voc)
    resultado, _ = pasar(escena, guion, voc, pasos)
    return escena, resultado


def lecturas_por_ficha(escena, voc, radio=30.0):
    filas = {f.id: {'lexema': f.lexema, 'aciertan': [], 'fallan': []} for f in escena.visibles()}
    for camara in escena.camaras:
        modelo = camara.modelo()
        if modelo is None:
            continue
        _, lecturas = leer_cuadro(render(escena, camara), voc)
        for ficha in escena.visibles():
            uv, z = proyectar(modelo, [ficha.centro])
            if z[0] <= 0:
                continue
            cerca = sorted((l for l in lecturas
                            if float(np.hypot(l['observacion']['x'] - uv[0][0],
                                              l['observacion']['y'] - uv[0][1])) < radio),
                           key=lambda l: np.hypot(l['observacion']['x'] - uv[0][0],
                                                  l['observacion']['y'] - uv[0][1]))
            if not cerca:
                continue
            leido = cerca[0]['observacion']['lexema']
            if leido == ficha.lexema:
                filas[ficha.id]['aciertan'].append(camara.id)
            elif leido != '<sin leer>':
                filas[ficha.id]['fallan'].append((camara.id, leido))
    return filas


class PixelesDesdeSTLTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def test_la_geometria_de_la_escena_sale_de_los_stl(self):
        escena, _ = GUIONES['completa'][0](self.vocabulario)
        mundo = escenario_de(escena)
        bloques = sum(len(malla.bloque(2 if c.largo > 75 else 1, 0.6)) for c in escena.cuerpos)
        operaciones = sum(len(malla.operacion(f.lexema)[0]) + len(malla.operacion(f.lexema)[1])
                          for f in escena.visibles() if malla.operacion(f.lexema) is not None)
        self.assertGreater(bloques, 1000, 'los bloques deben aportar la malla del STL')
        self.assertGreater(operaciones, 100, 'las fichas de operación deben aportar su grabado del STL')
        self.assertGreaterEqual(mundo.total(), bloques + operaciones)

    def test_el_grabado_del_stl_es_lo_que_distingue_cada_operacion(self):
        for token in ('PUSH', 'ADD', 'POP'):
            cuerpo, grabado = malla.operacion(token)
            self.assertTrue(len(cuerpo) and len(grabado), token)
        self.assertIsNone(malla.operacion('a'), 'los parámetros no tienen STL propio')

    def test_cada_camara_ve_la_escena_desde_su_pose(self):
        escena, _ = GUIONES['completa'][0](self.vocabulario)
        vistas = [render(escena, c) for c in escena.camaras]
        for n, imagen in enumerate(vistas):
            self.assertTrue((imagen != imagen[0, 0]).any(), f'la cámara {n} rinde un cuadro vacío')
        for a in range(len(vistas)):
            for b in range(a + 1, len(vistas)):
                self.assertFalse((vistas[a] == vistas[b]).all(), 'dos poses distintas no pueden dar el mismo cuadro')

    def test_el_render_es_determinista(self):
        escena, _ = GUIONES['completa'][0](self.vocabulario)
        for camara in escena.camaras:
            primero = render(escena, camara)
            olvidar_vistas()
            self.assertTrue((primero == render(escena, camara)).all(), camara.id)


class ReconstruccionDesdeSTLTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()
        cls.escena, cls.resultado = recorrer('completa', cls.vocabulario)

    def test_el_programa_simple_se_reconstruye_desde_los_pixeles(self):
        codigo = [' '.join([i['token'], *i['operandos']]) for i in self.resultado['instrucciones']]
        self.assertEqual(codigo, ['PUSH a 3', 'ADD a'])
        self.assertEqual(sorted(p['lexema'] for p in self.resultado['piezas']), sorted(self.escena.verdad()))

    def test_la_lectura_desde_stl_habilita_la_ejecucion(self):
        self.assertTrue(puede_ejecutar(self.resultado), self.resultado['avisos'])
        self.assertEqual(self.resultado['avisos'], [])

    def test_la_verdad_conocida_no_entra_en_la_tuberia(self):
        marcos, _ = fuentes(self.escena, self.vocabulario, 10.0, 1)
        for marco in marcos:
            for observacion in marco['historial'][0]['observaciones']:
                self.assertNotIn('verdad', observacion)
                self.assertNotIn('lexema_real', observacion)

    def test_ninguna_camara_lee_un_simbolo_equivocado(self):
        filas = lecturas_por_ficha(self.escena, self.vocabulario)
        erroneas = [(v['lexema'], v['fallan']) for v in filas.values() if v['fallan']]
        self.assertEqual(erroneas, [], 'una lectura equivocada es peor que ninguna')

    def test_cada_ficha_la_leen_al_menos_dos_camaras(self):
        filas = lecturas_por_ficha(self.escena, self.vocabulario)
        flojas = {v['lexema']: len(v['aciertan']) for v in filas.values() if len(v['aciertan']) < 2}
        self.assertEqual(flojas, {}, 'la disposición debe dar redundancia ficha por ficha')


class ReutilizacionDeVistasTest(unittest.TestCase):
    """La imagen rasterizada y su lectura se reutilizan entre capturas. Eso solo es admisible si
    cualquier cambio de la geometría o de la pose produce otra clave: una caché que sobreviviera
    a mover una cámara, tapar una ficha o retirarla estaría ocultando justo lo que se mide."""

    @classmethod
    def setUpClass(cls):
        cls.vocabulario = vocabulario()

    def leer(self, escena, camara, secuencia=1):
        return cuadro(escena, camara, self.vocabulario, 10.0, secuencia)[1]['observaciones']

    def lexemas(self, observaciones):
        return sorted((o['lexema'], round(o['x']), round(o['y'])) for o in observaciones)

    def escena(self):
        escena, _ = GUIONES['completa'][0](self.vocabulario)
        return escena, escena.camaras[0]

    def test_sin_cambios_la_lectura_reutilizada_es_la_misma(self):
        escena, camara = self.escena()
        primera = self.leer(escena, camara, 1)
        self.assertEqual(self.lexemas(primera), self.lexemas(self.leer(escena, camara, 2)))
        self.assertTrue(primera, 'la escena base tiene que producir observaciones')

    def test_la_lectura_reutilizada_es_una_copia_y_no_el_original(self):
        escena, camara = self.escena()
        primera = self.leer(escena, camara, 1)
        primera[0]['lexema'] = 'PISOTEADO'
        self.assertNotIn('PISOTEADO', [o['lexema'] for o in self.leer(escena, camara, 2)])

    def test_mover_la_camara_no_reutiliza_la_lectura_anterior(self):
        escena, camara = self.escena()
        antes = self.lexemas(self.leer(escena, camara, 1))
        camara.centro = camara.centro + [140., 0., 0.]
        self.assertNotEqual(antes, self.lexemas(self.leer(escena, camara, 2)))

    def test_tapar_una_ficha_no_reutiliza_la_lectura_anterior(self):
        escena, camara = self.escena()
        antes = self.lexemas(self.leer(escena, camara, 1))
        objetivo = next(f for f in escena.fichas if f.lexema == '3')
        escena.manos = [Mano((objetivo.centro[0], objetivo.centro[1], 0.), 30., 120.)]
        self.assertNotEqual(antes, self.lexemas(self.leer(escena, camara, 2)))

    def test_retirar_una_ficha_no_reutiliza_la_lectura_anterior(self):
        escena, camara = self.escena()
        antes = self.lexemas(self.leer(escena, camara, 1))
        escena.retirar(next(f for f in escena.fichas if f.lexema == '3').id)
        self.assertNotEqual(antes, self.lexemas(self.leer(escena, camara, 2)))
