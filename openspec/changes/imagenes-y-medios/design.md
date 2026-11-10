# Diseño: imágenes y medios

## Context

Ver `proposal.md` para el motivo. Hechos del código (leídos el 2026-11-10):

- **Fotos de producto.** Ningún `<img>` de foto lleva `srcSet` ni `sizes`. Se pintan en
  la tarjeta (`ProductPage.jsx`, 159 px en móvil y unos 265 px en escritorio), la ficha
  (`ProductDetail.jsx`, de 339 a unos 864 px), el lightbox (hasta 860 px), el carrito
  (72–88 px), la tarjeta del chat (hasta 350 px), las miniaturas del cartel (64 px), «La
  banda» (`StreetWall.jsx`, 132–236 px; usa las dos fotos de 5906 px en cualquier modo)
  y el Taller (64–80 px).
- **De dónde sale la URL.** En demo, de `src/data/demoCatalog.json` y
  `shared/preview-products.mjs` (`/products/<nombre>.webp`), con el tamaño escrito a mano
  en `src/data/productImages.js`. En Shopify, `storefront.mjs` pide `{ url altText }` y
  manda `{ url, alt }`; `normalize.js` no define tamaño y todo cae al `?? 1254` del JSX.
  El póster de un drop sale de la Admin API igual (`drops-admin.mjs`). La CSP permite
  imágenes de `'self'`, `data:` y `https://cdn.shopify.com`.
- **Caché.** `/products/*` y `/music/*` no llevan hash: se sirven con
  `max-age=14400, must-revalidate`. Lo que sale de `src/images/optimized/` lleva hash y
  es inmutable.
- **`scripts/optimizar-imagenes.mjs`.** Solo escribe WebP en `src/images/optimized/`,
  una salida por maestro: conserva las medidas de la salida existente, crea `-600` (alto)
  en `characters/`, `-hd` sin pérdida o `-wN` con `--width`. No genera varias medidas a
  la vez, no toca `public/products/` y abre los maestros sin `animated: true`. Los
  maestros viven en `assets-master/`, que no se versiona.
- **Maestros que faltan**: de las fotos de `public/products/`, de las dos animaciones y
  del arte de noche. Los `-hd` (sin pérdida) y los PNG de `prompts-munecos/salidas/`
  tienen las mismas medidas.
- **Animación del pie** (`Footer.jsx`): póster primero y cambio a la animación cuando un
  `IntersectionObserver` con `rootMargin: '800px 0px'` ve la cinta; nunca con
  movimiento reducido. Se pinta a `clamp(84px, 10vw, 110px)` de alto. De noche pasa a
  `toxico-paseo-224.webp` a través de `nightArt.js`.
- **Estampida**: 24 corredores de `src/data/crew.js` (`-hd`), precargados al teclear
  «035», pintados a 70–140 px de alto. De noche, 16 pasan a su `night/*-800.webp`.
- **Repartidor** (`CartRunner.jsx`): la `<img>` solo existe durante la carrera (1.120 ms)
  y nada la precarga.
- **Ocultas por CSS sin `loading="lazy"`**: `.listen-hanger` (Estudio, ≤640 px),
  `.chat-lean` (chat, ≤1200 px), `.crew-corner-character` (Mi Crew) y `.taller-pegador`.
  El público de la mesa y el fotógrafo de la portada ya llevan `loading="lazy"`.
- **Audio**: `<audio preload="none">` sin `src` hasta un gesto; encender el neón asigna y
  reproduce `modo-neon.m4a` a propósito. La mesa descarga `barro.m4a` entero al elegir el
  banco BARRO y lo trocea por tiempos fijos (`CORTES_BARRO`, `BARRO_DURACION`).

Medidas con `sharp` 0.35.5 sobre los ficheros de hoy (2026-11-10):

