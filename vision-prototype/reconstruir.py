import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile
import time

import cv2
import websockets

import clasificador_simbolos as clasif

RAIZ_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES_SCALA = [
    "src/main/scala/sculpter/Tokens.scala",
    "src/main/scala/sculpter/AST.scala",
    "src/main/scala/sculpter/Lexer.scala",
    "src/main/scala/sculpter/Parser.scala",
    "src/main/scala/sculpter/Interpreter.scala",
    "vision-prototype/ejecutor_scala/Main.scala",
]

TOLERANCIA_FILA_PX = 40
ESTABILIDAD_S = 0.8
MOVIMIENTO_PX = 6
AREA_MINIMA = 0.002
AREA_MAXIMA = 0.15
PROPORCION_MAXIMA = 1.8
VOLCADO = None
PUERTO_WEBSOCKET = 8765
INTERVALO_S = 0.35
ANCHO_TRABAJO_PX = 640
BLOQUE_UMBRAL = 35
C_UMBRAL = 7


def reducir_resolucion(cuadro):
    alto, ancho = cuadro.shape[:2]
    if ancho <= ANCHO_TRABAJO_PX:
        return cuadro
    factor = ANCHO_TRABAJO_PX / ancho
    return cv2.resize(cuadro, (ANCHO_TRABAJO_PX, int(alto * factor)))


def regiones(cuadro):
    gris = cv2.cvtColor(cuadro, cv2.COLOR_BGR2GRAY)
    difuminado = cv2.GaussianBlur(gris, (5, 5), 0)
    binaria = cv2.adaptiveThreshold(
        difuminado, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
        BLOQUE_UMBRAL, C_UMBRAL,
    )
    contornos, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    alto_cuadro, ancho_cuadro = gris.shape
    area_cuadro = ancho_cuadro * alto_cuadro
    area_minima = area_cuadro * AREA_MINIMA
    area_maxima = area_cuadro * AREA_MAXIMA

    regiones = []
    for contorno in contornos:
        x, y, w, h = cv2.boundingRect(contorno)
        area = w * h
        if area < area_minima or area > area_maxima:
            continue
        if max(w, h) / min(w, h) > PROPORCION_MAXIMA:
            continue
        recorte = cuadro[y : y + h, x : x + w]
        regiones.append((recorte, x + w / 2, y + h / 2))
    return regiones


def mejores(candidatos, cuantos: int = 2) -> str:
    return ", ".join(f"{lexema} {puntaje:.2f}" for lexema, puntaje in candidatos[:cuantos])


def volcar(recorte, indice: int, lexema: str | None, candidatos) -> None:
    if VOLCADO is None:
        return
    os.makedirs(VOLCADO, exist_ok=True)
    mejor = f"{candidatos[0][0]}_{candidatos[0][1]:.2f}" if candidatos else "sin_candidatos"
    estado = lexema or "rechazada"
    cv2.imwrite(os.path.join(VOLCADO, f"{indice:02d}_{estado}_{mejor}.png"), recorte)


def detectar(cuadro):
    if not clasif.hay_referencias():
        return [], ["carpeta referencias/ vacía nada que reconocer todavía"]

    detecciones = []
    avisos = []
    for indice, (recorte, cx, cy) in enumerate(regiones(cuadro)):
        lexema, candidatos = clasif.reconocer_con_puntajes(recorte)
        volcar(recorte, indice, lexema, candidatos)
        if lexema:
            detecciones.append((lexema, cx, cy))
        elif candidatos:
            detecciones.append((clasif.SIN_LEER, cx, cy))
            avisos.append(f"ficha en ({cx:.0f},{cy:.0f}) sin leer -- {mejores(candidatos)}")
        else:
            avisos.append(f"región en ({cx:.0f},{cy:.0f}) descartada, sin trazo reconocible")
    return detecciones, avisos


def mejor_vista(lecturas):
    puntajes = [len(det) - len(avisos) for det, avisos in lecturas]
    return puntajes.index(max(puntajes)) if puntajes else 0


def filas(detecciones):
    grupos = []
    for deteccion in sorted(detecciones, key=lambda d: d[2]):
        for grupo in grupos:
            if abs(grupo[0][2] - deteccion[2]) <= TOLERANCIA_FILA_PX:
                grupo.append(deteccion)
                break
        else:
            grupos.append([deteccion])
    return [sorted(grupo, key=lambda d: d[1]) for grupo in grupos]


def programa(detecciones):
    return "\n".join(" ".join(lexema for lexema, _, _ in fila) for fila in filas(detecciones))


