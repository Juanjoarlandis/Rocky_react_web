# Diseño: SEO y caché

## Context

Ver `proposal.md` para el motivo. Hechos del código (leídos el 2026-11-10):

- **Rutas.** `src/App.jsx` declara `/`, `/products/:category?`, `/menudrop`, `/cart`,
  `/product/:productId`, `/rockyIA`, `/estudio`, `/crew`, `/mi-crew`, `/legal/:page`,
  `/taller` y `*`. `src/config/routes.js` tiene los destinos de los enlaces
  (`ROUTES`), y las páginas legales válidas están en `LEGAL_PAGES` (`src/config/legal`).
- **Servidor.** `server/http/static.mjs` no sabe qué rutas existen: tras los dos
  `express.static` y los 404 de `/assets/*` y de imágenes de `/products/*`, un
  `app.get('*')` envía `index.html` con 200. El `express.static` de la raíz no desactiva
  `redirect`, y como `dist/products/` es una carpeta, `/products` recibe un 301. Una
  prueba fija el 200 de `/cart`; ninguna cubre rutas desconocidas.
- **Metadatos.** `index.html` lleva `<link rel="canonical" href="https://rocky035.com/">`
  y `og:url` igual. En `src/` solo se toca `document.title` (`useDocumentTitle`, que usan
  diez páginas pero no `NotFound`), el `theme-color` y el `noindex` del Taller.
- **No encontrados.** `NotFound.jsx` no fija título. `Legal` con un slug desconocido
  pinta `<NotFound />`. Una categoría desconocida usa el slug como título; `ProductDetail`
  ya pone «Producto no encontrado».
- **Duplicados.** La categoría casa por nombre o por handle
  (`product.drop === category || product.dropHandle === category`). «Tienda» apunta a la
  portada con `end: true`.
- **Puerta.** `setGateHeaders` pone `Cache-Control: no-store`, CDN `no-store` y
  `X-Robots-Tag` en `/access-gate/style.css` y en `/access-gate/media/:name` (lista
  cerrada de siete: logo, tres ilustraciones y tres fuentes, resueltos al arrancar desde
  `dist/`). Dos pruebas de `server/app.test.mjs` exigen ese `no-store`.
- **Otros cambios de la fase 4.** `servidor-ligero` sirve `index.html` precomprimido:
  conviene no convertirlo en un documento distinto por ruta.

## Goals / Non-Goals

**Goals:**

- Estados HTTP y metadatos correctos con el menor cambio en cómo se sirve el documento.
- Una sola definición de las rutas para cliente y servidor.

**Non-Goals:**

- Generar HTML distinto por ruta.
- Consultar el catálogo al servir un documento.

## Decisions

### D1. Una tabla de rutas en `shared/`

`shared/routes.mjs` define las rutas de la aplicación (patrón, y para `/legal/:page`,
sus slugs válidos) y dos funciones puras: casar una ruta y calcular su canónica.
`src/config/routes.js` y `src/App.jsx` construyen sus `<Route>` a partir de ella, y
`server/http/static.mjs` la usa para decidir el estado.

- *Por qué en `shared/`*: es donde ya viven los módulos sin Node que usan los dos lados.
- Una prueba recorre las rutas que declara `App` y falla si alguna no está en la tabla.
- *Alternativa descartada: una lista aparte en el servidor.* Se desincroniza con la
  primera ruta nueva.

### D2. 404 con la aplicación, o de texto si parece un fichero

El fallback de `static.mjs` casa la ruta con la tabla: si existe, 200 como hoy; si no y
el último tramo no lleva extensión, `index.html` con estado 404 y `X-Robots-Tag: noindex`
(el visitante ve la página 404 de la aplicación); si lleva extensión, 404 `text/plain`
sin caché, igual que los assets.

- *Por qué las dos formas*: una persona que se equivoca de URL merece la página bonita;
  un rastreador que pide `/sitemap.xml` o un `.m4a` no debe recibir HTML.
