"""Almacén del conjunto físico: originales, historial, CVAT y reparto. No mide el detector."""

import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import numpy as np

from plataforma import cvat, dataset
from plataforma.dispositivos import Cuadro
from plataforma.mesa import Mesa, region_de_la_mesa
from plataforma.sesiones import Dataset

INTR = {'camera_matrix': [[900., 0., 32.], [0., 900., 24.], [0., 0., 1.]]}


def color(ancho=64, alto=48, tono=200):
    return np.full((alto, ancho, 3), tono, np.uint8)


def mesa_sintetica(resolucion=(64, 48), d=-800.0):
    ancho, alto = resolucion
    return Mesa((np.array([0., 0., -1.]), d), np.ones((alto, ancho), np.uint8),
                {'a': 3.0, 'b': 0.0, 'sigma_global': 3.0}, resolucion, INTR)


class _Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.ds = Dataset(Path(self._tmp.name) / 'dataset')
        self.s = self.ds.crear_sesion('2026-10-11-cenital')
        self.s.agregar_camara('rs0', 'realsense', fuente='944622074682')

    def tearDown(self):
        self._tmp.cleanup()

    def vista(self, escena='cadena', montaje='push-a-3', con_profundidad=True, sesion=None):
        s = sesion or self.s
        toma = s.nueva_toma(montaje, escena)
        prof = np.full((48, 64), 800.0) if con_profundidad else None
        s.guardar_vista(toma, 'rs0', color(), prof, {'intrinsecos': INTR})
        return toma


class EsquemaTest(unittest.TestCase):
    def test_los_identificadores_no_admiten_guion_bajo(self):
        """El nombre de imagen para CVAT es `<sesion>__<toma>__<camara>`."""
        for malo in ('Sesion', 'con_guion', '', 'a b', '-empieza'):
            with self.subTest(malo=malo), self.assertRaises(ValueError):
                dataset.validar_id(malo)
        self.assertEqual(dataset.validar_id('2026-10-11-cenital'), '2026-10-11-cenital')

    def test_una_escena_negativa_con_caras_es_un_error(self):
        a = dataset.anotacion_nueva('s', 't', 'c', '', 'mesa_vacia')
        a['caras'] = [dataset.cara([1, 2, 3, 4])]
        self.assertTrue(any('negativa' in f for f in dataset.validar(a)))

    def test_la_misma_pieza_no_puede_salir_dos_veces_en_una_vista(self):
        a = dataset.anotacion_nueva('s', 't', 'c', 'm', 'cadena')
        a['caras'] = [dataset.cara([1, 2, 3, 4], 'PUSH', 'p1'), dataset.cara([9, 2, 3, 4], 'a', 'p1')]
        self.assertTrue(any('dos veces' in f for f in dataset.validar(a)))

    def test_revisada_exige_escena_y_caras(self):
        a = dataset.anotacion_nueva('s', 't', 'c', 'm', 'cadena')
        self.assertFalse(dataset.revisada(a))
        a['escena_revisada_por'] = 'carla'
        self.assertFalse(dataset.revisada(a), 'la escena sola no basta')
        a['caras_revisadas_por'] = 'carla'
        self.assertTrue(dataset.revisada(a))


class ConflictosEntreVistasTest(unittest.TestCase):
    def vista(self, camara, caras, escena='cadena'):
        a = dataset.anotacion_nueva('s', 't', camara, 'm', escena)
        a['escena_revisada_por'] = 'carla'
        a['caras'] = caras
        return a

    def test_la_misma_pieza_leida_distinto_es_un_conflicto_pendiente(self):
        conflictos = dataset.conflictos_de_toma([
            self.vista('rs0', [dataset.cara([0, 0, 9, 9], 'ADD', 'p1')]),
            self.vista('w1', [dataset.cara([5, 5, 9, 9], 'SUB', 'p1')])])
        self.assertEqual(len(conflictos), 1)
        self.assertIn('p1', conflictos[0])

    def test_una_camara_que_no_ve_la_pieza_no_contradice_a_otra(self):
        self.assertEqual(dataset.conflictos_de_toma([
            self.vista('rs0', [dataset.cara([0, 0, 9, 9], 'ADD', 'p1')]),
            self.vista('w1', [])]), [])

    def test_sin_leer_en_una_vista_no_es_desacuerdo(self):
        self.assertEqual(dataset.conflictos_de_toma([
            self.vista('rs0', [dataset.cara([0, 0, 9, 9], 'ADD', 'p1')]),
            self.vista('w1', [dataset.cara([5, 5, 9, 9], dataset.SIN_LEER, 'p1')])]), [])


