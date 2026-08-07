#!/usr/bin/env python3
"""Recorta los márgenes transparentes de los PNG generados.

Imprescindible antes de integrarlos en la web: el anclaje CSS
("apoyado sobre el borde") asume que la figura llega hasta los
bordes de la imagen, sin aire alrededor.

Uso:
    python3 recortar_margenes.py salidas/*.png
"""
import sys

from PIL import Image

PAD = 6  # margen de seguridad en px


def recortar(ruta):
    img = Image.open(ruta).convert('RGBA')
    bbox = img.getchannel('A').getbbox()
    if not bbox:
        print(f"{ruta}: imagen vacía, la salto")
        return
    left = max(bbox[0] - PAD, 0)
    top = max(bbox[1] - PAD, 0)
    right = min(bbox[2] + PAD, img.width)
    bottom = min(bbox[3] + PAD, img.height)
    recortada = img.crop((left, top, right, bottom))
    recortada.save(ruta)
    print(
        f"{ruta}: {img.width}x{img.height} -> {recortada.width}x{recortada.height} "
        f"(ratio alto/ancho = {recortada.height / recortada.width:.3f})"
    )


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for ruta in sys.argv[1:]:
        recortar(ruta)
