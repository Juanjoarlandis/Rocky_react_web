# Línea base de rendimiento para la fase 4

Medidas del commit `7effff4` (rama `propuestas/estudio-y-pared`, árbol limpio) tomadas el
2026-11-10, antes de empezar la optimización. Repite `metricas.md` con sus mismos comandos
y añade lo que aquella auditoría no midió: el servidor en una máquina limitada, las
escrituras del almacén y el coste de ejecución en el navegador. **No cambia código de la
aplicación.** Al cerrar la fase 4 se repite entera, con los mismos scripts, para comparar.

## 0. Entorno y método

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-10 |
| Commit | `7effff4` (`propuestas/estudio-y-pared`). La auditoría midió `7d2bf57`. Durante la medida entró `f4f7774`, que solo cambia `docs/ops/publicar.md` |
| Equipo | Intel i9-14900KF (32 hilos), 64 GB, disco NVMe, Linux 6.8. Carga media 0,9–1,5 |
| Node | 24.11.0 para el build y las instancias locales; la imagen Docker lleva 24.19.0 |
| Docker | 29.9.3 |
| Navegador | Google Chrome 157.0.8103.50; Lighthouse 13.5.0; Playwright-core 1.58.2 |

- **Código medido**: `git archive HEAD` en una carpeta temporal, sin `.env`, con el
  `node_modules` del repo (`npm ls` sin diferencias con el lock, salvo `sharp`, instalado
  con `--no-save`). El `dist/` resultante coincide fichero a fichero (127 ficheros,
  `sha256sum`) con el de la imagen Docker, que hace su propio `npm ci`.
- **No midas el `dist/` del árbol de trabajo**: el `.env` local fija `NODE_ENV` y Vite
  genera React de desarrollo (`index` de 531,9 kB en vez de 322,95 kB).
- **Las cifras absolutas no son las de producción.** Este equipo es mucho más rápido que
  una Raspberry o un VPS pequeño, no hay Cloudflare delante (sin Brotli ni CDN) y el
  catálogo es el de vista previa. Valen para comparar el mismo montaje antes y después.
- Scripts en [`herramientas/fase4/`](herramientas/README.md); el apartado 9 dice cómo
  repetir cada bloque.

## 1. Build de producción

```bash
npx vite build        # Node 24.11.0, Vite 8.3.6, sin NODE_ENV en el entorno
```

### 1.1 JavaScript y CSS por chunk

| Fichero | Bruto | gzip | En `7d2bf57` (bruto / gzip) |
| --- | ---: | ---: | ---: |
| `index.html` | 2,68 kB | 0,88 kB | 2,51 / 0,83 |
| `Legal-*.css` | 1,42 kB | 0,55 kB | 1,42 / 0,55 |
| `ProductDetail-*.css` | 3,99 kB | 1,49 kB | 3,71 / 1,41 |
| `Muro-*.css` (antes `MenuDrop`) | 4,88 kB | 1,71 kB | 1,88 / 0,74 |
| `Cart-*.css` | 5,16 kB | 1,50 kB | 5,16 / 1,50 |
| `Taller-*.css` | 5,99 kB | 1,45 kB | nuevo |
| `Crew-*.css` | 13,65 kB | 3,41 kB | 13,65 / 3,41 |
| `ChatComponent-*.css` | 14,15 kB | 3,57 kB | 14,15 / 3,57 |
| `CrewProfile-*.css` | 14,45 kB | 3,28 kB | 14,45 / 3,28 |
| `Studio-*.css` | 32,77 kB | 7,18 kB | 24,25 / 5,42 |
| **`index-*.css`** | **85,16 kB** | **18,71 kB** | 66,40 / 14,85 |
| `pegador-carteles-600-*.js` | 0,06 kB | 0,08 kB | nuevo |
| `commerce-*.js` | 0,07 kB | 0,09 kB | nuevo |
| `useCopyToClipboard-*.js` | 0,41 kB | 0,29 kB | 0,40 / 0,29 |
| `chat-*.js` | 1,13 kB | 0,68 kB | 1,13 / 0,68 |
| `Muro-*.js` (antes `MenuDrop`) | 2,72 kB | 0,98 kB | 2,59 / 1,03 |
| `ProductDetail-*.js` | 4,58 kB | 1,93 kB | 4,00 / 1,66 |
| `Cart-*.js` | 4,65 kB | 1,74 kB | 4,58 / 1,71 |
| `ChatComponent-*.js` | 8,31 kB | 3,10 kB | 8,27 / 3,08 |
| `CrewProfile-*.js` | 12,66 kB | 3,72 kB | 12,62 / 3,69 |
| `Legal-*.js` | 13,34 kB | 4,99 kB | 12,04 / 4,51 |
| `Crew-*.js` | 13,40 kB | 5,00 kB | 13,37 / 4,98 |
| `Taller-*.js` | 25,72 kB | 7,67 kB | nuevo |
| **`useDocumentTitle-*.js`** (chunk compartido) | **47,37 kB** | **17,32 kB** | nuevo |
| `Studio-*.js` | 69,36 kB | 20,51 kB | 60,55 / 17,75 |
| **`index-*.js`** | **322,95 kB** | **105,76 kB** | 336,79 / 110,80 |

`dist/index.html` precarga las tres fuentes y declara `modulepreload` de
`useDocumentTitle-*.js` y `commerce-*.js`: los dos se descargan en todas las páginas, igual
que `index-*.js`. **El JavaScript común ha pasado de 336,8 kB (110,8 kB gzip) a 370,4 kB
(123,2 kB gzip)** y el CSS común, de 66,4 kB (14,9 kB gzip) a 85,2 kB (18,7 kB gzip).

### 1.2 JavaScript y CSS inicial por ruta

Común más el chunk de la ruta y sus imports estáticos.

| Ruta | JS bruto | JS gzip | CSS bruto | CSS gzip |
| --- | ---: | ---: | ---: | ---: |
| `/` y `/products` | 370,4 kB | 123,2 kB | 85,2 kB | 18,7 kB |
| `/product/:id` | 375,0 kB | 125,1 kB | 89,2 kB | 20,2 kB |
| `/menudrop` | 373,1 kB | 124,2 kB | 90,0 kB | 20,4 kB |
| `/cart` | 375,0 kB | 124,9 kB | 90,3 kB | 20,2 kB |
| `/rockyIA` | 379,8 kB | 127,0 kB | 99,3 kB | 22,3 kB |
| `/crew` | 384,2 kB | 128,5 kB | 98,8 kB | 22,1 kB |
| `/mi-crew` | 383,1 kB | 126,9 kB | 99,6 kB | 22,0 kB |
| `/legal/:page` | 383,7 kB | 128,2 kB | 86,6 kB | 19,3 kB |
| `/taller` | 396,1 kB | 130,8 kB | 91,2 kB | 20,2 kB |
| `/estudio` | 441,3 kB | 144,7 kB | 117,9 kB | 25,9 kB |

### 1.3 De qué está hecho el JavaScript común

Reparto de los 370,4 kB entre módulos de origen, leyendo el sourcemap de un build con
`--sourcemap` (`herramientas/fase4/composicion-chunk.mjs.txt`; unos 11 kB de envoltorio
no se atribuyen a ningún módulo).

| Origen | Bruto | Parte |
| --- | ---: | ---: |
| `react-dom` | 178,0 kB | 48,1 % |
| `react-router` | 35,3 kB | 9,5 % |
| `react` + `scheduler` | 11,3 kB | 3,1 % |
| **Librerías** | **224,6 kB** | **60,6 %** |
| `src/features/night` (descontrol, spray, arte de noche) | 32,3 kB | 8,7 % |
| `src/components` (barra, pie, intro, muro de calle…) | 19,9 kB | 5,4 % |
| `src/features/peeker` (el Curioso) | 11,4 kB | 3,1 % |
| `src/features/catalog` | 11,1 kB | 3,0 % |
| `src/data` | 9,4 kB | 2,5 % |
| `src/features/drops` | 9,1 kB | 2,5 % |
| `src/features/storefront` | 8,6 kB | 2,3 % |
| `shared/` (catálogo de vista previa, drops) | 6,6 kB | 1,8 % |
| Rutas de imágenes importadas | 5,6 kB | 1,5 % |
| Resto de la aplicación | 20,6 kB | 5,6 % |
| **Aplicación** | **134,6 kB** | **36,3 %** |