- Con la puerta activa nada cambia: `requireAccess` va antes.
- Los productos y categorías que casan con el patrón responden 200 aunque no existan;
  su `noindex` lo pone el cliente (D4).

### D3. Canónica en la cabecera `Link`, y en el DOM desde el cliente

El servidor añade `Link: <origen + canónica>; rel="canonical"` a toda respuesta 200 del
documento. `index.html` deja de llevar `<link rel="canonical">` y `og:url`; un hook de
metadatos, montado una vez en `App`, los crea y los actualiza en cada navegación con la
misma función de D1.

- *Por qué la cabecera*: da la canónica correcta a quien no ejecuta JavaScript sin
  generar un HTML por ruta, así que `index.html` sigue siendo un fichero estático y
  precomprimido.
- *Por qué quitar `og:url` del HTML*: sin él, quien comparte un enlace toma la URL que
  pidió; con el de la portada, todas las páginas dicen ser la portada.
- *Alternativa descartada: plantilla de `index.html` por ruta.* Obliga a comprimir en
  caliente o a cachear variantes, para dos atributos.
- El origen es `PUBLIC_ORIGIN`. La canónica no lleva parámetros ni barra final;
  `/products` da `/`. Un tramo de categoría que no tiene forma de handle no recibe
  cabecera canónica: el cliente lo sustituirá (D5).

### D4. «No encontrado» lo decide el cliente

Un hook pequeño fija el título «No encontrado · ROCKY 035» y añade
`<meta name="robots" content="noindex">` mientras su componente está montado, y lo
retira al desmontar. Lo usan `NotFound`, el estado «producto no encontrado» de
`ProductDetail` y el de categoría vacía de `ProductPage`, estos dos solo cuando el
catálogo ya ha cargado.

### D5. Categoría por nombre: sustituir la URL

Cuando `ProductPage` resuelve una categoría por su nombre, navega con `replace` a la
URL del handle.

### D6. «Tienda» activa en el catálogo

El enlace se marca activo si la ruta es la portada, `/products/*` o `/product/*`.

### D7. `redirect: false` en el estático de la raíz

`/products` deja de recibir el 301 de la carpeta y cae en el fallback, que lo sirve
como ruta de la aplicación.

### D8. Caché privada para los recursos de la puerta

`/access-gate/style.css` pasa a `Cache-Control: private, max-age=3600` y
`/access-gate/media/:name` a `private, max-age=86400`. Se conservan
`Cloudflare-CDN-Cache-Control: no-store` y `X-Robots-Tag`. El HTML de la puerta y sus
respuestas no cambian.

- *Por qué privada y no pública*: la postura de la puerta es que, hacia fuera, la web
  no existe; no se deja nada en la caché de borde.
- *Por qué un día y no «inmutable»*: se piden por nombre fijo, sin hash en la URL.
- Las dos pruebas que exigen `no-store` se actualizan: el requisito cambia aquí, a
  propósito, y queda escrito en `specs/puerta-de-acceso/spec.md`.
- Toca el fichero de la puerta, así que el cambio pasa por `security-review`.

## Risks / Trade-offs

- [Un buscador ignora la canónica de la cabecera] → La aplicación la repite en el DOM al
  ejecutarse; antes del cambio todas las páginas declaraban la portada, que es peor.
- [Una ruta nueva se olvida en la tabla y empieza a dar 404] → La prueba de D1 lo
  impide.
- [Un enlace antiguo con nombre de categoría] → Sigue funcionando: 200 y sustitución.
- [Una ilustración de la puerta cambia y el visitante ve la antigua un día] → Asumido;
  son decorativas.
- [El 404 con la aplicación rompe la recarga por chunk caducado] → `preloadRecovery`
  recarga la misma URL; una ruta válida sigue dando 200.

## Migration Plan

Llega con una release y se revierte con `release:revertir`. No hay datos que migrar.
Con la puerta cerrada, los buscadores no ven nada de esto: se comprueba en local y,
cuando la web se abra, con `curl -I` desde fuera.
