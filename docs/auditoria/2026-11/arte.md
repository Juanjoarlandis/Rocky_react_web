# Arte

Inventario de todo el arte del repositorio (tarea 5.1), su uso, duplicados y nombres
(5.2), el lenguaje visual actual (5.3) y la revisión pantalla a pantalla (5.4). Commit
`7d2bf57`.

## 1. Inventario (tarea 5.1)

Generado el 2026-11-08 con el script del apéndice A, ejecutado desde una carpeta
temporal fuera del repo (`ffprobe` para medidas y duraciones; los WebP animados se
leen de su cabecera `VP8X`):

```bash
python3 -I inventario_arte.py /ruta/al/repo arte.tsv && python3 -I arte_md.py arte.tsv inventario.md
```

Comprobación del total contra el disco:

```bash
find src/images public posters prompts-munecos -type f | wc -l   # 231
```

Total inventariado: **231 ficheros**.

| Carpeta | Ficheros | Peso |
| --- | ---: | ---: |
| `src/images/` | 77 | 3.56 MB |
| `public/` | 21 | 4.81 MB |
| `posters/` | 46 | 46.55 MB |
| `prompts-munecos/` | 87 | 5.22 MB |

### Imágenes empaquetadas por Vite (`src/images/`) — 77

| Ruta | Formato | Medidas / duración | Peso (kB) | Uso | Dónde se usa | Nombre | Duplicado de |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `Rockypng.png` | png | 831×173 | 2.8 | referenciado | src/components/NavBar.jsx, src/components/SplashIntro.jsx, src/features/night/spray/shareImage.js | no kebab-case | prompts-munecos/referencias/logo-rocky.png |
| `optimized/characters/abrazando-paquete-hd.webp` | webp | 960×961 | 22.1 | referenciado | src/data/crew.js | ok | — |
| `optimized/characters/asomado-borde-hd.webp` | webp | 1156×905 | 17.3 | referenciado | src/data/crew.js, src/features/cart/Cart.jsx, src/features/night/nightArt.js, src/features/peeker/CuriousPeeker.jsx | ok | — |
| `optimized/characters/auriculares-sentado-hd.webp` | webp | 964×1038 | 36.8 | referenciado | src/data/crew.js, src/features/night/nightArt.js, src/features/studio/Studio.jsx | ok | — |
| `optimized/characters/bombilla-eureka-hd.webp` | webp | 849×1529 | 29.7 | referenciado | src/data/crew.js, src/features/cart/Cart.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/breakdance-freeze-hd.webp` | webp | 1107×1101 | 50.3 | referenciado | src/data/crew.js, src/data/crewAvatarImages.js, src/features/night/nightArt.js, src/features/studio/BeatMachine.jsx | ok | — |
| `optimized/characters/colgado-borde-hd.webp` | webp | 593×1565 | 20.3 | referenciado | src/data/crew.js, src/features/studio/Studio.jsx | ok | — |
| `optimized/characters/corriendo-bolsa-hd.webp` | webp | 1049×1069 | 24.6 | referenciado | src/data/crew.js, src/features/cart/CartRunner.jsx, src/features/catalog/DropAviso.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/cotilla-esquina-460.webp` | webp | 348×460 | 26.1 | referenciado | src/features/night/nightArt.js, src/features/peeker/CuriousPeeker.jsx | ok | — |
| `optimized/characters/cruiser-patinando-hd.webp` | webp | 940×1131 | 19.5 | referenciado | src/data/crew.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/dado-sentado-hd.webp` | webp | 1103×1142 | 27.6 | referenciado | src/data/crew.js, src/features/catalog/MenuDrop.jsx | ok | — |
| `optimized/characters/diana-jefe-hd.webp` | webp | 852×1481 | 23.8 | referenciado | src/data/crew.js, src/data/crewAvatarImages.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/dormido-esperando-hd.webp` | webp | 1111×1081 | 22.3 | referenciado | src/data/crew.js, src/features/cart/Cart.jsx | ok | — |
| `optimized/characters/estrella-apoyado-hd.webp` | webp | 784×1598 | 23.7 | referenciado | src/data/crew.js, src/data/crewAvatarImages.js, src/features/chat/ChatComponent.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/fotografo-agachado-hd.webp` | webp | 789×1178 | 46.6 | referenciado | src/data/crew.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/grafitero-sin-chorro-420.webp` | webp | 254×420 | 20.5 | referenciado | src/features/catalog/ProductPage.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/grafitero-spray-hd.webp` | webp | 821×1356 | 23.4 | referenciado | src/data/crew.js, src/data/crewAvatarImages.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/larguirucho-esquina-600.webp` | webp | 600×838 | 42.5 | referenciado | src/features/crew/CrewProfile.jsx | ok | — |
| `optimized/characters/lata-spray-hd.webp` | webp | 624×1408 | 21.8 | referenciado | src/data/crew.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/lata-spray-walk-seedance-224.webp` | webp | 166×224 · animado, 81 fotogramas | 647.7 | referenciado | src/components/Footer.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/lata-spray-walk-seedance-poster-224.webp` | webp | 166×224 | 9.4 | referenciado | src/components/Footer.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/luna-movil-hd.webp` | webp | 1003×1364 | 24.0 | referenciado | src/data/crew.js, src/features/studio/Studio.jsx | ok | — |
| `optimized/characters/nube-paseando-hd.webp` | webp | 732×1276 | 21.0 | referenciado | src/data/crew.js, src/features/catalog/ProductDetail.jsx | ok | — |
| `optimized/characters/perdido-mapa-hd.webp` | webp | 614×1360 | 20.1 | referenciado | src/components/NotFound.jsx, src/data/crew.js | ok | — |
| `optimized/characters/perro-rocky-hd.webp` | webp | 770×1076 | 18.0 | referenciado | src/components/NotFound.jsx, src/data/crew.js, src/features/night/nightArt.js | ok | — |
| `optimized/characters/sentado-borde-blanco-hd.webp` | webp | 717×1186 | 18.4 | referenciado | src/data/crew.js, src/features/catalog/ProductDetail.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/sentado-borde-rojo-hd.webp` | webp | 720×1187 | 18.0 | referenciado | src/data/crew.js, src/features/chat/ChatComponent.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/skater-ollie-hd.webp` | webp | 912×1098 | 22.2 | referenciado | src/data/crew.js, src/data/crewAvatarImages.js, src/features/catalog/MenuDrop.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/characters/tele-sentado-borde-hd.webp` | webp | 721×1367 | 19.3 | referenciado | src/data/crew.js, src/features/studio/Studio.jsx | ok | — |
| `optimized/night/congelao-800.webp` | webp | 804×800 | 73.7 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/diana-rota-400.webp` | webp | 230×400 | 17.0 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/diana-rota-800.webp` | webp | 460×800 | 57.1 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/estrellao-800.webp` | webp | 392×800 | 50.2 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/flash-negro-316.webp` | webp | 212×316 | 11.8 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/flash-negro-800.webp` | webp | 536×800 | 57.1 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/fundido-800.webp` | webp | 444×800 | 57.0 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/los-del-banco-860.webp` | webp | 861×538 | 55.8 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/miron-800.webp` | webp | 1022×800 | 83.1 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/miron-esquina-460.webp` | webp | 348×460 | 16.9 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/no-aterriza-800.webp` | webp | 664×800 | 54.5 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/no-entrega-350.webp` | webp | 343×350 | 16.0 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/no-entrega-800.webp` | webp | 785×800 | 59.5 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/no-se-levanta-800.webp` | webp | 800×539 | 47.6 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/portero-infierno-800.webp` | webp | 485×800 | 56.6 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/productor-poseido-800.webp` | webp | 743×800 | 74.3 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/sabueso-negro-800.webp` | webp | 572×800 | 68.6 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/sin-frenos-350.webp` | webp | 291×350 | 13.7 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/sin-frenos-800.webp` | webp | 665×800 | 51.7 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/tachon-420.webp` | webp | 254×420 | 16.9 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/tachon-800.webp` | webp | 484×800 | 47.4 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/toxico-800.webp` | webp | 355×800 | 50.5 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/toxico-paseo-224.webp` | webp | 166×224 · animado, 81 fotogramas | 692.6 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/toxico-paseo-poster-224.webp` | webp | 166×224 | 11.0 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/night/vigia-insomne-800.webp` | webp | 484×800 | 47.9 | referenciado | src/features/night/nightArt.js | ok | — |
| `optimized/shell/cart-96.webp` | webp | 96×96 | 4.4 | referenciado | src/components/NavBar.jsx | ok | — |
| `optimized/shell/fotografo-agachado.webp` | webp | 212×316 | 30.7 | referenciado | src/components/StreetWall.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/shell/ia-256.webp` | webp | 256×256 | 10.5 | referenciado | src/features/chat/ChatComponent.jsx | ok | — |
| `optimized/shell/instagram-64.webp` | webp | 64×64 | 4.1 | referenciado | src/components/Footer.jsx | ok | — |
| `optimized/shell/menu-256.webp` | webp | 256×256 | 12.2 | referenciado | src/features/chat/ChatComponent.jsx | ok | — |
| `optimized/shell/sentado-860.webp` | webp | 860×538 | 99.6 | referenciado | src/components/Footer.jsx, src/data/crew.js, src/features/night/nightArt.js | ok | — |
| `optimized/shell/tumbado-800.webp` | webp | 800×539 | 44.5 | referenciado | src/data/crew.js, src/features/cart/Cart.jsx, src/features/catalog/MenuDrop.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/splash/abrazando-paquete.webp` | webp | 350×350 | 31.9 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/bolsa-head.webp` | webp | 300×300 | 13.4 | referenciado | src/components/SplashIntro.jsx, src/data/crewAvatarImages.js | ok | — |
| `optimized/splash/bombilla-eureka.webp` | webp | 184×330 | 18.6 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/breakdance-freeze.webp` | webp | 403×400 | 44.3 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/colgado-head.webp` | webp | 300×300 | 16.2 | referenciado | src/components/SplashIntro.jsx, src/data/crewAvatarImages.js | ok | — |
| `optimized/splash/corriendo-bolsa.webp` | webp | 344×350 | 23.2 | referenciado | src/components/SplashIntro.jsx, src/features/catalog/ProductPage.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/splash/cruiser-patinando.webp` | webp | 291×350 | 20.1 | referenciado | src/components/SplashIntro.jsx, src/features/catalog/ProductPage.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/splash/diana-jefe.webp` | webp | 231×400 | 21.7 | referenciado | src/components/SplashIntro.jsx, src/components/StreetWall.jsx, src/features/night/nightArt.js | ok | — |
| `optimized/splash/dormido-head.webp` | webp | 300×300 | 15.7 | referenciado | src/components/SplashIntro.jsx, src/data/crewAvatarImages.js | ok | — |
| `optimized/splash/estrella-apoyado.webp` | webp | 162×330 | 16.4 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/grafitero-spray.webp` | webp | 255×420 | 23.5 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/lata-spray.webp` | webp | 133×300 | 14.4 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/nube-paseando.webp` | webp | 173×300 | 13.7 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/perro-rocky.webp` | webp | 201×280 | 15.3 | referenciado | src/components/SplashIntro.jsx | ok | — |
| `optimized/splash/skater-head.webp` | webp | 300×300 | 21.6 | referenciado | src/components/SplashIntro.jsx, src/data/crewAvatarImages.js | ok | — |
| `optimized/splash/skater-ollie.webp` | webp | 316×380 | 24.9 | referenciado | src/components/SplashIntro.jsx | ok | — |

### Estáticos servidos tal cual (`public/`) — 21

| Ruta | Formato | Medidas / duración | Peso (kB) | Uso | Dónde se usa | Nombre | Duplicado de |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `favicon.ico` | ico | 16×16 | 2.1 | referenciado | index.html | ok | — |
| `favicon.svg` | svg | — | 0.3 | referenciado | index.html | ok | — |
| `logo192.png` | png | 192×192 | 1.3 | referenciado | index.html | ok | — |
| `logo512.png` | png | 512×512 | 4.0 | referenciado | server/http/access-gate.mjs | ok | — |
| `manifest.json` | json | — | 0.5 | referenciado | index.html | ok | — |
| `music/barro.m4a` | m4a | 113.1 s | 2617.1 | referenciado | src/data/studio.js | ok | — |
| `music/modo-neon.m4a` | m4a | 127.2 s | 997.5 | referenciado | src/data/studio.js | ok | — |
| `og.png` | png | 1200×630 | 78.6 | referenciado | index.html | ok | — |
| `products/placeholder-unreleased.webp` | webp | 1254×1254 | 141.9 | referenciado | src/config/commerce.js, src/data/demoCatalog.json, src/data/productImages.js | ok | — |
| `products/rocky-airwave.webp` | webp | 1254×1254 | 64.9 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky-marea-035.webp` | webp | 1254×1254 | 137.2 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky-night-runner.webp` | webp | 1254×1254 | 144.8 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky-pit-crew.webp` | webp | 1254×1254 | 194.5 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky-racing.webp` | webp | 850×850 | 12.7 | referenciado | src/data/demoCatalog.json, src/data/productImages.js, src/data/streetWall.js | ok | — |
| `products/rocky-signal-ghost.webp` | webp | 1254×1254 | 107.7 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky-solar-club.webp` | webp | 1254×1254 | 94.9 | referenciado | shared/preview-products.mjs, src/data/productImages.js | ok | — |
| `products/rocky35-camel.webp` | webp | 5906×5906 | 171.0 | referenciado | src/data/demoCatalog.json, src/data/productImages.js, src/data/streetWall.js | ok | — |
| `products/rockydz-boyz.webp` | webp | 5906×5906 | 150.5 | referenciado | src/data/demoCatalog.json, src/data/productImages.js, src/data/streetWall.js | ok | prompts-munecos/referencias/camiseta-con-personajes.webp |
| `robots.txt` | txt | — | 0.1 | sin referencia | — | ok | — |
| `street/.gitkeep` | .gitkeep | — | 0.0 | sin referencia | — | n/a | prompts-munecos/salidas/.gitkeep |
| `theme-init.js` | js | — | 0.4 | referenciado | index.html, src/utils/theme.js | ok | — |