class SesionesTest(_Base):
    def test_un_original_no_se_sobrescribe(self):
        toma = self.vista()
        with self.assertRaises(FileExistsError):
            self.s.guardar_vista(toma, 'rs0', color(tono=10), None, {})
        recuperado, _, _ = self.s.cargar_vista(toma, 'rs0')
        self.assertEqual(int(recuperado[0, 0, 0]), 200, 'el original debe seguir intacto')

    def test_una_webcam_guarda_solo_color(self):
        self.s.agregar_camara('w1', 'webcam', fuente='1')
        toma = self.s.nueva_toma('push-a-3', 'cadena')
        info = self.s.guardar_vista(toma, 'w1', color(), None, {})
        self.assertFalse(info['profundidad'])
        _, prof, _ = self.s.cargar_vista(toma, 'w1')
        self.assertIsNone(prof)

    def test_profundidad_desalineada_no_deja_restos(self):
        toma = self.s.nueva_toma('push-a-3', 'cadena')
        with self.assertRaises(ValueError):
            self.s.guardar_vista(toma, 'rs0', color(), np.zeros((10, 10)), {})
        self.assertFalse(Path(str(self.s.ruta_vista(toma, 'rs0')) + '.color.png').exists())

    def test_varias_camaras_comparten_toma(self):
        self.s.agregar_camara('w1', 'webcam', fuente='1')
        toma = self.vista()
        self.s.guardar_vista(toma, 'w1', color(), None, {})
        self.assertEqual(self.s.vistas(toma), ['rs0', 'w1'])

    def test_corregir_una_anotacion_guarda_la_version_anterior(self):
        toma = self.vista()
        a = self.s.anotacion(toma, 'rs0')
        a['caras'] = [dataset.cara([1, 1, 5, 5], 'PUSH', 'p1')]
        self.s.guardar_anotacion(toma, 'rs0', a, 'carla', 'cli', 'primera')
        a = self.s.anotacion(toma, 'rs0')
        a['caras'][0]['caja'] = [2, 2, 5, 5]
        self.s.guardar_anotacion(toma, 'rs0', a, 'carla', 'cvat', 'corregida')
        anteriores = self.s.historial(toma, 'rs0')
        self.assertEqual(len(anteriores), 1)
        self.assertEqual(json.loads(anteriores[0].read_text())['caras'][0]['caja'], [1, 1, 5, 5])
        self.assertEqual([c['resumen'] for c in self.s.anotacion(toma, 'rs0')['cambios']],
                         ['primera', 'corregida'])

    def test_una_correccion_sin_autor_se_niega(self):
        toma = self.vista()
        with self.assertRaises(ValueError):
            self.s.guardar_anotacion(toma, 'rs0', self.s.anotacion(toma, 'rs0'), '', 'cli')

    def test_la_camara_del_servicio_se_reconoce_por_tipo_y_fuente(self):
        self.assertEqual(self.s.camara_para('realsense', '944622074682'), 'rs0')
        self.assertIsNone(self.s.camara_para('realsense', 'otro-serial'))
        self.assertIsNone(self.s.camara_para('webcam', '944622074682'))

    def test_la_referencia_de_mesa_es_de_cada_camara(self):
        self.s.agregar_camara('rs1', 'realsense', fuente='otro')
        mesa_sintetica(d=-700.0).guardar(self.s.ruta_mesa('rs0'))
        self.assertAlmostEqual(self.s.mesa('rs0').plano[1], -700.0)
        self.assertIsNone(self.s.mesa('rs1'))


