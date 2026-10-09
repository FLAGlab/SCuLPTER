import argparse
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plataforma.ensayo import Mesa, dos_webcams, girar
from plataforma.escena_virtual import escenario_de, olvidar_vistas
from plataforma.lectura import leer
from plataforma.lector import Lector
from plataforma.vocabulario import Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def capturar(mesa, voc, etapas):
    """Una captura con reloj de pared. Las cámaras se exponen a la vez y se reconocen después,
    como en un montaje real: si cada cuadro se sellara al terminar de reconocerlo, los sellos se
    separarían más que la ventana de sincronización y la fusión descartaría cámaras."""
    mesa.secuencia += 1
    reloj = time.monotonic()
    mundo = escenario_de(mesa.escena)
    etapas['mallas'].append(time.monotonic() - reloj)
    expuesto = time.monotonic()

    def rasterizar(camara):
        reloj = time.monotonic()
        imagen = mundo.rasterizar(camara.modelo(), camara.resolucion)[0]
        etapas['captura'].append(time.monotonic() - reloj)
        return imagen

    def reconocer(imagen):
        reloj = time.monotonic()
        salida = leer(imagen, voc)
        etapas['reconocimiento'].append(time.monotonic() - reloj)
        return salida

    # Una cámara por hilo, como hace el servicio: en serie el ciclo pasa de 0.35 s y la fusión
    # trata ese hueco como discontinuidad, reiniciando la espera de quietud.
    with ThreadPoolExecutor(max_workers=max(2, len(mesa.escena.camaras))) as piscina:
        imagenes = list(piscina.map(rasterizar, mesa.escena.camaras))
        lecturas_por_camara = list(piscina.map(reconocer, imagenes))
    marcos = []
    for camara, (_, lecturas, tinta) in zip(mesa.escena.camaras, lecturas_por_camara):
        marcos.append({'id': camara.id, 'nombre': camara.nombre, 'estado': 'conectada',
                       'pose': camara.pose(), 'intrinsecos': camara.intrinsecos(),
                       'historial': [{'secuencia': mesa.secuencia, 'instante': expuesto,
                                      'resolucion': list(camara.resolucion),
                                      'observaciones': [l['observacion'] for l in lecturas],
                                      'tinta': tinta, 'profundidad': None}]})
    return marcos, expuesto


def episodio(mesa, voc, lector, etapas, limite=12.0):
    """Marca el cambio físico y espera hasta que haya programa confirmado y veredicto."""
    cambio = time.monotonic()
    confirmado = veredicto = None
    while time.monotonic() - cambio < limite:
        marcos, expuesto = capturar(mesa, voc, etapas)
        reloj = time.monotonic()
        lector.actualizar(marcos, expuesto + 0.001)
        etapas['fusion'].append(time.monotonic() - reloj)
        estado = lector.estado()
        if confirmado is None and estado['lectura']['estado'] == 'confirmada':
            confirmado = time.monotonic() - cambio
        if confirmado is not None and estado['veredicto'] is not None:
            veredicto = time.monotonic() - cambio
            break
    return confirmado, veredicto, lector.estado()


def main():
    p = argparse.ArgumentParser(description='Latencia con reloj de pared del ciclo completo. Imágenes VIRTUALES, reloj REAL.')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    p.add_argument('--repeticiones', type=int, default=4)
    args = p.parse_args()
    voc = Vocabulario(RAIZ, args.datos)
    etapas = {k: [] for k in ('mallas', 'captura', 'reconocimiento', 'fusion')}
    filas = []
    for vuelta in range(args.repeticiones):
        olvidar_vistas()
        mesa = Mesa(voc, ['PUSH a 3'], dos_webcams)
        lector = Lector(voc)
        def tapar_y_destapar(m):
            m.mano('5')
            for _ in range(3):
                capturar(m, voc, etapas)
                lector.actualizar(capturar(m, voc, etapas)[0], time.monotonic())
            m.mano(None)

        acciones = [('construir', lambda m: None),
                    ('cambiar la ficha 3 por un 5', lambda m: m.cambiar('3', '5')),
                    ('retirar la mano que tapaba el literal', tapar_y_destapar)]
        for nombre, aplicar in acciones:
            aplicar(mesa)
            lectura, veredicto, estado = episodio(mesa, voc, lector, etapas)
            filas.append({'vuelta': vuelta + 1, 'accion': nombre, 'lectura': lectura,
                          'veredicto': veredicto, 'programa': estado['lectura']['programa']})
        lector.esperar()
    print(f"{'vuelta':>7}{'acción':<30}{'a lectura s':>12}{'a Scala s':>11}  programa")
    for f in filas:
        lec = f'{f["lectura"]:.2f}' if f['lectura'] is not None else 'no llegó'
        ver = f'{f["veredicto"]:.2f}' if f['veredicto'] is not None else 'no llegó'
        print(f"{f['vuelta']:>7}{f['accion']:<30}{lec:>12}{ver:>11}  {' · '.join(f['programa'])}")

    def resumen(valores, etiqueta):
        if not valores:
            print(f'{etiqueta:<34}sin datos')
            return
        orden = sorted(valores)
        p95 = orden[min(len(orden) - 1, int(round(0.95 * (len(orden) - 1))))]
        print(f'{etiqueta:<34}mediana {statistics.median(orden):.3f} s · p95 {p95:.3f} s · n={len(orden)}')

    print()
    resumen([f['lectura'] for f in filas if f['lectura'] is not None], 'cambio -> programa confirmado')
    resumen([f['veredicto'] for f in filas if f['veredicto'] is not None], 'cambio -> veredicto de Scala')
    print()
    for etapa in ('mallas', 'captura', 'reconocimiento', 'fusion'):
        resumen(etapas[etapa], f'  {etapa} (por cámara y captura)' if etapa in ('captura', 'reconocimiento')
                else f'  {etapa} (por captura)')
    print('\nReloj de pared REAL; imágenes VIRTUALES rasterizadas desde los STL.')
    print('No mide exposición ni transporte de una webcam física: eso sigue sin verificar.')


if __name__ == '__main__':
    main()
