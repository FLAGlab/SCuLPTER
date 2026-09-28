import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plataforma.vocabulario import PROGRAMAS, Vocabulario

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def informe(vocabulario, nombre, programa):
    r = vocabulario.ensayo(programa)
    print(f"== {nombre} ==")
    print(programa.replace("\n", " · "))
    print()
    print(f"Catálogo: {r['declarados']} declarados · {r['con_plantilla']} con plantilla utilizable · {r['desde_ficha']} desde ficha real")
    if r["listos"]:
        print("\nListos, fotografiados de una ficha real:")
        for s in r["listos"]:
            print(f"  {s['lexema']:<10} {s['tipo']}")
    if r["provisionales"]:
        print("\nProvisionales, sirven para probar pero no acreditan lectura física:")
        for s in r["provisionales"]:
            print(f"  {s['lexema']:<10} {s['tipo']:<10} origen={s['origen']}")
    if r["faltan"]:
        print("\nHay que fotografiar esto antes del ensayo:")
        for s in r["faltan"]:
            print(f"  {s['lexema']:<10} {s['tipo']:<10} {s['motivo']}")
    else:
        print("\nNo falta ningún símbolo para este programa.")
    print()
    return r


def main():
    p = argparse.ArgumentParser(description="Audita qué símbolos hacen falta para leer un programa físico.")
    p.add_argument("--programa", choices=sorted(PROGRAMAS) + ["todos"], default="minimo")
    p.add_argument("--archivo", help="Archivo de texto con un programa SCuLPT, una instrucción por línea.")
    p.add_argument("--datos", default=os.path.join(RAIZ, "datos_locales"))
    args = p.parse_args()
    vocabulario = Vocabulario(RAIZ, args.datos)
    if args.archivo:
        informe(vocabulario, os.path.basename(args.archivo), open(args.archivo, encoding="utf-8").read())
        return
    nombres = sorted(PROGRAMAS) if args.programa == "todos" else [args.programa]
    pendientes = set()
    for nombre in nombres:
        pendientes |= {s["lexema"] for s in informe(vocabulario, nombre, PROGRAMAS[nombre])["faltan"]}
    if len(nombres) > 1:
        print(f"Unión de lo que falta en {len(nombres)} programas: {', '.join(sorted(pendientes)) or 'nada'}")
    print(f"\nPara capturarlos: python3 herramientas/capturar_referencias.py, o la página Símbolos del simulador.")
    print("Consulta CAPTURA_REFERENCIAS.md para recorte, luz y orientaciones.")


if __name__ == "__main__":
    main()
