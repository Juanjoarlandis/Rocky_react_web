# Propuesta: SEO y caché

## Why

Es el cambio C17 del plan de la auditoría (`docs/auditoria/2026-11/plan-fases.md`). Sus
cinco hallazgos siguen vigentes en el código de hoy:

- **H-012.** `index.html` fija el canónico y `og:url` a la portada, y como ese documento
  se sirve en todas las rutas, todas declaran ser la portada.
- **H-043.** El servidor responde 200 con la aplicación a cualquier ruta que no sea un
  asset: `/loquesea`, `/legal/loquesea`, `/sitemap.xml` o `/music/no-existe.m4a`. La
  página 404 no cambia el título ni pide que no se indexe, y una categoría inexistente
  usa su slug como título.
- **H-062.** `/products` repite la portada, una categoría se abre igual por nombre que
  por handle (`/products/ROCKY%20DROP%204` y `/products/rocky-drop-4`) y en el catálogo
  ningún enlace de la barra queda activo.
- **H-152.** El CSS y las imágenes de la puerta de acceso van con `no-store`: unos 166 kB
  que se descargan en cada visita a la puerta.
- **H-153.** `GET /products` recibe un 301 a `/products/` del servidor de estáticos, sin
  las cabeceras de la aplicación.

El plan hacía depender este cambio de otro, `resiliencia-y-errores`, por el 404 de la
aplicación; ese cambio no existe, así que el 404 se resuelve aquí. Es de nivel 2.

## What Changes

- **Una ruta que no existe responde 404.** El servidor conoce las rutas de la aplicación:
  una ruta desconocida recibe el documento de la aplicación con estado 404 y
  `X-Robots-Tag: noindex`, y una que parece un fichero, un 404 de texto.
- **Cada página declara su URL canónica**, con la cabecera `Link` del servidor y, en el
  navegador, con el `<link rel="canonical">` y el `og:url` que la aplicación mantiene al
  navegar. `index.html` deja de fijarlos a la portada.
- **Las páginas no encontradas lo dicen**: título «No encontrado» y `noindex` en el 404,
  en un producto, una categoría o una página legal que no existen.
- **Una sola URL por contenido**: `/products` tiene por canónica la portada y una
  categoría abierta por su nombre pasa a su URL por handle.
- **La barra marca «Tienda»** en todo el catálogo.
- **`/products` deja de redirigir.**
- **Los recursos visuales de la puerta se guardan en el navegador** (caché privada); el
  HTML de la puerta sigue sin guardarse.

## Capabilities

### New Capabilities

- `rutas-y-metadatos`: qué responde el servidor a cada ruta de la aplicación y qué
  declara cada página sobre sí misma (estado, URL canónica, título e indexación).
- `puerta-de-acceso`: cómo se sirven los recursos de la puerta privada.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- Datos para compartir por producto (`og:title`, `og:image` propios de cada ficha):
  exige que el servidor escriba datos del catálogo en el HTML. Queda como propuesta
  aparte.
- `sitemap.xml`, datos estructurados y cualquier cambio de textos.
- Comprobar en el servidor si un producto o una categoría existen: se resuelve en el
  cliente con `noindex`.
- La caché de borde de Cloudflare (`despliegue-ligero`) y la compresión
  (`servidor-ligero`).
- Quitar o cambiar la puerta de acceso.

## Supuestos

- Los buscadores aceptan la URL canónica en la cabecera HTTP `Link` y, al ejecutar la
  página, en el `<link>` que añade la aplicación.
- Los recursos de la puerta no contienen nada privado: son su hoja de estilos y siete
  fuentes e ilustraciones que también usa la web.

## Impact

Un módulo nuevo de rutas compartido en `shared/`, `src/config/routes.js`, `src/App.jsx`,
`server/http/static.mjs` y sus pruebas, `server/http/access-gate.mjs` (solo cabeceras de
caché) y dos pruebas que hoy exigen `no-store`, `index.html`, `src/components/NotFound.jsx`
y `NavBar.jsx`, `src/features/catalog/ProductPage.jsx` y `ProductDetail.jsx`,
`src/features/legal/Legal.jsx` y un hook nuevo de metadatos junto a `useDocumentTitle`.
Sin dependencias nuevas.