Lectura: el suelo de librerías ronda los 225 kB brutos (unos 74 kB gzip, estimado en
proporción). De la aplicación, lo que no hace falta para pintar la portada (noche, Curioso,
Estampida, corredor del carrito y parte de `data` y `shared`) suma unos 55–65 kB brutos,
unos 18–21 kB gzip.

### 1.4 Recursos copiados a `dist/`

```bash
for e in js css woff2 webp png svg m4a; do find dist -name "*.$e" -printf '%s\n' | awk -v e=$e '{s+=$1;n++}END{printf "%s %d %.1f\n",e,n,s/1024}'; done
```

| Tipo | Ficheros | Peso | En `7d2bf57` |
| --- | ---: | ---: | ---: |
| WebP | 87 | 4917,1 kB | 86 · 4866,5 kB |
| M4A (música) | 2 | 3614,5 kB | 2 · 3614,6 kB |
| JS (con `theme-init.js`) | 16 | 514,9 kB | 12 · 446,1 kB |
| CSS | 10 | 177,4 kB | 9 · 141,7 kB |
| PNG | 3 | 83,9 kB | 3 · 83,9 kB |
| WOFF2 | 3 | 79,8 kB | 3 · 79,8 kB |
| SVG | 1 | 0,3 kB | 1 · 0,3 kB |

`dist/` ocupa 9,7 MB. No hay ningún `<video>`, mp4 ni webm: lo más pesado son dos WebP
animados de 81 fotogramas a 166 × 224 (`toxico-paseo-224`, 709,2 kB, y
`lata-spray-walk-seedance-224`, 663,2 kB) y el audio (`barro.m4a`, 2,68 MB a 190 kbps y
113 s; `modo-neon.m4a`, 1,02 MB a 64 kbps y 127 s).

## 2. Lighthouse

El mismo montaje que la segunda tanda de la auditoría (`metricas.md`, 2.1): Lighthouse
13.5.0 con Chrome en headless contra una instancia aislada de Express
(`http://localhost:3290`, el `dist/` del apartado 1, modo demo, origen permitido el suyo,
`SHOPIFY_RATE_LIMIT_MAX=1000` y el resto de `.env.example`). Tres pasadas por página y
viewport; se da la mediana. 2026-11-10, 11:46–11:57, 60 pasadas válidas de 60, carga media
del equipo entre 1,1 y 1,9.

| Página | Viewport | Rend. | Acces. | B. prác. | SEO | FCP | LCP | CLS | TBT | Imágenes | Total | Antes: Rend. · LCP · CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | móvil | 68 | 96 | 100 | 100 | 3,45 s | 9,76 s | 0,029 | 0 ms | 1400 kB | 1943 kB | 69 · 10,36 s · 0,029 |
| `/` | escritorio | 96 | 96 | 100 | 100 | 0,68 s | 1,37 s | 0,016 | 0 ms | 1418 kB | 1961 kB | 97 · 1,26 s · 0,016 |
| `/products` | móvil | 67 | 96 | 100 | 100 | 3,60 s | 9,83 s | 0,029 | 0 ms | 1400 kB | 1943 kB | 69 · 10,58 s · 0,029 |
| `/products` | escritorio | 97 | 96 | 100 | 100 | 0,72 s | 1,22 s | 0,016 | 0 ms | 1418 kB | 1961 kB | 97 · 1,26 s · 0,016 |
| `/product/rockydz-boyz` | móvil | 52 | 97 | 100 | 100 | 3,45 s | 6,08 s | 0,386 | 0 ms | 1313 kB | 1867 kB | 53 · 6,68 s · 0,386 |
| `/product/rockydz-boyz` | escritorio | 91 | 97 | 100 | 100 | 0,68 s | 1,30 s | 0,149 | 0 ms | 1313 kB | 1867 kB | 91 · 1,22 s · 0,151 |
| `/menudrop` | móvil | 50 | 96 | 100 | 100 | 3,30 s | 8,26 s | 0,386 | 0 ms | 1489 kB | 2043 kB | 60 · 6,53 s · 0,231 |
| `/menudrop` | escritorio | 75 | 100 | 100 | 100 | 0,68 s | 1,56 s | 0,429 | 0 ms | 1489 kB | 2043 kB | 86 · 1,20 s · 0,219 |
| `/estudio` | móvil | 48 | 100 | 77 | 100 | 3,45 s | 7,43 s | 0,454 | 0 ms | 1281 kB | 2745 kB | 50 · 7,13 s · 0,454 |
| `/estudio` | escritorio | 74 | 100 | 77 | 100 | 0,77 s | 1,42 s | 0,524 | 0 ms | 1462 kB | 2926 kB | 75 · 1,28 s · 0,522 |
| `/crew` | móvil | 53 | 91 | 100 | 100 | 3,45 s | 6,00 s | 0,386 | 8 ms | 1495 kB | 2068 kB | 53 · 6,53 s · 0,386 |
| `/crew` | escritorio | 76 | 91 | 100 | 100 | 0,68 s | 1,48 s | 0,427 | 0 ms | 1759 kB | 2332 kB | 77 · 1,22 s · 0,437 |
| `/rockyIA` | móvil | 71 | 100 | 100 | 100 | 3,45 s | 5,85 s | 0,000 | 0 ms | 411 kB | 980 kB | 75 · 5,18 s · 0,000 |
| `/rockyIA` | escritorio | 96 | 96 | 100 | 100 | 0,71 s | 1,28 s | 0,000 | 0 ms | 411 kB | 980 kB | 98 · 1,14 s · 0,000 |
| `/cart` | móvil | 67 | 96 | 100 | 100 | 3,45 s | 6,60 s | 0,103 | 8 ms | 1197 kB | 1752 kB | 68 · 6,75 s · 0,103 |
| `/cart` | escritorio | 94 | 96 | 100 | 100 | 0,68 s | 1,30 s | 0,095 | 0 ms | 1197 kB | 1752 kB | 96 · 1,08 s · 0,097 |
| `/legal/privacidad` | móvil | 51 | 97 | 100 | 100 | 3,45 s | 7,13 s | 0,386 | 0 ms | 1121 kB | 1680 kB | 53 · 6,60 s · 0,386 |
| `/legal/privacidad` | escritorio | 77 | 97 | 100 | 100 | 0,68 s | 1,24 s | 0,429 | 0 ms | 1121 kB | 1680 kB | 79 · 1,08 s · 0,433 |
| `/no-existe` (404) | móvil | 69 | 100 | 100 | 100 | 3,45 s | 7,20 s | 0,028 | 0 ms | 1161 kB | 1704 kB | 71 · 6,83 s · 0,028 |
| `/no-existe` (404) | escritorio | 96 | 100 | 100 | 100 | 0,68 s | 1,38 s | 0,008 | 0 ms | 1161 kB | 1704 kB | 97 · 1,22 s · 0,008 |

**Lectura.**

- **Móvil**: rendimiento entre 48 y 71; FCP de 3,3–3,6 s (antes 3,0 s) y LCP de 5,9 a
  9,8 s. Escritorio, 74–97. Nada ha mejorado desde la auditoría y `/menudrop` ha empeorado
  (rendimiento 60 → 50 en móvil y 86 → 75 en escritorio; CLS 0,23 → 0,39; +329 kB).
- **Elemento LCP en móvil**: en la portada, `/products` y `/menudrop` ya no es una foto,
  sino la cinta del cartel (`span.cartel-cinta`); en la ficha, la foto de 5906 × 5906
  (`rockydz-boyz.webp`); en `/estudio`, `/crew` y `/cart`, la ilustración `sentado-860`
  del pie, que lleva `loading="lazy"`; en legal, un párrafo; en el 404, el muñeco del
  mapa.
- **CLS**: el elemento que se desplaza es `<footer class="footer">` en la ficha,
  `/menudrop`, `/estudio`, `/crew`, `/cart` y legal (0,10–0,52). H-170 sigue vigente.
- **Imágenes**: en todas las páginas con pie corto, la más pesada es la animación
  `lata-spray-walk-seedance-224` (648 kB), seguida de `sentado-860` (100 kB). H-169 sigue
  vigente.
