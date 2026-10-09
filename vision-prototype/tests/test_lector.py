import time
import unittest

import reconstruir
from plataforma.ensayo import Mesa, dos_webcams, girar
from plataforma.escena_virtual import Camara, centro_de, olvidar_vistas
from plataforma.guiones import GUIONES
from plataforma.lector import Lector, version_de
from plataforma.recorrido import recorrer
from plataforma.fusion import puede_ejecutar

from tests.entorno import vocabulario

SIN_SCALA = {'etapa': 'ok', 'valido': True}


def lento(espera):
    def validar(codigo):
        time.sleep(espera)
        return {'etapa': 'ok', 'valido': True, 'codigo': codigo}
    return validar


class VersionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()

    def leer(self, programa, camaras=dos_webcams, pasos=12):
        mesa = Mesa(self.voc, programa, camaras)
        lector = Lector(self.voc, validar=lambda c: SIN_SCALA)
        mesa.capturas(lector, pasos)
        lector.esperar()
        return mesa, lector

    def test_el_mismo_montaje_da_la_misma_version(self):
        _, uno = self.leer(['PUSH a 3'])
        _, dos = self.leer(['PUSH a 3'])
        self.assertEqual(uno.version, dos.version)

    def test_cambiar_una_ficha_cambia_la_version_y_el_programa(self):
        mesa, lector = self.leer(['PUSH a 3'])
        antes = lector.version
        self.assertEqual(lector.estado()['lectura']['programa'], ['PUSH a 3'])
        mesa.cambiar('3', '5')
        mesa.capturas(lector, 12)
        lector.esperar()
        self.assertNotEqual(lector.version, antes)
        self.assertEqual(lector.estado()['lectura']['programa'], ['PUSH a 5'])

    def test_una_version_identica_no_se_reejecuta_en_cada_captura(self):
        _, lector = self.leer(['PUSH a 3'], pasos=24)
        completas = [h for h in lector.historial if h['estado'] == 'confirmada']
        self.assertGreater(len(completas), 10, 'el montaje se lee completo en muchas capturas')
        self.assertEqual(len(lector.ejecuciones), 1,
                         f'{len(lector.ejecuciones)} validaciones para un solo programa distinto')
        self.assertEqual(len(lector.cache), 1)

    def test_el_veredicto_lleva_la_version_que_lo_produjo(self):
        _, lector = self.leer(['PUSH a 3'])
        estado = lector.estado()
        self.assertEqual(estado['veredicto']['version'], estado['lectura']['version'])


class VeredictoAtrasadoTest(unittest.TestCase):
    """Una respuesta de Scala que llega tarde no puede reemplazar una lectura más nueva."""

    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()

    def test_un_veredicto_de_una_version_vieja_se_descarta(self):
        lector = Lector(self.voc, validar=lambda c: SIN_SCALA)
        lector.orden, lector.version = 7, 'nueva'
        aceptado = lector._aceptar(3, 'vieja', {'etapa': 'ok'}, 0.1)
        self.assertFalse(aceptado, 'un veredicto de la versión 3 no entra con la 7 en curso')
        self.assertIsNone(lector.veredicto)

    def test_un_veredicto_de_la_version_en_curso_si_entra(self):
        lector = Lector(self.voc, validar=lambda c: SIN_SCALA)
        lector.orden, lector.version = 7, 'nueva'
        self.assertTrue(lector._aceptar(7, 'nueva', {'etapa': 'ok'}, 0.1))
        self.assertEqual(lector.veredicto['orden'], 7)

    def test_un_veredicto_lento_no_pisa_el_montaje_siguiente(self):
        mesa = Mesa(self.voc, ['PUSH a 3'], dos_webcams)
        lector = Lector(self.voc, validar=lento(1.5))
        mesa.capturas(lector, 12)
        mesa.cambiar('3', '5')
        mesa.capturas(lector, 12)
        lector.esperar()
        estado = lector.estado()
        self.assertEqual(estado['lectura']['programa'], ['PUSH a 5'])
        if estado['veredicto']:
            self.assertEqual(estado['veredicto']['version'], estado['lectura']['version'])
            self.assertIn('PUSH a 5', estado['veredicto'].get('codigo', 'PUSH a 5'))