### Pósters de marketing (`posters/`, no se sirven) — 46

| Ruta | Formato | Medidas / duración | Peso (kB) | Uso | Dónde se usa | Nombre | Duplicado de |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `README.md` | md | — | 1.7 | fuera de la web | — | no kebab-case | — |
| `img/01-ya-tenemos-casa.png` | png | 2160×2700 | 1756.8 | fuera de la web | — | ok | — |
| `img/02-el-drop-4-existe.png` | png | 2160×2700 | 1257.5 | fuera de la web | — | ok | posters/img/03-el-drop-4-existe.png |
| `img/02-todo-puesto-nada-visto.png` | png | 2160×2700 | 2068.3 | fuera de la web | — | ok | — |
| `img/03-el-album-de-la-crew.png` | png | 2160×2700 | 1509.9 | fuera de la web | — | ok | posters/img/06-el-album-de-la-crew.png |
| `img/03-el-drop-4-existe.png` | png | 2160×2700 | 1257.5 | fuera de la web | — | ok | posters/img/02-el-drop-4-existe.png |
| `img/04-faltan-tres-cromos.png` | png | 2160×2700 | 1531.8 | fuera de la web | — | ok | posters/img/07-faltan-tres-cromos.png |
| `img/04-miralo-de-cerca.png` | png | 2160×2700 | 1661.4 | fuera de la web | — | ok | — |
| `img/05-que-llevas-ahi.png` | png | 2160×2700 | 1161.8 | fuera de la web | — | ok | — |
| `img/05-tu-sitio-en-la-colmena.png` | png | 2160×2700 | 1395.2 | fuera de la web | — | ok | posters/img/10-tu-sitio-en-la-colmena.png |
| `img/06-el-album-de-la-crew.png` | png | 2160×2700 | 1509.9 | fuera de la web | — | ok | posters/img/03-el-album-de-la-crew.png |
| `img/06-la-colmena-ya-suena.png` | png | 2160×2700 | 1477.8 | fuera de la web | — | ok | posters/img/12-la-colmena-ya-suena.png |
| `img/07-faltan-tres-cromos.png` | png | 2160×2700 | 1531.8 | fuera de la web | — | ok | posters/img/04-faltan-tres-cromos.png |
| `img/08-cada-uno-tiene-ficha.png` | png | 2160×2700 | 1583.9 | fuera de la web | — | ok | — |
| `img/09-quedan-tres-sitios.png` | png | 2160×2700 | 1177.6 | fuera de la web | — | ok | — |
| `img/10-tu-sitio-en-la-colmena.png` | png | 2160×2700 | 1395.2 | fuera de la web | — | ok | posters/img/05-tu-sitio-en-la-colmena.png |
| `img/11-la-tienda-tiene-cerebro.png` | png | 2160×2700 | 1093.5 | fuera de la web | — | ok | — |
| `img/12-la-colmena-ya-suena.png` | png | 2160×2700 | 1477.8 | fuera de la web | — | ok | posters/img/06-la-colmena-ya-suena.png |
| `img/13-la-web-suena.png` | png | 2160×2700 | 1172.2 | fuera de la web | — | ok | — |
| `img/14-cuando-vuelan-vuelan.png` | png | 2160×2700 | 1188.6 | fuera de la web | — | ok | — |
| `img/15-te-has-salido-del-mapa.png` | png | 2160×2700 | 1259.4 | fuera de la web | — | ok | — |
| `img/16-desde-el-banco-lo-vimos-todo.png` | png | 2160×2700 | 1491.2 | fuera de la web | — | ok | — |
| `index.html` | html | — | 15.8 | fuera de la web | — | ok | — |
| `miniaturas/01-ya-tenemos-casa.png` | png | 720×900 | 370.5 | fuera de la web | — | ok | — |
| `miniaturas/02-el-drop-4-existe.png` | png | 720×900 | 283.5 | fuera de la web | — | ok | posters/miniaturas/03-el-drop-4-existe.png |
| `miniaturas/02-todo-puesto-nada-visto.png` | png | 720×900 | 424.9 | fuera de la web | — | ok | — |
| `miniaturas/03-el-album-de-la-crew.png` | png | 720×900 | 362.6 | fuera de la web | — | ok | posters/miniaturas/06-el-album-de-la-crew.png |
| `miniaturas/03-el-drop-4-existe.png` | png | 720×900 | 283.5 | fuera de la web | — | ok | posters/miniaturas/02-el-drop-4-existe.png |
| `miniaturas/04-faltan-tres-cromos.png` | png | 720×900 | 353.8 | fuera de la web | — | ok | posters/miniaturas/07-faltan-tres-cromos.png |
| `miniaturas/04-miralo-de-cerca.png` | png | 720×900 | 374.4 | fuera de la web | — | ok | — |
| `miniaturas/05-que-llevas-ahi.png` | png | 720×900 | 288.3 | fuera de la web | — | ok | — |
| `miniaturas/05-tu-sitio-en-la-colmena.png` | png | 720×900 | 332.3 | fuera de la web | — | ok | posters/miniaturas/10-tu-sitio-en-la-colmena.png |
| `miniaturas/06-el-album-de-la-crew.png` | png | 720×900 | 362.6 | fuera de la web | — | ok | posters/miniaturas/03-el-album-de-la-crew.png |
| `miniaturas/06-la-colmena-ya-suena.png` | png | 720×900 | 352.0 | fuera de la web | — | ok | posters/miniaturas/12-la-colmena-ya-suena.png |
| `miniaturas/07-faltan-tres-cromos.png` | png | 720×900 | 353.8 | fuera de la web | — | ok | posters/miniaturas/04-faltan-tres-cromos.png |
| `miniaturas/08-cada-uno-tiene-ficha.png` | png | 720×900 | 373.4 | fuera de la web | — | ok | — |
| `miniaturas/09-quedan-tres-sitios.png` | png | 720×900 | 303.8 | fuera de la web | — | ok | — |
| `miniaturas/10-tu-sitio-en-la-colmena.png` | png | 720×900 | 332.3 | fuera de la web | — | ok | posters/miniaturas/05-tu-sitio-en-la-colmena.png |
| `miniaturas/11-la-tienda-tiene-cerebro.png` | png | 720×900 | 269.8 | fuera de la web | — | ok | — |
| `miniaturas/12-la-colmena-ya-suena.png` | png | 720×900 | 352.0 | fuera de la web | — | ok | posters/miniaturas/06-la-colmena-ya-suena.png |
| `miniaturas/13-la-web-suena.png` | png | 720×900 | 289.0 | fuera de la web | — | ok | — |
| `miniaturas/14-cuando-vuelan-vuelan.png` | png | 720×900 | 298.7 | fuera de la web | — | ok | — |
| `miniaturas/15-te-has-salido-del-mapa.png` | png | 720×900 | 313.4 | fuera de la web | — | ok | — |
| `miniaturas/16-desde-el-banco-lo-vimos-todo.png` | png | 720×900 | 331.0 | fuera de la web | — | ok | — |
| `video/apertura.mp4` | mp4 | 1080×1350 | 723.5 | fuera de la web | — | ok | — |
| `video/reel-album.mp4` | mp4 | 1080×1350 | 9959.1 | fuera de la web | — | ok | — |