class RepartoTest(_Base):
    def test_verificacion_y_legado_nunca_entran_en_el_reparto(self):
        self.ds.crear_sesion('verificacion-recorrido', proposito='verificacion')
        with self.assertRaises(ValueError):
            self.ds.asignar('verificacion-recorrido', 'prueba')
        self.assertEqual(self.ds.grupo('verificacion-recorrido'), 'fuera')

    def test_lo_que_ya_es_de_prueba_no_pasa_a_entrenar_sin_forzar(self):
        self.ds.asignar('2026-10-11-cenital', 'prueba')
        with self.assertRaises(ValueError):
            self.ds.asignar('2026-10-11-cenital', 'entrenamiento')
        self.ds.asignar('2026-10-11-cenital', 'entrenamiento', forzar=True)
        self.assertEqual(self.ds.grupo('2026-10-11-cenital'), 'entrenamiento')

    def test_todas_las_vistas_de_una_sesion_caen_en_el_mismo_grupo(self):
        self.s.agregar_camara('w1', 'webcam', fuente='1')
        for _ in range(3):
            toma = self.vista()
            self.s.guardar_vista(toma, 'w1', color(), None, {})
        otra = self.ds.crear_sesion('2026-10-14-oblicua')
        otra.agregar_camara('rs0', 'realsense', fuente='944622074682')
        self.vista(sesion=otra)
        self.ds.asignar('2026-10-11-cenital', 'prueba')
        self.ds.asignar('2026-10-14-oblicua', 'entrenamiento')
        prueba = list(self.ds.vistas({'prueba'}))
        self.assertEqual(len(prueba), 6)
        self.assertEqual({s for s, _, _ in prueba}, {'2026-10-11-cenital'})


class IndiceTest(_Base):
    def test_el_indice_sale_de_las_anotaciones(self):
        toma = self.vista()
        a = self.s.anotacion(toma, 'rs0')
        a.update(caras=[dataset.cara([1, 2, 3, 4], 'PUSH', 'p1')], escena_revisada_por='carla',
                 caras_revisadas_por='carla')
        self.s.guardar_anotacion(toma, 'rs0', a, 'carla', 'cli')
        self.vista(escena='mesa_vacia', montaje='')
        vistas, caras = self.ds.indexar()
        self.assertEqual((vistas, caras), (2, 1))
        import csv
        with open(self.ds.raiz / 'indice' / 'caras.csv', encoding='utf-8') as f:
            fila = next(csv.DictReader(f))
        self.assertEqual((fila['simbolo'], fila['pieza'], fila['revisada']), ('PUSH', 'p1', 'True'))


