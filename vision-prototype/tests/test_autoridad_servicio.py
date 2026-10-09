import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from plataforma.escena_virtual import (AREA_TRABAJO, PASO_CORTO_MM, PASO_LARGO_MM,
                                       PLANO_FICHA_MAX_MM, PLANO_FICHA_MIN_MM, render)
from plataforma.dispositivos import Cuadro
from plataforma.estado import Estado
from plataforma.guiones import GUIONES
from plataforma.lector import Lector, en_scala

from tests.entorno import vocabulario

RAIZ = Path(__file__).resolve().parents[1]


class Montado(unittest.TestCase):
    escena_nombre = 'dos_webcams_corta'
    resolucion = None

    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, Path(self.temporal.name))
        self.estado.stop_fusion.set()
        self.estado.hilo_fusion.join(timeout=3)
        self.estado.vocabulario = vocabulario()
        self.estado.lector.vocabulario = self.estado.vocabulario
        self.escena, _ = GUIONES[self.escena_nombre][0](self.estado.vocabulario)
        if self.resolucion:
            for camara in self.escena.camaras:
                camara.resolucion = tuple(self.resolucion)
        self.ids = {}
        for n, camara in enumerate(self.escena.camaras):
            config = self.estado.accion('agregar', {'tipo': 'webcam', 'fuente': str(n),
                                                    'nombre': camara.id, 'rol': 'simbolos'})
            self.ids[camara.id] = config['id']
            self.estado.config['intrinsecos'][config['id']] = camara.intrinsecos()
            self.estado.config['poses'][config['id']] = camara.pose()
        self.estado.config['fusion'].update(plano_min_mm=PLANO_FICHA_MIN_MM,
                                            plano_max_mm=PLANO_FICHA_MAX_MM)
        self.estado.accion('configurar_fusion', {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM,
                                                 'paso_2_mm': PASO_LARGO_MM, **AREA_TRABAJO})

    def tearDown(self):
        self.estado.cerrar()
        self.temporal.cleanup()

    def fuentes(self):
        salida = []
        for camara in self.escena.camaras:
            cid = self.ids[camara.id]
            cam = self.estado.camaras[cid]
            salida.append({'id': cid, 'nombre': camara.id, 'estado': cam.estado,
                           'historial': list(cam.historial),
                           'intrinsecos': self.estado.config['intrinsecos'][cid],
                           'pose': self.estado.config['poses'][cid]})
        return salida

    def correr(self, capturas=12, base=None, camaras=None):
        base = time.monotonic() if base is None else base
        for n in range(capturas):
            instante = base + n*0.1
            for camara in (camaras if camaras is not None else self.escena.camaras):
                cam = self.estado.camaras[self.ids[camara.id]]
                cam.estado = 'conectada'
                self.estado.procesar(cam, Cuadro(render(self.escena, camara), instante))
            self.estado.lector.actualizar(self.fuentes(), instante)
        self.estado.lector.esperar()
        return self.estado.resumen()


class AutoridadUnicaTest(Montado):
    """El servicio es la única autoridad sobre la lectura física: publica estado versionado,
    programa, motivo y el veredicto de Scala de esa misma versión, con su traza completa."""

    def test_publica_estado_versionado_con_veredicto_y_traza(self):
        resumen = self.correr()
        lectura, veredicto = resumen['lectura'], resumen['veredicto']
        self.assertIn(lectura['estado'], ('pendiente', 'estabilizando', 'confirmada'))
        self.assertEqual(lectura['estado'], 'confirmada', lectura['motivo'])
        self.assertEqual(lectura['programa'], list(self.escena.programa))
        self.assertEqual(veredicto['version'], lectura['version'])
        self.assertTrue(veredicto['traza'], 'el servicio tiene que entregar la traza completa')
        self.assertEqual(len(veredicto['traza']), len(veredicto['pasos']) + 1,
                         'la traza lleva el estado inicial más cada paso')
        self.assertEqual(veredicto['traza'][0]['paso'], 0)
        self.assertIsNotNone(veredicto['limite'], 'la traza tiene que venir acotada')

    def test_los_tres_estados_llevan_motivo_cuando_no_estan_confirmados(self):
        resumen = self.correr(capturas=2)
        lectura = resumen['lectura']
        if lectura['estado'] != 'confirmada':
            self.assertTrue(lectura['motivo'], 'pendiente o estabilizando exige motivo')

    def test_un_error_de_ejecucion_no_es_un_error_de_camara(self):
        """`PUSH a 3 · ADD a` se lee perfecto y Scala lo rechaza: la lectura sigue confirmada."""
        veredicto = en_scala('PUSH a 3\nADD a')
        self.assertEqual(veredicto['etapa'], 'runtime')
        self.assertEqual(veredicto['decide'], 'lenguaje')
        self.assertFalse(veredicto['valido'])
        self.assertTrue(veredicto['traza'], 'un rechazo del lenguaje también trae traza')


