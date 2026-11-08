#!/usr/bin/env python3
"""Monta recorridos.md (secciones + matrices) y la parte «Sin confirmar» de hallazgos.md.

Uso: python3 -I montar_recorridos.py <carpeta-secciones> <docs/auditoria/2026-11>
"""
import os
import re
import sys

SRC, DOCS = sys.argv[1], sys.argv[2]
AREAS = [
    ('1-estructura.md', 'EST', 'Estructura y navegación'),
    ('2-catalogo.md', 'CAT', 'Catálogo y drops'),
    ('3-carrito.md', 'CART', 'Carrito, checkout y cuenta'),
    ('4-chat-crew.md', 'CHAT', 'Rocky IA y Crew'),
    ('5-estudio.md', 'STU', 'Estudio de beats'),
    ('6-noche-musica.md', 'NOCHE', 'Modo noche y música'),
    ('7-transversales.md', 'TRANS', 'Transversales'),
]
ROUTES = ['/', '/products/:category?', '/menudrop', '/cart', '/product/:productId', '/rockyIA',
          '/estudio', '/crew', '/mi-crew', '/legal/:page', '*']
FEATURES = ['cart', 'catalog', 'chat', 'crew', 'estampida', 'legal', 'music', 'night', 'peeker',
            'storefront', 'studio']
ENDPOINTS = [
    'GET /api/health', 'POST /api/shopify/webhooks', 'GET /api/shopify/status', 'GET /api/shopify/products',
    'GET /api/shopify/cart', 'POST /api/shopify/cart/lines', 'PATCH /api/shopify/cart/lines',
    'DELETE /api/shopify/cart/lines', 'POST /api/shopify/checkout', 'GET /api/shopify/account/login',
    'GET /api/shopify/account/callback', 'GET /api/shopify/account', 'POST /api/shopify/account/logout',
    'GET /api/shopify/account/crew', 'PATCH /api/shopify/account/crew/avatar',
    'POST /api/shopify/account/crew/redeem', 'POST /api/chat', 'POST /api/chat/barra', 'POST /api/avisos',
    'GET /api/beats', 'POST /api/beats', 'POST /api/beats/:id/like', 'POST /api/beats/:id/report',
    'DELETE /api/beats/:id', 'GET /api/drop/calendario.ics',
]
INFRA = ['PUERTA requireAccess', 'POST /access-gate', 'GET /access-gate/style.css',
         'GET /access-gate/media/:name', 'ESTÁTICOS /assets y /products', 'FALLBACK GET *', '404 /api/*']
ALIASES = {
    'Estáticos /assets': 'ESTÁTICOS /assets y /products',
    'Fallback de la SPA (GET *)': 'FALLBACK GET *',
}

coverage = {'ruta': {}, 'feature': {}, 'componente': {}, 'endpoint': {}}
sections, candidates = [], []
total_fichas = 0

for fname, code, title in AREAS:
    text = open(os.path.join(SRC, fname), encoding='utf-8').read()
    cov_match = re.search(r'```cobertura\n(.*?)```', text, re.S)
    body = text[:cov_match.start()] if cov_match else text
    parts = re.split(r'^###\s+Candidatos a hallazgo.*$', body, maxsplit=1, flags=re.M)
    fichas = parts[0].rstrip() + '\n'
    cand = parts[1] if len(parts) > 1 else ''
    total_fichas += len(re.findall(r'^### R-', fichas, re.M))
    sections.append(fichas)
    # Identificadores estables para los candidatos de primer nivel.
    n = 0
    out = []
    for line in cand.strip('\n').splitlines():
        m_num = re.match(r'^(\d+)\.\s+(.*)$', line)
        m_c = re.match(r'^- \*\*C-(\d+)\*\*\s*(.*)$', line)
        if m_num or m_c:
            n += 1
            rest = (m_num or m_c).group(2)
            rest = re.sub(r'^[·—-]\s*', '', rest)
            out.append(f'- **C-{code}-{n:02d}** · {rest}')
        else:
            out.append(line)
    candidates.append((code, title, n, '\n'.join(out).strip()))
    if cov_match:
        for raw in cov_match.group(1).splitlines():
            bits = [b.strip() for b in raw.split('|')]
            if len(bits) < 3 or bits[0] not in coverage:
                continue
            kind, key, ids = bits[0], bits[1], bits[2]
            if kind == 'feature':
                key = key.replace('src/features/', '').strip('/')
            if kind == 'endpoint':
                key = ALIASES.get(key, key)
            ids = [i.strip() for i in ids.split(',') if i.strip()]
            coverage[kind].setdefault(key, set()).update(ids)