### Prompts y material de los muñecos (`prompts-munecos/`, no se sirven) — 87

| Ruta | Formato | Medidas / duración | Peso (kB) | Uso | Dónde se usa | Nombre | Duplicado de |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `01-grafitero-spray.md` | md | — | 2.7 | fuera de la web | — | ok | — |
| `02-sentado-borde-camiseta-blanca.md` | md | — | 2.8 | fuera de la web | — | ok | — |
| `03-sentado-borde-chandal-rojo.md` | md | — | 2.5 | fuera de la web | — | ok | — |
| `04-extra-asomado-borde.md` | md | — | 2.0 | fuera de la web | — | ok | — |
| `05-extra-perdido-404.md` | md | — | 2.1 | fuera de la web | — | ok | — |
| `06-skater-ollie.md` | md | — | 2.0 | fuera de la web | — | ok | — |
| `07-colgado-borde.md` | md | — | 2.4 | fuera de la web | — | ok | — |
| `08-corriendo-bolsa.md` | md | — | 2.0 | fuera de la web | — | ok | — |
| `09-dormido-esperando.md` | md | — | 2.7 | fuera de la web | — | ok | — |
| `10-perro-mascota.md` | md | — | 2.1 | fuera de la web | — | ok | — |
| `11-pack-stickers.md` | md | — | 2.3 | fuera de la web | — | ok | — |
| `12-corona-espinas.md` | md | — | 2.1 | fuera de la web | — | ok | — |
| `13-productor-estudio.md` | md | — | 2.4 | fuera de la web | — | ok | — |
| `14-rapero-micro.md` | md | — | 2.3 | fuera de la web | — | ok | — |
| `15-abeja-colmena.md` | md | — | 2.2 | fuera de la web | — | ok | — |
| `16-estrella-apoyada.md` | md | — | 2.6 | fuera de la web | — | ok | — |
| `17-dado-sentado.md` | md | — | 2.4 | fuera de la web | — | ok | — |
| `18-nube-paseando.md` | md | — | 2.4 | fuera de la web | — | ok | — |
| `19-tele-sentado-borde.md` | md | — | 2.7 | fuera de la web | — | ok | — |
| `20-lata-spray.md` | md | — | 2.5 | fuera de la web | — | ok | — |
| `21-luna-movil.md` | md | — | 2.5 | fuera de la web | — | ok | — |
| `22-diana-jefe.md` | md | — | 2.3 | fuera de la web | — | ok | — |
| `23-bombilla-eureka.md` | md | — | 2.5 | fuera de la web | — | ok | — |
| `24-cruiser-patinando.md` | md | — | 2.8 | fuera de la web | — | ok | — |
| `README.md` | md | — | 4.2 | fuera de la web | — | no kebab-case | — |
| `favicons/16/bolsa-head.png` | png | 16×16 | 0.6 | fuera de la web | — | ok | — |
| `favicons/16/colgado-head.png` | png | 16×16 | 0.7 | fuera de la web | — | ok | — |
| `favicons/16/dormido-head.png` | png | 16×16 | 0.5 | fuera de la web | — | ok | — |
| `favicons/16/skater-head.png` | png | 16×16 | 0.7 | fuera de la web | — | ok | — |
| `favicons/180/bolsa-head.png` | png | 180×180 | 15.3 | fuera de la web | — | ok | — |
| `favicons/180/colgado-head.png` | png | 180×180 | 16.9 | fuera de la web | — | ok | — |
| `favicons/180/dormido-head.png` | png | 180×180 | 14.7 | fuera de la web | — | ok | — |
| `favicons/180/skater-head.png` | png | 180×180 | 26.1 | fuera de la web | — | ok | — |
| `favicons/32/bolsa-head.png` | png | 32×32 | 1.3 | fuera de la web | — | ok | — |
| `favicons/32/colgado-head.png` | png | 32×32 | 1.7 | fuera de la web | — | ok | — |
| `favicons/32/dormido-head.png` | png | 32×32 | 1.2 | fuera de la web | — | ok | — |
| `favicons/32/skater-head.png` | png | 32×32 | 1.7 | fuera de la web | — | ok | — |
| `favicons/48/bolsa-head.png` | png | 48×48 | 2.4 | fuera de la web | — | ok | — |
| `favicons/48/colgado-head.png` | png | 48×48 | 2.8 | fuera de la web | — | ok | — |
| `favicons/48/dormido-head.png` | png | 48×48 | 2.1 | fuera de la web | — | ok | — |
| `favicons/48/skater-head.png` | png | 48×48 | 3.1 | fuera de la web | — | ok | — |
| `favicons/512/bolsa-head.png` | png | 512×512 | 48.0 | fuera de la web | — | ok | — |
| `favicons/512/colgado-head.png` | png | 512×512 | 57.4 | fuera de la web | — | ok | — |
| `favicons/512/dormido-head.png` | png | 512×512 | 59.8 | fuera de la web | — | ok | — |
| `favicons/512/skater-head.png` | png | 512×512 | 89.5 | fuera de la web | — | ok | — |
| `favicons/ico/bolsa-head.ico` | ico | 16×16 | 5.3 | fuera de la web | — | ok | — |
| `favicons/ico/colgado-head.ico` | ico | 16×16 | 6.0 | fuera de la web | — | ok | — |
| `favicons/ico/dormido-head.ico` | ico | 16×16 | 4.2 | fuera de la web | — | ok | — |
| `favicons/ico/skater-head.ico` | ico | 16×16 | 6.8 | fuera de la web | — | ok | — |
| `favicons/maestros/bolsa-head.png` | png | 1024×1024 | 104.5 | fuera de la web | — | ok | — |
| `favicons/maestros/colgado-head.png` | png | 1024×1024 | 126.0 | fuera de la web | — | ok | — |
| `favicons/maestros/dormido-head.png` | png | 1024×1024 | 134.2 | fuera de la web | — | ok | — |
| `favicons/maestros/skater-head.png` | png | 1024×1024 | 198.4 | fuera de la web | — | ok | — |
| `favicons/preview-favicons.png` | png | 1080×620 | 109.7 | fuera de la web | — | ok | — |
| `preview-tercera-tanda.png` | png | 1632×1902 | 738.9 | fuera de la web | — | ok | — |
| `recortar_margenes.py` | py | — | 1.1 | fuera de la web | — | no kebab-case | — |
| `referencias/camiseta-con-personajes.webp` | webp | 5906×5906 | 150.5 | fuera de la web | — | ok | public/products/rockydz-boyz.webp |
| `referencias/icono-cara.png` | png | 2048×2048 | 153.3 | fuera de la web | — | ok | — |
| `referencias/icono-carrito.png` | png | 2048×2048 | 167.2 | fuera de la web | — | ok | — |
| `referencias/icono-robot.png` | png | 2048×2048 | 565.0 | fuera de la web | — | ok | — |
| `referencias/logo-rocky.png` | png | 831×173 | 2.8 | fuera de la web | — | ok | src/images/Rockypng.png |
| `referencias/sentados-banco.png` | png | 3279×2048 | 794.8 | fuera de la web | — | ok | — |
| `referencias/tumbado.png` | png | 2031×1368 | 339.7 | fuera de la web | — | ok | — |
| `salidas/.gitkeep` | .gitkeep | — | 0.0 | fuera de la web | — | n/a | public/street/.gitkeep |
| `salidas/abrazando-paquete.png` | png | 960×961 | 58.3 | fuera de la web | — | ok | — |
| `salidas/asomado-borde.png` | png | 1156×905 | 41.0 | fuera de la web | — | ok | — |
| `salidas/auriculares-sentado.png` | png | 964×1038 | 80.7 | fuera de la web | — | ok | — |
| `salidas/bombilla-eureka.png` | png | 849×1529 | 67.1 | fuera de la web | — | ok | — |
| `salidas/breakdance-freeze.png` | png | 1107×1101 | 112.8 | fuera de la web | — | ok | — |
| `salidas/colgado-borde.png` | png | 593×1565 | 48.2 | fuera de la web | — | ok | — |
| `salidas/corriendo-bolsa.png` | png | 1049×1069 | 59.1 | fuera de la web | — | ok | — |
| `salidas/cruiser-patinando.png` | png | 940×1131 | 45.8 | fuera de la web | — | ok | — |
| `salidas/dado-sentado.png` | png | 1103×1142 | 64.3 | fuera de la web | — | ok | — |
| `salidas/diana-jefe.png` | png | 852×1481 | 55.9 | fuera de la web | — | ok | — |
| `salidas/dormido-esperando.png` | png | 1111×1081 | 55.2 | fuera de la web | — | ok | — |
| `salidas/estrella-apoyado.png` | png | 784×1598 | 57.0 | fuera de la web | — | ok | — |
| `salidas/fotografo-agachado.png` | png | 789×1178 | 98.3 | fuera de la web | — | ok | — |
| `salidas/grafitero-spray.png` | png | 821×1356 | 57.4 | fuera de la web | — | ok | — |
| `salidas/lata-spray.png` | png | 624×1408 | 50.5 | fuera de la web | — | ok | — |
| `salidas/luna-movil.png` | png | 1003×1364 | 56.5 | fuera de la web | — | ok | — |
| `salidas/nube-paseando.png` | png | 732×1276 | 48.3 | fuera de la web | — | ok | — |
| `salidas/perdido-mapa.png` | png | 614×1360 | 46.4 | fuera de la web | — | ok | — |
| `salidas/perro-rocky.png` | png | 770×1076 | 43.7 | fuera de la web | — | ok | — |
| `salidas/sentado-borde-blanco.png` | png | 717×1186 | 43.9 | fuera de la web | — | ok | — |
| `salidas/sentado-borde-rojo.png` | png | 720×1187 | 43.0 | fuera de la web | — | ok | — |
| `salidas/skater-ollie.png` | png | 912×1098 | 55.8 | fuera de la web | — | ok | — |
| `salidas/tele-sentado-borde.png` | png | 721×1367 | 41.9 | fuera de la web | — | ok | — |