class PerdidaDeCamaraTest(Montado):
    def test_perder_una_camara_deshabilita_la_ejecucion_con_motivo(self):
        resumen = self.correr()
        self.assertEqual(resumen['lectura']['estado'], 'confirmada')
        version = resumen['lectura']['version']
        sola = self.escena.camaras[:1]
        resumen = self.correr(base=time.monotonic() + 5.0, camaras=sola)
        self.assertNotEqual(resumen['lectura']['estado'], 'confirmada',
                            'con una sola vista no se puede sostener la lectura')
        self.assertTrue(resumen['lectura']['motivo'])
        self.assertNotEqual(resumen['lectura']['version'], version)


class CambioDuranteValidacionTest(unittest.TestCase):
    """Cambiar una ficha mientras Scala responde: el veredicto viejo no puede activarse."""

    def test_el_veredicto_de_la_version_anterior_se_descarta(self):
        lector = Lector(vocabulario(), validar=lambda c: {'etapa': 'ok', 'valido': True, 'codigo': c})
        lector.orden, lector.version = 4, 'antes'
        self.assertFalse(lector._aceptar(3, 'antes', {'etapa': 'ok'}, 0.5))
        self.assertIsNone(lector.veredicto)

    def test_un_veredicto_lento_de_la_version_vieja_no_se_publica(self):
        lentos = []

        def lento(codigo):
            lentos.append(codigo)
            time.sleep(0.6)
            return {'etapa': 'ok', 'valido': True, 'codigo': codigo}

        lector = Lector(vocabulario(), validar=lento)
        lector.orden, lector.version = 1, 'vieja'
        lector._pedir(1, 'vieja', 'PUSH a 3')
        lector.orden, lector.version = 2, 'nueva'
        lector.esperar()
        self.assertEqual(len(lentos), 1)
        self.assertIsNone(lector.veredicto,
                          'el veredicto de la versión vieja no puede activarse con otra en curso')


class RecorridoDeTrazaTest(unittest.TestCase):
    """La página recorre la traza que entrega el servicio; no vuelve a ejecutar nada."""

    def test_la_traza_permite_recorrer_paso_a_paso(self):
        veredicto = en_scala('PUSH a 3\nPUSH a 5\nADD a')
        traza = veredicto['traza']
        self.assertEqual(veredicto['etapa'], 'ok')
        self.assertEqual([p['paso'] for p in traza], list(range(len(traza))))
        self.assertEqual(traza[0]['pilas'], {})
        self.assertEqual(traza[-1]['pilas'], {'a': [8]})
        for paso in traza:
            self.assertIn('instruccion', paso)
            self.assertIn('pilas', paso)


class CorrespondenciaCajaImagenTest(Montado):
    """Cada caja mostrada sale de la observación de esa cámara y ese cuadro."""

    def test_cada_caja_viene_de_su_camara_y_su_cuadro(self):
        resumen = self.correr()
        for camara in resumen['camaras']:
            self.assertIsNotNone(camara['cuadro'], camara['nombre'])
            self.assertEqual(camara['cuadro'], camara['secuencia'],
                             'sin desfase, el cuadro fusionado es el último capturado')
            propias = {(round(o['x'], 3), round(o['y'], 3)) for o in camara['observaciones']}
            for vista in camara['vistas']:
                self.assertIn('caja', vista)
                self.assertIn(vista['clase'],
                              ('asociada', 'contradice', 'ilegible', 'sin_asociar'))
                self.assertIn((round(vista['x'], 3), round(vista['y'], 3)), propias,
                              f"{camara['nombre']}: la caja no está entre sus observaciones")

    def test_no_hay_cajas_sin_observacion_detras(self):
        resumen = self.correr()
        for camara in resumen['camaras']:
            self.assertLessEqual(len(camara['vistas']), len(camara['observaciones']),
                                 'no puede haber más cajas que observaciones reales')

    def test_toda_caja_lleva_el_sello_del_cuadro_publicado(self):
        resumen = self.correr()
        for camara in resumen['camaras']:
            for vista in camara['vistas']:
                self.assertEqual(vista['secuencia'], camara['cuadro'],
                                 'una caja de otro cuadro no puede pintarse sobre esta imagen')

    def test_tapar_una_ficha_no_deja_cajas_de_capturas_anteriores(self):
        """Las pistas conservan su última lectura para no perder la identidad de una ficha
        tapada, pero esa lectura es de un cuadro anterior: no puede dibujarse encima de la
        imagen de ahora."""
        from plataforma.escena_virtual import Mano
        self.correr()
        literal = next(f for f in self.escena.fichas if f.lexema == '3')
        self.escena.manos = [Mano((literal.centro[0], literal.centro[1], 0.), 30., 120.)]
        resumen = self.correr(base=time.monotonic() + 5.0)
        for camara in resumen['camaras']:
            self.assertLessEqual(len(camara['vistas']), len(camara['observaciones']),
                                 f"{camara['nombre']}: cajas de más durante la oclusión")
            for vista in camara['vistas']:
                self.assertEqual(vista['secuencia'], camara['cuadro'],
                                 f"{camara['nombre']}: caja de un cuadro anterior")


