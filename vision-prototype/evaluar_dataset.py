"""Mide el reconocimiento sobre un dataset anotado con capture_dataset.py.

Para cada imagen del manifiesto corre la misma detección que reconstruir.py y
compara con `expected`:

- Por símbolo: verdaderos/falsos positivos y falsos negativos contando
  lexemas (sin importar la posición), y de ahí precisión, recall y F1 por
  lexema y globales (micro).
- Por programa: si el programa reconstruido coincide exactamente con el
  esperado, y qué fracción de sus instrucciones aparece.
- Confusiones: qué se leyó en lugar de qué, y qué se perdió o sobró.

  python3 vision-prototype/evaluar_dataset.py --manifest dataset/sesion1/manifest.jsonl
  python3 vision-prototype/evaluar_dataset.py --manifest ... --split test --json metricas.json
"""
import argparse
import json
import os
import sys
from collections import Counter, defaultdict

import cv2

import reconstruir


def normalizar_programa(texto: str) -> list[str]:
    """'PUSH heart 3; PUSH  heart 10' -> ['PUSH heart 3', 'PUSH heart 10']."""
    lineas = texto.replace(";", "\n").splitlines()
    return [" ".join(linea.split()) for linea in lineas if linea.strip()]


def tokens_de(lineas: list[str]) -> Counter:
    return Counter(token for linea in lineas for token in linea.split())


def leer_manifiesto(ruta: str, split: str | None, writer: str | None) -> list[dict]:
    filas = []
    with open(ruta, encoding="utf-8") as archivo:
        for numero, linea in enumerate(archivo, 1):
            if not linea.strip():
                continue
            fila = json.loads(linea)
            if split and fila.get("split") != split:
                continue
            if writer and fila.get("writer") != writer:
                continue
            fila["_linea"] = numero
            filas.append(fila)
    return filas


def evaluar_imagen(ruta_imagen: str, esperado: str) -> dict:
    cuadro = cv2.imread(ruta_imagen)
    if cuadro is None:
        return {"error": f"no se pudo leer {ruta_imagen}"}

    detecciones, avisos = reconstruir.detectar_en_cuadro(cuadro)
    reconstruido = normalizar_programa(reconstruir.reconstruir_programa(detecciones))
    esperado_lineas = normalizar_programa(esperado)

    conteo_esperado = tokens_de(esperado_lineas)
    conteo_detectado = tokens_de(reconstruido)
    tp = {lex: min(conteo_esperado[lex], conteo_detectado[lex]) for lex in conteo_esperado}
    faltantes = Counter({lex: conteo_esperado[lex] - tp[lex] for lex in conteo_esperado if conteo_esperado[lex] > tp[lex]})
    sobrantes = Counter({lex: conteo_detectado[lex] - tp.get(lex, 0) for lex in conteo_detectado if conteo_detectado[lex] > tp.get(lex, 0)})

    lineas_acertadas = sum(1 for linea in esperado_lineas if linea in reconstruido)
    return {
        "esperado": esperado_lineas,
        "reconstruido": reconstruido,
        "tp": Counter(tp),
        "faltantes": faltantes,
        "sobrantes": sobrantes,
        "programa_exacto": reconstruido == esperado_lineas,
        "lineas_acertadas": lineas_acertadas,
        "lineas_esperadas": len(esperado_lineas),
        "regiones_rechazadas": len(avisos),
    }


def _metricas(tp: int, fp: int, fn: int) -> dict:
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "precision": precision, "recall": recall, "f1": f1}