## 2. Uso, duplicados y nombres (tarea 5.2)

**Uso.** Para cada fichero de `src/images/` y `public/` se busca su nombre en `src/`,
`server/`, `shared/`, `scripts/`, `index.html`, `vite.config.mjs`, `Dockerfile` y los
JSON, HTML y CSS de `public/`. Si no aparece, se busca su raíz sin sufijo de ancho
(p. ej. `nombre-800.webp` → `nombre`) por si el nombre se compone en tiempo de
ejecución (`dinámico?`, a revisar a mano). Resultado:

| Uso | Ficheros |
| --- | ---: |
| `referenciado` (el nombre exacto aparece en código, fuera de tests) | 96 |
| `sin referencia` | 2 (`public/robots.txt`, que se sirve por convención, y `public/street/.gitkeep`) |
| `dinámico?` / `solo tests` | 0 |
| `fuera de la web` (`posters/` y `prompts-munecos/`) | 133 |

«Referenciado» significa que el nombre aparece en el código, no que se vea en alguna
pantalla: la ejecución de recorridos y la revisión por pantalla (5.4) confirman qué se
pinta de verdad.

**Duplicados exactos (mismo SHA-1).** No hay ninguno entre los ficheros que sirve la
web. En `posters/` hay cinco pares de pósters idénticos con distinto número, tanto en
`img/` como en `miniaturas/`: `02`/`03-el-drop-4-existe`, `03`/`06-el-album-de-la-crew`,
`04`/`07-faltan-tres-cromos`, `05`/`10-tu-sitio-en-la-colmena` y
`06`/`12-la-colmena-ya-suena`.

