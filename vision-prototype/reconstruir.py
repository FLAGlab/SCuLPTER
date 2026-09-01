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

import clasificador_simbolos

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
VENTANA_ESTABILIDAD_S = 0.8
MOVIMIENTO_ESTABLE_PX = 6
AREA_MINIMA_FRACCION = 0.002
PUERTO_WEBSOCKET = 8765
INTERVALO_CLASIFICACION_S = 0.35
ANCHO_TRABAJO_PX = 640


def reducir_resolucion(cuadro):
    alto, ancho = cuadro.shape[:2]
    if ancho <= ANCHO_TRABAJO_PX:
        return cuadro
    factor = ANCHO_TRABAJO_PX / ancho
    return cv2.resize(cuadro, (ANCHO_TRABAJO_PX, int(alto * factor)))


def detectar_regiones_por_contorno(cuadro):
    gris = cv2.cvtColor(cuadro, cv2.COLOR_BGR2GRAY)
    difuminado = cv2.GaussianBlur(gris, (5, 5), 0)
    _, binaria = cv2.threshold(difuminado, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contornos, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    alto_cuadro, ancho_cuadro = gris.shape
    area_minima = ancho_cuadro * alto_cuadro * AREA_MINIMA_FRACCION

    regiones = []
    for contorno in contornos:
        x, y, w, h = cv2.boundingRect(contorno)
        if w * h < area_minima:
            continue
        recorte = cuadro[y : y + h, x : x + w]
        regiones.append((recorte, x + w / 2, y + h / 2))
    return regiones


def detectar_en_cuadro(cuadro):
    if not clasificador_simbolos.hay_referencias():
        return [], ["carpeta referencias/ vacía -- nada que reconocer todavía"]

    detecciones = []
    avisos = []
    for recorte, cx, cy in detectar_regiones_por_contorno(cuadro):
        lexema = clasificador_simbolos.reconocer(recorte)
        if lexema:
            detecciones.append((lexema, cx, cy))
        else:
            avisos.append(f"región en ({cx:.0f},{cy:.0f}) sin coincidencia en referencias")
    return detecciones, avisos


def elegir_mejor_vista(lecturas_por_camara):
    mejor_indice = 0
    mejor_puntaje = -1
    for indice, (detecciones, avisos) in enumerate(lecturas_por_camara):
        puntaje = len(detecciones) - len(avisos)
        if puntaje > mejor_puntaje:
            mejor_puntaje = puntaje
            mejor_indice = indice
    return mejor_indice


def reconstruir_programa(detecciones: list[tuple[str, float, float]]) -> str:
    detecciones_ordenadas = sorted(detecciones, key=lambda d: d[2])

    filas: list[list[tuple[str, float, float]]] = []
    for deteccion in detecciones_ordenadas:
        colocado = False
        for fila in filas:
            if abs(fila[0][2] - deteccion[2]) <= TOLERANCIA_FILA_PX:
                fila.append(deteccion)
                colocado = True
                break
        if not colocado:
            filas.append([deteccion])

    lineas = []
    for fila in filas:
        fila_ordenada = sorted(fila, key=lambda d: d[1])
        lineas.append(" ".join(lexema for lexema, _, _ in fila_ordenada))
    return "\n".join(lineas)


def programa_como_instrucciones(detecciones: list[tuple[str, float, float]]) -> list[dict]:
    detecciones_ordenadas = sorted(detecciones, key=lambda d: d[2])
    filas: list[list[tuple[str, float, float]]] = []
    for deteccion in detecciones_ordenadas:
        colocado = False
        for fila in filas:
            if abs(fila[0][2] - deteccion[2]) <= TOLERANCIA_FILA_PX:
                fila.append(deteccion)
                colocado = True
                break
        if not colocado:
            filas.append([deteccion])

    instrucciones = []
    for fila in filas:
        fila_ordenada = sorted(fila, key=lambda d: d[1])
        tokens = [lexema for lexema, _, _ in fila_ordenada]
        if not tokens:
            continue
        instrucciones.append({"token": tokens[0], "operandos": tokens[1:]})
    return instrucciones


def ejecutar_en_interprete(codigo: str) -> str:
    if not codigo.strip():
        return "(todavía no hay instrucciones reconstruidas)"

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


def reportar_consola(detecciones, avisos, indice_camara_usada, total_camaras, etiqueta: str = "") -> None:
    codigo = reconstruir_programa(detecciones)
    print("\n" + "=" * 60)
    if etiqueta:
        print(etiqueta)
    print(f"[vision] cámara usada: {indice_camara_usada + 1}/{total_camaras} -- {len(detecciones)} detección(es)")
    for aviso in avisos:
        print(f"[vision]   ! {aviso}")
    print("[programa reconstruido]")
    print(codigo if codigo else "  (vacío)")
    print("[intérprete scala]")
    for linea in ejecutar_en_interprete(codigo).splitlines():
        print(f"  {linea}")


def ejecutar_con_imagenes(rutas: list[str]) -> None:
    lecturas = []
    for ruta in rutas:
        cuadro = cv2.imread(ruta)
        if cuadro is None:
            sys.exit(f"no se pudo leer la imagen: {ruta}")
        lecturas.append(detectar_en_cuadro(cuadro))

    indice_mejor = elegir_mejor_vista(lecturas)
    detecciones, avisos = lecturas[indice_mejor]
    reportar_consola(detecciones, avisos, indice_mejor, len(rutas), etiqueta=f"Imágenes estáticas: {rutas}")


def resolver_fuente_camara(valor: str):
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


async def ejecutar_con_camaras(fuentes: list, una_vez: bool, servidor: ServidorSimulador | None) -> None:
    capturas = [cv2.VideoCapture(fuente) for fuente in fuentes]
    for captura, fuente in zip(capturas, fuentes):
        if not captura.isOpened():
            sys.exit(f"no se pudo abrir la cámara: {fuente}")

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
            if ahora - ultima_clasificacion_ts >= INTERVALO_CLASIFICACION_S:
                ultima_clasificacion_ts = ahora
                lecturas = [detectar_en_cuadro(c) if c is not None else ([], ["sin señal de cámara"]) for c in cuadros]
                indice_mejor = elegir_mejor_vista(lecturas)

            detecciones, avisos = lecturas[indice_mejor]
            posiciones = {f"{lexema}_{i}": (x, y) for i, (lexema, x, y) in enumerate(detecciones)}

            hubo_movimiento = posiciones_previas is None or set(posiciones) != set(posiciones_previas)
            if not hubo_movimiento and posiciones_previas is not None:
                for clave, (x, y) in posiciones.items():
                    ox, oy = posiciones_previas[clave]
                    if abs(x - ox) > MOVIMIENTO_ESTABLE_PX or abs(y - oy) > MOVIMIENTO_ESTABLE_PX:
                        hubo_movimiento = True
                        break

            if hubo_movimiento or estable_desde is None:
                estable_desde = ahora
            posiciones_previas = posiciones

            clave_estable = tuple(sorted(posiciones.items()))
            esta_estable = (ahora - estable_desde) >= VENTANA_ESTABILIDAD_S

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
                reportar_consola(detecciones, avisos, indice_mejor, len(capturas))
                if servidor is not None:
                    instrucciones = programa_como_instrucciones(detecciones)
                    await servidor.difundir({"tipo": "programa", "instrucciones": instrucciones})
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
    argumentos = parser.parse_args()

    if argumentos.imagen:
        ejecutar_con_imagenes(argumentos.imagen)
        return

    fuentes = [resolver_fuente_camara(c) for c in argumentos.camara] or [0]

    servidor = None
    if argumentos.servir_3d:
        servidor = ServidorSimulador(PUERTO_WEBSOCKET)
        await websockets.serve(servidor.manejar_cliente, "localhost", PUERTO_WEBSOCKET)
        print(f"servidor para el simulador 3D en ws://localhost:{PUERTO_WEBSOCKET}")

    await ejecutar_con_camaras(fuentes, argumentos.una_vez, servidor)


def principal() -> None:
    asyncio.run(principal_async())


if __name__ == "__main__":
    principal()
