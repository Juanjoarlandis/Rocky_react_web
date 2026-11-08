# Métricas de partida

Medidas del commit `7d2bf57` para comparar al final de la fase 4. Cada bloque lleva el
comando exacto para repetirlo.

## 1. Build de producción (tarea 6.1)

2026-11-08, Node 24.11.0, Vite 8.2.1:

```bash
npx vite build
```

### 1.1 JavaScript y CSS por chunk

El chunk `index` se descarga en todas las páginas; el resto se cargan de forma diferida
al entrar en su ruta.

| Fichero | Bruto | gzip |
| --- | ---: | ---: |
| `index.html` | 2.51 kB | 0.83 kB |
| `Legal-Cd0oGzrr.css` | 1.42 kB | 0.55 kB |
| `MenuDrop-Dv0r1SuK.css` | 1.88 kB | 0.74 kB |
| `ProductDetail-Dor7XHJ3.css` | 3.71 kB | 1.41 kB |
| `Cart-BPoiRZnn.css` | 5.16 kB | 1.50 kB |
| `Crew-gZKak55r.css` | 13.65 kB | 3.41 kB |
| `ChatComponent-CC3IJAwm.css` | 14.15 kB | 3.57 kB |
| `CrewProfile-Di64flhN.css` | 14.45 kB | 3.28 kB |
| `Studio-BqxpPfe0.css` | 24.25 kB | 5.42 kB |
| `index-K0dCrn9X.css` | 66.40 kB | 14.85 kB |
| `useCopyToClipboard-C2d5fyWr.js` | 0.40 kB | 0.29 kB |
| `chat-1bb26GSM.js` | 1.13 kB | 0.68 kB |
| `MenuDrop-BWUzOF54.js` | 2.59 kB | 1.03 kB |
| `ProductDetail-Dsng8mOW.js` | 4.00 kB | 1.66 kB |
| `Cart-DfHHzklY.js` | 4.58 kB | 1.71 kB |
| `ChatComponent-DNjo8pmo.js` | 8.27 kB | 3.08 kB |
| `Legal-DWmqmljv.js` | 12.04 kB | 4.51 kB |
| `CrewProfile-CQtN0bRE.js` | 12.62 kB | 3.69 kB |
| `Crew-D1ycuwV3.js` | 13.37 kB | 4.98 kB |
| `Studio-CSD2z6Zp.js` | 60.55 kB | 17.75 kB |
| `index-DRRAAIS0.js` | 336.79 kB | 110.80 kB |

Total: 12 ficheros JS (446,1 kB brutos; los 11 de la tabla más `theme-init.js`, que se
copia tal cual desde `public/`) y 9 CSS (141,7 kB brutos). El chunk común
`index` lleva 336,79 kB de JS (110,80 kB con gzip) y 66,40 kB de CSS (14,85 kB con
gzip). El estudio es el chunk diferido más grande (60,55 kB de JS y 24,25 kB de CSS).

### 1.2 Recursos copiados a `dist/`

```bash
for e in js css woff2 webp png svg m4a; do find dist -name "*.$e" -printf '%s\n' | awk -v e=$e '{s+=$1;n++}END{printf "%s %d %.1f\n",e,n,s/1024}'; done
```

| Tipo | Ficheros | Peso |
| --- | ---: | ---: |
| WebP | 86 | 4866,5 kB |
| M4A (música) | 2 | 3614,6 kB |
| JS | 12 | 446,1 kB |
| CSS | 9 | 141,7 kB |
| PNG | 3 | 83,9 kB |
| WOFF2 (Luckiest Guy 16,7 kB · Archivo 34,1 kB · Fredoka 29,0 kB) | 3 | 79,8 kB |
| SVG | 1 | 0,3 kB |

`dist/index.html` no declara `preload` ni `modulepreload` en el HTML generado.

## 2. Lighthouse (tarea 6.2)

**Primera tanda (2026-11-08) descartada.** Las 60 pasadas contra `http://localhost:3001`
terminaron en `NO_FCP` (la página no pintó nada). La causa fue la configuración de la
medida, no la web: ese Express tenía `PUBLIC_ORIGIN`/`API_ALLOWED_ORIGINS` en
`http://localhost:3002`, y Chrome envía la cabecera `Origin` al pedir los módulos JS, el
CSS y las fuentes del mismo origen (atributo `crossorigin`). La política de origen exacto
responde 403 a todo ello y la SPA no arranca:

```bash
curl -s -o /dev/null -w "%{http_code}" -H "Origin: http://localhost:3001" http://localhost:3001/assets/index-DRRAAIS0.js   # 403
curl -s -o /dev/null -w "%{http_code}" -H "Origin: http://localhost:3002" http://localhost:3001/assets/index-DRRAAIS0.js   # 200
```

Se repite contra una instancia cuyo origen permitido es el suyo propio. Lo que esto
revela sobre producción (una web servida desde un origen no listado se queda en blanco)
se trata como hallazgo en `hallazgos.md`.

### 2.1 Segunda tanda (válida)

2026-11-08, 14:41–14:52. Lighthouse 13.5.0 con Google Chrome 157 (`--headless=new`),
contra una instancia aislada de Express (`http://localhost:3290`, build de `dist/`, modo
demo, origen permitido el suyo, `SHOPIFY_RATE_LIMIT_MAX=1000` para que las 60 pasadas no
choquen con el límite por IP, resto de variables con los valores de `.env.example`) arrancada
por `herramientas/e1/lh-run.mjs`; la mediana se calcula por página y viewport sobre las tres
pasadas con `statistics.median` (script en `herramientas/lighthouse-medianas.py`). Carga media del
sistema entre 0,7 y 1,0 durante la medida. Tres pasadas por página y viewport (móvil con
limitación simulada de Lighthouse; escritorio con `--preset=desktop`); se da la mediana.

```bash
npx -y lighthouse@13.5.0 "$URL" [--preset=desktop] \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-path=/usr/bin/google-chrome --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json --output-path=<página>__<viewport>__<n>.json --quiet
```

| Página | Viewport | Rend. | Acces. | Buenas prác. | SEO | FCP | LCP | CLS | TBT | Imágenes | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | móvil | 69 | 96 | 100 | 100 | 3,00 s | 10,36 s | 0,029 | 0 ms | 1723 kB | 2213 kB |
| `/` | escritorio | 97 | 96 | 100 | 100 | 0,60 s | 1,26 s | 0,016 | 0 ms | 1755 kB | 2244 kB |
| `/products` | móvil | 69 | 96 | 100 | 100 | 3,15 s | 10,58 s | 0,029 | 0 ms | 1723 kB | 2213 kB |
| `/products` | escritorio | 97 | 96 | 100 | 100 | 0,64 s | 1,26 s | 0,016 | 0 ms | 1755 kB | 2245 kB |
| `/product/rockydz-boyz` | móvil | 53 | 97 | 100 | 100 | 3,00 s | 6,68 s | 0,386 | 0 ms | 1313 kB | 1813 kB |
| `/product/rockydz-boyz` | escritorio | 91 | 97 | 100 | 100 | 0,60 s | 1,22 s | 0,151 | 0 ms | 1313 kB | 1813 kB |
| `/menudrop` | móvil | 60 | 96 | 96 | 100 | 3,00 s | 6,53 s | 0,231 | 0 ms | 1218 kB | 1714 kB |
| `/menudrop` | escritorio | 86 | 96 | 100 | 100 | 0,60 s | 1,20 s | 0,219 | 0 ms | 1218 kB | 1714 kB |
| `/estudio` | móvil | 50 | 100 | 77 | 100 | 3,00 s | 7,13 s | 0,454 | 0 ms | 1281 kB | 2675 kB |
| `/estudio` | escritorio | 75 | 100 | 77 | 100 | 0,69 s | 1,28 s | 0,522 | 0 ms | 1281 kB | 2675 kB |
| `/crew` | móvil | 53 | 91 | 100 | 100 | 3,00 s | 6,53 s | 0,386 | 6 ms | 1495 kB | 2015 kB |
| `/crew` | escritorio | 77 | 91 | 100 | 100 | 0,60 s | 1,22 s | 0,437 | 0 ms | 1759 kB | 2279 kB |
| `/rockyIA` | móvil | 75 | 100 | 100 | 100 | 3,00 s | 5,18 s | 0,000 | 0 ms | 411 kB | 927 kB |
| `/rockyIA` | escritorio | 98 | 96 | 100 | 100 | 0,63 s | 1,14 s | 0,000 | 0 ms | 411 kB | 927 kB |
| `/cart` | móvil | 68 | 96 | 100 | 100 | 3,10 s | 6,75 s | 0,103 | 0 ms | 1197 kB | 1698 kB |
| `/cart` | escritorio | 96 | 96 | 100 | 100 | 0,60 s | 1,08 s | 0,097 | 0 ms | 1197 kB | 1698 kB |
| `/legal/privacidad` | móvil | 53 | 97 | 100 | 100 | 3,00 s | 6,60 s | 0,386 | 0 ms | 1121 kB | 1626 kB |
| `/legal/privacidad` | escritorio | 79 | 97 | 100 | 100 | 0,60 s | 1,08 s | 0,433 | 0 ms | 1121 kB | 1626 kB |
| `/no-existe (404)` | móvil | 71 | 100 | 100 | 100 | 3,00 s | 6,83 s | 0,028 | 0 ms | 1161 kB | 1650 kB |
| `/no-existe (404)` | escritorio | 97 | 100 | 100 | 100 | 0,60 s | 1,22 s | 0,008 | 0 ms | 1161 kB | 1650 kB |