class CvatTest(_Base):
    def exportar(self, *tomas):
        destino = self.ds.raiz / 'cvat' / 'lote'
        return cvat.exportar(self.ds, [(self.s.id, t, 'rs0') for t in tomas], destino), destino

    def zip_de_cvat(self, imagenes, ruta, ancho=64, alto=48, categoria='cara'):
        """Exportación de CVAT en COCO 1.0, escrita sin usar `cvat.coco`."""
        datos = {'licenses': [{'name': '', 'id': 0, 'url': ''}], 'info': {},
                 'categories': [{'id': 1, 'name': categoria, 'supercategory': ''}],
                 'images': [], 'annotations': []}
        n = 1
        for i, (nombre, cajas) in enumerate(imagenes, 1):
            datos['images'].append({'id': i, 'width': ancho, 'height': alto, 'file_name': nombre,
                                    'license': 0, 'flickr_url': '', 'coco_url': '',
                                    'date_captured': 0})
            for caja, simbolo, pieza in cajas:
                datos['annotations'].append({
                    'id': n, 'image_id': i, 'category_id': 1, 'segmentation': [],
                    'area': float(caja[2] * caja[3]), 'bbox': [float(v) for v in caja],
                    'iscrowd': 0, 'attributes': {'simbolo': simbolo, 'pieza': pieza,
                                                 'occluded': False, 'rotation': 0.0}})
                n += 1
        with zipfile.ZipFile(ruta, 'w') as z:
            z.writestr('annotations/instances_default.json', json.dumps(datos))
        return ruta

    def test_el_nombre_de_imagen_se_descompone_sin_manifiesto(self):
        nombre = cvat.nombre_imagen('2026-10-11-cenital', 't20261011-101530', 'rs0')
        self.assertEqual(cvat.separar_nombre('carpeta/' + nombre),
                         ('2026-10-11-cenital', 't20261011-101530', 'rs0'))
        self.assertIsNone(cvat.separar_nombre('cualquier.png'))

    def test_ida_y_vuelta_con_una_exportacion_de_cvat(self):
        toma = self.vista()
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        self.assertTrue((destino / 'imagenes' / nombre).is_file())
        self.assertTrue((destino / 'cvat_etiquetas.json').is_file())
        zip_ = self.zip_de_cvat([(nombre, [([4, 5, 10, 11], 'PUSH', 'p1'), ([20, 5, 9, 9], 'a', '-')])],
                                destino / 'export.zip')
        informe = cvat.importar(self.ds, cvat.leer_coco(zip_), 'carla', manifiesto)
        self.assertEqual(informe['importadas'], [(nombre, 2)])
        a = self.s.anotacion(toma, 'rs0')
        self.assertEqual([c['simbolo'] for c in a['caras']], ['PUSH', 'a'])
        self.assertEqual([c['pieza'] for c in a['caras']], ['p1', None])
        self.assertEqual(a['caras_revisadas_por'], 'carla')
        self.assertFalse(dataset.revisada(a), 'la escena sigue sin confirmar')

    def test_la_importacion_no_hereda_completa_ni_zona_del_borrador(self):
        toma = self.vista()
        a = self.s.anotacion(toma, 'rs0')
        a.update(caras=[dataset.cara([4, 5, 10, 11])], caras_origen='borrador', completa=True,
                 zona=[0, 0, 30, 30], zona_motivo='borrador')
        self.s.guardar_anotacion(toma, 'rs0', a, 'claude', 'borrador')
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat([(nombre, [([4, 5, 10, 11], 'PUSH', 'p1')])],
                                                                destino / 'z.zip')), 'carla', manifiesto)
        a = self.s.anotacion(toma, 'rs0')
        self.assertFalse(a['completa'])
        self.assertIsNone(a['zona'])

    def test_solo_se_importan_las_imagenes_pedidas(self):
        from herramientas import dataset_fisico
        hecha, sin_tocar = self.vista(), self.vista()
        self.exportar(hecha, sin_tocar)
        destino = self.ds.raiz / 'cvat' / 'lote'
        nombres = [cvat.nombre_imagen(self.s.id, t, 'rs0') for t in (hecha, sin_tocar)]
        zip_ = self.zip_de_cvat([(n, [([4, 5, 10, 11], 'PUSH', 'p1')]) for n in nombres], destino / 'z.zip')
        dataset_fisico.main(['--raiz', str(self.ds.raiz), 'cvat-importar', str(zip_), '--lote', 'lote',
                             '--revisor', 'carla', '--solo', nombres[0]])
        self.assertEqual(self.s.anotacion(hecha, 'rs0')['caras_revisadas_por'], 'carla')
        self.assertEqual(self.s.anotacion(sin_tocar, 'rs0')['caras_revisadas_por'], '')

    def test_una_imagen_sin_cajas_no_cuenta_como_revisada_si_tiene_fichas(self):
        """CVAT exporta todas las imágenes de la tarea, anotadas o no."""
        toma = self.vista()
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        informe = cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat([(nombre, [])], destino / 'z.zip')),
                                'carla', manifiesto)
        self.assertEqual(informe['sin_cajas'], [nombre])
        self.assertEqual(self.s.anotacion(toma, 'rs0')['caras_revisadas_por'], '')

    def test_una_escena_negativa_sin_cajas_si_queda_revisada(self):
        toma = self.vista(escena='mesa_vacia', montaje='')
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat([(nombre, [])], destino / 'z.zip')),
                      'carla', manifiesto)
        self.assertEqual(self.s.anotacion(toma, 'rs0')['caras_revisadas_por'], 'carla')

    def test_cajas_en_una_escena_declarada_vacia_se_rechazan(self):
        toma = self.vista(escena='mesa_vacia', montaje='')
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        informe = cvat.importar(self.ds, cvat.leer_coco(
            self.zip_de_cvat([(nombre, [([4, 5, 10, 11], 'PUSH', 'p1')])], destino / 'z.zip')),
            'carla', manifiesto)
        self.assertEqual(len(informe['rechazadas']), 1)
        self.assertIn('negativa', informe['rechazadas'][0][1])

    def test_un_tamano_distinto_se_rechaza(self):
        toma = self.vista()
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        informe = cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat(
            [(nombre, [([1, 1, 5, 5], 'PUSH', 'p1')])], destino / 'z.zip', ancho=1280, alto=720)),
            'carla', manifiesto)
        self.assertIn('tamaño', informe['rechazadas'][0][1])

    def test_una_imagen_que_no_es_la_exportada_se_rechaza(self):
        toma = self.vista()
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        manifiesto['imagenes'][nombre]['sha256'] = '0' * 64
        informe = cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat(
            [(nombre, [([1, 1, 5, 5], 'PUSH', 'p1')])], destino / 'z.zip')), 'carla', manifiesto)
        self.assertIn('no es la que se exportó', informe['rechazadas'][0][1])

    def test_etiquetas_con_nombre_de_simbolo_tambien_valen(self):
        toma = self.vista()
        manifiesto, destino = self.exportar(toma)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat(
            [(nombre, [([1, 1, 5, 5], '', '-')])], destino / 'z.zip', categoria='ADD')),
            'carla', manifiesto)
        self.assertEqual(self.s.anotacion(toma, 'rs0')['caras'][0]['simbolo'], 'ADD')

    def test_lo_precargado_por_el_detector_queda_marcado(self):
        toma = self.vista()
        destino = self.ds.raiz / 'cvat' / 'previo'
        with patch('plataforma.localizacion.localizar', return_value=([], [], {})):
            manifiesto = cvat.exportar(self.ds, [(self.s.id, toma, 'rs0')], destino, precargar=True)
        nombre = cvat.nombre_imagen(self.s.id, toma, 'rs0')
        cvat.importar(self.ds, cvat.leer_coco(self.zip_de_cvat(
            [(nombre, [([1, 1, 5, 5], 'PUSH', 'p1')])], destino / 'z.zip')), 'carla', manifiesto)
        self.assertTrue(self.s.anotacion(toma, 'rs0')['caras_precargadas_del_detector'])