def evaluar(filas: list[dict], carpeta: str) -> dict:
    tp_total, fp_total, fn_total = Counter(), Counter(), Counter()
    confusiones = Counter()
    exactos = 0
    lineas_acertadas = lineas_esperadas = 0
    detalle = []
    errores = []

    for fila in filas:
        resultado = evaluar_imagen(os.path.join(carpeta, fila["image"]), fila["expected"])
        if "error" in resultado:
            errores.append(resultado["error"])
            continue
        tp_total.update(resultado["tp"])
        fn_total.update(resultado["faltantes"])
        fp_total.update(resultado["sobrantes"])
        exactos += resultado["programa_exacto"]
        lineas_acertadas += resultado["lineas_acertadas"]
        lineas_esperadas += resultado["lineas_esperadas"]

        # Un faltante y un sobrante en la misma imagen es, casi seguro, una
        # confusión: la ficha estaba pero se leyó como otra cosa.
        faltantes = list(resultado["faltantes"].elements())
        sobrantes = list(resultado["sobrantes"].elements())
        for esperado, leido in zip(faltantes, sobrantes):
            confusiones[(esperado, leido)] += 1
        for esperado in faltantes[len(sobrantes):]:
            confusiones[(esperado, "(nada)")] += 1
        for leido in sobrantes[len(faltantes):]:
            confusiones[("(nada)", leido)] += 1

        detalle.append({
            "image": fila["image"],
            "esperado": resultado["esperado"],
            "reconstruido": resultado["reconstruido"],
            "programa_exacto": resultado["programa_exacto"],
            "regiones_rechazadas": resultado["regiones_rechazadas"],
        })

    lexemas = sorted(set(tp_total) | set(fp_total) | set(fn_total))
    por_simbolo = {lex: _metricas(tp_total[lex], fp_total[lex], fn_total[lex]) for lex in lexemas}
    global_ = _metricas(sum(tp_total.values()), sum(fp_total.values()), sum(fn_total.values()))
    evaluadas = len(filas) - len(errores)
    return {
        "imagenes": evaluadas,
        "errores": errores,
        "simbolos": por_simbolo,
        "global": global_,
        "programa": {
            "exactos": exactos,
            "tasa_exactos": exactos / evaluadas if evaluadas else 0.0,
            "lineas_acertadas": lineas_acertadas,
            "lineas_esperadas": lineas_esperadas,
            "tasa_lineas": lineas_acertadas / lineas_esperadas if lineas_esperadas else 0.0,
        },
        "confusiones": [{"esperado": e, "leido": l, "veces": n} for (e, l), n in confusiones.most_common()],
        "detalle": detalle,
    }


def imprimir(informe: dict) -> None:
    print(f"\n{informe['imagenes']} imagen(es) evaluadas")
    for error in informe["errores"]:
        print(f"  ! {error}")

    print(f"\n{'símbolo':>8}  {'esp':>4} {'tp':>4} {'fp':>4} {'fn':>4}   {'prec':>5} {'rec':>5} {'f1':>5}")
    for lex, m in informe["simbolos"].items():
        print(f"{lex:>8}  {m['tp'] + m['fn']:>4} {m['tp']:>4} {m['fp']:>4} {m['fn']:>4}   "
              f"{m['precision']:5.2f} {m['recall']:5.2f} {m['f1']:5.2f}")
    g = informe["global"]
    print(f"{'GLOBAL':>8}  {g['tp'] + g['fn']:>4} {g['tp']:>4} {g['fp']:>4} {g['fn']:>4}   "
          f"{g['precision']:5.2f} {g['recall']:5.2f} {g['f1']:5.2f}")

    p = informe["programa"]
    print(f"\nprogramas exactos: {p['exactos']}/{informe['imagenes']} ({p['tasa_exactos']:.0%})   "
          f"instrucciones acertadas: {p['lineas_acertadas']}/{p['lineas_esperadas']} ({p['tasa_lineas']:.0%})")

    if informe["confusiones"]:
        print("\nconfusiones (esperado -> leído):")
        for c in informe["confusiones"]:
            print(f"  {c['esperado']:>8} -> {c['leido']:<8} x{c['veces']}")

    fallidas = [d for d in informe["detalle"] if not d["programa_exacto"]]
    if fallidas:
        print("\nimágenes con programa incorrecto:")
        for d in fallidas:
            print(f"  {d['image']}")
            print(f"     esperado:     {' ; '.join(d['esperado'])}")
            print(f"     reconstruido: {' ; '.join(d['reconstruido']) or '(vacío)'}")


def principal() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", required=True, help="manifest.jsonl escrito por capture_dataset.py")
    parser.add_argument("--split", choices=("train", "validation", "test"), help="evaluar solo este split")
    parser.add_argument("--writer", help="evaluar solo las imágenes de este autor")
    parser.add_argument("--json", metavar="SALIDA", help="guardar el informe completo como JSON")
    parser.add_argument("--guardar-regiones", metavar="CARPETA", help="volcar las regiones detectadas (ver reconstruir.py)")
    args = parser.parse_args()

    if not reconstruir.clasificador_simbolos.hay_referencias():
        sys.exit("referencias/ está vacía: no hay plantillas con qué reconocer")
    reconstruir.CARPETA_REGIONES = args.guardar_regiones

    filas = leer_manifiesto(args.manifest, args.split, args.writer)
    if not filas:
        sys.exit("el manifiesto no tiene filas (o ninguna pasa los filtros)")

    informe = evaluar(filas, os.path.dirname(os.path.abspath(args.manifest)))
    imprimir(informe)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as archivo:
            json.dump(informe, archivo, ensure_ascii=False, indent=2)
        print(f"\ninforme guardado en {args.json}")


if __name__ == "__main__":
    principal()
