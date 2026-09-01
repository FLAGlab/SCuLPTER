import os

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CARPETA_REFERENCIAS = os.path.join(os.path.dirname(AQUI), "referencias")


def cargar(etiqueta: str) -> Image.Image:
    return Image.open(os.path.join(CARPETA_REFERENCIAS, f"{etiqueta}.jpg")).convert("RGB")


def componer(etiquetas: list[str], ruta_salida: str) -> None:
    iconos = [cargar(etiqueta) for etiqueta in etiquetas]
    ancho_icono, alto_icono = iconos[0].size
    espacio = 80
    lienzo = Image.new(
        "RGB",
        (espacio + len(iconos) * (ancho_icono + espacio), alto_icono + 2 * espacio),
        color=(200, 200, 200),
    )
    for i, icono in enumerate(iconos):
        x = espacio + i * (ancho_icono + espacio)
        lienzo.paste(icono, (x, espacio))
    lienzo.save(ruta_salida)
    print(f"generado {ruta_salida}")


if __name__ == "__main__":
    componer(["ADD", "MUL", "DUP"], os.path.join(AQUI, "demo_simbolos_reales.png"))
