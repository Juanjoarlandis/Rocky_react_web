#!/usr/bin/env python3
"""Medianas de Lighthouse por página y viewport (auditoría 2026-11, tarea 6.2).

Uso: python3 -I lighthouse-medianas.py <carpeta-con-json> <salida.json>
Lee <página>__<movil|escritorio>__<n>.json (salida de lighthouse.sh), descarta las pasadas
con runtimeError y calcula con statistics.median las cuatro categorías, FCP, LCP, Speed
Index, CLS, TBT, bytes de imagen, bytes totales y número de peticiones.
"""
import collections
import json
import os
import statistics as st
import sys

d, outp = sys.argv[1], sys.argv[2]
rows = collections.defaultdict(list)
errors = []
for f in sorted(os.listdir(d)):
    if not f.endswith('.json'):
        continue
    page, mode, _ = f[:-5].split('__')
    j = json.load(open(os.path.join(d, f), encoding='utf-8'))
    if j.get('runtimeError'):
        errors.append((f, j['runtimeError'].get('code')))
        continue
    c, a = j['categories'], j['audits']

    def sc(k):
        return round(c[k]['score'] * 100) if c[k]['score'] is not None else None

    items = a['network-requests']['details']['items']
    rows[(page, mode)].append(dict(
        perf=sc('performance'), a11y=sc('accessibility'), bp=sc('best-practices'), seo=sc('seo'),
        fcp=a['first-contentful-paint']['numericValue'], lcp=a['largest-contentful-paint']['numericValue'],
        si=a['speed-index']['numericValue'], cls=a['cumulative-layout-shift']['numericValue'],
        tbt=a['total-blocking-time']['numericValue'],
        img=sum(i.get('transferSize', 0) for i in items if i.get('resourceType') == 'Image'),
        tot=a['total-byte-weight']['numericValue'], req=len(items)))
out = []
for (page, mode), rs in sorted(rows.items()):
    def m(k):
        vals = [r[k] for r in rs if r[k] is not None]
        return st.median(vals) if vals else None
    out.append(dict(page=page, mode=mode, n=len(rs), perf=m('perf'), a11y=m('a11y'), bp=m('bp'), seo=m('seo'),
                    fcp=m('fcp') / 1000, lcp=m('lcp') / 1000, si=m('si') / 1000, cls=m('cls'), tbt=m('tbt'),
                    img=m('img') / 1024, tot=m('tot') / 1024, req=m('req')))
json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(out)} combinaciones página × viewport; pasadas descartadas: {errors}')