def id_key(i):
    m = re.match(r'R-([A-Z0-9]+)-(\d+)', i)
    return (m.group(1), int(m.group(2))) if m else (i, 0)


def table(header, keys, kind, fmt=lambda k: f'`{k}`'):
    lines = [f'| {header} | Recorridos |', '| --- | --- |']
    empty = []
    for k in keys:
        ids = sorted(coverage[kind].get(k, set()), key=id_key)
        if not ids:
            empty.append(k)
        lines.append(f"| {fmt(k)} | {', '.join(ids) if ids else '**SIN RECORRIDO**'} |")
    return '\n'.join(lines), empty


rt, e1 = table('Ruta', ROUTES, 'ruta')
ft, e2 = table('Feature', FEATURES, 'feature', lambda k: f'`src/features/{k}`')
et, e3 = table('Endpoint', ENDPOINTS, 'endpoint')
it, e4 = table('Manejador', INFRA, 'endpoint')
comp_keys = sorted(k for k in coverage['componente'] if not re.search(r'\.test\.', k))
ct, _ = table('Componente o fichero', comp_keys, 'componente')
empty = e1 + e2 + e3 + e4

matrices = f"""## 8. Matrices de cobertura (tarea 2.9)

Construidas a partir de los bloques de cobertura de cada sección y contrastadas con los
listados mecánicos del apéndice A. **Total: {total_fichas} recorridos.** Filas sin
recorrido: **{len(empty)}**{(' — ' + ', '.join(empty)) if empty else ''}.

### 8.1 Rutas × recorridos

{rt}

### 8.2 Features × recorridos

{ft}

### 8.3 Endpoints × recorridos

{et}

### 8.4 Manejadores de infraestructura × recorridos

{it}

### 8.5 Componentes y ficheros × recorridos

Lista informativa: los ficheros que cada sección declaró cubrir (sin tests).

{ct}
"""

rec_path = os.path.join(DOCS, 'recorridos.md')
rec = open(rec_path, encoding='utf-8').read()
assert '<!-- SECCIONES -->' in rec, 'falta el marcador de secciones'
rec = rec.replace('<!-- SECCIONES -->', '\n'.join(sections).rstrip() + '\n\n' + matrices)
open(rec_path, 'w', encoding='utf-8').write(rec)

hal_path = os.path.join(DOCS, 'hallazgos.md')
hal = open(hal_path, encoding='utf-8').read()
marker = 'Pendiente de la ejecución de recorridos.'
assert marker in hal, 'falta el marcador de sin confirmar'
total_c = sum(c[2] for c in candidates)
block = [f'Candidatos que salieron al leer el código para el mapa de recorridos (tareas 2.2–2.8). '
         f'Son **{total_c}**. Se confirman o descartan al ejecutar los recorridos; al confirmarse '
         f'pasan arriba con un número `H-NNN` y aquí se anota «→ H-NNN» o «descartado: motivo».\n']
for code, title, n, text in candidates:
    block.append(f'### {title} (`C-{code}-NN`, {n})\n\n{text}\n')
hal = hal.replace(marker, '\n'.join(block).rstrip())
open(hal_path, 'w', encoding='utf-8').write(hal)
print(f'recorridos: {total_fichas}; candidatos: {total_c}; filas vacías: {empty}')