class CapturaTest(_Base):
    def test_la_captura_escribe_una_toma_por_cuadro(self):
        from herramientas.guardar_muestra import capturar

        class Fuente:
            def leer(self):
                return Cuadro(color(), 1.5, np.full((48, 64), 800.0), INTR)

        tomas = capturar(self.s, 'rs0', Fuente(), 'cadena', 'push-a-3', cuantas=2, cada=0)
        self.assertEqual(len(tomas), 2)
        for toma in tomas:
            _, prof, meta = self.s.cargar_vista(toma, 'rs0')
            self.assertIsNotNone(prof)
            self.assertEqual(meta['intrinsecos'], INTR)
            self.assertIn('instante_pared', meta)
            self.assertFalse(dataset.revisada(self.s.anotacion(toma, 'rs0')))


class RegionTest(unittest.TestCase):
    def test_un_objeto_sobre_la_mesa_al_tomar_la_referencia_no_deja_un_hueco(self):
        """La mesa sigue debajo de lo que tuviera encima."""
        h = np.zeros((120, 160))
        h[50:70, 70:90] = 35.0
        h[:, 150:] = -750.0
        region = region_de_la_mesa(h, np.ones_like(h, bool))
        self.assertTrue(region[60, 80], 'el sitio del objeto debe seguir dentro de la región')
        self.assertFalse(region[60, 155], 'el suelo, 750 mm por debajo, no puede entrar')