- **Auditorías que fallan en las 20 combinaciones**: `render-blocking-insight`,
  `unused-javascript`, `image-delivery-insight`, `network-dependency-tree-insight` y
  `document-latency-insight`. En 10–19: `largest-contentful-paint`,
  `lcp-discovery-insight`, `cumulative-layout-shift`, `label-content-name-mismatch` y
  `color-contrast`.
- **Buenas prácticas 77 en `/estudio`**: sigue cargando el reproductor de Spotify, con
  1,07 MB de scripts y cookies de terceros (`third-party-cookies`). Igual que en la
  auditoría, Chrome cargó ese iframe de `open.spotify.com` como cualquier visitante; no se
  envió ningún dato del usuario.

Medianas en `herramientas/datos/lh-medianas-7effff4.json`.

## 3. Navegador: peso, memoria y coste en ejecución

```bash
node traza-navegador.mjs <salida>
```

Chrome en headless contra la misma instancia en modo demo, con toda salida que no sea
`localhost` bloqueada. Dos perfiles: **móvil** (375 × 812, densidad 2, CPU cuatro veces
más lenta, como Lighthouse) y **escritorio** (1440 × 900, sin limitar). Tres escenarios: la
portada en primera visita (con la intro y la caché vacía), la portada con el modo neón
encendido y `/estudio` con la mesa sonando. La red es local y sin limitar: los tiempos de
carga no valen (para eso está Lighthouse), los pesos y los costes sí.

### 3.1 Peso y memoria

«Decodificadas» es la suma de ancho × alto × 4 bytes de las imágenes cargadas;
«necesarias», lo mismo limitado al tamaño al que se pintan. La memoria es el RSS de los
procesos *renderer* de Chrome, con su parte fija incluida: lo que importa es la subida.

| Escenario | Viewport | Peso al cargar | Tras recorrerla | Decodificadas (necesarias) al cargar | Tras recorrerla | Renderer |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Portada, primera visita | móvil | 1.318 kB | 2.895 kB | 21,6 MB (1,8) | 314,5 MB (4,2) | 426 → 811 MB |
| Portada, primera visita | escritorio | 1.921 kB | 2.926 kB | 45,9 MB (2,4) | 318,8 MB (3,0) | 453 → 839 MB |
| Portada en neón | móvil | 2.221 kB | 3.825 kB | 24,8 MB (1,8) | 314,5 MB (4,2) | 499 → 940 MB |
| Portada en neón | escritorio | 2.836 kB | 3.952 kB | 49,0 MB (2,4) | 314,8 MB (3,0) | 632 → 1.123 MB |
| `/estudio` (después: mesa sonando) | móvil | 1.551 kB | 1.570 kB | 23,5 MB (1,2) | — | 419 → 654 MB |
| `/estudio` (después: mesa sonando) | escritorio | 964 kB | 993 kB | 53,7 MB (0,4) | — | 537 → 695 MB |

- **Recorrer la portada sube la memoria del renderer en unos 385 MB**, en móvil y en
  escritorio. Casi todo son las dos fotos de 5906 × 5906 (`rockydz-boyz.webp` y
  `rocky35-camel.webp`): 266 MB decodificadas para pintarse a menos de 300 px de lado,
  entre 458 y 637 veces más píxeles de los que se ven (H-003).
- La portada en primera visita descarga 363 kB de JS, 83 kB de CSS, 81 kB de fuentes y
  791 kB en 24 imágenes (móvil) antes de tocar nada; al recorrerla, 2.368 kB en 34
  imágenes.
- Encender el neón descarga `modo-neon.m4a` (998 kB) y el arte de noche; en escritorio el
  proceso de GPU pasa de 177 MB a 317 MB al recorrer la página.
- En `/estudio`, las ilustraciones `-hd` (unos 1000 × 1400 px) se pintan entre 16 y 476
  veces más pequeñas de lo que miden: 53,7 MB decodificadas para 0,4 MB necesarias en
  escritorio.
- El peso de `/estudio` en escritorio varía entre pasadas (964 kB aquí, 1.726 kB en la
  anterior): cuando el pie sube antes de que cargue el contenido (H-170), sus imágenes
  diferidas entran en pantalla y se descargan, animación de 648 kB incluida. El CLS de
  esta traza tampoco es estable (0 y 0,50 en dos pasadas); la referencia es Lighthouse.

### 3.2 Coste en ejecución

Ocupación del hilo principal (`Performance.getMetrics`) y, en escritorio, CPU de los
procesos renderer y GPU de Chrome como porcentaje de un núcleo. El reposo se mide 10 s
sin muestrear fotogramas. En móvil la CPU de proceso no vale: la falsea el propio
limitador.

| Fase | Móvil ×4: hilo principal | Escritorio: hilo principal | Escritorio: renderer + GPU | Observaciones |
| --- | ---: | ---: | ---: | --- |
| Portada de día, en reposo | 0,7 % | 0,3 % | 1,4 % + 0,6 % | 33–45 recálculos de estilo en 10 s |
| Portada de día, scroll | 4,3 % | 2,0 % | 8,7 % + 8,5 % | |
| Encender el neón (5 s) | 23,1 % | 10,7 % | 21,5 % + 22,3 % | Móvil: una tarea larga de 63 ms |
| **Neón, en reposo, con su cinta sonando** | **15,8 %** | **8,6 %** | **12,8 % + 13,7 %** | 607–609 recálculos de estilo en 10 s: uno por fotograma |
| Neón, en reposo, con la radio parada | 13,6 % | 7,8 % | 10,8 % + 5,9 % | 606–610 recálculos en 10 s. Animaciones vivas: `tubo-roto` en los dos `.page-title`, `lata-patrulla` y `ticker-scroll` |
| Neón, moviendo el puntero | — | 12,4 % | 50,1 % + 35,5 % | La linterna (H-136) |
| Neón, scroll | 39,1 % | 15,0 % | 85,8 % + 61,5 % | |
| `/estudio`, en reposo | 1,0 % | 0,3 % | 1,7 % + 2,7 % | |
| `/estudio`, mesa sonando | 30,2 % | 10,9 % | 27,3 % + 9,3 % | 167–176 layouts en 10 s; móvil: una tarea larga de 72 ms |

- **De día la web está quieta**: en reposo no llega al 1 % del hilo principal.
- **El modo neón es lo caro.** Encenderlo pone a sonar su cinta (`modo-neon.m4a`), así
  que ese es su estado normal. Sin tocar nada recalcula estilos en cada fotograma y ocupa
  el 15,8 % del hilo en el móvil lento y un cuarto de núcleo en escritorio; al hacer
  scroll, el 39 % del hilo en móvil y casi núcleo y medio en escritorio (con rasterizado
  por software). En escritorio es entre ocho y trece veces la CPU que cuesta de día.
- **El coste es del neón, no de la música**: con la radio parada sigue en el 13,6 % del
  hilo y con un recálculo por fotograma. De día, con las mismas dos animaciones de la
  cinta del pie, son 33–45 recálculos en 10 s; lo único que añade la noche en reposo es
  `tubo-roto` sobre los títulos.
- Mover el puntero en neón sube la CPU de Chrome de 0,27 a 0,86 núcleos.
- La mesa sonando ocupa el 30 % del hilo en el móvil lento, con unos 17 layouts por
  segundo.
- No se perdió ningún fotograma por culpa del hilo principal en el scroll (0 de 481 por
  encima de 25 ms en los cuatro casos). En este equipo esa medida no discrimina: las que
  sirven para comparar son la ocupación del hilo y la CPU.

## 4. Servidor en un contenedor limitado

```bash
docker build --no-cache -t rocky035:lineabase-7effff4 <carpeta del git archive>
ROCKY_REPO=<git archive con dist/> node medir-contenedor.mjs rocky035:lineabase-7effff4 <salida> 256m
```

El contenedor arranca con las restricciones de `compose.production.yaml` (`--init`,
`--read-only`, `tmpfs` en `/tmp`, sin capacidades, 256 procesos) más `--cpus=1` y
`--memory`. Entorno: `NODE_ENV=production` (el de la imagen), `PUBLIC_ORIGIN` HTTPS,
`TRUST_PROXY_HOPS=1`, puerta de acceso apagada, almacén cifrado con una clave aleatoria y
sin Shopify. La carga la genera ApacheBench desde fuera del contenedor, con `keep-alive`.

