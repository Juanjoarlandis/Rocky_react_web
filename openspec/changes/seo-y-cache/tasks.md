# Tareas: SEO y caché

## 1. Línea base

- [x] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; anotar con `curl -sI` contra el servidor local el estado y las cabeceras de `/`, `/cart`, `/products`, `/loquesea`, `/legal/loquesea`, `/sitemap.xml`, `/music/no-existe.m4a` y, con la puerta activa, de `/access-gate/style.css` y de un recurso de `/access-gate/media/`.
  - Partida (commit `1347e35`): `npm run check` → 161 ficheros, 1.755 pruebas en verde.
  - Estado y cabeceras de partida (instancia local con `PUBLIC_ORIGIN=https://rocky035.com`): `/`, `/cart`, `/crew/`, `/legal/privacidad`, `/product/…?utm_source=x`, **`/loquesea`, `/legal/loquesea`, `/sitemap.xml` y `/music/no-existe.m4a`**, todas 200 `text/html` sin `Link` ni `X-Robots-Tag`; `/products`, 301 a `/products/` sin cabeceras de caché. Con la puerta activa: `/access-gate/style.css` y `/access-gate/media/grafitero`, 200 con `Cache-Control: no-store`.

## 2. Tabla de rutas compartida

- [x] 2.1 Escribir `shared/routes.test.mjs` y verlo fallar: cada ruta de la aplicación casa; una desconocida no; `/legal/` solo con sus slugs válidos; canónica sin parámetros ni barra final; `/products` da `/`; un tramo de categoría sin forma de handle no tiene canónica.
  - `shared/routes.test.mjs`, 44 pruebas. Además de lo pedido: casa como React Router (sin distinguir mayúsculas en los tramos fijos, con barra final), entrega los parámetros decodificados, rechaza una codificación rota y vuelve a codificar los parámetros en la canónica.
- [x] 2.2 Implementar `shared/routes.mjs` y hacer que `src/config/routes.js` y `src/App.jsx` salgan de él; añadir la prueba que falla si `App` pinta una ruta que no está en la tabla. Las pruebas de navegación existentes siguen en verde.
  - `src/config/routes.js` exporta `ROUTE_PATHS` (los patrones de la tabla) y `App` pinta `<Route path={ROUTE_PATHS.x}>`. `src/config/routes.test.js` lee `App.jsx` y falla si hay una ruta escrita a mano, si falta alguna de la tabla o si `LEGAL_PAGES` no coincide con sus slugs.

## 3. Estados del servidor

- [x] 3.1 Añadir a `server/app.test.mjs` las pruebas y verlas fallar: ruta desconocida da 404 con el documento y `X-Robots-Tag: noindex`; `/legal/loquesea` igual; `/sitemap.xml` y `/music/no-existe.m4a` dan 404 `text/plain` sin caché; las rutas conocidas siguen en 200 sin `noindex`; `/products` da 200 sin redirección; con la puerta activa nada cambia.
  - Siete pruebas nuevas en `server/app.test.mjs` («rutas de la aplicación: estado y URL canónica»), incluida la de que nada de la petición llega crudo a la cabecera `Link` y la de un visitante con acceso tras la puerta (404 con cabeceras privadas).
- [x] 3.2 Implementar en `server/http/static.mjs` el fallback con la tabla (D2) y `redirect: false` (D7) hasta que pasen esas pruebas y, sin tocarlas, las de estáticos que ya había.
  - **Prueba existente cambiada a propósito**: `server/http/static.test.mjs`, «no deja la codificación ni el tipo de la variante…». Fijaba el comportamiento antiguo (un `.json` cuya variante desaparece caía al documento de la aplicación); con D2 eso es un 404 de texto. Sigue comprobando lo que le da nombre: que la respuesta no hereda `Content-Encoding` ni el tipo de la variante.

## 4. URL canónica

- [x] 4.1 Añadir pruebas del servidor, primero en rojo: cabecera `Link` con la canónica en `/`, `/product/rocky-racing?utm_source=x`, `/crew/` y `/products`; ninguna en una ruta desconocida. Implementar D3 en el servidor con `PUBLIC_ORIGIN`.
  - Incluida en las pruebas de 3.1: `Link` en `/`, `/cart`, `/estudio`, `/legal/privacidad`, `/product/rocky-racing?utm_source=x`, `/products/rocky-drop-4`, `/crew/`, `/products` (la portada) y `/CART`; ninguna en rutas desconocidas ni en una categoría abierta por su nombre. `mountStaticApp` recibe `publicOrigin` de la configuración.