| Qué | Hoy | Candidatas |
| --- | ---: | --- |
| Foto de 5906 px | 154–175 kB | 1.280 px: 20 kB · 640: 9 kB · 320: 4 kB |
| Foto de 1254 px | 145–199 kB | 640: 13–30 kB · 320: 5–10 kB |
| 23 ilustraciones `-hd` | 584,5 kB | alto 320: 309,7 kB con pérdida (472,5 sin pérdida) · alto 640: 704,3 kB |
| 16 ilustraciones de noche `-800` | 959,2 kB | alto 320: 263,5 kB con pérdida |
| Animación del pie (81 fotogramas, 166 × 224, 42 ms) | 663,2 kB | animada q75: 612,5 kB · q60: 572,2 kB · alto 168: 490,1 kB · alto 112: 305,3 kB · hoja de sprites 224: 545,2 kB · 168: 428,2 kB · 112: 255,2 kB · 41 fotogramas: 283,5 kB · vídeo VP9 con alfa: 162,6–248,5 kB |

## Goals / Non-Goals

**Goals:**

- Que el peso y la memoria de las imágenes dependan de cómo se pintan, no del original.
- Un único sitio que sepa pintar una foto de producto.
- Que regenerar las variantes sea una orden, no trabajo manual.

**Non-Goals:**

- AVIF u otro formato: WebP ya es universal aquí y duplicaría ficheros.
- Un servicio de redimensionado propio: gastaría CPU del servidor.
- Cambiar el arte, el número de fotogramas o la calidad del audio.

## Decisions

### D1. Variantes por convención de nombre, generadas por el script

`public/products/<nombre>.webp` pasa a medir 1.280 px como máximo y gana
`<nombre>-640.webp` y `<nombre>-320.webp`. `optimizar-imagenes.mjs` aprende a generar
varias anchuras en una pasada (`--widths 320,640,1280`) y a escribir en
`public/products/` desde `assets-master/products/`.

- *Por qué 320, 640 y 1.280*: cubren la tarjeta en móvil (318 px reales), la ficha en
  escritorio (450–864) y el lightbox (hasta 1.720 con densidad 2, que acepta 1.280 sin
  pérdida visible en ilustraciones planas).
- *Por qué por convención*: el catálogo demo y los productos de vista previa siguen
  guardando una sola ruta; las variantes se derivan del nombre.
- Los ficheros de 5906 px se mueven a `assets-master/products/` como maestros; siguen en
  el historial de git en `7effff4`.
- *Alternativa descartada: importar las fotos desde `src/` para que lleven hash.* Las
  rutas `/products/…` están en el catálogo demo, en `shared/` y en el validador del chat.

### D2. Un componente para la foto de producto

Un componente único recibe la imagen (`url`, `alt`, `width`, `height`, `sources`), el
`sizes` del sitio donde se pinta y la prioridad, y monta `src`, `srcSet`, `sizes`,
`width`, `height`, `loading`, `decoding` y `fetchPriority`. Lo usan los ocho sitios.
Para las rutas locales calcula `sources` con la convención de D1; para Shopify usa las
que manda el servidor.

- *Por qué*: hoy cada sitio escribe sus atributos a mano y ya divergen (el carrito y la
  ficha no llevan `loading`; el lightbox no lleva nada).
- `src/data/productImages.js` se reduce a las medidas reales de los originales nuevos.
- La ficha y el cartel de cabecera marcan su foto como prioritaria (`fetchPriority`):
  es su imagen principal. El lightbox no reserva caja con `width` y `height`, porque su
  CSS limita los dos ejes y con ambas medidas deformaba la foto en ventanas apaisadas.
- Límite conocido: no hay variante entre 640 y 1.254 px, así que la ficha en un móvil de
  densidad 2 (339 px pintados) descarga el original (66–199 kB). Cumple la regla de
  cuatro veces; una variante de 960 px queda como mejora si esas fotos siguen.

### D3. En Shopify, las variantes las pide el servidor

`storefront.mjs` y `drops-admin.mjs` piden, con alias, `width`, `height` y tres
`url(transform: { maxWidth: N })` por imagen, y el servidor responde
`{ url, alt, width, height, sources: [{ width, url }] }`.

- *Por qué*: es la interfaz documentada de Shopify para pedir un tamaño, el contrato
  queda en un solo sitio y de paso llega el tamaño real, que hoy falta.
- *Alternativa descartada: añadir `&width=` a la URL del CDN en el cliente.* Depende del
  formato de una URL que no es nuestra.
- *Alternativa descartada: redimensionar en nuestro servidor.* CPU y disco en la
  máquina que se quiere aligerar.