**Nombres.** No hay una convención escrita. La de facto es kebab-case en minúsculas
y, en `src/images/optimized/`, un sufijo con el ancho en píxeles para las variantes
(`-224`, `-800`…). Desviaciones:

- `src/images/Rockypng.png`: mayúscula y la extensión repetida en el nombre.
- `src/images/optimized/`: 40 de 76 ficheros no llevan sufijo de ancho y los que lo
  llevan usan 12 anchos distintos (64, 96, 224, 256, 316, 350, 400, 420, 460, 600, 800
  y 860).
- Fotos de producto en `public/products/` con tres prefijos distintos: `rocky-`,
  `rocky35-` y `rockydz-`.
- Los `README.md` y el `.py` de `prompts-munecos/` siguen la convención de su tipo y no
  cuentan como desviación.

**Medidas y peso que destacan** (se convierten en hallazgos en la consolidación):

- `public/products/rocky35-camel.webp` y `rockydz-boyz.webp` miden 5906 × 5906 px; el
  resto de fotos de producto, 1254 × 1254. Pesan poco (150–171 kB), pero el navegador
  tiene que decodificar unos 35 megapíxeles por imagen.
- `src/images/optimized/night/toxico-paseo-224.webp` (693 kB) y
  `characters/lata-spray-walk-seedance-224.webp` (648 kB) son animaciones de 166 × 224
  px con 81 fotogramas: son los dos ficheros de imagen más pesados de la web.