- [x] 4.2 Escribir las pruebas del hook de metadatos y verlas fallar: crea el `<link rel="canonical">` y el `og:url`, los actualiza al navegar y usa la misma función que el servidor. Implementarlo, montarlo en `App` y quitar de `index.html` el canónico y el `og:url` fijos.
  - `src/hooks/usePageMetadata.js` (`useCanonicalUrl`, montado en `App`, y `useNotFound`) con siete pruebas. El origen del cliente es la constante `SITE_ORIGIN` de `src/config/links.js`; el del servidor, `PUBLIC_ORIGIN`. En producción son el mismo; en una instancia local con otro `PUBLIC_ORIGIN` Lighthouse ve dos canónicas distintas (ver 7.1).
- [x] 4.3 Verificar en el navegador, sobre el build, que al pasar de la portada a `/crew` y a una ficha cambian el canónico y `og:url`, y que el HTML servido ya no declara la portada.
  - Con Chrome sobre el build (`seo-nav.mjs`): el HTML servido no lleva `rel="canonical"` ni `og:url`; en `/?utm_source=x` valen `https://rocky035.com/`; al pasar a `/crew` sin recargar, `https://rocky035.com/crew`; en una ficha, la de la ficha; en `/loquesea`, ninguna, y al volver a la tienda, otra vez la de la portada.

## 5. No encontrados y duplicados

- [x] 5.1 Pruebas, primero en rojo, en `NotFound.test.jsx`, `ProductDetail.test.jsx`, `ProductPage.test.jsx` y `Legal.test.jsx`: título «No encontrado · ROCKY 035» y `noindex` en cada caso; nada de eso mientras el catálogo carga; el `noindex` desaparece al volver a una página que existe. Implementar D4.
  - `useNotFound` en `NotFound`, `ProductDetail` (solo con el catálogo cargado y sin error), `ProductPage` (categoría sin productos ni drop, sin esperas pendientes) y `Legal`. Una sola etiqueta `noindex` aunque la pidan dos componentes a la vez (la página legal que pinta dentro el 404). Verificado también en el navegador (4.3): `/product/no-existe`, `/products/no-existe` y `/loquesea` se titulan «No encontrado · ROCKY 035» con `noindex`, que desaparece al volver a la portada.
- [x] 5.2 Prueba en `ProductPage.test.jsx`, primero en rojo, de que una categoría abierta por nombre sustituye la URL por la del handle sin añadir entrada al historial; implementar D5.
  - `ProductPage` navega con `replace` a `ROUTES.category(handle)` conservando parámetros y hash; la prueba comprueba que «atrás» vuelve a la portada y que un nombre que no es de ninguna categoría no se toca.
- [x] 5.3 Prueba en `NavBar.test.jsx`, primero en rojo, de que «Tienda» está activa en la portada, en `/products/…` y en `/product/…`, en la barra y en el menú móvil; implementar D6.
  - «Tienda» ya no puede ser un `NavLink` (son tres rutas): `NavBar` calcula con la tabla si la ruta es la portada, el catálogo o una ficha y pinta la misma clase `is-active` y el mismo `aria-current="page"`. Ocho pruebas, en la barra y en el menú móvil.

## 6. Puerta de acceso

- [x] 6.1 Actualizar las dos pruebas de `server/app.test.mjs` que exigen `no-store` a lo que pide `specs/puerta-de-acceso/spec.md` (el requisito cambia, D8), añadir las del HTML de la puerta y del recurso no permitido, y verlas fallar; implementar las cabeceras en `server/http/access-gate.mjs`.
  - **Pruebas existentes cambiadas a propósito** (el requisito cambia, D8): las dos aserciones de `no-store` de «serves only the allowlisted visual resources used by the gate» pasan a `private, max-age=3600` (hoja) y `private, max-age=86400` (medios), con `Cloudflare-CDN-Cache-Control: no-store` y `X-Robots-Tag`. Prueba nueva: el HTML de la puerta y la respuesta a una clave mala siguen en `no-store`; un recurso fuera de la lista, 404 sin caché.