class FalloDelCicloTest(Montado):
    """Un fallo del ciclo no puede dejar en pie la lectura anterior como confirmada."""

    def test_un_fallo_de_fusion_publica_pendiente_con_motivo(self):
        resumen = self.correr()
        self.assertEqual(resumen['lectura']['estado'], 'confirmada', resumen['lectura']['motivo'])
        self.assertIsNotNone(resumen['veredicto'])
        with patch.object(self.estado.lector.fusion, 'actualizar',
                          side_effect=RuntimeError('triangulación imposible')):
            self.estado.lector.actualizar(self.fuentes(), time.monotonic() + 5.0)
        resumen = self.estado.resumen()
        self.assertEqual(resumen['lectura']['estado'], 'pendiente')
        self.assertIn('triangulación imposible', resumen['lectura']['motivo'])
        self.assertEqual(resumen['lectura']['programa'], [])
        self.assertIsNone(resumen['lectura']['version'])
        self.assertIsNone(resumen['veredicto'],
                          'el veredicto anterior no puede seguir habilitando la ejecución')
        self.assertFalse(resumen['fusion']['estable'])

    def test_un_veredicto_tardio_no_revive_la_version_caida(self):
        self.correr()
        lector = self.estado.lector
        orden, version = lector.orden, lector.version
        with patch.object(lector.fusion, 'actualizar', side_effect=RuntimeError('cámara perdida')):
            lector.actualizar(self.fuentes(), time.monotonic() + 5.0)
        self.assertFalse(lector._aceptar(orden, version, {'etapa': 'ok', 'valido': True}, 0.4),
                         'una respuesta de Scala de antes del fallo no puede publicarse')
        self.assertIsNone(lector.estado()['veredicto'])

    def test_el_hilo_del_servicio_publica_pendiente_cuando_el_ciclo_falla(self):
        self.correr()
        self.assertEqual(self.estado.resumen()['lectura']['estado'], 'confirmada')
        with patch.object(self.estado.lector, 'actualizar', side_effect=RuntimeError('ciclo roto')):
            self.estado.stop_fusion.clear()
            hilo = threading.Thread(target=self.estado._fusionar, daemon=True)
            hilo.start()
            limite = time.monotonic() + 3
            while time.monotonic() < limite:
                if (self.estado.lector.estado()['lectura'] or {}).get('estado') == 'pendiente':
                    break
                time.sleep(0.02)
            self.estado.stop_fusion.set()
            hilo.join(timeout=3)
        resumen = self.estado.resumen()
        self.assertEqual(resumen['lectura']['estado'], 'pendiente')
        self.assertIn('ciclo de lectura', resumen['lectura']['motivo'])
        self.assertIsNone(resumen['veredicto'])


class EscalaDeCajasTest(Montado):
    """Las cajas vienen en coordenadas del cuadro original. Por encima de 640 px el cuadro se
    reduce para reconocer, así que publicar la resolución reducida las dibujaría desplazadas y
    más pequeñas de lo que son."""

    resolucion = (1024, 768)

    def test_la_resolucion_publicada_es_la_de_las_cajas(self):
        from reconstruir import ANCHO_TRABAJO_PX
        resumen = self.correr()
        for camara in resumen['camaras']:
            with self.subTest(camara=camara['nombre']):
                self.assertEqual(camara['resolucion_vistas'], [1024, 768])
                self.assertEqual(camara['resolucion_vistas'], camara['resolucion'])
                self.assertNotEqual(camara['resolucion_vistas'][0], ANCHO_TRABAJO_PX,
                                    'la resolución publicada no puede ser la del cuadro reducido')
                self.assertTrue(camara['vistas'] or camara['tinta'], 'sin evidencia que escalar')
                for caja in [v['caja'] for v in camara['vistas']] + camara['tinta']:
                    x, y, w, h = caja
                    self.assertTrue(0 <= x and x + w <= 1024, caja)
                    self.assertTrue(0 <= y and y + h <= 768, caja)

    def test_las_cajas_no_caben_en_el_cuadro_reducido(self):
        """Si cupieran todas, la escala equivocada pasaría inadvertida."""
        from reconstruir import ANCHO_TRABAJO_PX
        resumen = self.correr()
        anchos = [v['caja'][0] + v['caja'][2] for c in resumen['camaras'] for v in c['vistas']]
        self.assertTrue(anchos, 'no hay cajas publicadas')
        self.assertGreater(max(anchos) / ANCHO_TRABAJO_PX, 0.75,
                           'con estas cajas la escala reducida no se distinguiría de la correcta')