- Audio: `public/music/barro.m4a` (2,6 MB, 113 s) y `modo-neon.m4a` (1,0 MB, 127 s).
  En la ejecución hay que comprobar que solo se descargan al reproducir.

## 3. Lenguaje visual actual (tarea 5.3)

La web tiene una dirección artística reconocible y bastante disciplinada: un **cuaderno
de calle dibujado a mano** de día y una **noche de luz negra** («descontrol») que la
reinterpreta. Lo que sigue describe lo que hay, con la fuente de cada afirmación.

**Superficie y color de día.** Papel crema (`--paper: #faf7f0`) con retícula de puntos
(`--dot-grid-size: 26px`, `--dot-alpha: 0.07`) y garabatos muy suaves
(`--notebook-doodles`), tinta casi negra (`--ink: #1a1a1a`) y un único acento rojo
(`--accent: #e63946`) para subrayados garabateados (`--squiggle`), estrellas, estados y
etiquetas «Próximamente». El amarillo neón (`--neon-yellow`) y el post-it
(`--postit`) se reservan para avisos. Bloques entintados para pie y marquesina
(`--ink-block`). Fuente: `src/styles/00-tokens.css:19-100`; capturas
`capturas/arte-portada-dia.webp`, `arte-carrito-dia.webp`.