- `url` y `alt` no cambian: el añadido es compatible y `normalizeCatalog` pasa los campos
  nuevos tal cual. El validador del chat (`safeImage`) aplica la misma regla de `https:`
  a cada variante. El doble de Shopify de la auditoría aprende a responder estos campos.
- **Verificado contra la tienda de pruebas el 2026-11-10** (Storefront y Admin,
  API 2026-07): `width`, `height` y `url(transform: { maxWidth })` existen en las dos, las
  URL responden 200 con el ancho pedido y Shopify no amplía (un original de 1.024 px
  pedido a 1.280 mide 1.024). A un navegador que acepta WebP le sirve WebP: 13 kB a
  320 px y 32 kB a 640 px de un PNG original de 1 MB.

### D4. Ilustraciones en dos alturas, con pérdida

El script genera `-h320` y `-h640` desde cada `-hd` y desde cada `night/*-800`, a
calidad 82. `crew.js` y `nightArt.js` exponen las variantes y un ayudante elige la que
toca según el alto al que se pinta.

- *Por qué con pérdida*: a 320 px, las 23 ilustraciones pesan 309,7 kB con pérdida y
  472,5 kB sin ella. Es la misma calidad que ya usan las `-600`.
- *Dos alturas y `srcSet` por densidad.* Cada sitio declara el alto máximo en píxeles
  CSS al que pinta y `artSources(src, alto)` (`src/data/art.js`) devuelve `src` y, si
  hace falta, `srcSet="… 1x, … 2x"`: la menor variante que cubre ese alto a densidad 1
  y la menor que lo cubre a densidad 2. Hasta 160 px basta la de 320 en cualquier
  pantalla; hasta 320 px, 320 y 640; por encima, 640 y el original. (La primera versión
  de este diseño descartaba `srcSet` porque solo sabe de anchos; con descriptores de
  densidad no hace falta saber el ancho.)
- El emparejamiento día-noche no cambia: `nightArt.js` sigue resolviendo el original de
  día a su original de noche, y la variante se elige después, sobre el de noche.
- *Coste*: la tabla de variantes (`import.meta.glob` sobre los `-hd`, los `-800` de
  noche y sus `-h320`/`-h640`) vive en el chunk compartido y pesa unos 2,4 kB en gzip.
  Con el resto del cambio, el JavaScript inicial pasa de 122,2 a 125,3 kB y su límite
  sube de 123 a 126 kB hasta que `carga-y-estabilidad` lo baje. Si entonces el objetivo
  de 100 kB queda justo, la alternativa es un módulo por personaje.
- *Vite no incrusta las ilustraciones optimizadas.* Por defecto mete en el JavaScript,
  en base64, lo que pesa menos de 4 kB: los dos pósters de 112 px añadían 10 kB al
  bundle inicial. `assetsInlineLimit` lo desactiva para `src/images/optimized/`.
- Solo se ofrecen densidades 1 y 2: en una pantalla de densidad 3 una ilustración
  queda al 82–89 % de la nitidez ideal, que no se aprecia en dibujos de trazo.
- La variante de 640 px con pérdida pesa más que el `-hd` sin pérdida (704 frente a
  585 kB el lote de día), pero ocupa entre 3 y 6 veces menos memoria decodificada, que
  es lo que se busca; por eso solo se ofrece a quien la necesita.
- Los `-hd` se quedan como origen y para lo que se pinta grande (404, avatar de Mi
  Crew).

### D5. Animación del pie: tres alturas y carga al verse

Se generan variantes de 112 y 168 px de alto junto a la de 224 (el script abre los
maestros con `animated: true`). El `<img>` las ofrece con `srcSet` y el observador pasa
de 800 px de margen a «la cinta está en pantalla». Con `prefers-reduced-motion` o
`navigator.connection.saveData` se queda el póster.

- *Por qué no recodificar a la misma medida*: 612,5 kB frente a 663,2 kB; no compensa.
- Las variantes van a calidad 75: 305 kB (día) y 314 kB (noche) la de 112 px; 490 y
  525 kB la de 168 px. Bajar a calidad 50 solo ahorra un 10 % más, así que los límites
  del delta pasan de 310 y 450 kB a 320 y 530 kB: el peso lo ponen los 81 fotogramas
  con alfa, no la calidad.