### 4.1 Imagen

| Capa | Tamaño |
| --- | ---: |
| Base `node:24.19.0-bookworm-slim` | 229,1 MB |
| `node_modules` de producción | 12,9 MB |
| `dist/` | 9,6 MB |
| `server/`, `shared/`, scripts y `package*.json` | 1,1 MB |
| **Total** | **252,7 MB** |

- De los 16,2 MB que ocupa `node_modules` dentro de la imagen, 11,3 MB (el 70 %) son
  `react-dom`, `react-router`, `react` y `scheduler`. El servidor no los importa
  (`server/` y `shared/` solo usan `express` y `dotenv`): están en `dependencies` y
  `npm prune --omit=dev` los conserva.
- Construir sin caché tarda 22 s en este equipo (`npm ci` 3,1 s; tests y build 8,1 s;
  `npm prune` 9,0 s). No es representativo de la Raspberry, donde el mismo build ha
  registrado un 29 % de espera de E/S (`docs/ops/publicar.md`).

### 4.2 Arranque y reposo (256 MB, 1 CPU)

| Medida | Valor |
| --- | ---: |
| De `docker run` al primer 200 en `/` | 211 ms |
| Arranque de Node dentro del contenedor (hasta «listening») | 171 ms |
| Memoria del contenedor en reposo (cgroup) | 24,9 MB (21,3 MB anónima) |
| RSS del proceso Node en reposo | 70,0 MB |
| CPU en reposo, sin `HEALTHCHECK` | 17 ms en 60 s (0,03 % de una CPU) |
| CPU en reposo, con el `HEALTHCHECK` de la imagen | 372 ms en 120 s (0,31 %) |
| Pico de memoria del contenedor en reposo, sin / con `HEALTHCHECK` | 29,1 MB / 53,0 MB |

El RSS incluye las páginas del binario de Node, que el cgroup no cuenta por ser de
fichero y compartibles. El `HEALTHCHECK` lanza un `node -e fetch(…)` cada 30 s: en este
equipo cuesta unos 85 ms de CPU y unos 24 MB transitorios por sonda, y multiplica por diez
el consumo en reposo. En una máquina cinco o diez veces más lenta sería entre medio
segundo y un segundo de CPU cada 30 s.

### 4.3 Latencia con 20 conexiones (256 MB, 1 CPU)

| Recurso | Bytes | Peticiones | Por segundo | p50 | p95 | p99 | Máx. |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `index.html` | 2.685 | 5.000 | 10.139 | 1 ms | 3 ms | 31 ms | 58 ms |
| JS principal | 322.953 | 2.000 | 3.357 | 2 ms | 53 ms | 65 ms | 65 ms |
| JS principal con `Accept-Encoding: br, gzip` | 322.953 | 2.000 | 3.970 | 2 ms | 54 ms | 58 ms | 60 ms |
| CSS principal | 85.168 | 3.000 | 7.936 | 1 ms | 2 ms | 48 ms | 65 ms |
| WebP animado del pie | 663.248 | 1.000 | 2.495 | 3 ms | 52 ms | 59 ms | 59 ms |
| `GET /api/drops` | 61 | 5.000 | 26.270 | 0 ms | 1 ms | 1 ms | 45 ms |
| `GET /api/shopify/status` | 140 | 1.500 | 17.795 | 1 ms | 2 ms | 31 ms | 31 ms |

Sin fallos ni respuestas distintas de 2xx. Dos lecturas:

- **El origen no comprime.** Con `Accept-Encoding: br, gzip` el JS principal viaja con sus
  322.953 bytes: la compresión depende entera de Cloudflare. El tramo entre Cloudflare y
  el servidor va sin comprimir.
- Los p95 de unos 50 ms en los ficheros grandes son el corte de la cuota de CPU (periodos
  de 100 ms), no el disco: el servidor satura una CPU sirviendo estáticos. Las cifras por
  segundo son las de este equipo; una CPU de VPS o de Raspberry dará varias veces menos.

`GET /api/shopify/products` con el doble de Shopify (fuera del contenedor, apartado 5):
7,3 ms la primera lectura y 0,7 ms desde la caché de 30 s.

### 4.4 Memoria bajo carga

Memoria del contenedor (cgroup) después de cada prueba, en este orden y sin reiniciar
entre ellas (`ROCKY_QUICK=1`):

| Después de | 256 MB · 20 conexiones | 128 MB · 20 | 128 MB · 4 | 128 MB · 1 |
| --- | ---: | ---: | ---: | ---: |
| Reposo | 24,9 MB | 24,2 MB | 24,5 MB | 24,2 MB |
| `index.html` × 5.000 | 54,7 MB | 53,5 MB | 47,5 MB | 41,2 MB |
| JS principal × 2.000 | 76,8 MB | **OOM** | 122,4 MB | 53,0 MB |
| JS principal × 2.000 (con `Accept-Encoding`) | 121,3 MB | — | 124,5 MB | 80,4 MB |
| CSS principal × 3.000 | 152,9 MB | — | **OOM** | 79,8 MB |
| WebP animado × 1.000 | 146,8 MB | — | — | 107,1 MB |
| `GET /api/drops` × 5.000 | 153,7 MB | — | — | 81,0 MB |
| `GET /api/shopify/status` × 1.500 | 155,1 MB | — | — | 81,3 MB |
| Pico | 164,9 MB | — | — | 114,8 MB |
| RSS de Node al acabar | 198,6 MB | — | — | 127,0 MB |

- **Con 128 MB el servidor muere por falta de memoria** (`OOMKilled`, código 137) al
  servir el JS principal con 20 conexiones y, con 4, al llegar al CSS. Solo aguanta la
  tanda con una conexión, y aun así toca 114,8 MB.
- **Con 256 MB sube de 25 MB a 155 MB y no los devuelve**: 20 s después de la carga sigue
  en 152–155 MB (casi todo memoria anónima). El pico varía entre tandas: 157,8 MB,
  164,9 MB y 173,0 MB en tres repeticiones.
- Servir 5.000 veces un `index.html` de 2,7 kB ya dobla la memoria (25 → 55 MB). El
  consumo depende de cuánto se sirve, no de cuántas conexiones hay abiertas.
- No hay ningún tope configurado: ni `NODE_OPTIONS` ni límites de memoria o CPU en
  `compose.production.yaml`.

La carga de esta prueba es muy superior a la de un día normal, pero marca el margen: hoy
el servidor no cabe con garantías en 128 MB y necesita unos 200 MB de RSS cuando le llega
una ráfaga.

## 5. Escrituras del almacén cifrado

El almacén (`server/storage/encrypted-file-store.mjs`) guarda el estado en memoria y, en
cada mutación, serializa, cifra y reescribe el fichero entero. Se cuentan esos volcados
con una precarga que envuelve `writeState()` sin tocar el servidor, contra el doble local
de Shopify y OpenRouter de la auditoría (`herramientas/e2sim/`):

```bash
node contar-escrituras.mjs <salida>
```

El doble no simula las consultas Admin de los drops, así que la instancia va sin
credenciales Admin: sin drops, sin Taller y sin pared compartida (la pared guarda en su
propio fichero, con retraso, y no pasa por este almacén).

| Petición | Volcados | Fichero después |
| --- | ---: | ---: |
| `GET /` · `GET /assets/*` · `GET /api/health` | 0 | — |
| `GET /api/shopify/status` · `/products` · `GET /api/drops` | 0 | — |
| `GET /api/shopify/cart` · `/account` · `GET /api/beats` (con o sin sesión) | 0 | — |
| `POST /api/shopify/cart/lines`, visitante nuevo (sesión y carrito nuevos) | **4** | 1,6 kB |
| `POST /api/shopify/cart/lines`, sesión existente | 2 | 3,4 kB |
| `PATCH /api/shopify/cart/lines` (cantidad) | 2 | 5,2 kB |
| `DELETE /api/shopify/cart/lines` | 2 | 6,3 kB |
| `POST /api/beats` (publicar) | 2 | 6,8 kB |
| `POST /api/beats/:id/like` | 1 | 6,8 kB |
| `POST /api/chat` (cada mensaje) | 1 | 7,1–7,4 kB |
| `POST /api/avisos` | 2 | 7,7 kB |

