import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

from herramientas.evaluar_sesion import evaluar
from herramientas.registrar_sesion import seleccionar
from test_fusion import fuente, INTR, CONFIG


class EnsayoTest(unittest.TestCase):
    def test_no_graba_sin_calibracion_y_paso_medido(self):
        config = {'camaras': [{'id': 'a', 'tipo': 'webcam', 'fuente': '0'}], 'intrinsecos': {}, 'poses': {}}
        with self.assertRaisesRegex(ValueError, 'Falta calibrar'):
            seleccionar(config, 0)

    def test_reproduccion_distingue_confirmacion_correcta_e_incorrecta(self):
        puntos = [('PUSH', [-40, 0, 20]), ('a', [-20, 0, 20]), ('2', [0, 0, 20])]
        a = fuente('a', [-100, -70, 600], puntos)
        b = fuente('b', [100, 70, 600], puntos)
        with tempfile.TemporaryDirectory() as temporal:
            carpeta = Path(temporal)
            sesion = {'version': 1, 'camaras': [{'id': 'a', 'nombre': 'A'}, {'id': 'b', 'nombre': 'B'}],
                      'intrinsecos': {'a': INTR, 'b': INTR}, 'poses': {'a': a['pose'], 'b': b['pose']},
                      'fusion': CONFIG, 'esperado': 'PUSH a 2', 'escena': 'completa', 'debe_ejecutar': True}
            (carpeta / 'sesion.json').write_text(json.dumps(sesion))
            imagen = np.full((480, 640, 3), 255, np.uint8)
            observaciones = []
            with (carpeta / 'cuadros.jsonl').open('w') as manifiesto:
                for n in range(12):
                    archivos = {}
                    for camara, origen in [('a', a), ('b', b)]:
                        nombre = f'{camara}_{n}.png'
                        cv2.imwrite(str(carpeta / nombre), imagen)
                        archivos[camara] = nombre
                        observaciones.append((imagen, [{'observacion': o} for o in origen['historial'][0]['observaciones']]))
                    manifiesto.write(json.dumps({'t': n * .1, 'imagenes': archivos}) + '\n')
            with patch('herramientas.evaluar_sesion.leer_cuadro', side_effect=observaciones):
                informe = evaluar(carpeta)
            self.assertEqual(informe['cuadros'], 12)
            self.assertGreater(informe['confirmaciones_correctas'], 0)
            self.assertEqual(informe['confirmaciones_incorrectas'], 0)
            self.assertGreater(informe['pendientes'], 0)
            sesion['esperado'] = 'MOV a 2'
            (carpeta / 'sesion.json').write_text(json.dumps(sesion))
            with patch('herramientas.evaluar_sesion.leer_cuadro', side_effect=observaciones):
                incorrecto = evaluar(carpeta)
            self.assertGreater(incorrecto['confirmaciones_incorrectas'], 0)


if __name__ == '__main__':
    unittest.main()