**Tipografía.** Tres familias autoalojadas (`src/styles/01-fonts.css`): **Luckiest Guy**
para rótulos (un solo peso), **Fredoka** para la voz «a mano» y la interfaz, y
**Archivo** para el cuerpo. Escala de ocho pasos más una display fluida
(`--text-2xs` … `--text-display`, `00-tokens.css:171-195`). La única familia fuera de
tokens es la monoespaciada de la mesa de beats (`src/styles/components/beat-machine.css:105`
y `:294`).

**Formas.** Radios irregulares «trazados a mano» (`--wobble-xs` … `--wobble-lg`), sombras
duras de pegatina sin desenfoque (`--shadow-ink-*`, `--shadow-accent-*`) y celo
translúcido sujetando fotos y marcos (`--tape`). Se ve en tarjetas de producto, ficha,
menú de drops y cromos (`arte-ficha-dia.webp`, `arte-menudrop-dia.webp`,
`arte-crew-dia.webp`).

**Personajes.** Un elenco de muñecos de línea negra con relleno plano azul, rojo y blanco
(`src/images/optimized/characters/`, `shell/`, `splash/`) que se asoman, se sientan en
los bordes de las tarjetas o cruzan la pantalla. Cada pantalla tiene su escena: patinador
y chico de gafas en la portada, tumbado y bombilla en el carrito vacío, DJ y abeja en La
Colmena, el perdido con mapa y su perro en el 404, la banda en Crew. El trazo y la paleta
son coherentes entre todos (`arte-404-dia.webp`, `arte-estudio-dia.webp`).

**Producto.** Fotos realistas de camiseta sobre blanco o negro, enmarcadas como polaroid
con celo. Es el único material no dibujado, y convive bien con el resto gracias al marco.

**Noche («descontrol», `html[data-theme='neon']`).** Papel violeta casi negro
(`--paper: #0c0917`), tinta lavanda (`--ink: #edf1ff`), acento lima ultravioleta
(`--uv-lime: #d4ff26`) y violeta (`--uv-violet: #9d72ff`). Las sombras siguen siendo
duras pero irradian halo, los subrayados gotean (`--uv-drips`) y el panal del estudio pasa
a miel. Encima, una capa de oscuridad con linterna y el spray para pintar. Fuente:
`00-tokens.css:228-283`; capturas `arte-portada-noche.webp`, `arte-estudio-noche.webp`,
`arte-crew-noche.webp`, `arte-404-noche.webp` (en el 404 la oscuridad es total y el
texto solo aparece bajo la linterna, a propósito, con copy distinto al de día).

**Movimiento.** Tres duraciones (`--dur-fast/base/slow`) y una curva con rebote
(`--ease-bounce`). Personajes animados (el patinador cruza la portada; los muñecos
cabecean con la música). `src/hooks/usePrefersReducedMotion.js` existe pero no lo usa
ningún componente (ver candidatos `C-EST` y `C-NOCHE`).

**Disciplina.** 166 tokens; ningún color literal en CSS fuera de `00-tokens.css` (lo
bloquea Stylelint); 12 colores literales en JS, justificados en su mayoría por el lienzo
del spray y la imagen para compartir (`src/features/night/spray/`), más `theme.js` y
`Boombox.jsx`. Cortes de 480, 640, 900 y 1200 px; menú hamburguesa hasta 640.

## 4. Revisión pantalla a pantalla (tarea 5.4)