**Las lecturas no escriben** (22 peticiones probadas, todas con 200 o 201). El coste está
en las mutaciones, porque cada volcado reescribe todo el fichero y el fichero crece con
las sesiones vivas, que duran 30 días. Con 1.000 visitantes nuevos que añaden una
camiseta al carrito, uno detrás de otro:

| Sesiones en el almacén | Fichero | Por volcado | Escrito por cada alta | Petición (mediana) |
| ---: | ---: | ---: | ---: | ---: |
| 1–50 | 77 kB | 0,27 ms | 0,17 MB | 2,0 ms |
| 226–275 | 391 kB | 1,35 ms | 1,39 MB | 6,7 ms |
| 476–525 | 740 kB | 2,58 ms | 2,76 MB | 12,2 ms |
| 951–1000 | 1.403 kB | 4,71 ms | 5,35 MB | 22,7 ms |

Cada sesión con carrito ocupa unos 1,4 kB en el fichero. Las 1.000 altas escribieron
**2,75 GB** en disco en total: el coste por petición crece en línea recta con las sesiones
vivas y el acumulado, con su cuadrado. Los tiempos son de un NVMe; en una tarjeta SD o en
el disco de un VPS barato la misma cantidad de bytes tarda mucho más y desgasta el
soporte. Las mutaciones se serializan en una sola cola, así que mientras dura un volcado
esperan todas las demás.

## 6. Hallazgos de la fase 4, contra el código de hoy

Comprobación de los hallazgos de rendimiento de `plan-fases.md` (C15 y C16) en `7effff4`.

| Hallazgo | Estado | Evidencia de hoy |
| --- | --- | --- |
| H-003 Dos fotos de producto de 5906 × 5906 | Vigente | +385 MB de memoria del renderer al recorrer la portada (3.1) |
| H-169 Animación del pie de 650 kB | Vigente | `lata-spray-walk-seedance-224-*.webp`, 663,2 kB; la imagen más pesada en 7 de 10 páginas (2) |
| H-145 `barro.m4a` a 190 kbps | Vigente | 113 s, 190 kbps, 2,68 MB (`ffprobe`) |
| H-170 CLS por el pie | Vigente | CLS de 0,10 a 0,52 en seis páginas, siempre `footer.footer` (2) |
| H-171 LCP en móvil | Vigente | LCP de 5,9 a 9,8 s en móvil (2) |
| H-137 Un `MutationObserver` por cada `useNightMode` | Vigente | `useNightMode.js` crea uno por suscripción; 31 llamadas en 19 ficheros |
| H-136 La linterna repinta la ventana entera | Vigente | Mover el puntero en neón sube la CPU de Chrome de 0,27 a 0,86 núcleos (3.2), aunque `torch.js` ya agrupa por fotograma |
| H-135 Lienzo del spray a página entera | Vigente | El lienzo se monta en cada ruta de noche, se coja o no el spray (`Spray.jsx:602`), con tope de 12 Mpx; su coste no se ha aislado del resto del neón |
| H-118 Dos `AudioContext` en el estudio | Vigente | `createEngine()` crea un contexto por llamada y lo llaman la mesa (`BeatMachine.jsx:198`) y el ranking (`useRankingPlayer.js:52`); hay un tercero en `spray/rattle.js` |
| H-096 Leer el perfil Crew reescribe el almacén | Sin medir | Necesita cuenta de cliente (HTTPS local); las demás lecturas no escriben (5) |
| H-047 La Estampida descarga 615 KiB | Vigente | 24 ilustraciones, 630.160 bytes, pintadas a 70–140 px de alto (`Estampida.jsx:38-48`) |
| H-083 El repartidor cruza sin dibujo | Vigente | `CartRunner.jsx` no precarga y la carrera dura 1.120 ms |
| H-068 `/menudrop` descarga una ilustración oculta | Ya no aplica | `MenuDrop.jsx` se sustituyó por el muro (`42bf1e1`) y `muro.css` no oculta ninguna imagen; el mismo patrón sigue en `/estudio`, `/rockyIA`, `/mi-crew`, `/taller` y la portada |
| H-097 `useCrewProfile` devuelve un objeto nuevo | Vigente | `useCrewProfile.js:52-59`; impacto limitado, nadie depende del objeto entero |

## 7. Dependencias y cabeceras de producción

- `npm audit` y `npm audit --omit=dev`: **0 vulnerabilidades** (550 dependencias, 73 de
  producción).
- Producción (solo lectura, con la puerta cerrada), igual que en la auditoría: `GET /`
  responde 200 con `cache-control: no-store`, `content-encoding: br` y
  `cf-cache-status: DYNAMIC`; `/access-gate/style.css`, `no-store` y `BYPASS` (H-152). Los
  estáticos de la aplicación no se pueden medir desde fuera mientras la puerta esté
  cerrada.

## 8. Presupuestos de la fase 4

Fijados a partir de esta línea base. Máquina objetivo: 1 vCPU, 512 MB de RAM y disco
lento, con el contenedor limitado a 128 MB. Si al implementar alguno resulta
inalcanzable, se cambia aquí con su motivo y su medida, no en silencio.

| Métrica | Hoy | Presupuesto | Se comprueba en |
| --- | ---: | ---: | --- |
| JS inicial de la portada (gzip) | 123,2 kB | ≤ 100 kB | 1.2 |
| CSS común (gzip) | 18,7 kB | ≤ 15 kB | 1.2 |
| Peso total de `/` en móvil (Lighthouse) | 1.943 kB | ≤ 800 kB | 2 |
| Rendimiento móvil de Lighthouse, todas las páginas | 48–71 | ≥ 85 | 2 |
| LCP en móvil | 5,9–9,8 s | ≤ 3,0 s | 2 |
| CLS | hasta 0,52 | ≤ 0,05 | 2 |
| Píxeles de la imagen mayor frente a los que se pintan | ×458 a ×637 | ≤ ×4 | 3.1 |
| Imágenes decodificadas tras recorrer la portada (móvil) | 314,5 MB | ≤ 40 MB | 3.1 |
| Hilo principal en reposo con el neón (móvil ×4) | 15,8 % | ≤ 5 % | 3.2 |
| CPU de Chrome en reposo con el neón (escritorio) | 26,5 % de un núcleo | ≤ 8 % | 3.2 |
| Hilo principal con la mesa sonando (móvil ×4) | 30,2 % | ≤ 20 % | 3.2 |
| Compresión en el origen (JS, CSS, HTML, SVG, JSON) | ninguna | Brotli y gzip precomprimidos | 4.3 |
| Memoria del contenedor bajo la carga de 4.3 | pico 158–173 MB; OOM con 128 MB | supera la tanda con 128 MB; pico ≤ 100 MB | 4.4 |
| Memoria del contenedor en reposo | 24,9 MB | ≤ 30 MB | 4.2 |
| CPU en reposo | 0,31 %, con un `node` nuevo cada 30 s | ≤ 0,05 %, sin lanzar procesos | 4.2 |
| Escrito a disco por 1.000 altas de carrito | 2,75 GB | ≤ 30 MB | 5 |
| Lecturas que escriben en el almacén | 0 | 0 | 5 |
| `node_modules` dentro de la imagen | 16,2 MB | ≤ 5 MB | 4.1 |
| Dónde se construye la imagen | en la máquina de producción | fuera de ella | `docs/ops/publicar.md` |

Cuatro cifras cambian respecto a la propuesta inicial, por lo que se ha medido:

- **JS ≤ 100 kB, no 90 kB.** Las librerías (`react-dom`, `react-router`, `react`) ocupan
  unos 74 kB gzip que no se pueden diferir; bajar de 100 kB exigiría cambiar de router.
- **CSS ≤ 15 kB, no 12 kB.** Lo que se puede sacar del CSS común (noche, spray, Curioso,
  Estampida, corredor del carrito, 404 y lightbox) es alrededor del 22 % de su fuente.
  Las hojas del muro y de la ficha ya van en su propio chunk.
- **LCP ≤ 3,0 s, no 2,5 s.** Es una SPA sin render en servidor medida con red 4G lenta
  simulada: el FCP de hoy ya es de 3,45 s.