class CapturasDesfasadasTest(Montado):
    """Las cámaras y la fusión avanzan en hilos distintos. La imagen publicada tiene que ser la
    del cuadro del que salen las cajas, no la última que entró por la cámara."""

    def capturar(self, cuantas, desde):
        for n in range(cuantas):
            for camara in self.escena.camaras:
                cam = self.estado.camaras[self.ids[camara.id]]
                cam.estado = 'conectada'
                self.estado.procesar(cam, Cuadro(render(self.escena, camara), desde + n*0.1))

    def test_la_imagen_publicada_es_la_del_cuadro_fusionado(self):
        self.correr()
        fusionados = {c['id']: c['cuadro'] for c in self.estado.resumen()['camaras']}
        self.capturar(2, time.monotonic() + 1.2)
        resumen = self.estado.resumen()
        for camara in resumen['camaras']:
            with self.subTest(camara=camara['nombre']):
                cam = self.estado.camaras[camara['id']]
                self.assertEqual(camara['cuadro'], fusionados[camara['id']],
                                 'el cuadro publicado tiene que seguir siendo el fusionado')
                self.assertLess(camara['cuadro'], cam.secuencia,
                                'la cámara tenía que haber avanzado por delante de la fusión')
                with cam.lock:
                    self.assertIn(camara['cuadro'], cam.limpios,
                                  'la imagen de ese cuadro tiene que seguir disponible')
                for vista in camara['vistas']:
                    self.assertEqual(vista['secuencia'], camara['cuadro'])

    def test_sin_imagen_de_ese_cuadro_no_se_publica_ninguna_caja(self):
        self.correr()
        self.capturar(9, time.monotonic() + 1.2)
        resumen = self.estado.resumen()
        for camara in resumen['camaras']:
            with self.subTest(camara=camara['nombre']):
                self.assertIsNone(camara['cuadro'])
                self.assertEqual(camara['vistas'], [])
                self.assertEqual(camara['tinta'], [])
                self.assertIsNone(camara['resolucion_vistas'])


class ImagenPorCuadroTest(Montado):
    """La página pide la imagen del cuadro del que salen sus cajas. El servicio sirve ese y no
    otro: una captura más nueva no puede ocupar el sitio de la que se está dibujando."""

    def servidor(self):
        from http.server import ThreadingHTTPServer
        from servicio import crear_handler
        servidor = ThreadingHTTPServer(('127.0.0.1', 0), crear_handler(self.estado))
        hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
        hilo.start()
        return servidor, f'http://127.0.0.1:{servidor.server_port}'

    def test_sirve_el_cuadro_pedido_aunque_la_camara_ya_haya_avanzado(self):
        import urllib.error
        import urllib.request
        self.correr()
        camara = self.estado.resumen()['camaras'][0]
        servidor, base = self.servidor()
        try:
            ruta = f"{base}/api/imagen/{camara['id']}/limpio?secuencia={camara['cuadro']}"
            with urllib.request.urlopen(ruta, timeout=10) as respuesta:
                self.assertEqual(respuesta.headers['X-Secuencia'], str(camara['cuadro']))
                antes = respuesta.read()
            self.assertTrue(antes)
            for n in range(2):
                for escena_camara in self.escena.camaras:
                    cam = self.estado.camaras[self.ids[escena_camara.id]]
                    self.estado.procesar(cam, Cuadro(render(self.escena, escena_camara),
                                                     time.monotonic() + 2 + n*0.1))
            self.assertGreater(self.estado.camaras[camara['id']].secuencia, camara['cuadro'])
            with urllib.request.urlopen(ruta, timeout=10) as respuesta:
                self.assertEqual(respuesta.read(), antes,
                                 'el cuadro pedido no puede sustituirse por uno más nuevo')
            with self.assertRaises(urllib.error.HTTPError) as fallo:
                urllib.request.urlopen(f"{base}/api/imagen/{camara['id']}/limpio?secuencia=99999",
                                       timeout=10)
            self.assertEqual(fallo.exception.code, 409,
                             'un cuadro que no está no puede responderse con otra imagen')
        finally:
            servidor.shutdown()
            servidor.server_close()