class EvaluadorTest(_Base):
    def test_cada_vista_se_evalua_con_la_referencia_de_su_sesion(self):
        from herramientas import evaluar_localizacion

        otra = self.ds.crear_sesion('2026-10-14-oblicua')
        otra.agregar_camara('rs0', 'realsense', fuente='944622074682')
        mesa_sintetica(d=-700.0).guardar(self.s.ruta_mesa('rs0'))
        mesa_sintetica(d=-1100.0).guardar(otra.ruta_mesa('rs0'))
        toma = self.vista(sesion=otra)
        a = otra.anotacion(toma, 'rs0')
        a.update(caras=[dataset.cara([1, 1, 5, 5])], escena_revisada_por='c', caras_revisadas_por='c')
        otra.guardar_anotacion(toma, 'rs0', a, 'c', 'cli')
        usadas = []

        def falso(color, profundidad, intrinsecos, mesa=None):
            usadas.append(mesa.plano[1])
            return [], [], {'motivo': ''}

        with patch.object(evaluar_localizacion, 'localizar', falso):
            fila = evaluar_localizacion.evaluar_vista(self.ds, otra.id, toma, 'rs0')
        self.assertEqual(usadas, [-1100.0], 'debe usar la referencia de su sesión, no la otra')
        self.assertEqual([c['hallada'] for c in fila['caras']], [False])

    def test_lo_que_no_esta_revisado_no_se_mide(self):
        from herramientas import evaluar_localizacion
        toma = self.vista()
        fila = evaluar_localizacion.evaluar_vista(self.ds, self.s.id, toma, 'rs0')
        self.assertEqual(fila['motivo'], 'sin revisar')

    def test_una_vista_sin_profundidad_se_mide_por_la_ruta_rgb(self):
        from herramientas import evaluar_localizacion
        self.s.agregar_camara('w1', 'webcam', fuente='1')
        toma = self.s.nueva_toma('push-a-3', 'cadena')
        self.s.guardar_vista(toma, 'w1', color(), None, {})
        a = self.s.anotacion(toma, 'w1')
        a.update(caras=[dataset.cara([1, 1, 5, 5])], escena_revisada_por='c', caras_revisadas_por='c')
        self.s.guardar_anotacion(toma, 'w1', a, 'c', 'cli')
        fila = evaluar_localizacion.evaluar_vista(self.ds, self.s.id, toma, 'w1')
        self.assertEqual(fila['motivo'], '')
        self.assertEqual(fila['ruta'], 'rgb')

    def test_un_borrador_solo_se_mide_si_se_pide(self):
        from herramientas import evaluar_localizacion
        toma = self.vista()
        a = self.s.anotacion(toma, 'rs0')
        a.update(caras=[dataset.cara([1, 1, 5, 5])], caras_origen='borrador')
        self.s.guardar_anotacion(toma, 'rs0', a, 'claude', 'borrador')
        mesa_sintetica().guardar(self.s.ruta_mesa('rs0'))
        self.assertEqual(evaluar_localizacion.evaluar_vista(self.ds, self.s.id, toma, 'rs0')['motivo'],
                         'sin revisar')
        fila = evaluar_localizacion.evaluar_vista(self.ds, self.s.id, toma, 'rs0', borradores=True)
        self.assertTrue(fila['borrador'])
        self.assertEqual(fila['motivo'], '')

    def test_el_emparejamiento_es_uno_a_uno_y_no_depende_del_orden(self):
        from herramientas.evaluar_localizacion import emparejar
        caras = [dataset.cara([0, 0, 10, 10]), dataset.cara([5, 0, 10, 10])]
        candidatos = [{'caja': [4, 0, 10, 10]}]
        self.assertEqual(emparejar(caras, candidatos, 0.25), {1: 0})
        self.assertEqual(emparejar(caras[::-1], candidatos, 0.25), {0: 0},
                         'el candidato va a la cara con más solape, esté primero o no')

    def test_la_zona_se_aplica_a_caras_y_candidatos(self):
        from herramientas import evaluar_localizacion
        self.s.agregar_camara('w1', 'webcam', fuente='1')
        toma = self.s.nueva_toma('push-a-3', 'cadena')
        self.s.guardar_vista(toma, 'w1', color(), None, {})
        a = self.s.anotacion(toma, 'w1')
        a.update(caras=[dataset.cara([1, 1, 5, 5]), dataset.cara([60, 40, 5, 5])],
                 zona=[0, 0, 20, 20], zona_motivo='prueba', completa=True,
                 escena_revisada_por='c', caras_revisadas_por='c')
        self.s.guardar_anotacion(toma, 'w1', a, 'c', 'cli')
        fuera = [{'caja': [1, 1, 5, 5]}, {'caja': [70, 50, 5, 5]}]
        with patch.object(evaluar_localizacion, 'localizar_rgb', lambda c: (fuera, [], {})):
            fila = evaluar_localizacion.evaluar_vista(self.ds, self.s.id, toma, 'w1')
        self.assertEqual(len(fila['caras']), 1)
        self.assertEqual(fila['candidatos'], 1)
        self.assertEqual(fila['sin_pareja'][0.25], 0)


