"""Medidas del montaje físico y configuración de fusión que se deriva de ellas.

Módulo neutral a propósito: lo comparten la ruta de servicio (`lector`, `estado`) y el gemelo
digital (`escena_virtual`), así que no importa ninguno de los dos ni depende de OpenCV. Los
valores son los del montaje real; cambiarlos cambia lo que la fusión acepta como paso entre
bloques y como plano de las fichas.
"""

PASO_CORTO_MM = 95.0
PASO_LARGO_MM = 115.0
PLANO_FICHA_MIN_MM = 22.0
PLANO_FICHA_MAX_MM = 56.0
AREA_TRABAJO = {'x_min': -60.0, 'x_max': 500.0, 'y_min': -120.0, 'y_max': 320.0}

CONFIGURACION_PASOS = {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM, 'paso_2_mm': PASO_LARGO_MM, 'medido': True,
                       'plano_min_mm': PLANO_FICHA_MIN_MM, 'plano_max_mm': PLANO_FICHA_MAX_MM,
                       'area_trabajo': dict(AREA_TRABAJO)}
