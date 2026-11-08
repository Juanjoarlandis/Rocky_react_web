#!/usr/bin/env python3
"""Convierte arte.tsv en las secciones 1 y 2 de arte.md. Uso: python3 -I arte_md.py arte.tsv salida.md"""
import re
import sys

ANIMATED = {
    'src/images/optimized/night/toxico-paseo-224.webp': '166×224 · animado, 81 fotogramas',
    'src/images/optimized/characters/lata-spray-walk-seedance-224.webp': '166×224 · animado, 81 fotogramas',
}
KEBAB = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$')

rows = [l.rstrip('\n').split('\t') for l in open(sys.argv[1], encoding='utf-8')][1:]


def name_check(path):
    name = path.rsplit('/', 1)[-1]
    if name.startswith('.'):
        return 'n/a'
    if not KEBAB.match(name):
        return 'no kebab-case'
    return 'ok'


groups = [
    ('src/images', 'Imágenes empaquetadas por Vite (`src/images/`)'),
    ('public', 'Estáticos servidos tal cual (`public/`)'),
    ('posters', 'Pósters de marketing (`posters/`, no se sirven)'),
    ('prompts-munecos', 'Prompts y material de los muñecos (`prompts-munecos/`, no se sirven)'),
]
out = []
w = out.append
total = len(rows)
w(f'Total inventariado: **{total} ficheros**.\n')
w('| Carpeta | Ficheros | Peso |')
w('| --- | ---: | ---: |')
for prefix, _ in groups:
    sel = [r for r in rows if r[0].startswith(prefix + '/')]
    kb = sum(float(r[4]) for r in sel)
    w(f'| `{prefix}/` | {len(sel)} | {kb / 1024:.2f} MB |')
w('')
for prefix, title in groups:
    sel = [r for r in rows if r[0].startswith(prefix + '/')]
    w(f'### {title} — {len(sel)}\n')
    w('| Ruta | Formato | Medidas / duración | Peso (kB) | Uso | Dónde se usa | Nombre | Duplicado de |')
    w('| --- | --- | --- | ---: | --- | --- | --- | --- |')
    for r in sel:
        path, fmt, dims, dur, kb, sha, use, where, dup = (r + [''] * 9)[:9]
        md = ANIMATED.get(path) or dims or dur or '—'
        where = where.replace('|', '\\|') or '—'
        dup = dup or '—'
        w(f'| `{path[len(prefix) + 1:]}` | {fmt} | {md} | {kb} | {use} | {where} | {name_check(path)} | {dup} |')
    w('')
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{total} filas')
