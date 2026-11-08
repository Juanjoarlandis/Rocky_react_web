#!/usr/bin/env python3
"""Inventario de arte de ROCKY 035 (auditoría 2026-11, tareas 5.1 y 5.2).

Uso: python3 -I inventario_arte.py <raíz-del-repo> <salida.tsv>
Lista cada fichero de src/images, public, posters y prompts-munecos con formato,
medidas, duración, peso, hash y uso en el código. No modifica nada.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(sys.argv[1])
OUT = sys.argv[2]
ART_DIRS = ['src/images', 'public', 'posters', 'prompts-munecos']
# Dónde se buscan referencias: código y HTML/CSS servidos.
CODE_DIRS = ['src', 'server', 'shared', 'scripts']
CODE_FILES = ['index.html', 'vite.config.mjs', 'Dockerfile']
CODE_EXT = ('.js', '.jsx', '.mjs', '.css', '.html', '.json', '.webmanifest')
MEDIA = ('.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif', '.svg', '.ico', '.mp4', '.m4a', '.mp3', '.webm')


def probe(path):
    try:
        out = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height:format=duration',
             '-of', 'json', path], capture_output=True, text=True, timeout=20).stdout
        data = json.loads(out or '{}')
    except Exception:
        return '', ''
    dims = ''
    for s in data.get('streams', []):
        if s.get('width'):
            dims = f"{s['width']}×{s['height']}"
            break
    dur = data.get('format', {}).get('duration')
    dur = f"{float(dur):.1f} s" if dur and not dims else (f"{float(dur):.1f} s" if dur and path.endswith('.mp4') else '')
    return dims, dur


def code_corpus():
    corpus = []
    for d in CODE_DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            if 'node_modules' in base:
                continue
            for f in files:
                if f.endswith(CODE_EXT):
                    p = os.path.join(base, f)
                    rel = os.path.relpath(p, ROOT)
                    if rel.startswith(('src/images', 'public')) and not f.endswith(('.json', '.html', '.css', '.webmanifest')):
                        continue
                    with open(p, encoding='utf-8', errors='replace') as fh:
                        corpus.append((rel, fh.read()))
    for f in CODE_FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            with open(p, encoding='utf-8', errors='replace') as fh:
                corpus.append((f, fh.read()))
    return corpus


def usage(rel, name, corpus):
    stem = os.path.splitext(name)[0]
    hits, test_hits = [], []
    pat = re.compile(r'(?<![\w-])' + re.escape(name) + r'(?![\w])')
    for crel, text in corpus:
        if crel == rel:
            continue
        if pat.search(text):
            (test_hits if '.test.' in crel else hits).append(crel)
    if hits:
        return 'referenciado', sorted(set(hits))
    # Referencia por raíz del nombre (p. ej. ${stem}-600.webp o imports sin extensión).
    base_stem = re.sub(r'-\d{2,4}$', '', stem)
    stem_pat = re.compile(r'(?<![\w-])' + re.escape(base_stem) + r'(?![\w])')
    stem_hits = [c for c, t in corpus if c != rel and '.test.' not in c and stem_pat.search(t)]
    if stem_hits and base_stem != stem:
        return 'dinámico?', sorted(set(stem_hits))
    if test_hits:
        return 'solo tests', sorted(set(test_hits))
    return 'sin referencia', []


def main():
    corpus = code_corpus()
    rows = []
    for d in ART_DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            for f in sorted(files):
                p = os.path.join(base, f)
                rel = os.path.relpath(p, ROOT)
                ext = os.path.splitext(f)[1].lower().lstrip('.') or f
                size = os.path.getsize(p)
                with open(p, 'rb') as fh:
                    sha = hashlib.sha1(fh.read()).hexdigest()[:12]
                dims, dur = probe(p) if f.lower().endswith(MEDIA) and not f.endswith('.svg') else ('', '')
                if d in ('posters', 'prompts-munecos'):
                    use, where = 'fuera de la web', []
                else:
                    use, where = usage(rel, f, corpus)
                rows.append([rel, ext, dims, dur, f"{size / 1024:.1f}", sha, use, ', '.join(where[:4]) + (' …' if len(where) > 4 else '')])
    rows.sort()
    dup = {}
    for r in rows:
        dup.setdefault(r[5], []).append(r[0])
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('ruta\tformato\tmedidas\tduración\tpeso_kb\tsha1\tuso\tdónde\tduplicado_de\n')
        for r in rows:
            others = [x for x in dup[r[5]] if x != r[0]]
            fh.write('\t'.join(r + [', '.join(others)]) + '\n')
    print(f'{len(rows)} ficheros inventariados en {OUT}')


if __name__ == '__main__':
    main()
