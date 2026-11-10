# Compara dos informes de capturas.mjs: python3 comparar-capturas.py <dir-despues> (lee cap-antes/informe.json)
import json, re, sys
a = json.load(open('cap-antes/informe.json')); b = json.load(open(sys.argv[1] + '/informe.json'))
print(f"{'página':22} {'MB antes':>9} {'MB después':>10}   peores (píxeles descargados / píxeles pintados)")
for key in b:
    dpr = 2 if key.endswith('375') else 1
    dec = lambda r: sum(i['natural'][0]*i['natural'][1]*4 for i in r['images'])/1048576
    worst = []
    for i in b[key]['images']:
        pw, ph = i['painted']
        if pw < 8 or ph < 8: continue
        ratio = (i['natural'][0]*i['natural'][1]) / (pw*dpr*ph*dpr)
        name = re.sub(r'-[A-Za-z0-9_-]{8}\.webp$', '', i['src'].split('/')[-1])
        if ratio > 4.05 or ratio < 0.95: worst.append(f"{name} ×{ratio:.1f}")
    print(f"{key:22} {dec(a[key]):9.1f} {dec(b[key]):10.1f}   {', '.join(sorted(set(worst)))[:230]}")