- **Las lecturas ya no escribían.** El presupuesto del almacén pasa a ser lo que escriben
  las mutaciones, que es donde está el coste.

### Lo que ya vigila `npm run check`

Desde el cambio `presupuesto-de-rendimiento`, `npm run check` (y con él el CI) ejecuta
`npm run budget:check` sobre el `dist/` recién construido y falla si algo supera los
límites de `scripts/performance-budget.json`. Mide con el gzip de `node:zlib` a nivel 9,
que da cifras un 1 % menores que las de Vite de la tabla anterior, y cuenta como
JavaScript inicial todo lo que `index.html` hace descargar al abrir: sus scripts (también
`theme-init.js`), los módulos que precarga y lo que importan de forma estática.

| Métrica | Hoy | Límite | Objetivo |
| --- | ---: | ---: | ---: |
| JavaScript inicial (gzip) | 122,18 kB | 123 kB | 100 kB |
| CSS inicial (gzip) | 18,52 kB | 19 kB | 15 kB |
| Mayor chunk diferido (gzip) | 20,36 kB | 21 kB | 21 kB |
| Fuentes precargadas | 81,76 kB | 82 kB | 82 kB |
| Mayor lado de imagen | 1.598 px | 1.600 px | 1.600 px |
| Imagen más pesada | 199,16 kB | 200 kB | 200 kB |
| Total de imágenes (WebP, PNG, SVG e ICO) | 5.123,41 kB | 5.200 kB | 5.200 kB |
| Pista de audio más pesada | 1.021,43 kB | 1.100 kB | 1.100 kB |
| Total de audio | 3.701,30 kB | 3.750 kB | 3.750 kB |

- Las dos fotos de 5.906 px, las dos animaciones del pie y `barro.m4a` quedan fuera de
  los límites generales como excepciones con techo propio. Cada una se retira en el
  cambio que la resuelve; si deja de hacer falta y sigue declarada, la comprobación falla.
- Los límites solo bajan: cuando una medida queda más de un 10 % por debajo de su límite,
  la comprobación pide bajarlo, hasta llegar al objetivo.
- Un fichero de un tipo para el que no hay regla (un JPEG, un vídeo) también hace fallar
  la comprobación: nada entra en `dist/` sin que alguien decida cuánto puede pesar.
- El resto de la tabla de presupuestos (Lighthouse, navegador, contenedor y almacén) no
  entra en `check`: tarda minutos y depende del equipo. Se repite con las herramientas
  del apartado 9 al cerrar cada cambio.

### Tras `imagenes-y-medios`

Medido el 2026-11-10 con el cambio aplicado (mismo método; Lighthouse solo en tres páginas).

| Métrica | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| Peso de `/` en móvil (Lighthouse) | 1.943 kB | 1.149 kB | ≤ 800 kB |
| Imágenes de `/` en móvil (Lighthouse) | 1.400 kB | 580 kB | — |
| LCP de `/` en móvil | 9,76 s | 7,51 s | ≤ 3,0 s |
| Imágenes decodificadas al recorrer la portada (móvil) | 344,5 MB | 8,9 MB | ≤ 40 MB |
| Imágenes decodificadas en `/estudio` (escritorio) | 55,6 MB | 5,3 MB | ≤ 15 MB |
| Imágenes decodificadas en `/crew` (móvil) | 122,2 MB | 33,5 MB | — |
| Estampida: dibujos que descarga (día / noche) | 584 / 1.330 kB | 340 / 351 kB | ≤ 350 / 500 kB |
| Animación del pie que descarga un móvil | 663 kB, a 800 px del pie | 490 kB, solo al verse | ≤ 530 kB |

El peso de `/` sigue por encima de su presupuesto: lo que queda son las fuentes, el
JavaScript sin comprimir en el origen (`servidor-ligero`) y la animación del pie, que
Lighthouse descarga porque recorre la página entera.

### Tras `servidor-ligero`

Medido el 2026-11-10 con la imagen del cambio, en el mismo contenedor (1 CPU, 128 MB).

| Métrica | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| JS principal servido a un navegador | 322.953 bytes, sin comprimir | 90.907 bytes en Brotli | Brotli y gzip precomprimidos |
| JS principal: peticiones por segundo (20 conexiones) | 3.357 | 9.276 | — |
| Tanda de carga con 128 MB | muere (OOM) | aguanta tres seguidas, pico de 78,5 MB, 0 fallos | pico ≤ 100 MB |
| Memoria en reposo | 24,9 MB | 24,5 MB | ≤ 30 MB |
| CPU en 120 s de reposo con la sonda | 372 ms, un `node` nuevo cada 30 s | 125 ms, sin lanzar Node | ≤ 150 ms |
| Memoria tras cada sonda | 49 MB | 20 MB | — |
| Almacén de 5.000 sesiones, 200 mutaciones seguidas | muere a la segunda | aguanta las 200 (3 de 3), pico de 110–125 MB | no muere |

El presupuesto de CPU en reposo pasa de 60 a 150 ms: lanzar cualquier proceso dentro del
contenedor cuesta a Docker unos 23 ms, y la sonda sigue siendo necesaria para publicar.
El pico con el almacén grande queda pegado al límite; lo baja `almacen-escritura-agrupada`.
Ejecutar además un script con `docker exec` (exportar avisos) arranca otro Node en el mismo
contenedor y con 128 MB lo mata: el límite de memoria de producción se fija en
`despliegue-ligero` contando con ese segundo proceso.

### Tras `almacen-escritura-agrupada`

Medido el 2026-11-10 con `fase4/contar-escrituras.mjs.txt`, que ahora espera a la ventana
de volcado antes de contar (`datos/fase4/escrituras-agrupadas.json`).

| Métrica | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| Volcados por alta de carrito con sesión nueva | 4 | 1, compartido con lo que llegue en 5 s | — |
| Volcados en 1.000 altas de carrito seguidas | 4.000 | 1 | — |
| Escrito a disco en esas 1.000 altas | 2,75 GB | 1,37 MB | ≤ 30 MB |
| Tiempo de un alta: primeras 50 → últimas 50 | 2,0 → 22,7 ms | 0,7 → 0,3 ms | no crece |
| Alta de aviso (confirmada) | 2 volcados | 2 volcados, con `fsync` | — |
| Lecturas que escriben | 0 (el perfil Crew, 1 por lectura) | 0 | 0 |

Los volcados dejan de depender del número de escrituras: dependen del tiempo. Lo que se
puede perder si el proceso muere sin apagado ordenado son las escrituras diferidas de
los últimos 5 segundos (sesiones, carritos, votos); nunca un crédito, un aviso ni un
cierre de sesión.

### Tras `carga-y-estabilidad`

Medido el 2026-11-10 con las mismas herramientas (`fase4/`), más las que hicieron falta
para diagnosticar: `diagnostico-neon`, `diagnostico-mesa`, `traza-animaciones`,
`traza-invalidaciones`, `capturas-neon` y, contra la tienda de pruebas, `instancia-real`
y `lh-real`.

**Carga** (`npm run budget:check`):

| Métrica | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| JS inicial de la portada (gzip) | 123,2 kB | 99,9 kB; 98,4 kB con el pie aparte | ≤ 100 kB |
| CSS inicial (gzip) | 18,7 kB | 14,0 kB; 13,1 kB con el pie aparte | ≤ 15 kB |
| Fuentes precargadas | 81,8 kB | 52,1 kB | ≤ 55 kB |
| Ilustraciones de la intro en un móvil (DPR ≤ 2) | 343 kB | 96 kB | — |
| Total de imágenes en `dist/` | — | 8.743 kB | ≤ 8.750 kB |

El total de imágenes es la única métrica que sube (de 8.700 a 8.750 kB de límite): son las
dieciséis variantes a la mitad de la intro, 96 kB en disco que ahorran 247 kB de descarga.
`CLAUDE.md` recoge que es la única que puede subir, y por qué.

**Lighthouse**, mediana de tres, catálogo de muestra (`fase4/lh-paginas.mjs.txt`):