**Lectura.**
- **Móvil**: rendimiento entre 50 y 75 en todas las páginas; LCP de 5,2 s a 10,6 s y FCP de
  3 s (red lenta simulada). En escritorio, 75–98.
- **CLS**: muy alto en `/estudio` (0,45 móvil · 0,52 escritorio), `/crew` (0,39 · 0,44),
  `/legal/privacidad` (0,39 · 0,43), la ficha (0,39 · 0,15) y `/menudrop` (0,23 · 0,22). El
  elemento que se desplaza es casi siempre `<footer class="footer">`; en el estudio,
  además, los muñecos del splash (`splash-muneco neon-art`).
- **Imágenes en todas las páginas**: de 411 kB (`/rockyIA`) a 1,75 MB (portada). En todas
  menos el chat, la imagen más pesada es `lata-spray-walk-seedance-224` (649 kB, la
  animación del pie), seguida de `sentado-860` (101 kB).
- **Elemento LCP** (móvil): portada y listado, la foto de producto «RockyRacing»; ficha, la
  foto de 5906 × 5906 (`rockydz-boyz.webp`); estudio, Crew y menú drop, la ilustración
  `sentado-860` con `loading="lazy"`; legal, un párrafo.
- **Auditorías que fallan con frecuencia**: `render-blocking-insight`, `unused-javascript`,
  `image-delivery-insight`, `lcp-discovery-insight`, `color-contrast`,
  `label-content-name-mismatch`; en Crew además `aria-prohibited-attr`, `heading-order` y
  `unsized-images`; en el menú drop `image-aspect-ratio`.
- **Buenas prácticas 77 en `/estudio`**: el iframe de Spotify pone las cookies de terceros
  `sp_t` y `sp_landing` (`third-party-cookies`, `inspector-issues`).
- **SEO 100** en local; en producción la puerta añade `x-robots-tag: noindex`, que es lo
  esperado mientras la web sea privada.

**Nota de transparencia**: estas pasadas usaron la red real del equipo. En `/estudio`,
Chrome cargó el iframe de `open.spotify.com/embed/…` como lo haría cualquier visitante;
no se envió ningún dato del usuario. Los recorridos de Playwright, en cambio, bloqueaban
toda salida que no fuera `localhost`.

**Limitación**: medido en local, sin Cloudflare (sin Brotli en los estáticos, sin CDN) y
con el catálogo de vista previa. Sirve como línea base para comparar el mismo montaje
antes y después de las fases 2–4, no como cifra de producción.

## 3. Imágenes por página, caché en producción y dependencias (tarea 6.3)

### 3.1 Imágenes por página

