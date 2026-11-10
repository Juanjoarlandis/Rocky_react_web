# Tareas: SEO y caché

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; anotar con `curl -sI` contra el servidor local el estado y las cabeceras de `/`, `/cart`, `/products`, `/loquesea`, `/legal/loquesea`, `/sitemap.xml`, `/music/no-existe.m4a` y, con la puerta activa, de `/access-gate/style.css` y de un recurso de `/access-gate/media/`.

## 2. Tabla de rutas compartida

- [ ] 2.1 Escribir `shared/routes.test.mjs` y verlo fallar: cada ruta de la aplicación casa; una desconocida no; `/legal/` solo con sus slugs válidos; canónica sin parámetros ni barra final; `/products` da `/`; un tramo de categoría sin forma de handle no tiene canónica.
- [ ] 2.2 Implementar `shared/routes.mjs` y hacer que `src/config/routes.js` y `src/App.jsx` salgan de él; añadir la prueba que falla si `App` pinta una ruta que no está en la tabla. Las pruebas de navegación existentes siguen en verde.

## 3. Estados del servidor

- [ ] 3.1 Añadir a `server/app.test.mjs` las pruebas y verlas fallar: ruta desconocida da 404 con el documento y `X-Robots-Tag: noindex`; `/legal/loquesea` igual; `/sitemap.xml` y `/music/no-existe.m4a` dan 404 `text/plain` sin caché; las rutas conocidas siguen en 200 sin `noindex`; `/products` da 200 sin redirección; con la puerta activa nada cambia.
- [ ] 3.2 Implementar en `server/http/static.mjs` el fallback con la tabla (D2) y `redirect: false` (D7) hasta que pasen esas pruebas y, sin tocarlas, las de estáticos que ya había.

## 4. URL canónica

- [ ] 4.1 Añadir pruebas del servidor, primero en rojo: cabecera `Link` con la canónica en `/`, `/product/rocky-racing?utm_source=x`, `/crew/` y `/products`; ninguna en una ruta desconocida. Implementar D3 en el servidor con `PUBLIC_ORIGIN`.
- [ ] 4.2 Escribir las pruebas del hook de metadatos y verlas fallar: crea el `<link rel="canonical">` y el `og:url`, los actualiza al navegar y usa la misma función que el servidor. Implementarlo, montarlo en `App` y quitar de `index.html` el canónico y el `og:url` fijos.
- [ ] 4.3 Verificar en el navegador, sobre el build, que al pasar de la portada a `/crew` y a una ficha cambian el canónico y `og:url`, y que el HTML servido ya no declara la portada.

## 5. No encontrados y duplicados

- [ ] 5.1 Pruebas, primero en rojo, en `NotFound.test.jsx`, `ProductDetail.test.jsx`, `ProductPage.test.jsx` y `Legal.test.jsx`: título «No encontrado · ROCKY 035» y `noindex` en cada caso; nada de eso mientras el catálogo carga; el `noindex` desaparece al volver a una página que existe. Implementar D4.
- [ ] 5.2 Prueba en `ProductPage.test.jsx`, primero en rojo, de que una categoría abierta por nombre sustituye la URL por la del handle sin añadir entrada al historial; implementar D5.
- [ ] 5.3 Prueba en `NavBar.test.jsx`, primero en rojo, de que «Tienda» está activa en la portada, en `/products/…` y en `/product/…`, en la barra y en el menú móvil; implementar D6.

## 6. Puerta de acceso

- [ ] 6.1 Actualizar las dos pruebas de `server/app.test.mjs` que exigen `no-store` a lo que pide `specs/puerta-de-acceso/spec.md` (el requisito cambia, D8), añadir las del HTML de la puerta y del recurso no permitido, y verlas fallar; implementar las cabeceras en `server/http/access-gate.mjs`.

## 7. Cierre

- [ ] 7.1 Repetir los `curl -sI` de 1.1 y anotar el antes y el después; repetir Lighthouse (SEO y buenas prácticas siguen en 100) sobre las diez páginas.
- [ ] 7.2 Actualizar `README.md` y `SECURITY.md` donde describen el fallback de la aplicación y la caché de la puerta.
- [ ] 7.3 `npm run check`; autorrevisión de `git diff`; `security-review` por tocar la puerta; revisión independiente contra las dos especificaciones. Anotar el resultado aquí.

## Workflow follow-up

- Cuando la web se abra, comprobar desde fuera con `curl -I` el 404, la cabecera `Link` y el `X-Robots-Tag`.
- Proponer aparte los datos para compartir por producto (`og:title`, `og:image`).
- Archivar con `openspec-archive-change` tras VERIFIED.