- **Medido el 2026-11-10 (tarea 6.3):** con el muñeco cruzando la pantalla, Chrome gasta
  un 2,3 % de un núcleo con el WebP animado y un 3,3 % con una hoja de sprites del mismo
  tamaño (mediana de tres medidas de 10 s). La hoja no gana: se queda el WebP.
- *Alternativa descartada: quitar fotogramas (283,5 kB con 41).* Baja la animación de
  24 a 12 imágenes por segundo: cambia el arte.
- *Alternativa descartada: vídeo con alfa (163–249 kB).* Safari no admite alfa en WebM y
  haría falta una segunda codificación en HEVC; mucha compatibilidad para ahorrar poco
  sobre la variante de 112 px.
- *Hoja de sprites*: pesa parecido (255–545 kB) pero se decodifica una vez y se puede
  pausar. Se decide midiendo: si con la cinta en pantalla la CPU de Chrome en reposo
  baja más de un 20 % respecto al WebP animado, se usa la hoja; si no, se queda el WebP,
  que es menos código. La medida y la decisión se anotan en `tasks.md`.

### D6. Repartidor: precarga en reposo y carrera cuando hay dibujo

`CartRunner` pide su ilustración (variante `-h320`, unos 13 kB) con
`requestIdleCallback` y, al lanzar la carrera, espera a `decode()` con un límite de 1 s;
si no llega, no hay carrera.

### D7. Ocultas: `loading="lazy"`

Las cuatro ilustraciones que el CSS oculta sin `loading` pasan a llevarlo: una imagen
diferida sin caja no se descarga. Se comprueba con Playwright mirando las peticiones.

### D8. Audio: no se recodifica

`barro.m4a` se queda como está.

- *Por qué*: no hay máster sin pérdida, y pasar de AAC a 190 kbps a AAC a 128 kbps es
  una segunda compresión de la pista de un artista para ahorrar 1 MB que solo se
  descarga al pulsar reproducir. Además la mesa corta ese fichero por tiempos fijos y
  una recodificación puede desplazarlos.
- Queda como pregunta abierta para cuando aparezca el máster.

### D9. Vídeos: regla y guardián

`CONTRIBUTING.md` gana la regla (póster, `preload="none"`, carga al entrar en pantalla,
pausa fuera de ella y con la pestaña oculta, sin sonido automático) y
`scripts/check-budget.mjs` trata `.mp4`, `.webm` y `.mov` como error salvo límite
declarado.

### D10. El guardián se aprieta en el mismo cambio

Se retiran las excepciones de las dos fotos. Las animaciones dejan de ser excepciones
y pasan a tener métrica propia (`animationWeight`, 710 kB): una animación son decenas
de fotogramas y no tiene sentido medirla contra el límite de una imagen fija. El total
de imágenes sube a 8.700 kB porque `dist/` lleva ahora todas las variantes (es espacio
en disco, no lo que descarga una visita), y el JavaScript inicial a 126 kB (D4). Los
vídeos solo pasan si están declarados en `videos` con su límite (D9).

## Risks / Trade-offs

- [La variante con pérdida de una ilustración se nota] → Capturas antes y después a los
  tamaños reales, de día y de noche; si se nota, esa ilustración sube de calidad o de
  escalón.
- [Shopify no acepta la transformación como se supone] → Se prueba contra la tienda de
  pruebas antes de implementar el resto de D3; si falla, D3 se replantea y el modo demo
  no se ve afectado.
- [Sin maestros versionados, otra máquina no puede regenerar] → Como hoy: las salidas se
  versionan. Se documenta qué hay en `assets-master/`.
- [Más ficheros en el repo] → Unas 120 variantes pequeñas (menos de 1,5 MB en total).
- [Las fotos sin hash cambian de contenido con el mismo nombre] → Ya revalidan cada 4 h;
  la variante de 1.280 px sustituye a un fichero que solo cambia aquí.

## Open Questions

- ¿Existe el máster sin pérdida de `barro.m4a`? Si aparece, recodificarlo a 128 kbps
  comprobando que los cortes de la mesa siguen cayendo donde deben. No cambia nada de
  este cambio.
