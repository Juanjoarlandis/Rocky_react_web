#!/usr/bin/env python3
"""Vuelca los resultados de ejecución en los documentos de la auditoría (idempotente).

Uso: python3 -I volcar_resultados.py <resultados-e1> <docs/auditoria/2026-11>
- Genera ejecucion.md (todas las líneas de ejecución, teclado y correcciones).
- Actualiza los campos «Resultado» y «Hallazgos» de cada ficha de recorridos.md y añade
  «Corrección tras ejecutar» cuando la hay.
- Añade a cada candidato de hallazgos.md una línea «Ejecución» con su estado.
"""
import collections
import os
import re
import sys

RES, DOCS = sys.argv[1], sys.argv[2]
AREAS = [  # fichero de resultados → (código para NUEVO-n, título)
    ('estructura', 'EST', 'Estructura y navegación'),
    ('catalogo', 'CAT', 'Catálogo y drops'),
    ('carrito', 'CART', 'Carrito, checkout y cuenta'),
    ('chat-crew', 'CHAT', 'Rocky IA y Crew'),
    ('estudio', 'STU', 'Estudio de beats'),
    ('noche-musica', 'NOCHE', 'Modo noche y música'),
    ('transversales', 'TRANS', 'Transversales'),
    ('e2', 'E2', 'E2 simulado (todas las áreas)'),
]
VP_ORDER = {'escritorio': 0, 'movil': 1, 'api': 2}


