#!/usr/bin/env python3
"""Vuelca los resultados de ejecución con el criterio corregido tras la revisión independiente.

Uso: python3 -I volcar_resultados_v2.py <resultados-e1> <docs/auditoria/2026-11>
- OK = comportamiento correcto; FALLO = reproduce un hallazgo confirmado o rompe algo.
  Una línea registrada como OK que cita un candidato confirmado para esa misma ficha
  (o un hallazgo nuevo N-…) pasa a FALLO, conservando el resultado original.
- Se quitan los «NO EJECUTADO» de E1 que ya tienen resultado en E2 para la misma ficha y viewport.
- Fichas de recorridos.md: Resultado, Hallazgos (H-NNN con su origen) y Corrección tras ejecutar.
- ejecucion.md: resumen, tablas, excepciones de viewport, teclado y correcciones.
- hallazgos.md: anexo «Recorridos en FALLO y sus hallazgos» y su inverso.
"""
import collections
import os
import re
import sys

RES, DOCS = sys.argv[1], sys.argv[2]
AREAS = [
    ('estructura', 'EST', 'Estructura y navegación'),
    ('catalogo', 'CAT', 'Catálogo y drops'),
    ('carrito', 'CART', 'Carrito, checkout y cuenta'),
    ('chat-crew', 'CHAT', 'Rocky IA y Crew'),
    ('estudio', 'STU', 'Estudio de beats'),
    ('noche-musica', 'NOCHE', 'Modo noche y música'),
    ('transversales', 'TRANS', 'Transversales'),
    ('e2', 'E2', 'E2 simulado (todas las áreas)'),
]
VP = {'escritorio': 0, 'movil': 1, 'api': 2}
IDRE = r'\b(?:C-[A-Z]+-\d+|N-[A-Z0-9]+-\d+|H-\d{3})\b'


def tsv(path, cols):
    if not os.path.exists(path):
        return []
    out = []
    for line in open(path, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) >= 2 and p[0].strip():
            out.append((p + [''] * cols)[:cols])
    return out


def ren(text, code):
    return re.sub(r'\bNUEVO-(\d+)\b', lambda m: f'N-{code}-{m.group(1)}', text)


def esc(x):
    return x.replace('|', '\\|').strip()


# Mapa ID -> destino, de la tabla de hallazgos.md
hp = os.path.join(DOCS, 'hallazgos.md')
hal = open(hp, encoding='utf-8').read()
dest = {}
for m in re.finditer(r'^\| ((?:C|N)-[A-Z0-9]+-\d+) \| ([^|]+) \|', hal, re.M):
    dest[m.group(1)] = re.findall(r'H-\d{3}', m.group(2))
titles = dict(re.findall(r'^### (H-\d{3}) · (.*)$', hal, re.M))

# R-IDs de cada candidato confirmado
cand_r = collections.defaultdict(set)
for f, code, _ in AREAS:
    for cid, estado, ev, cat, sev, rids in tsv(os.path.join(RES, f'{f}-candidatos.tsv'), 6):
        if estado.strip().startswith('confirmado'):
            cand_r[cid] |= set(re.findall(r'R-[A-Z0-9]+-\d+', rids))

rows, tecl, corr = [], [], []
for f, code, title in AREAS:
    for rid, vp, res, ev, hz in tsv(os.path.join(RES, f'{f}.tsv'), 5):
        row = dict(area=title, src=f, rid=rid, vp=vp, res=res.strip(), ev=ren(ev, code), hz=ren(hz, code))
        (tecl if rid.startswith('TECLADO') else rows).append(row)
    for rid, mal, real in tsv(os.path.join(RES, f'{f}-correcciones.tsv'), 3):
        corr.append((title, rid, ren(mal, code), ren(real, code)))
corr.append(('Estructura y navegación', 'R-NAV-06', 'Daba por ejecutados todos los pasos', 'En E1 no hay ningún producto añadible, así que solo se comprobó el estado vacío del icono del carrito; los pasos 2–5 (contador con líneas) no se ejecutaron en E1 y quedan cubiertos por las fichas de carrito de E2 (R-CART-06 y siguientes)'))

# Quitar «NO EJECUTADO» de E1 superados por E2
e2keys = {(r['rid'], r['vp']) for r in rows if r['src'] == 'e2'}
before = len(rows)
rows = [r for r in rows if not (r['src'] != 'e2' and r['res'].startswith('NO EJECUTADO') and (r['rid'], r['vp']) in e2keys)]
stale = before - len(rows)

# Remarcar OK -> FALLO
flipped = []
for r in rows + tecl:
    ids = re.findall(IDRE, r['hz'])
    hs = []
    for i in ids:
        if i.startswith('H-'):
            hs.append(i)
        elif dest.get(i) and (i.startswith('N-') or r['rid'] in cand_r.get(i, set()) or r['rid'].startswith('TECLADO')):
            hs += dest[i]
    hs = sorted(set(hs))
    r['hs'] = hs
    if r['res'].startswith('OK') and hs:
        sim = ' (E2 simulado)' if 'E2 simulado' in r['res'] else ''
        r['res'] = f"FALLO{sim}: reproduce {', '.join(hs)} (registrado como «{r['res']}» con el criterio anterior)"
        flipped.append((r['rid'], r['vp']))