def pendientes(detecciones):
    huecos = []
    for numero, fila in enumerate(filas(detecciones), start=1):
        for posicion, (lexema, cx, cy) in enumerate(fila):
            if clasif.ilegible(lexema):
                ranura = "la operación" if posicion == 0 else f"el parámetro {posicion}"
                huecos.append(f"instrucción {numero}: {ranura} sin leer (ficha en {cx:.0f},{cy:.0f})")
    return huecos


def instrucciones(detecciones):
    return [
        {
            "token": fila[0][0],
            "operandos": [lexema for lexema, _, _ in fila[1:]],
            "pendiente": any(clasif.ilegible(lexema) for lexema, _, _ in fila),
        }
        for fila in filas(detecciones) if fila
    ]


def ejecutar(codigo: str) -> str:
    if not codigo.strip():
        return "(todavía no hay instrucciones reconstruidas)"
    if clasif.SIN_LEER in codigo:
        return "(lectura incompleta, no se ejecuta)"

    with tempfile.NamedTemporaryFile("w", suffix=".scu", delete=False) as archivo:
        archivo.write(codigo + "\n")
        ruta_temporal = archivo.name

    try:
        resultado = subprocess.run(
            ["scala-cli", "run", *FUENTES_SCALA, "--", ruta_temporal],
            cwd=RAIZ_REPO,
            capture_output=True,
            text=True,
            timeout=60,
        )
        salida = resultado.stdout.strip()
        prefijos_conocidos = ("PARSED", "STEP", "RESULT")
        lineas = [l for l in salida.splitlines() if l.startswith(prefijos_conocidos)]
        if not lineas:
            return "(sin salida -- ver stderr)\n" + resultado.stderr.strip()
        if any(l.startswith("RESULT INVALID") for l in lineas):
            lineas.append("  -> el programa reconstruido no es sintácticamente válido SCuLPT")
        return "\n".join(lineas)
    finally:
        os.unlink(ruta_temporal)


def reportar(detecciones, avisos, camara, total, etiqueta="") -> None:
    codigo = programa(detecciones)
    huecos = pendientes(detecciones)
    print("\n" + "=" * 60)
    if etiqueta:
        print(etiqueta)
    print(f"[vision] cámara usada: {camara + 1}/{total} -- {len(detecciones)} detección(es)")
    for aviso in avisos:
        print(f"[vision]   ! {aviso}")
    print("[programa reconstruido]")
    print(codigo if codigo else "  (vacío)")
    if huecos:
        print(f"[lectura incompleta] {len(huecos)} ficha(s) sin leer, no se ejecuta")
        for hueco in huecos:
            print(f"  - {hueco}")
        print("  muestra esas fichas a la cámara, o añade su plantilla con herramientas/capturar_referencias.py")
        return
    print("[intérprete scala]")
    for linea in ejecutar(codigo).splitlines():
        print(f"  {linea}")


def desde_imagenes(rutas: list[str]) -> None:
    lecturas = []
    for ruta in rutas:
        cuadro = cv2.imread(ruta)
        if cuadro is None:
            sys.exit(f"no se pudo leer la imagen: {ruta}")
        lecturas.append(detectar(cuadro))

    indice_mejor = mejor_vista(lecturas)
    detecciones, avisos = lecturas[indice_mejor]
    reportar(detecciones, avisos, indice_mejor, len(rutas), etiqueta=f"Imágenes estáticas: {rutas}")


def fuente(valor: str):
    try:
        return int(valor)
    except ValueError:
        return valor


class ServidorSimulador:
    def __init__(self, puerto: int):
        self.puerto = puerto
        self.clientes = set()

    async def manejar_cliente(self, conexion):
        self.clientes.add(conexion)
        try:
            await conexion.wait_closed()
        finally:
            self.clientes.discard(conexion)

    async def difundir(self, mensaje: dict) -> None:
        if not self.clientes:
            return
        payload = json.dumps(mensaje)
        cerradas = set()
        for cliente in self.clientes:
            try:
                await cliente.send(payload)
            except websockets.ConnectionClosed:
                cerradas.add(cliente)
        self.clientes -= cerradas