Capturas a 480, 640, 900, 1200 y 1440 px, con `prefers-reduced-motion: reduce` para que
sean estables, de día en las 11 pantallas y de noche en portada, ficha, Crew, estudio y
404. Generadas con `scratchpad/e1/arte-capturas.mjs` (Playwright 1.64.1 + Chrome 157,
instancia aislada de E1) y reunidas en tiras por pantalla en `capturas/arte-*.webp`.

**Limitación de las capturas a página completa**: las imágenes con carga diferida no se
cargan si nadie hace scroll, así que las tarjetas vacías al final de la portada y del
listado son un efecto de la captura, no un fallo. La carga real por página está medida en
`ejecucion.md` (área catálogo) y en `metricas.md`.

| Pantalla | Lo que funciona | Incoherencias y problemas |
| --- | --- | --- |
| Portada (`arte-portada-dia/noche.webp`) | Jerarquía clara (rótulo, lema, contador, CTA), escena de personajes sobre la línea roja, tarjetas con sombra dura; la noche conserva la composición | N-ARTE-1 (dos nombres de marca), N-ARTE-2 (con movimiento reducido el patinador queda detrás del CTA y tapa «28 diseños», `arte-portada-patinador-cta.webp`); fotos de 5906 px (H-003) |
| Listado `/products` | Igual que la portada | Es la misma página que `/` (mismo rótulo y lema); ver los candidatos de SEO de `C-CAT` |
| Ficha (`arte-ficha-dia.webp`) | Foto enmarcada con celo y personaje sentado en el marco; dos columnas desde 1200 | A 900 px la foto ocupa todo el ancho y el precio y los avisos quedan bajo el pliegue (N-ARTE-3); dos botones «Avísame» con acciones distintas (`C-CAT`) |
| Menú de drops (`arte-menudrop-dia.webp`) | Lista de tarjetas coherente, escena de personajes | Sin incoherencias visuales |
| Carrito (`arte-carrito-dia.webp`) | Estado vacío con personaje y tarjeta | La marquesina lee «ロッキー・スリーファイブ» («Rocky three-five»): N-ARTE-1 |
| Rocky IA (`arte-rockyia-dia.webp`) | Panel de chat con cabecera entintada, botones rápidos y nota del modo demo | El reproductor se integra en la cabecera del chat; en móvil el título queda «MODO N» (`N-NOCHE`) |
| Crew (`arte-crew-dia/noche.webp`) | Álbum, vitrina y cromos con marco y celo; la noche funciona bien | Marco «Tinta Azul» sin estilo (`C-CHAT-16`) |
| Mi Crew (`arte-micrew-dia.webp`) | Vista previa clara, avisos «sin datos reales» visibles | Sin incoherencias visuales |
| La Colmena / estudio (`arte-estudio-dia/noche.webp`) | Radiocasete dibujado, panal, DJ y abeja; la noche en miel y lima es la mejor resuelta | A 480 px el DJ tapa parte del subtítulo «EPs y» (N-ARTE-4, `arte-estudio-480-texto-tapado.webp`); el paso 16 del secuenciador se corta a 1200–1440 px (`N-STU-1`); familia monoespaciada fuera de tokens (N-ARTE-5) |
| Legal (`arte-legal-dia.webp`) | Tipografía legible, pastillas de navegación | Datos del titular «PENDIENTE» (`C-EST-15`) |
| 404 (`arte-404-dia/noche.webp`) | Escena del perdido con mapa y perro; de noche, linterna con copy propio | «Salir de aquí» se sale de pantalla en móvil de noche (`C-EST-14`) |

### Hallazgos de arte de esta revisión

- **N-ARTE-1 · Dos nombres de marca (importante, arte).** El logotipo de la barra dice
  «ROCKY 35» (`src/images/Rockypng.png`, usado en `src/components/NavBar.jsx`) y la
  marquesina «ロッキー・スリーファイブ» («Rocky three-five»), mientras que el rótulo, el
  pie, el `<title>` y el dominio dicen «ROCKY 035». Las fotos de producto mezclan
  `rocky35-` y `rocky-` (H-005). Hace falta una decisión de marca antes de la fase 3.
  Evidencia: logotipo en la barra de todas las capturas (`arte-portada-dia.webp`) y
  marquesina en `arte-carrito-dia.webp` y `arte-404-dia.webp`.
- **N-ARTE-2 · Con movimiento reducido el patinador se queda detrás del CTA (menor, arte y
  accesibilidad).** Sin animación, `cruiser-patinando` queda parado bajo «VER DROP 4» y
  tapa «28 diseños» a 900, 1200 y 1440 px. Con animación cruza la pantalla y solo pasa por
  detrás un instante. Evidencia: `arte-portada-patinador-cta.webp` y posiciones medidas
  con Playwright (de x = −715 a 1583 px en 4,5 s).
- **N-ARTE-3 · Ficha a 900 px con la compra bajo el pliegue (menor, arte).** A 900 px la
  foto ocupa todo el ancho de la columna única y el precio, «Avísame» y el formulario
  quedan por debajo de los 900 px de alto (`arte-ficha-dia.webp`, cuarta columna).
- **N-ARTE-4 · El DJ tapa el subtítulo del estudio en móvil (menor, arte).** A 480 px el
  personaje cubre «EPs y» de «maquetas, EPs y humo»
  (`arte-estudio-480-texto-tapado.webp`).
- **N-ARTE-5 · Tipografía monoespaciada fuera de tokens (menor, arte).**
  `src/styles/components/beat-machine.css:105` y `:294` declaran su propia pila
  monoespaciada en lugar de un token `--font-mono`. Evidencia de código; no tiene efecto visual
  propio que capturar.

## Apéndice A. Scripts del inventario

`inventario_arte.py`:

```python
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
```

`arte_md.py`:

```python
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
```