def short(res):
    for k in ('FALLO', 'OK', 'NO EJECUTADO'):
        if res.startswith(k):
            sim = ' (E2 simulado)' if 'E2 simulado' in res else ''
            if k == 'NO EJECUTADO':
                mot = res.split(':', 1)[1].strip() if ':' in res else ''
                return 'NO EJECUTADO' + sim + (f' ({mot[:80]})' if mot else '')
            return k + sim
    return res[:60]


# --- ejecucion.md ---
cnt = collections.defaultdict(collections.Counter)
for r in rows + tecl:
    cnt[r['area']][(r['vp'], short(r['res']).split(' (')[0])] += 1
out = ['# Ejecución de recorridos', '',
       'Resultados de las tareas 3.1–3.4 (E1) y 4.1 (E2 simulado), con Playwright 1.64.1 y Google '
       'Chrome 157 (ver `design.md`, D4 y D5). Cada área usó su propia instancia de Express con el '
       'build de `dist/`. Las referencias `C-…` son candidatos y `N-<ÁREA>-n` hallazgos nuevos; su '
       'destino `H-NNN` está en la tabla final de `hallazgos.md`.', '',
       '**Criterio de resultado** (corregido tras la revisión independiente, tarea 8.2): **OK** = el '
       'comportamiento es correcto; **FALLO** = se reproduce un hallazgo confirmado o algo se rompe; '
       '**NO EJECUTADO** = no se pudo ejecutar, con su motivo. En la primera pasada los agentes '
       'evaluaron contra el «resultado esperado» de cada ficha, escrito a partir del código, y '
       f'marcaron como OK {len(flipped)} ejecuciones que reproducían un defecto confirmado; ahora '
       'figuran como FALLO e indican su resultado original. Se han quitado además '
       f'{stale} «NO EJECUTADO» de E1 que E2 simulado ya cubre para la misma ficha y viewport.', '',
       '## Resumen', '', '| Área | Viewport | OK | FALLO | NO EJECUTADO |', '| --- | --- | ---: | ---: | ---: |']
tot = collections.Counter()
for _, _, title in AREAS:
    c = cnt.get(title)
    if not c:
        continue
    for vp in sorted({k[0] for k in c}, key=lambda v: (VP.get(v, 9), v)):
        out.append(f"| {title} | {vp} | {c[(vp, 'OK')]} | {c[(vp, 'FALLO')]} | {c[(vp, 'NO EJECUTADO')]} |")
        for k in ('OK', 'FALLO', 'NO EJECUTADO'):
            tot[k] += c[(vp, k)]
out.append(f"| **Total** | | **{tot['OK']}** | **{tot['FALLO']}** | **{tot['NO EJECUTADO']}** |")
out.append('')
out += ['## Excepciones de viewport', '',
        'Fichas ejecutadas en un solo viewport (o solo por API) y el motivo que declara su campo «Viewports».', '',
        '| Ficha | Ejecutada en | Motivo declarado |', '| --- | --- | --- |']
rec = open(os.path.join(DOCS, 'recorridos.md'), encoding='utf-8').read()
vpfield = {m.group(1): m.group(2).strip() for m in re.finditer(r'^### (R-[A-Z0-9]+-\d+) .*?^- \*\*Viewports\*\*: *(.*?)$', rec, re.S | re.M)}
per = collections.defaultdict(set)
for r in rows:
    per[r['rid']].add(r['vp'])
for rid in sorted(per):
    v = per[rid]
    if not {'escritorio', 'movil'} <= v:
        out.append(f"| {rid} | {', '.join(sorted(v, key=lambda x: VP.get(x, 9)))} | {esc(vpfield.get(rid, '—'))} |")
out.append('')
for _, _, title in AREAS:
    rr = [r for r in rows if r['area'] == title]
    if not rr:
        continue
    out += [f'## {title}', '', '| Recorrido | Viewport | Resultado | Evidencia | Hallazgos |', '| --- | --- | --- | --- | --- |']
    for r in sorted(rr, key=lambda r: (r['rid'], VP.get(r['vp'], 9))):
        hz = ', '.join(r['hs']) + (f" ({esc(r['hz'])})" if r['hz'] else '') if r['hs'] else (esc(r['hz']) or '—')
        out.append(f"| {r['rid']} | {r['vp']} | {esc(r['res'])} | {esc(r['ev'])} | {hz} |")
    out.append('')
