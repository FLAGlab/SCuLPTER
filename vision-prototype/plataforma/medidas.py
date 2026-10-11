"""Medidas del montaje físico, en mm, y configuración de fusión derivada.

No importa la ruta de servicio ni el gemelo, para que ambos puedan usarlo.
"""

PASO_CORTO_MM = 95.0
PASO_LARGO_MM = 115.0
LADO_FICHA_MM = 15.0
LADO_OPERACION_MM = 20.0
ANCHO_BLOQUE_MM = 21.0
PLANO_FICHA_MIN_MM = 22.0
PLANO_FICHA_MAX_MM = 56.0
AREA_TRABAJO = {'x_min': -60.0, 'x_max': 500.0, 'y_min': -120.0, 'y_max': 320.0}

CONFIGURACION_PASOS = {'modo': 'fusion', 'paso_mm': PASO_CORTO_MM, 'paso_2_mm': PASO_LARGO_MM, 'medido': True,
                       'plano_min_mm': PLANO_FICHA_MIN_MM, 'plano_max_mm': PLANO_FICHA_MAX_MM,
                       'area_trabajo': dict(AREA_TRABAJO)}