class BarridoDePosesTest(unittest.TestCase):
    """Más allá de las tres poses a 1024 px que antes fallaban: un barrido de alturas, campos y
    anchos de trabajo. En ninguna configuración puede confirmarse algo distinto de la mesa."""

    alturas = (380., 440., 500.)
    campos = (40., 45., 52.)
    anchos = (640, 1024)

    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()

    def test_ninguna_pose_confirma_un_programa_que_no_esta(self):
        malas, probadas = [], 0
        original = reconstruir.ANCHO_TRABAJO_PX
        try:
            for ancho in self.anchos:
                reconstruir.ANCHO_TRABAJO_PX = ancho
                for altura in self.alturas:
                    for fov in self.campos:
                        olvidar_vistas()
                        escena, guion = GUIONES['completa'][0](self.voc)
                        centro = centro_de(escena.fichas)
                        mira = [float(centro[0]), float(centro[1]), 30.]
                        resolucion = (ancho, ancho*3//4)
                        escena.camaras = [
                            Camara('web1', 'izquierda', [centro[0] - 30., -45., altura], mira, fov, resolucion),
                            Camara('web2', 'derecha', [centro[0] + 30., -45., altura], mira, fov, resolucion)]
                        resultado, _ = recorrer(escena, guion, self.voc, 12)
                        probadas += 1
                        codigo = [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
                        real = list(escena.programa)
                        if puede_ejecutar(resultado) and codigo != real:
                            malas.append((ancho, altura, fov, codigo))
                        elif not puede_ejecutar(resultado):
                            self.assertTrue(resultado['avisos'], f'{ancho}/{altura}/{fov}: pendiente sin motivo')
        finally:
            reconstruir.ANCHO_TRABAJO_PX = original
            olvidar_vistas()
        self.assertEqual(probadas, len(self.anchos)*len(self.alturas)*len(self.campos))
        self.assertEqual(malas, [], f'{len(malas)} configuraciones confirman un programa que no está')


class HuecoNoVacioTest(unittest.TestCase):
    """A 1024 px de ancho de trabajo había disposiciones que confirmaban `PUSH a 3` con
    `PUSH a 3 · ADD a` sobre la mesa y sin ningún aviso. El hueco donde seguiría la cadena se
    comprobaba visible, no vacío."""

    casos = ((500., 40.), (500., 45.), (440., 45.))
    ancho = 1024

    @classmethod
    def setUpClass(cls):
        cls.voc = vocabulario()

    def setUp(self):
        self.original = reconstruir.ANCHO_TRABAJO_PX
        reconstruir.ANCHO_TRABAJO_PX = self.ancho
        olvidar_vistas()

    def tearDown(self):
        reconstruir.ANCHO_TRABAJO_PX = self.original
        olvidar_vistas()

    def test_ninguna_disposicion_confirma_un_prefijo(self):
        for altura, fov in self.casos:
            escena, guion = GUIONES['completa'][0](self.voc)
            centro = centro_de(escena.fichas)
            mira = [float(centro[0]), float(centro[1]), 30.]
            escena.camaras = [
                Camara('web1', 'izquierda', [centro[0] - 30., -45., altura], mira, fov,
                       (self.ancho, self.ancho * 3 // 4)),
                Camara('web2', 'derecha', [centro[0] + 30., -45., altura], mira, fov,
                       (self.ancho, self.ancho * 3 // 4))]
            resultado, _ = recorrer(escena, guion, self.voc, 12)
            codigo = [' '.join([i['token'], *i['operandos']]) for i in resultado['instrucciones']]
            real = list(escena.programa)
            with self.subTest(altura=altura, fov=fov):
                if puede_ejecutar(resultado):
                    self.assertEqual(codigo, real, f'confirma {codigo} con la mesa en {real}')
                else:
                    self.assertTrue(resultado['avisos'], 'pendiente exige motivo')


class FusionDePrueba:
    """Resultados de fusión fabricados, para empujar muchas capturas sin rasterizar nada."""

    def __init__(self, completa=False):
        self.completa, self.n = completa, 0

    def actualizar(self, fuentes, config, ahora):
        self.n += 1
        return {'id': 'fusion', 'ambito': 'programa',
                'estado': 'estable' if self.completa else 'incompleta',
                'estable': self.completa, 'compatible': self.completa,
                'instrucciones': [{'token': 'PUSH', 'operandos': ['a', str(self.n)], 'virtual': False}],
                'piezas': [], 'avisos': [] if self.completa else [f'captura {self.n} sin cerrar'],
                'camaras': ['c1'], 'revision': self.n}

    def fallar(self):
        pass

    def reiniciar(self):
        self.n = 0


class LimitesDeSesionTest(unittest.TestCase):
    """Una sesión en vivo no puede crecer sin fin: historial, muestras, hilos y caché de trazas
    quedan acotados, y la traza de la versión vigente se conserva."""

    def lector(self, completa=False, validar=None):
        lector = Lector(vocabulario(), validar=validar or (lambda codigo: dict(SIN_SCALA, codigo=codigo)))
        lector.fusion = FusionDePrueba(completa)
        return lector

    def test_el_historial_y_las_muestras_quedan_acotados(self):
        from plataforma.lector import HISTORIA, MUESTRAS
        lector = self.lector()
        for n in range(HISTORIA + MUESTRAS + 50):
            lector.actualizar([], 100.0 + n*0.1)
        self.assertEqual(lector.metricas()['capturas'], HISTORIA + MUESTRAS + 50)
        self.assertLessEqual(len(lector.historial), HISTORIA)
        self.assertLessEqual(len(lector.episodios), MUESTRAS)
        self.assertLessEqual(len(lector.ejecuciones), MUESTRAS)

    def test_las_cuentas_no_dependen_del_historial_recortado(self):
        lector = self.lector(completa=True)
        for n in range(40):
            lector.actualizar([], 100.0 + n*0.1)
        lector.esperar()
        m = lector.metricas()
        self.assertEqual(m['capturas'], 40)
        self.assertEqual(m['capturas_completas'], 40)
        self.assertEqual(m['pendientes'], 0)
        self.assertEqual(m['ejecuciones'], m['versiones'] - 0, 'un programa distinto por captura')

    def test_la_cache_de_trazas_y_los_hilos_quedan_acotados(self):
        from plataforma.lector import CACHE_MAXIMA
        lector = self.lector(completa=True)
        for n in range(CACHE_MAXIMA * 3):
            lector.actualizar([], 100.0 + n*0.1)
            lector.esperar()
        self.assertLessEqual(len(lector.cache), CACHE_MAXIMA)
        self.assertEqual(lector.enviados, set(), 'un programa ya validado no sigue marcado en vuelo')
        self.assertLessEqual(len(lector.hilos), 1)
        vigente = '\n'.join(lector.estado()['lectura']['programa'])
        self.assertIn(vigente, lector.cache, 'la traza de la versión vigente se conserva')
        self.assertEqual(lector.estado()['veredicto']['version'], lector.version)

    def test_reiniciar_suelta_la_cache(self):
        lector = self.lector(completa=True)
        lector.actualizar([], 100.0)
        lector.esperar()
        self.assertTrue(lector.cache)
        lector.reiniciar()
        self.assertEqual(lector.cache, {})
        self.assertIsNone(lector.version)


class MedidasDeGrabacionTest(unittest.TestCase):
    """Una grabación de cámaras reales no se puede evaluar con las medidas ni las referencias
    del montaje virtual: lo que falte se informa y el resultado no se presenta como aceptación
    física."""

    def medidas(self, **cambios):
        from argparse import Namespace
        from herramientas.leer_grabacion import medidas
        datos = {'paso_mm': 95.0, 'paso_2_mm': None, 'paso_unico': False,
                 'plano_min_mm': None, 'plano_max_mm': None, 'area': None}
        return medidas(Namespace(**{**datos, **cambios}))

    def test_sin_las_medidas_del_montaje_se_informa_que_faltan(self):
        config, faltan = self.medidas()
        self.assertEqual(len(faltan), 4, faltan)
        self.assertIsNone(config['paso_2_mm'], 'no se rellena con el paso de la escena virtual')
        self.assertIsNone(config['plano_min_mm'])
        self.assertIsNone(config['area_trabajo'])

    def test_con_las_medidas_dadas_no_falta_nada(self):
        config, faltan = self.medidas(paso_2_mm=115.0, plano_min_mm=3.0, plano_max_mm=14.0,
                                      area='-150,150,-60,240')
        self.assertEqual(faltan, [])
        self.assertEqual(config['area_trabajo'],
                         {'x_min': -150., 'x_max': 150., 'y_min': -60., 'y_max': 240.})
        self.assertTrue(config['medido'])

    def test_un_area_invertida_no_se_acepta(self):
        with self.assertRaises(SystemExit):
            self.medidas(area='150,-150,-60,240')

    def test_las_referencias_y_el_paso_son_obligatorios(self):
        import subprocess
        import sys
        from pathlib import Path
        raiz = Path(__file__).resolve().parents[1]
        salida = subprocess.run([sys.executable, 'herramientas/leer_grabacion.py',
                                 '--camara', 'a=uno', '--camara', 'b=dos'],
                                cwd=raiz, capture_output=True, text=True, timeout=120)
        self.assertNotEqual(salida.returncode, 0)
        self.assertIn('--datos', salida.stderr)
        self.assertIn('--paso-mm', salida.stderr)