Bytes de imagen por página (mediana de Lighthouse, tabla anterior) y detalle de la
ejecución del catálogo (`scratchpad/resultados-e1/catalogo-imagenes.tsv`, respuestas de
red de Playwright con caché vacía):

| Página | Escritorio | Móvil | Observación |
| --- | --- | --- | --- |
| `/` | 19 imágenes, 2,13 MB | 18 imágenes, 2,10 MB | Descarga en la carga inicial las dos fotos de 5906 px |
| `/products/rocky-drop-4` | 11 imágenes, 1,31 MB | igual | Las dos fotos de 5906 px |
| `/product/smoker-edition` | 8 imágenes, 1,0 MB | igual | `rocky35-camel.webp` (5906 px) |
| `/product/rockydz-boyz` | 8 imágenes, 0,98 MB | igual | `rockydz-boyz.webp` (5906 px) |
| `/product/rockyracing` | 8 imágenes, 0,84 MB | igual | — |
| `/menudrop` | 8 imágenes, 0,88 MB | igual | En móvil descarga el patinador oculto con `display: none` (22,7 kB) |

Común a todas las páginas: `lata-spray-walk-seedance-224.webp` (≈650 kB, animación de 81
fotogramas en el pie) y `sentado-860.webp` (≈101 kB). Las fotos de 5906 px pesan poco en
red (150–175 kB) pero suben la memoria del renderizador en ≈+235 MB (ficha, móvil) y
≈+430 MB (portada, móvil) frente a una foto de 1254 px (ver H-003).

### 3.2 Cabeceras de producción (solo lectura, `curl`, 2026-11-08)

```bash
curl -s -o /dev/null -D - -H 'Accept-Encoding: br, gzip' https://rocky035.com/
curl -s -I -H 'Accept-Encoding: br, gzip' https://rocky035.com/access-gate/style.css
```

| Recurso | Estado | `cache-control` | Compresión | Otras |
| --- | --- | --- | --- | --- |
| `GET /` (puerta) | 200 HTML | `no-store` | `br` | CSP, HSTS (1 año, subdominios), `x-frame-options: DENY`, `x-robots-tag: noindex, nofollow, noarchive`, `cf-cache-status: DYNAMIC` |
| `/access-gate/style.css` | 200 | `no-store` | `br` | `cf-cache-status: BYPASS` |
| `/robots.txt` | 200 | `no-store` | `br` | — |
| `/assets/*`, `/products/*` | 404 con la puerta cerrada | `no-store` | — | No se pueden medir sin abrir la puerta |
| `HEAD /` | 404 | `no-store` | — | La puerta solo responde a `GET` |
| `/api/health` | 404 JSON | `no-store` | — | Solo responde desde loopback (`server/http/routes/health.mjs:17-20`) |

En local, Express sirve `/assets/*` con `public, max-age=31536000, immutable` y
`index.html` con `public, max-age=0, must-revalidate`, sin compresión (la pone Cloudflare).
Los medios y el CSS de la puerta van con `no-store` (≈166 kB por visita a la puerta).
Comprobar la caché real de los estáticos de producción queda para E3.

### 3.3 Dependencias

```bash
npm ci && npm audit --json && npm audit --omit=dev --json && npm outdated
```

2026-11-08: **15 vulnerabilidades** (3 críticas, 6 altas, 6 moderadas) sobre 549
dependencias; **4 en producción** (`proxy-addr` crítica, `body-parser` alta, `express` y
`qs` moderadas). `npm audit fix` las arregla dentro de los rangos de `package.json` (p. ej.
`express` 4.22.3) salvo tres que exigen tocar `package.json`: el `overrides` de `qs` fijado en
6.16.0 y `@vitest/coverage-v8` fijado exactamente en 4.1.10 (texto corregido tras la revisión
independiente). El CI (`npm audit --audit-level=moderate`) fallaba, como confirmó la primera
ejecución en GitHub (H-002). Tras el cambio `dependencias-y-ci`: 0 vulnerabilidades.
`npm outdated`: 19 paquetes por detrás; con salto mayor disponible, entre otros,
`express` 5, `eslint` 10, `stylelint` 17 y `dotenv` 18 (migrar a Express 5 requiere
acuerdo previo según `CLAUDE.md`).
