import argparse
import json
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plataforma.dispositivos import Cuadro
from plataforma.escena_virtual import (AREA_TRABAJO, PASO_CORTO_MM, PASO_LARGO_MM,
                                       PLANO_FICHA_MAX_MM, PLANO_FICHA_MIN_MM, Mano, render)
from plataforma.estado import Estado
from plataforma.guiones import GUIONES

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Banco:
    """Monta el servicio real (`Estado`) con dos cámaras y le empuja cuadros. Es la misma ruta de
    decisión que usan las webcams y las grabaciones: aquí la fuente de imagen es virtual."""

    def __init__(self, escena_nombre, datos):
        from plataforma.vocabulario import Vocabulario
        # La configuración del montaje va a un directorio temporal: el recorrido no debe dejar
        # cámaras registradas en datos_locales/.
        self.temporal = tempfile.TemporaryDirectory()
        self.estado = Estado(RAIZ, self.temporal.name)
        self.estado.stop_fusion.set()
        self.estado.hilo_fusion.join(timeout=3)
        self.estado.vocabulario = Vocabulario(RAIZ, datos)
        self.estado.lector.vocabulario = self.estado.vocabulario
        self.escena, _ = GUIONES[escena_nombre][0](self.estado.vocabulario)
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
        self.reloj = time.monotonic()

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

    def capturas(self, cuantas=12, camaras=None):
        for _ in range(cuantas):
            self.reloj += 0.1
            for camara in (camaras if camaras is not None else self.escena.camaras):
                cam = self.estado.camaras[self.ids[camara.id]]
                cam.estado = 'conectada'
                self.estado.procesar(cam, Cuadro(render(self.escena, camara), self.reloj))
            self.estado.lector.actualizar(self.fuentes(), self.reloj)
        self.estado.lector.esperar()
        return self.estado.resumen()

    def cerrar(self):
        self.estado.cerrar()
        self.temporal.cleanup()


def fila(paso, resumen):
    lectura, veredicto = resumen['lectura'], resumen['veredicto']
    estado = lectura['estado']
    programa = ' · '.join(lectura['programa']) or '(nada)'
    detalle = programa if estado == 'confirmada' else (lectura['motivo'] or '')[:58]
    etapa = (veredicto or {}).get('etapa', '—')
    traza = len((veredicto or {}).get('traza') or [])
    print(f"{paso:<42}{estado:<14}{etapa:<9}{traza:>6}  {detalle}")


def cajas(resumen):
    print('   evidencia por cámara (cada caja, de su cámara y su cuadro):')
    for c in resumen['camaras']:
        cuenta = {}
        for v in c['vistas']:
            cuenta[v['clase']] = cuenta.get(v['clase'], 0) + 1
        detalle = ' · '.join(f'{n} {k}' for k, n in sorted(cuenta.items())) or 'sin observaciones'
        print(f"     {c['nombre']:<8} cuadro {str(c['cuadro'] or '—'):<4} {len(c['vistas']):>2} cajas · "
              f"{len(c['tinta']):>2} sin resolver · {detalle}")
    piezas = resumen['fusion']['piezas']
    firmes = sum(1 for p in piezas if p['estado'] == 'confirmada')
    print(f"     mesa estimada: {len(piezas)} fichas situadas, {firmes} confirmadas, "
          f"{len(piezas)-firmes} provisionales")


def main():
    p = argparse.ArgumentParser(description='Recorrido de uso con el servicio como única autoridad. Fuente de imagen VIRTUAL.')
    p.add_argument('--escena', default='dos_webcams_corta')
    p.add_argument('--datos', default=os.path.join(RAIZ, 'datos_locales', 'virtual'))
    p.add_argument('--json', metavar='SALIDA')
    args = p.parse_args()
    banco = Banco(args.escena, args.datos)
    print(f"{'paso del recorrido':<42}{'estado':<14}{'scala':<9}{'traza':>6}  programa / motivo")
    historia = []
    try:
        resumen = banco.capturas()
        fila('1. construir el programa', resumen)
        cajas(resumen)
        historia.append(('construir', resumen['lectura'], resumen['veredicto']))

        confirmada = resumen['veredicto']
        literal = next(f for f in banco.escena.fichas if f.lexema == '3')
        literal.lexema = '5'
        fila('2. cambiar la ficha 3 por un 5', banco.capturas(2))
        resumen = banco.capturas(12)
        fila('   (quieto otra vez)', resumen)
        historia.append(('cambiar ficha', resumen['lectura'], resumen['veredicto']))

        banco.escena.manos = [Mano((literal.centro[0], literal.centro[1], 0.), 30., 120.)]
        resumen = banco.capturas(12)
        fila('3. tapar el literal con la mano', resumen)
        cajas(resumen)
        historia.append(('mano', resumen['lectura'], resumen['veredicto']))

        banco.escena.manos = []
        resumen = banco.capturas(12)
        fila('4. retirar la mano', resumen)
        historia.append(('retirar mano', resumen['lectura'], resumen['veredicto']))

        resumen = banco.capturas(12, camaras=banco.escena.camaras[:1])
        fila('5. perder una cámara', resumen)
        historia.append(('perder camara', resumen['lectura'], resumen['veredicto']))

        resumen = banco.capturas(12)
        fila('6. recuperar la cámara', resumen)
        historia.append(('recuperar', resumen['lectura'], resumen['veredicto']))

        veredicto = resumen['veredicto']
        if veredicto and veredicto.get('traza'):
            print(f"\n   traza de Scala de la versión {veredicto['version']} "
                  f"(etapa {veredicto['etapa']}, decide {veredicto.get('decide')}):")
            for paso in veredicto['traza']:
                pilas = ' '.join(f"{k}={v}" for k, v in sorted((paso['pilas'] or {}).items())) or '(vacías)'
                print(f"     paso {paso['paso']}  instrucción {paso['instruccion']}  -> {pilas}")
    finally:
        banco.cerrar()
    print('\nFUENTE DE IMAGEN VIRTUAL: escenas rasterizadas desde los STL.')
    print('USO FÍSICO NO VERIFICADO: ninguna cámara ni ficha real ha intervenido.')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w', encoding='utf-8') as archivo:
            json.dump([{'paso': n, 'lectura': l, 'veredicto': v} for n, l, v in historia],
                      archivo, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