class ReferenciasTest(_Base):
    def poner(self, sesion, revisada):
        toma = sesion.nueva_toma('ficha-push', 'ficha_sola')
        imagen = color()
        imagen[15:35, 20:24] = 0
        imagen[15:19, 20:40] = 0
        sesion.guardar_vista(toma, 'rs0', imagen, None, {})
        a = sesion.anotacion(toma, 'rs0')
        a['caras'] = [dataset.cara([10, 8, 40, 32], 'PUSH')]
        if revisada:
            a.update(escena_revisada_por='carla', caras_revisadas_por='carla')
        else:
            a.update(caras_origen='borrador')
        sesion.guardar_anotacion(toma, 'rs0', a, 'carla' if revisada else 'claude', 'cli')
        return toma

    def test_solo_salen_de_caras_revisadas_de_entrenamiento(self):
        from herramientas import dataset_fisico
        prueba = self.ds.crear_sesion('2026-10-12-prueba')
        prueba.agregar_camara('rs0', 'realsense', fuente='944622074682')
        buena = self.poner(self.s, True)
        self.poner(self.s, False)
        self.poner(prueba, True)
        self.ds.asignar(self.s.id, 'entrenamiento')
        self.ds.asignar(prueba.id, 'prueba')
        voc = Path(self._tmp.name) / 'voc'
        argv = ['--raiz', str(self.ds.raiz), 'referencias', '--lexema', 'PUSH', '--guardar',
                '--vocabulario', str(voc)]
        dataset_fisico.main(argv)
        dataset_fisico.main(argv)
        guardadas = json.loads((voc / 'simbolos.json').read_text())
        self.assertEqual(len(guardadas), 1, 'ni el borrador, ni la prueba, ni repetir la orden')
        self.assertEqual(guardadas[0]['procedencia']['toma'], buena)
        self.assertEqual(guardadas[0]['procedencia']['revisor'], 'carla')
        self.assertEqual(guardadas[0]['procedencia']['caja'], [10, 8, 40, 32])


if __name__ == '__main__':
    unittest.main()