async def desde_camaras(fuentes: list, una_vez: bool, servidor: ServidorSimulador | None) -> None:
    capturas = [cv2.VideoCapture(fuente) for fuente in fuentes]
    for captura, fuente in zip(capturas, fuentes):
        if not captura.isOpened():
            mensaje = f"no se pudo abrir la cámara: {fuente}"
            if sys.platform == "darwin":
                mensaje += (
                    "\n  en macOS la cámara se autoriza a la app desde la que corres el script "
                    "(Terminal, iTerm, VS Code...):\n"
                    "  Ajustes del Sistema > Privacidad y seguridad > Cámara. "
                    "Si no aparece, ejecuta `tccutil reset Camera` y vuelve a intentarlo.\n"
                    "  `python3 vision-prototype/herramientas/listar_camaras.py` muestra los índices disponibles."
                )
            sys.exit(mensaje)

    print(f"{len(capturas)} cámara(s) activa(s). Presiona 'q' en cualquier ventana para salir.")
    ultima_lectura_estable = None
    estable_desde = None
    posiciones_previas = None
    ultima_clasificacion_ts = 0.0
    lecturas = [([], []) for _ in capturas]
    indice_mejor = 0

    try:
        while True:
            cuadros = []
            for captura in capturas:
                ok, cuadro = captura.read()
                cuadros.append(reducir_resolucion(cuadro) if ok else None)

            ahora = time.time()
            if ahora - ultima_clasificacion_ts >= INTERVALO_S:
                ultima_clasificacion_ts = ahora
                lecturas = [detectar(c) if c is not None else ([], ["sin señal de cámara"]) for c in cuadros]
                indice_mejor = mejor_vista(lecturas)

            detecciones, avisos = lecturas[indice_mejor]
            posiciones = {f"{lexema}_{i}": (x, y) for i, (lexema, x, y) in enumerate(detecciones)}

            hubo_movimiento = posiciones_previas is None or set(posiciones) != set(posiciones_previas)
            if not hubo_movimiento and posiciones_previas is not None:
                for clave, (x, y) in posiciones.items():
                    ox, oy = posiciones_previas[clave]
                    if abs(x - ox) > MOVIMIENTO_PX or abs(y - oy) > MOVIMIENTO_PX:
                        hubo_movimiento = True
                        break

            if hubo_movimiento or estable_desde is None:
                estable_desde = ahora
            posiciones_previas = posiciones

            clave_estable = tuple(sorted(posiciones.items()))
            esta_estable = (ahora - estable_desde) >= ESTABILIDAD_S

            for indice_cam, cuadro in enumerate(cuadros):
                if cuadro is None:
                    continue
                if indice_cam == indice_mejor:
                    for lexema, x, y in detecciones:
                        cv2.circle(cuadro, (int(x), int(y)), 6, (0, 255, 0), -1)
                        cv2.putText(cuadro, lexema, (int(x) + 8, int(y) - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                estado = "ESTABLE" if esta_estable else "moviéndose..."
                usada = " [EN USO]" if indice_cam == indice_mejor else ""
                cv2.putText(cuadro, f"cam {indice_cam + 1}: {estado}{usada}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
                cv2.imshow(f"SCuLPT cámara {indice_cam + 1}", cuadro)

            if esta_estable and clave_estable != ultima_lectura_estable and detecciones:
                ultima_lectura_estable = clave_estable
                reportar(detecciones, avisos, indice_mejor, len(capturas))
                if servidor is not None:
                    await servidor.difundir({"tipo": "programa", "instrucciones": instrucciones(detecciones)})
                if una_vez:
                    break

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            await asyncio.sleep(0)
    finally:
        for captura in capturas:
            captura.release()
        cv2.destroyAllWindows()


async def principal_async() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--imagen", action="append", default=[], help="una imagen estática por cámara simulada (repetible)")
    parser.add_argument("--camara", action="append", default=[], help="índice numérico o URL de video (repetible, una por cámara)")
    parser.add_argument("--una-vez", action="store_true", help="termina después de la primera lectura estable")
    parser.add_argument("--servir-3d", action="store_true", help="levanta un servidor WebSocket para el simulador 3D")
    parser.add_argument(
        "--guardar-regiones", metavar="CARPETA",
        help="vuelca cada región detectada como PNG con su estado y mejor puntaje (para ajustar umbrales)",
    )
    argumentos = parser.parse_args()

    global VOLCADO
    VOLCADO = argumentos.guardar_regiones

    faltantes = clasif.sin_plantilla()
    if faltantes:
        print(f"[vision] símbolos en simbolos.json sin foto en referencias/: {', '.join(faltantes)}")

    if argumentos.imagen:
        desde_imagenes(argumentos.imagen)
        return

    fuentes = [fuente(c) for c in argumentos.camara] or [0]

    servidor = None
    if argumentos.servir_3d:
        servidor = ServidorSimulador(PUERTO_WEBSOCKET)
        await websockets.serve(servidor.manejar_cliente, "localhost", PUERTO_WEBSOCKET)
        print(f"servidor para el simulador 3D en ws://localhost:{PUERTO_WEBSOCKET}")

    await desde_camaras(fuentes, argumentos.una_vez, servidor)


def principal() -> None:
    try:
        asyncio.run(principal_async())
    except KeyboardInterrupt:
        print("\ndetenido")


if __name__ == "__main__":
    principal()