## 7. Cierre

- [x] 7.1 Repetir los `curl -sI` de 1.1 y anotar el antes y el después; repetir Lighthouse (SEO y buenas prácticas siguen en 100) sobre las diez páginas.
  - Después (`curl-base.mjs`, misma instancia): rutas conocidas, 200 con `Link: <https://rocky035.com/…>; rel="canonical"` (`/products` → la portada, `/crew/` → `/crew`, la ficha sin `utm_source`); `/loquesea` y `/legal/loquesea`, **404** `text/html` con `X-Robots-Tag: noindex`; `/sitemap.xml` y `/music/no-existe.m4a`, **404** `text/plain` `no-store`; `/products`, **200** sin redirección. Puerta: hoja `private, max-age=3600`, medios `private, max-age=86400`, HTML de la puerta `no-store`, recurso no permitido 404 `no-store`.
  - Lighthouse (móvil, una pasada, con `PUBLIC_ORIGIN=https://rocky035.com` como en producción): SEO 100 en las nueve páginas que existen; buenas prácticas 100 salvo `/estudio`, 77 como en la línea base (cookies de terceros del reproductor incrustado). `/no-existe` ya no se puede auditar: Lighthouse aborta ante un documento con 404, que es lo que se quería.
  - Con `PUBLIC_ORIGIN` distinto de `https://rocky035.com` (una instancia local), SEO baja a 92 por la auditoría `canonical`: la cabecera `Link` y el `<link>` del cliente dicen orígenes distintos. No pasa en producción, donde coinciden; queda escrito en `README.md`.
- [x] 7.2 Actualizar `README.md` y `SECURITY.md` donde describen el fallback de la aplicación y la caché de la puerta.
  - `README.md` (sección «Rutas, estados y URL canónica» y caché de la puerta) y `SECURITY.md` (dos invariantes nuevos).
- [x] 7.3 `npm run check`; autorrevisión de `git diff`; `security-review` por tocar la puerta; revisión independiente contra las dos especificaciones. Anotar el resultado aquí.
  - `npm run check` → 164 ficheros, **1.844 pruebas en verde** (partida: 1.755); JS inicial 99,81 kB (límite 100) y CSS inicial 13,10 kB. `openspec validate seo-y-cache --strict`, válido. `diff-check.sh`, limpio.
  - `security-review` (sobre toda la rama, con el árbol de este cambio): **sin hallazgos**. Comprobó, entre otras cosas, que nada de la petición llega crudo a la cabecera `Link` (los parámetros se decodifican y se vuelven a codificar; el origen es `PUBLIC_ORIGIN`, nunca `Host`), que la negociación de variantes no construye rutas con datos de la petición, y que en la puerta solo la hoja de estilos y la lista cerrada de siete recursos pasan a `private, max-age`: el HTML, las respuestas de acceso, los 404 ocultos y todo lo que hay detrás siguen sin caché.
  - Revisión independiente (subagente con contexto limpio, una ronda): sin bloqueantes. **Importante, corregido con su prueba**: al pasar de una categoría inexistente a otra el título volvía a ser el slug. **Menores, corregidos con su prueba**: una petición con `Range` a una ruta desconocida respondía 206 o 416 en vez de 404; el servidor casaba más estricto que el router con barras finales de más y tramos fijos escritos con `%XX` (`/cart//`, `/c%61rt`); `/index.html` pedido por su nombre respondía 200 sin canónica (ahora declara la portada; no se convierte en 404 porque una prueba de `servidor-ligero` fija que se sirve); y `SITE_ORIGIN` duplicaba `LEGAL_ENTITY.web` (ahora sale de él). Queda como está, a propósito: `//` y `/cart//extra` son 404 en el servidor aunque el router los pinte (lado seguro).
  - No comprobado: la caché real del navegador en la segunda visita a la puerta (solo las cabeceras), ni nada desde fuera con la web abierta (está tras la puerta).

## Workflow follow-up

- Cuando la web se abra, comprobar desde fuera con `curl -I` el 404, la cabecera `Link` y el `X-Robots-Tag`.
- Proponer aparte los datos para compartir por producto (`og:title`, `og:image`).
- Archivar con `openspec-archive-change` tras VERIFIED.