out += ['## Pasada de teclado (tarea 3.3)', '', '| Área | Pantalla | Viewport | Resultado | Evidencia | Hallazgos |', '| --- | --- | --- | --- | --- | --- |']
for r in tecl:
    hz = ', '.join(r['hs']) + (f" ({esc(r['hz'])})" if r['hz'] else '') if r['hs'] else (esc(r['hz']) or '—')
    out.append(f"| {r['area']} | {r['rid']} | {r['vp']} | {esc(r['res'])} | {esc(r['ev'])} | {hz} |")
out += ['', '## Correcciones de fichas', '', 'Fichas cuyo «resultado esperado» no coincidía con el código al ejecutarlas.', '',
        '| Área | Ficha | Qué estaba mal | Comportamiento real |', '| --- | --- | --- | --- |']
for t, rid, mal, real in corr:
    out.append(f'| {t} | {rid} | {esc(mal)} | {esc(real)} |')
open(os.path.join(DOCS, 'ejecucion.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# --- recorridos.md ---
per_res = collections.defaultdict(list)
per_h = collections.defaultdict(set)
per_o = collections.defaultdict(set)
for r in rows:
    per_res[r['rid']].append((r['vp'], r['res']))
    per_h[r['rid']] |= set(r['hs'])
    per_o[r['rid']] |= set(i for i in re.findall(IDRE, r['hz']) if not i.startswith('H-'))
corr_by = collections.defaultdict(list)
for _, rid, mal, real in corr:
    corr_by[rid].append(f'{mal} → {real}')


def fix(m):
    rid, body = m.group(1), m.group(2)
    if per_res.get(rid):
        summ = ' · '.join(f'{vp}: {short(x)}' for vp, x in sorted(per_res[rid], key=lambda y: (VP.get(y[0], 9), y[0])))
        body = re.sub(r'^- \*\*Resultado\*\*:.*$', f'- **Resultado**: {summ} (detalle en `ejecucion.md`)', body, count=1, flags=re.M)
    hs, orig = sorted(per_h.get(rid, set())), sorted(per_o.get(rid, set()))
    if hs or orig:
        txt = ', '.join(hs) if hs else '—'
        if orig:
            txt += f" (origen: {', '.join(orig)})"
        body = re.sub(r'^- \*\*Hallazgos\*\*:.*$', f'- **Hallazgos**: {txt}', body, count=1, flags=re.M)
    body = re.sub(r'^- \*\*Corrección tras ejecutar\*\*:.*\n', '', body, flags=re.M)
    if corr_by.get(rid):
        t = ' / '.join(corr_by[rid]).replace('\n', ' ')
        body = re.sub(r'(^- \*\*Resultado\*\*:.*$)', lambda mm: mm.group(1) + f'\n- **Corrección tras ejecutar**: {t}', body, count=1, flags=re.M)
    return f'### {rid}{body}'


rec = re.sub(r'^### (R-[A-Z0-9]+-\d+)(.*?)(?=^### |^## )', fix, rec, flags=re.S | re.M)
open(os.path.join(DOCS, 'recorridos.md'), 'w', encoding='utf-8').write(rec)

# --- hallazgos.md: anexos ---
fallos = [r for r in rows + tecl if r['res'].startswith('FALLO')]
app = ['## Recorridos en FALLO y sus hallazgos', '',
       f'Con el criterio corregido (ver `ejecucion.md`): {len(fallos)} ejecuciones en FALLO, cada una con '
       'al menos un hallazgo confirmado.', '', '| Recorrido | Viewport | Hallazgos |', '| --- | --- | --- |']
sin = []
for r in sorted(fallos, key=lambda r: (r['rid'], VP.get(r['vp'], 9))):
    if not r['hs']:
        sin.append(f"{r['rid']}/{r['vp']}")
    app.append(f"| {r['rid']} | {r['vp']} | {', '.join(r['hs']) or '**sin hallazgo**'} |")
inv = collections.defaultdict(set)
for r in rows + tecl:
    for h in r['hs']:
        inv[h].add(r['rid'])
app += ['', '## Hallazgos y los recorridos que los reproducen', '',
        'Trazabilidad inversa: de cada hallazgo a las fichas cuya ejecución lo reproduce o lo cita.', '',
        '| Hallazgo | Recorridos |', '| --- | --- |']
for h in sorted(titles):
    app.append(f"| {h} | {', '.join(sorted(inv.get(h, []))) or 'ninguno (sale de código, métricas, inventario o revisión)'} |")
hal = open(hp, encoding='utf-8').read()
cut = hal.find('\n## Recorridos en FALLO y sus hallazgos')
hal = (hal[:cut] if cut >= 0 else hal.rstrip()) + '\n\n' + '\n'.join(app) + '\n'
open(hp, 'w', encoding='utf-8').write(hal)

print(f"ejecuciones: {len(rows)} + teclado {len(tecl)}; OK→FALLO: {len(flipped)}; obsoletas quitadas: {stale}; "
      f"totales OK/FALLO/NO EJ: {tot['OK']}/{tot['FALLO']}/{tot['NO EJECUTADO']}; FALLO sin hallazgo: {sin}")