def read_tsv(path, cols):
    rows = []
    if not os.path.exists(path):
        return rows
    for line in open(path, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 2 or not p[0].strip():
            continue
        rows.append((p + [''] * cols)[:cols])
    return rows


def esc(s):
    return s.replace('|', '\\|').strip()


def rename_nuevo(text, code):
    return re.sub(r'\bNUEVO-(\d+)\b', lambda m: f'N-{code}-{m.group(1)}', text)


def short(res):
    res = res.strip()
    for key in ('FALLO', 'OK', 'NO EJECUTADO', 'PENDIENTE'):
        if res.startswith(key):
            tag = key
            sim = ' (E2 simulado)' if 'E2 simulado' in res else ''
            if key == 'NO EJECUTADO':
                motivo = res.split(':', 1)[1].strip() if ':' in res else ''
                return f'NO EJECUTADO{sim}' + (f' ({motivo[:80]})' if motivo else '')
            return tag + sim
    return res[:60]


exec_rows, teclado, correcciones = [], [], []
per_ficha = collections.defaultdict(list)
hall_ficha = collections.defaultdict(set)
for fname, code, title in AREAS:
    for rid, vp, res, ev, hz in read_tsv(os.path.join(RES, f'{fname}.tsv'), 5):
        hz = rename_nuevo(hz, code)
        ev = rename_nuevo(ev, code)
        row = (title, rid, vp, res, ev, hz)
        if rid.startswith('TECLADO'):
            teclado.append(row)
        else:
            exec_rows.append(row)
            per_ficha[rid].append((vp, res))
            for h in re.findall(r'\b(?:C-[A-Z]+-\d+|N-[A-Z0-9]+-\d+|H-\d{3})\b', hz):
                hall_ficha[rid].add(h)
    for rid, mal, real in read_tsv(os.path.join(RES, f'{fname}-correcciones.tsv'), 3):
        correcciones.append((title, rid, rename_nuevo(mal, code), rename_nuevo(real, code)))

# --- ejecucion.md ---
counts = collections.defaultdict(collections.Counter)
for title, rid, vp, res, ev, hz in exec_rows + teclado:
    counts[title][(vp, short(res).split(' (')[0])] += 1
out = ['# Ejecución de recorridos', '',
       'Resultados de las tareas 3.1–3.4 (E1) y 4.1 (E2 simulado). Generado a partir de los '
       'registros de los scripts de Playwright 1.64.1 con Google Chrome 157 (ver `design.md`, '
       'D4 y D5). Cada área usó su propia instancia de Express con el build de `dist/`. Las '
       'referencias `C-…` son candidatos de `hallazgos.md`; `N-<ÁREA>-n`, hallazgos nuevos '
       'aparecidos al ejecutar.', '',
       '## Resumen', '', '| Área | Viewport | OK | FALLO | NO EJECUTADO |', '| --- | --- | ---: | ---: | ---: |']
for _, _, title in AREAS:
    c = counts.get(title)
    if not c:
        continue
    for vp in sorted({k[0] for k in c}, key=lambda v: (VP_ORDER.get(v, 9), v)):
        out.append(f"| {title} | {vp} | {c[(vp, 'OK')]} | {c[(vp, 'FALLO')]} | {c[(vp, 'NO EJECUTADO')]} |")
out.append('')
for _, _, title in AREAS:
    rows = [r for r in exec_rows if r[0] == title]
    if not rows:
        continue
    out += [f'## {title}', '', '| Recorrido | Viewport | Resultado | Evidencia | Hallazgos |', '| --- | --- | --- | --- | --- |']
    for _, rid, vp, res, ev, hz in sorted(rows, key=lambda r: (r[1], VP_ORDER.get(r[2], 9))):
        out.append(f'| {rid} | {vp} | {esc(res)} | {esc(ev)} | {esc(hz) or "—"} |')
    out.append('')
out += ['## Pasada de teclado (tarea 3.3)', '', '| Área | Pantalla | Viewport | Resultado | Evidencia | Hallazgos |', '| --- | --- | --- | --- | --- | --- |']
for title, rid, vp, res, ev, hz in teclado:
    out.append(f'| {title} | {rid} | {vp} | {esc(res)} | {esc(ev)} | {esc(hz) or "—"} |')
out += ['', '## Correcciones de fichas', '',
        'Fichas cuyo «resultado esperado» no coincidía con el código al ejecutarlas. Se evaluaron '
        'contra el comportamiento real.', '', '| Área | Ficha | Qué estaba mal | Comportamiento real |', '| --- | --- | --- | --- |']
for title, rid, mal, real in correcciones:
    out.append(f'| {title} | {rid} | {esc(mal)} | {esc(real)} |')
open(os.path.join(DOCS, 'ejecucion.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# --- recorridos.md ---
rp = os.path.join(DOCS, 'recorridos.md')
rec = open(rp, encoding='utf-8').read()
corr_by = collections.defaultdict(list)
for _, rid, mal, real in correcciones:
    corr_by[rid].append(f'{mal} → {real}')


def fix_ficha(m):
    rid, body = m.group(1), m.group(2)
    res = per_ficha.get(rid)
    if res:
        summary = ' · '.join(f'{vp}: {short(r)}' for vp, r in sorted(res, key=lambda x: (VP_ORDER.get(x[0], 9), x[0])))
        body = re.sub(r'^- \*\*Resultado\*\*:.*$', f'- **Resultado**: {summary} (detalle en `ejecucion.md`)', body, count=1, flags=re.M)
    hz = sorted(hall_ficha.get(rid, set()))
    if hz:
        body = re.sub(r'^- \*\*Hallazgos\*\*:.*$', f"- **Hallazgos**: {', '.join(hz)}", body, count=1, flags=re.M)
    body = re.sub(r'^- \*\*Corrección tras ejecutar\*\*:.*\n', '', body, flags=re.M)
    if corr_by.get(rid):
        txt = ' / '.join(corr_by[rid]).replace('\n', ' ')
        body = re.sub(r'(^- \*\*Resultado\*\*:.*$)', lambda mm: mm.group(1) + f'\n- **Corrección tras ejecutar**: {txt}', body, count=1, flags=re.M)
    return f'### {rid}{body}'


rec = re.sub(r'^### (R-[A-Z0-9]+-\d+)(.*?)(?=^### |^## )', fix_ficha, rec, flags=re.S | re.M)
open(rp, 'w', encoding='utf-8').write(rec)

# --- hallazgos.md (estado de candidatos) ---
cand = {}
for fname, code, _ in AREAS:
    for cid, estado, ev, cat, sev, rids in read_tsv(os.path.join(RES, f'{fname}-candidatos.tsv'), 6):
        if not cid.startswith('C-'):
            continue
        prev = cand.get(cid)
        line = f'{estado.strip()} · {cat.strip() or "—"} · {sev.strip() or "—"} · {rename_nuevo(ev, code).strip()} ({rids.strip() or "—"})'
        # E2 completa lo que E1 dejó pendiente: se conservan ambos.
        cand[cid] = (prev + ' ‖ E2 simulado: ' + line) if prev and fname == 'e2' else line
hp = os.path.join(DOCS, 'hallazgos.md')
hal = open(hp, encoding='utf-8').read()
hal = re.sub(r'^  - \*\*Ejecución\*\*:.*\n', '', hal, flags=re.M)


def add_state(m):
    cid = m.group(1)
    st = cand.get(cid)
    return m.group(0) + (f'\n  - **Ejecución**: {st}' if st else '')


hal = re.sub(r'^- \*\*(C-[A-Z]+-\d+)\*\*.*$', add_state, hal, flags=re.M)
open(hp, 'w', encoding='utf-8').write(hal)

print(f'ejecuciones: {len(exec_rows)}, teclado: {len(teclado)}, correcciones: {len(correcciones)}, '
      f'fichas con resultado: {len(per_ficha)}, candidatos con estado: {len(cand)}')