| Página | Móvil: rend. · FCP · LCP · CLS · peso | Escritorio: rend. · LCP · CLS | Línea base, móvil: rend. · LCP · CLS |
| --- | --- | --- | --- |
| `/` | 84 · 1,65 s · 4,51 s · 0,030 · 608 kB | 99 · 0,82 s · 0,016 | 68 · 9,76 s · 0,029 |
| `/products` | 83 · 1,80 s · 4,51 s · 0,030 · 608 kB | 100 · 0,80 s · 0,016 | 67 · 9,83 s · 0,029 |
| `/product/rockydz-boyz` | 84 · 1,65 s · 4,36 s · 0,000 · 539 kB | 99 · 0,82 s · 0,000 | 52 · 6,08 s · 0,386 |
| `/menudrop` | 85 · 2,05 s · 4,21 s · 0,000 · 558 kB | 99 · 0,93 s · 0,000 | 50 · 8,26 s · 0,386 |
| `/estudio` | 85 · 1,65 s · 4,28 s · 0,000 · 1.412 kB | 99 · 0,80 s · 0,000 | 48 · 7,43 s · 0,454 |
| `/crew` | 84 · 2,05 s · 4,28 s · 0,000 · 964 kB | 99 · 0,84 s · 0,000 | 53 · 6,00 s · 0,386 |
| `/rockyIA` | 88 · 1,65 s · 3,83 s · 0,000 · 392 kB | 100 · 0,76 s · 0,000 | 71 · 5,85 s · 0,000 |
| `/cart` | 85 · 2,05 s · 4,05 s · 0,000 · 539 kB | 100 · 0,79 s · 0,000 | — |
| `/legal/privacidad` | 86 · 1,65 s · 4,05 s · 0,000 · 485 kB | 100 · 0,78 s · 0,000 | — |
| `/no-existe` | 88 · 1,65 s · 3,68 s · 0,000 · 513 kB | 100 · 0,80 s · 0,000 | — |

La tabla se midió antes de las correcciones de la revisión independiente (prioridad de la
primera foto, precarga en reposo, spray en su propio chunk). Con el build definitivo se
repitieron `/`, `/crew` y `/estudio`: 83, 85 y 87 de rendimiento en móvil y 4,58, 4,28 y
3,98 s de LCP, con el mismo CLS.

Después, al cargar aparte el pie de página (que ya queda siempre bajo el pliegue), las tres
páginas que se volvieron a medir mejoran en móvil: `/` 87 de rendimiento y 3,90 s de LCP
con 509 kB, `/cart` 87 y 3,83 s, y `/no-existe` 90 y 3,46 s, con el mismo CLS.

- **CLS**: 0,030 como mucho (presupuesto 0,05), en las diez páginas y los dos tamaños.
- **Rendimiento en móvil**: 83–88. Seis páginas llegan a 85; la portada, `/products`,
  la ficha y `/crew` se quedan a uno o dos puntos.
- **LCP en móvil**: 3,7–4,5 s. Baja a la mitad en la portada (9,76 → 4,51 s), pero **no
  llega a los 3,0 s** del presupuesto en ninguna página. Lo que queda es la cadena de una
  SPA sin render en servidor (documento → 100 kB de JavaScript → datos → pintura) con la
  red de Lighthouse (1,6 Mbps, 150 ms): el primer contenido llega a los 1,65–2,05 s y el
  elemento más grande depende de los datos. Bajar de ahí pide servir HTML ya pintado
  (prerender de la estructura o render en servidor), que no es de esta fase.
- **El elemento LCP ya no es la ilustración del pie** en `/estudio`, `/crew` ni `/cart`:
  es el subtítulo de la página o su propia ilustración.
- Contra la tienda de pruebas (`lh-real`, solo móvil, build definitivo): `/` 82 de
  rendimiento y 4,58 s de LCP; `/menudrop`, 83 y 4,50 s; CLS 0,000 en las dos. Ahí apareció un salto que el catálogo de muestra no
  enseña: si los productos llegaban antes que los drops, el cartel del drop empujaba las
  tarjetas (CLS de 0,30). El catálogo espera ahora a los dos.
- Precargar desde el HTML las tres peticiones de arranque no mejoró el LCP (4,73 s frente
  a 4,88 s, dentro del ruido) y precargar una sola fuente lo empeoró (CLS de 0,30 al
  llegar Archivo): no se hizo ninguna de las dos.

**Coste en ejecución** (`fase4/traza-navegador.mjs.txt`, 10 s por fase):

| Fase | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| Portada de día en reposo, hilo principal (móvil ×4) | 0,7 % | 0,9 % | < 2 % |
| Neón en reposo con su cinta, hilo principal (móvil ×4) | 15,8 % | 1,5–1,6 % | ≤ 5 % |
| Neón en reposo con su cinta, CPU de Chrome (escritorio) | 26,5 % | 6,9–8,5 % | ≤ 8 % |
| Neón en reposo, recálculos de estilo en 10 s (cinta / radio parada) | 607 / 606 | 100–136 / 35–75 | ≤ 100 |
| Neón, mover el puntero, CPU de Chrome (escritorio) | 85,6 % | 25,9–26,2 % | ≤ 43 % |
| Neón, scroll, CPU de Chrome (escritorio) | 147,3 % | 65,1–65,2 % | ≤ 74 % |
| Mesa sonando, hilo principal (móvil ×4) | 30,2 % | 12,0–12,6 % | ≤ 20 % |
| Mesa sonando, layouts en 10 s (móvil) | 167–176 | 2 | — |

Cada cifra de «Ahora» es el intervalo de dos tandas completas de la traza.

- **El neón en reposo queda en el límite de dos de sus tres presupuestos**: la CPU de
  Chrome en escritorio (6,9 y 8,5 % en las dos tandas, para un tope del 8 %) y los
  recálculos con la cinta sonando (de 100 a 136, para un tope de 100). El hilo principal
  en móvil, que es lo que nota el visitante, está en el 1,5 %.
- **El recálculo por fotograma del neón** no era de la pared ni del lienzo: el título de
  noche tenía dos animaciones de `opacity` y Chrome no las componía
  (`kTargetHasIncompatibleAnimations`). Con una de las dos en `filter: opacity()`, la
  infinita va a la GPU. Los recálculos que quedan (unos 10 por segundo con la cinta) los
  marca el ritmo de los WebP animados.
- **La linterna** son tres capas que solo se mueven; la tinta de la pared está dos veces
  (tenue con la página, entera en la ventana del haz).
- **La mesa**: el vúmetro rehacía el layout al cruzar la opacidad 1 y el cabezal arrancaba
  una transición en dieciséis celdas por paso. Queda **una tarea larga de 72–78 ms** al
  pulsar «play» (72 ms en la línea base), que el escenario pedía eliminar y no se ha
  eliminado: es crear el contexto y el motor de audio y pintar el estado.
- El lienzo del spray (hasta 12 Mpx) solo existe con el bote en la mano o con trazos que
  enseñar, y su código solo se descarga de noche.

### Tras `seo-y-cache`

Medido el 2026-11-10 con `fase4/estados-y-cabeceras.mjs.txt` (instancia local con
`PUBLIC_ORIGIN=https://rocky035.com`), `fase4/metadatos-al-navegar.mjs.txt` (Chrome sobre
el build) y `fase4/lh-seo.mjs.txt`.

| Petición | Antes | Ahora |
| --- | --- | --- |
| `/`, `/cart`, `/legal/privacidad` | 200 sin `Link` | 200 con `Link: <https://rocky035.com/…>; rel="canonical"` |
| `/product/rocky-racing?utm_source=x` | 200 sin `Link` | 200; canónica sin el parámetro |
| `/crew/` | 200 sin `Link` | 200; canónica `/crew` |
| `/products` | 301 a `/products/`, sin cabeceras de caché | 200; canónica la portada |
| `/loquesea`, `/legal/loquesea` | 200 `text/html` | 404 `text/html` con `X-Robots-Tag: noindex` |
| `/sitemap.xml`, `/music/no-existe.m4a` | 200 `text/html` | 404 `text/plain`, `no-store`, `noindex` |
| Puerta: `/access-gate/style.css` | `no-store` | `private, max-age=3600`; borde `no-store` |
| Puerta: `/access-gate/media/…` (lista cerrada) | `no-store` | `private, max-age=86400`; borde `no-store` |
| Puerta: su HTML, sus respuestas y lo que no está en la lista | `no-store` | igual |

- Lighthouse en móvil con el origen público de producción: SEO 100 en las nueve páginas
  que existen y buenas prácticas 100 salvo `/estudio` (77, como en la línea base: cookies
  de terceros del reproductor incrustado). `/no-existe` ya no se puede auditar: Lighthouse
  aborta ante un documento con 404.
- El JavaScript inicial queda en 99,8 kB con este cambio dentro (límite 100 kB): el margen
  es de 0,2 kB. Lo siguiente que entre en la carga inicial tendrá que sacar algo.

### Tras `despliegue-ligero`

Medido el 2026-11-10 en el equipo de publicación (x86-64, sin emulación), con Docker de
verdad.

| Métrica | Línea base | Ahora | Presupuesto |
| --- | ---: | ---: | ---: |
| Dónde se construye la imagen | en la Raspberry | en el equipo que publica | fuera de ella |
| `node_modules` dentro de la imagen | 16,2 MB | 4,9 MB | ≤ 5 MB |
| Imagen (x86-64) | 257 MB | 246 MB | — |
| Construir la imagen ARM64 desde x86-64, con la caché de capas | — | 22 s | — |
| Fichero de la imagen que viaja (`docker save` + gzip) | — | 103 MB | — |
| Ficheros de la imagen cuya huella se compara en producción | comparación a mano | 1.193 (todo `/app` y el binario de Node) | — |
| Límite de memoria del contenedor | ninguno | 192 MB, sin intercambio | — |
| Tanda de carga con ese límite: fallos · pico | — | 0 · 73 MB | 0 fallos |
| Almacén de 5.000 sesiones, 200 altas y un `docker exec` de exportación: pico | OOM con 128 MB | 130,9 MB, sin OOM | no muere |

- El `dist/` de la imagen ARM64 construida aquí coincide por `sha256` con un build limpio
  del mismo árbol (402 ficheros, 0 diferencias) y la imagen no lleva ningún `*.node`.
- La identidad de la imagen no se puede comparar por su identificador: el Docker de este
  equipo (almacén clásico) y el de la Raspberry (containerd) le dan uno distinto. Se
  comparan sus capas y su arranque.
- **Primer uso real, 2026-11-11**: `20261111T073408Z-fase-4-c5a28004`, preparada y
  verificada en 58 s y promovida con resultado `ok`. El primer intento lo paró la
  verificación: la Raspberry leía dañado el binario de Node (su caché de páginas, otra
  vez); se arregló vaciándola. En producción el contenedor usa 49–50 MiB en reposo con un
  tope de 192 MiB (antes, 68,8 MiB sin tope) y 95 ms de CPU por minuto en reposo (0,16 %;
  el presupuesto de 0,05 % no se alcanza en la Raspberry). Lo de detrás de la puerta de
  acceso no se ha podido comprobar desde fuera.

### Orden de los cambios

Cada uno es un cambio OpenSpec en `openspec/changes/`, propuesto el 2026-11-10.

| Orden | Cambio | Nivel | Qué ataca |
| ---: | --- | ---: | --- |
| 1 | `presupuesto-de-rendimiento` | 2 | Que `npm run check` falle si el build o los recursos se pasan, y que el build no dependa del `.env` local |
| 2 | `imagenes-y-medios` (C15) | 2 | Fotos y dibujos al tamaño al que se pintan; animación del pie solo cuando se ve |
| 3 | `servidor-ligero` | 2 | Estáticos precomprimidos, tope de memoria de Node, sonda de salud sin lanzar procesos |
| 4 | `almacen-escritura-agrupada` | 3 | Que el almacén cifrado deje de reescribirse entero en cada mutación |
| 5 | `carga-y-estabilidad` (C16) | 2 | JS y CSS inicial, LCP, CLS, coste del neón y de la mesa de beats |
| 6 | `seo-y-cache` (C17) | 2 | 404 reales, URL canónica por página, caché de los recursos de la puerta |
| 7 | `despliegue-ligero` | 3 | Construir la imagen fuera de la Raspberry, imagen de runtime mínima, límite de memoria |

- El 1 va primero para que todo lo demás quede vigilado.
- El 2 es la mayor ganancia para el visitante y la de menor riesgo.
- El 3 y el 4 son lo que hoy impide el objetivo de máquina pequeña, y no dependen del
  trabajo de cliente. El almacén va aparte porque toca sesiones y datos personales.
- El 5 se mide con el 2 y el 3 ya integrados: sus presupuestos de Lighthouse dependen
  de la compresión y de las imágenes.
- El 7 cambia el proceso de producción: se implementa y se prueba en local, y su primer
  uso real necesita autorización expresa.

## 9. Cómo repetirla

Carpeta de trabajo fuera del repo, con el commit extraído y las herramientas al lado:

```bash
T=<carpeta de trabajo>; N24=<bin de Node 24>
mkdir -p $T/repo $T/herr $T/out
git archive HEAD | tar -x -C $T/repo
ln -s "$PWD/node_modules" $T/repo/node_modules          # o `npm ci` dentro de $T/repo
(cd $T/repo && env -u NODE_ENV PATH=$N24:$PATH npx vite build)
cp docs/auditoria/2026-11/herramientas/fase4/* docs/auditoria/2026-11/herramientas/lighthouse.sh $T/herr/
cp -r docs/auditoria/2026-11/herramientas/e2sim $T/herr/
cd $T/herr && for f in $(find . -name '*.mjs.txt'); do mv "$f" "${f%.txt}"; done
# En e2sim/start-e2sim.mjs: /RUTA/AL/REPO → $T/repo y /RUTA/A/node24 → $N24/node
```

| Bloque | Comando (desde `$T/herr`, con Node 24 en el `PATH`) |
| --- | --- |
| 1.1–1.4 | `npx vite build` y el `find` de 1.4, en `$T/repo` |
| 1.3 | `npx vite build --sourcemap --outDir $T/out/dist-mapa` y `node composicion-chunk.mjs $T/out/dist-mapa/assets/index-*.js $T/out/dist-mapa/assets/useDocumentTitle-*.js` |
| 2 | `ROCKY_REPO=$T/repo ROCKY_NODE=$N24/node node lh-linea-base.mjs $T/herr/lighthouse.sh $T/out/lh` y `python3 -I ../../lighthouse-medianas.py $T/out/lh $T/out/lh-medianas.json` (la segunda, desde `herramientas/`) |
| 3 | `ROCKY_REPO=$T/repo ROCKY_NODE=$N24/node ROCKY_PLAYWRIGHT=<…/playwright-core/index.mjs> node traza-navegador.mjs $T/out` |
| 4 | `docker build --no-cache -t rocky035:lineabase $T/repo` y `ROCKY_REPO=$T/repo node medir-contenedor.mjs rocky035:lineabase $T/out 256m`; perfil por prueba con `ROCKY_QUICK=1` y `ROCKY_CONCURRENCY=<n>` |
| 5 | `node contar-escrituras.mjs $T/out` |

Si una tanda de Lighthouse se interrumpe, `lighthouse-faltan.sh` (mismos argumentos que
`lighthouse.sh`) ejecuta solo las pasadas que falten.

## 10. Limitaciones

- Equipo de escritorio rápido con NVMe: los tiempos del servidor y del almacén son un
  suelo, no lo que se verá en un VPS pequeño o en la Raspberry. Lo que sí se traslada son
  las proporciones: bytes por petición, volcados por mutación, memoria por carga.
- Sin Cloudflare: ni Brotli ni caché de borde. El peso de red de los apartados 2 y 3 es el
  bruto que sirve Express.
- Catálogo de vista previa (modo demo) en Lighthouse y en la traza; doble local de Shopify
  y OpenRouter en el recuento de escrituras, sin drops, Taller ni pared compartida.
- Chrome en headless, sin GPU en Lighthouse y con rasterizado por software en la traza: la
  cadencia de fotogramas sirve para comparar antes y después, no como cifra de un
  teléfono.
- El build de Docker falló la primera vez por la configuración del equipo
  (`~/.docker/config.json` pide `docker-credential-desktop`, que no está instalado). Se
  repitió con `DOCKER_CONFIG` apuntando a una carpeta vacía, sin tocar esa configuración.
