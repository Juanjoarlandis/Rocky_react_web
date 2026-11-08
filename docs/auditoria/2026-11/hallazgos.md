# Hallazgos

Hallazgos de la fase 1 de la auditoría sobre el commit `7d2bf57`, consolidados el
2026-11-08 (tarea 7.1). Vienen de tres sitios: de leer el código para el mapa de
recorridos (candidatos `C-…`), de ejecutar los recorridos en E1 y E2 simulado
(`ejecucion.md`, hallazgos nuevos `N-…`) y de la revisión de arte (`arte.md`,
`N-ARTE-…`). Los duplicados se han fusionado por causa raíz. Cada `H-NNN` dice en
**Origen** qué IDs agrupa, y la tabla del final da el destino de todos.

**Severidad**. Es la escala de la revisión de código, aplicada así:

- **bloqueante**: impide un recorrido, rompe la web o impide abrirla al público. Los
  datos legales «PENDIENTE» cuentan como bloqueantes para abrir.
- **importante**: degrada claramente la experiencia, el rendimiento, la accesibilidad o
  el arte, o expone un riesgo legal, de privacidad o de seguridad.
- **menor**: pulido.

Si la severidad final no es la que propusieron los agentes, el hallazgo lo dice
(«severidad ajustada: motivo»). Si las pasadas de E1 y de E2 simulado discreparon, el
hallazgo explica cuál se mantiene y por qué.

**Fase propuesta**:

- **2**: funcional, seguridad, operación, legal y privacidad, accesibilidad de
  interacción (foco, teclado, lectores de pantalla) y pruebas que faltan.
- **3**: arte (visual, marca, tokens, nombres y orden del arte, contraste).
- **4**: rendimiento y SEO.

**Entorno**:

- **E1**: local, sin credenciales.
- **E2 simulado**: el servidor real con dobles de Shopify y OpenRouter. No prueba el
  comportamiento real de Shopify ni el del modelo.
- **producción**: solo lectura con `curl`, con la puerta cerrada.
- **código y tests**: lectura del código y ejecución de los tests.

E3 (producción con la puerta abierta) no se ha ejecutado todavía.

**Cómo leer los IDs**:

- `H-NNN`: hallazgo confirmado. H-001 a H-006 conservan el número que tenían antes de
  consolidar. Los demás se numeran desde H-007 por severidad.
- `C-<ÁREA>-NN`: candidato que salió al leer el código (tareas 2.2–2.8). Las áreas son
  `EST` (estructura y navegación), `CAT` (catálogo y drops), `CART` (carrito, checkout
  y cuenta), `CHAT` (Rocky IA y Crew), `STU` (estudio de beats), `NOCHE` (modo noche y
  música) y `TRANS` (transversales).
- `N-<ÁREA>-n`: hallazgo nuevo aparecido al ejecutar. Usa las mismas áreas más `E2`
  para el entorno simulado; el área de carrito no dejó ninguno.
- `N-ARTE-n`: hallazgo de la revisión de arte (`arte.md`, apartado 4).
- `R-<ÁREA>-NN` y `TECLADO-<pantalla>`: fichas de `recorridos.md`. Su resultado está en
  `ejecucion.md`.

**Capturas y salidas**. Las de `capturas/…` están en el repositorio. Las de
`capturas-e1/…`, igual que las salidas de los scripts (`out/…`, `obs/…`,
`scratchpad/…`), se guardaron en el scratchpad de la sesión del 2026-11-08, fuera del
repositorio.


**Capturas.** Las rutas `capturas-e1/…` son del scratchpad de la sesión de auditoría y no se conservan; las de los hallazgos importantes con fallo visual se copiaron a `capturas/` (prefijo `fallo-h-NNN-`), dentro del límite de 40 de `design.md` (D7).

## Resumen

**175 hallazgos confirmados**: 1 bloqueante, 39 importantes y 135 menores (H-169 a H-173 salen de las métricas de Lighthouse, tarea 6.3; la parte de cookies de terceros de esas métricas está en H-017). Se han revisado 229 IDs: 190 candidatos `C-…`, 34 hallazgos nuevos `N-…` de la ejecución y 5 `N-ARTE-…`. De ellos, 219 se integran en algún hallazgo, 3 se descartan y 7 quedan pendientes, como `SIN CONFIRMAR`. 38 hallazgos agrupan más de un ID por compartir causa raíz.

Bloqueante: H-007 (Las páginas legales publican «PENDIENTE» en lugar de los datos del titular). H-008 (catálogo limitado a 8) se rebajó a importante en la revisión independiente: pasa a bloqueante si la tienda real publica más de 8 productos. H-174 se añadió en esa misma revisión.

Por fase, categoría y severidad:

| Fase | Categoría | Bloqueantes | Importantes | Menores | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| 2 | funcional | — | 17 | 60 | 77 |
| 2 | seguridad observada | — | 3 | 4 | 7 |
| 2 | operación | — | 4 | 18 | 22 |
| 2 | legal/privacidad | 1 | 3 | 1 | 5 |
| 2 | accesibilidad | — | 4 | 31 | 35 |
| 3 | accesibilidad | — | 2 | — | 2 |
| 3 | arte | — | 1 | 7 | 8 |
| 4 | rendimiento | — | 4 | 12 | 16 |
| 4 | SEO | — | 1 | 2 | 3 |
| **Total** | | **1** | **39** | **135** | **175** |

Por fase:

| Fase | Bloqueantes | Importantes | Menores | Total |
| --- | ---: | ---: | ---: | ---: |
| 2 | 1 | 31 | 114 | 146 |
| 3 | — | 3 | 7 | 10 |
| 4 | — | 5 | 14 | 19 |

## Bloqueantes

### H-007 · Las páginas legales publican «PENDIENTE» en lugar de los datos del titular
- **Categoría**: legal/privacidad
- **Severidad**: bloqueante (impide abrir la web al público)
- **Ubicación**: `/legal/aviso-legal` y `/legal/privacidad` («Responsable del tratamiento»). `src/config/legal.js:6-8`, pintado tal cual en `src/features/legal/Legal.jsx:14-32`; `isLegalEntityComplete` (`src/config/legal.js:22`) solo se usa en los tests.
- **Reproducción**: ver R-LEGAL-03. Abrir las dos páginas y leer los datos del titular.
- **Esperado**: titular, NIF y domicilio reales antes de abrir la web al público.
- **Observado**: las dos páginas muestran «Titular: PENDIENTE: nombre y apellidos o razón social», «NIF: PENDIENTE: NIF» y «Domicilio: PENDIENTE: domicilio a efectos de notificaciones». Nada lo avisa ni lo oculta.
- **Evidencia**: R-LEGAL-03 en FALLO en escritorio y móvil; capturas `capturas-e1/estructura/R-LEGAL-03-escritorio.png` y `R-LEGAL-03-movil.png`; `capturas/arte-legal-dia.webp`.
- **Entorno**: E1. Falta comprobar en E3 si producción enseña lo mismo.
- **Fase propuesta**: 2
- **Origen**: C-EST-15

## Importantes

### H-008 · El catálogo vivo solo carga 8 productos: los demás no salen y su ficha dice «Producto no encontrado»
- **Categoría**: funcional
- **Severidad**: importante (severidad ajustada tras la revisión independiente: se había subido a bloqueante apoyándose en el catálogo de vista previa, que no sufre el fallo. El límite de 8 tarjetas fue una decisión documentada del 31 de agosto —`docs/archive/2026-08/superpowers/plans/2026-08-31--shopify-catalog-production/tasks/03-production-rollout.md`: «la interfaz solicita y muestra ocho productos»—; el defecto es que la ficha, las categorías y los enlaces del carrito y de Rocky IA no resuelven los productos que quedan fuera de esos 8. **Pasa a bloqueante si la tienda real publica más de 8 productos**: no se sabe cuántos tiene hasta tener D7 o E3)
- **Ubicación**: `/`, `/products/:category?`, `/menudrop`, `/product/:productId` y los enlaces del carrito. `src/api/shopify.js:4` y `:37-39` piden `first=8`; `src/features/storefront/useStorefrontStatus.js:68-70` ignora `pageInfo`; `src/features/catalog/ProductDetail.jsx:34-36` solo busca entre lo cargado. Rocky IA, en cambio, ve hasta 50 (`server/services/catalog-cache.mjs:2`), y las líneas del carrito enlazan a la ficha (`src/features/cart/Cart.jsx:128` y `:142`).
- **Reproducción**: ver R-CAT-13, R-CAT-14, R-CART-10 y R-CHAT-19. Con más de 8 productos en Shopify, abrir la portada, contar los diseños y abrir la ficha del 9.º. Añadir desde Rocky IA un producto que no esté entre los 8 y seguir su enlace desde `/cart`.
- **Esperado**: todos los productos de la tienda aparecen en el catálogo, las categorías y el menú drop, y todos tienen ficha.
- **Observado**: solo se pide `GET /api/shopify/products?first=8` y, aunque llega `pageInfo.hasNextPage=true`, no se pide más.
  - Con el BFF simulado en E1 (10 productos), la portada cuenta «8 diseños» y `/product/mock-9` dice «Producto no encontrado» tras recargar.
  - En E2 simulado, LEVEL ORANGE y Mugshot no aparecen y `/product/level-orange` dice «Producto no encontrado».
  - Rocky IA sí ofrece LEVEL ORANGE. Una línea de ese producto añadida desde el chat enlaza a esa misma ficha vacía.
- **Evidencia**: `scratchpad/e1/catalogo/06-candidatos.mjs` (E1 con BFF simulado); R-CAT-13, R-CAT-14, R-CART-10 y R-CHAT-19 en E2 simulado, escritorio y móvil.
- **Entorno**: E1 con BFF simulado y E2 simulado. Falta la tienda de desarrollo real.
- **Fase propuesta**: 2
- **Origen**: C-CAT-01, C-CART-19

### H-001 · El código publicado no estaba en Git y el proceso de publicación no está versionado
- **Categoría**: operación
- **Severidad**: importante
- **Ubicación**: Raspberry `/opt/rocky035/releases/`; rama `rescate/produccion-2026-09-29` (commit `7d2bf57`)
- **Reproducción**: comparar el `release.json` de la release activa con GitHub (`git cat-file -e fdcbee15` en un clon de `Juanjoarlandis/Rocky_react_web`).
- **Esperado**: lo que está en producción sale de un commit que existe en el repositorio remoto, y el procedimiento que genera y promueve la release vive en el repo.
- **Observado**: la release activa se construyó desde `fdcbee15` (rama `claude/modo-descontrol`), que no existe en GitHub. Las 9 releases desde el 2026-09-04 vienen de commits no publicados. `promote.sh` se genera en cada release y el constructor de releases no está en el repo. El rescate (`7d2bf57`) solo existe en local hasta que se suba la rama.
- **Evidencia**: `release.json` de `20260929T100641Z-el-toxico-5617951b` (`"commit": "fdcbee15…"`, `"branch": "claude/modo-descontrol"`); `gh api …/commits/fdcbee15…` → 422 «No commit found».
- **Entorno**: producción y código (repositorio)
- **Fase propuesta**: 2 (operación): subir la rama, versionar el proceso de release y exigir que solo se publique desde commits remotos.
- **Origen**: registrado al preparar la auditoría, con el rescate de la release de producción; no agrupa candidatos.

### H-002 · `npm audit` encuentra 15 vulnerabilidades y el CI fallaría
- **Categoría**: seguridad observada (también operación)
- **Severidad**: importante
- **Ubicación**: `package-lock.json`; `.github/workflows/` (paso `npm audit --audit-level=moderate`)
- **Reproducción**: `npm ci && npm audit` y `npm audit --omit=dev`.
- **Esperado**: ninguna vulnerabilidad moderada o superior, como exige el CI.
- **Observado**: 15 en total (3 críticas, 6 altas y 6 moderadas) sobre 549 dependencias. Cuatro están en dependencias de producción: `proxy-addr` (crítica), `body-parser` (alta), `express` y `qs` (moderadas). `proxy-addr` interviene en la resolución de la IP del cliente con `TRUST_PROXY_HOPS`, de la que dependen los límites de peticiones. `npm audit fix` las resuelve dentro de los rangos de `package.json` (p. ej. `express` 4.22.3) **salvo** tres que exigen tocar `package.json`: el `overrides` de `qs` fijado en 6.16.0 (vulnerable hasta 6.16.0; arreglo desde 6.16.1) y `@vitest/coverage-v8` fijado exactamente en 4.1.10 (con `@vitest/mocker`, arreglo en 4.1.12). No hace falta migrar a Express 5. (Texto corregido tras la revisión independiente; resuelto en el cambio `dependencias-y-ci`, commit `4867511`.)
- **Evidencia**: salida de `npm audit --json` del 2026-11-08 (`metricas.md`, apartado 3.3).
- **Entorno**: código (repositorio)
- **Fase propuesta**: 2
- **Origen**: registrado al medir las dependencias (tarea 6.3); no agrupa candidatos.

### H-003 · Dos fotos de producto miden 5906 × 5906 px
- **Categoría**: rendimiento
- **Severidad**: importante
- **Ubicación**: `public/products/rocky35-camel.webp` y `public/products/rockydz-boyz.webp` (`src/data/productImages.js:12-13`). Se sirven tal cual, sin `srcset` ni `sizes`, en la tarjeta, la ficha y el lightbox (`src/features/catalog/ProductPage.jsx:225-234`, `src/features/catalog/ProductDetail.jsx:137-143`).
- **Reproducción**: `ffprobe -v error -show_entries stream=width,height public/products/rockydz-boyz.webp`; abrir `/product/rockydz-boyz`. Ver R-CAT-01, R-CAT-04 y R-CAT-08.
- **Esperado**: el mismo tamaño que el resto de fotos de producto (1254 × 1254) o variantes por ancho con `srcset` y `sizes`.
- **Observado**: miden 5906 × 5906, unos 35 megapíxeles por imagen. Pesan poco en red (175 104 y 154 066 bytes), pero:
  - se descargan en la carga inicial de `/` y de `/products/rocky-drop-4`, y en sus fichas, para pintarse a 264–266 px en escritorio y a 159–160 px en móvil;
  - la ficha `smoker-edition` sube la memoria del renderizador en +263 MB (escritorio) y +235 MB (móvil), frente a +92 y +62 MB con una foto de 1254 px;
  - la portada con la rejilla a la vista la sube en +482 y +430 MB, frente a +98 y +83 MB de `/products/costa-035`;
  - la primera decodificación tarda unos 80 ms, frente a unos 10 ms;
  - `rockydz-boyz.webp` es el elemento LCP de su ficha en móvil (LCP de 6,68 s).
- **Evidencia**: inventario de `arte.md`, apartado 2; R-CAT-01, R-CAT-04 y R-CAT-08 (sonda de memoria `00-memoria.mjs`); `metricas.md`, apartados 2.1 y 3.1.
- **Entorno**: todos (medido en E1)
- **Fase propuesta**: 4, después de ordenar el arte en la fase 3
- **Origen**: registrado en el inventario de arte (tarea 5.1); agrupa C-CAT-04.

### H-009 · Un fallo al cargar o al pintar una página deja la web en blanco
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: todas las rutas. No hay ningún ErrorBoundary en `src/` (rutas diferidas en `src/App.jsx:24-31` y `:116-192`; arranque en `src/main.jsx:12-18`). Además, `src/preloadRecovery.js:10-11` llama a `preventDefault()` antes de mirar la marca. Cuando ya no va a recargar, Vite 8 resuelve el `import()` a `undefined` y `React.lazy` revienta.
- **Reproducción**: ver R-NAV-17 y R-ERR-12. Con el build, bloquear el trozo de una página diferida (`/assets/Legal-*` o `ChatComponent-*.js`), navegar a ella y repetir antes de 10 s.
- **Esperado**: una pantalla de error con salida (recargar o volver), no la app desmontada.
- **Observado**: la primera vez recarga sola y deja la marca `rocky-preload-reload=1`. Al volver a fallar, `#root` queda vacío y salta «TypeError: Cannot read properties of undefined (reading 'default')». Si se repite antes de 10 s, la página se queda en blanco sin recargar; sin bloqueo y pasados 10 s, carga bien. Cualquier error de render acaba igual: el del Curioso a 80 px (H-049) y un `rocky-spray` corrupto (H-140) también dejan la página en blanco.
- **Evidencia**: capturas `capturas-e1/estructura/R-NAV-17-escritorio.png` y `capturas-e1/transversales/C-TRANS-02-escritorio.png`. Un `grep` en `src/` no encuentra ningún ErrorBoundary, `componentDidCatch` ni `getDerivedStateFromError`. Captura en el repo: `capturas/fallo-h-009-r-nav-17-escritorio.webp`.
- **Entorno**: E1 (build de `dist/` servido por Express)
- **Fase propuesta**: 2
- **Origen**: C-EST-02, C-TRANS-02

### H-010 · El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: todas las rutas.
  - `src/styles/02-base.css:40-44`: `html { overflow-x: clip }`.
  - `src/hooks/useLockBodyScroll.js:6-16`, que usan `src/components/NavBar.jsx:148` y `src/features/catalog/Lightbox.jsx:12`.
  - `src/components/SplashIntro.jsx:48-54`, con su propio bloqueo.
  - Cada bloqueo restaura lo que vio al entrar: `SplashIntro.jsx:49-52` y `useLockBodyScroll.js:10-13`.
  - Al cerrar el menú, el foco vuelve al botón: `NavBar.jsx:138-141` y `:175-179`.
- **Reproducción**: ver R-NAV-01, R-NAV-04, R-NAV-07 y R-CAT-08.
  - Girar la rueda o deslizar el dedo durante la intro.
  - Deslizar con la hoja del menú abierta, y abrir la hoja después de bajar para cerrarla luego.
  - Girar la rueda o arrastrar el dedo con el lightbox abierto.
  - Abrir el menú con Tab durante la intro y cerrarlo cuando ya ha terminado.
- **Esperado**: mientras hay intro, menú o lightbox, el fondo no se mueve. Al cerrar, la página sigue donde estaba y la barra sigue pegada arriba.
- **Observado**: el `body` recibe `overflow: hidden`, pero quien desplaza es el viewport (`document.scrollingElement` es `HTML`). Con `overflow-x: clip` en `html`, el `overflow` del `body` ya no se propaga al viewport.
  - Bajo la intro, la página baja entre 259 y 900 px con la rueda (escritorio) y entre 385 y 574 px con el dedo (móvil).
  - Con la hoja del menú abierta, baja 335 px.
  - Con el lightbox, pasa de 1408 a 2108 (escritorio) y llega a 2933 en móvil con el dedo; en la ficha, de 0 a 697 y de 0 a 1068.
  - Mientras el `body` está en `hidden`, la barra sticky se pega al `body` y se va de pantalla. Si la hoja se abre después de bajar, la barra y «Cerrar el menú» quedan con `top` negativo, y al cerrar la página salta a `y=0`.
  - Si el menú se abre durante la intro y se cierra después, el `body` se queda en `hidden`, porque cada bloqueo restaura lo que vio al entrar. La barra deja de ser sticky: tras deslizar 571 px, queda en `top −571`.
  - Control: con `overflow: hidden` también en `<html>`, la rueda deja de mover la página.
- **Evidencia**: R-NAV-01 en FALLO en escritorio y móvil; R-NAV-07 y R-CAT-08 en FALLO. Capturas `capturas-e1/estructura/R-NAV-01-escritorio.png`, `R-NAV-01-movil.png`, `R-NAV-07-movil.png`, `R-NAV-07-movil-hoja-tras-scroll.png`, `NUEVO-1-menu-abierto-tras-scroll-movil.png` y `C-EST-05-movil.png`, y `capturas-e1/catalogo/R-CAT-08-escritorio.png` y `R-CAT-08-movil.png`; `scratchpad/e1/catalogo/00-scrolllock.mjs`. Captura en el repo: `capturas/fallo-h-010-nuevo-1-menu-abierto-tras-scroll-movil.webp`, `capturas/fallo-h-010-r-cat-08-movil.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: N-EST-1, N-EST-3, N-CAT-1, C-EST-05

### H-011 · Abrir la web desde un origen no listado la deja en blanco: la política de origen bloquea los recursos de la propia página
- **Categoría**: funcional (también seguridad observada)
- **Severidad**: importante (según N-TRANS-1, baja a menor si en E3 se comprueba que ningún host alternativo llega al origen sin redirigir antes a `PUBLIC_ORIGIN`: `www.`, la IP del servidor u otro dominio)
- **Ubicación**:
  - `server/http/middleware/origin-policy.mjs:4-12`, montada para toda la app en `server/app.mjs:101`.
  - `dist/index.html`: el JS de módulo y el CSS llevan `crossorigin`.
  - Las `@font-face` de `src/styles/` y de `server/http/access-gate.css:1-23`.
  - La puerta: `server/http/access-gate.mjs:227-230`.
- **Reproducción**: ver R-ERR-01, R-GATE-06 y R-SYS-08. Arrancar Express con `PUBLIC_ORIGIN` y `API_ALLOWED_ORIGINS` en `http://localhost:<puerto>` y abrir `http://127.0.0.1:<puerto>/product/rockyracing`. Con la puerta activa, enviar la clave correcta desde ese host.
- **Esperado**: los GET de los recursos de la propia página cargan y solo se rechazan las mutaciones de otro origen, como dice el comentario del código («Un Origin ausente pasa…») y como daba por hecho R-ERR-01. La puerta responde con su página.
- **Observado**: Chrome manda `Origin` al pedir el JS de módulo, el CSS con `crossorigin` y las fuentes.
  - La política responde 403 `application/json` `{"message":"Origen no permitido."}` a `/assets/index-*.js` y a las 3 woff2.
  - El CSS se rechaza por su tipo MIME y `#root` queda vacío, sin ningún mensaje.
  - Con la puerta activa, sus 3 fuentes también reciben 403. Al enviar la clave correcta se ve el JSON crudo y no se crea la cookie; el mensaje de marca «Esa entrada no vale.» solo sale sin cabecera `Origin`.
  - El 403 sale en documentos y assets sin `Cache-Control` ni `Vary: Origin`.
- **Evidencia**: capturas `capturas-e1/transversales/R-ERR-01-escritorio.png` y `R-ERR-01-movil.png` (en blanco), `R-GATE-06-escritorio-json-crudo.png` y `R-GATE-06-movil-json-crudo.png`. En la consola, «Refused to apply style … MIME type ('application/json')» y 4 × 403. La primera tanda de Lighthouse acabó en `NO_FCP` en las 60 pasadas por esta misma causa (`metricas.md`, apartado 2: con `curl`, un `Origin` ajeno da 403 y el permitido, 200). Captura en el repo: `capturas/fallo-h-011-r-err-01-escritorio.webp`, `capturas/fallo-h-011-r-gate-06-movil-json-crudo.webp`.
- **Entorno**: E1 (Express sirviendo `dist/`; Vite no aplica esta política). Si Cloudflare cachea el 403 depende de sus reglas: queda pendiente de E3 o del panel.
- **Fase propuesta**: 2
- **Origen**: N-TRANS-1, C-TRANS-01, C-TRANS-20

### H-012 · El canónico y `og:url` apuntan a la portada en todas las rutas
- **Categoría**: SEO
- **Severidad**: importante
- **Ubicación**: `index.html:13` (canonical) y `:21` (`og:url`), con el resto de `og:*` en `:14-33`. El fallback de `server/http/static.mjs:79-82` sirve ese documento en todas las rutas y nada en `src/` los cambia: solo se actualiza `document.title`.
- **Reproducción**: ver R-NAV-24, R-CAT-02, R-CAT-04 y R-SYS-05. Abrir por URL directa, o navegando, `/product/rockyracing`, `/products/costa-035`, `/menudrop`, `/legal/privacidad`, `/crew` y una ruta inexistente, y leer `link[rel=canonical]`, `og:url` y `og:title`.
- **Esperado**: cada página declara su propia URL canónica y sus datos para compartir.
- **Observado**: en todas, canonical y `og:url` valen `https://rocky035.com/` y `og:title` vale «ROCKY 035 — Tienda oficial», tanto en el HTML servido como en el DOM tras el render. Solo cambia el título («RockyRacing · ROCKY 035», «Privacidad · ROCKY 035»…).
- **Evidencia**: R-NAV-24, R-CAT-02, R-CAT-04 y R-SYS-05.
- **Entorno**: E1 (build y Vite)
- **Fase propuesta**: 4
- **Origen**: C-EST-11, C-CAT-02, C-TRANS-03

### H-013 · «Saltar al contenido» queda tapado por la barra
- **Categoría**: accesibilidad
- **Severidad**: importante
- **Ubicación**: todas las rutas. `src/styles/03-utilities.css:6` le da `z-index: 1000`, el mismo valor que `--z-nav` (`src/styles/00-tokens.css:158`, `src/styles/components/navbar.css:5`), y la barra va después en el DOM (`src/App.jsx:88-96`).
- **Reproducción**: ver R-NAV-12, R-NAV-13 y TECLADO-navbar. En `/`, pulsar Tab una vez.
- **Esperado**: el enlace enfocado se ve por encima de todo.
- **Observado**: el enlace se coloca en `top=8 left=8` con z-index 1000, igual que la barra (68/58 px de alto, fondo opaco al 92 %). `elementFromPoint` en sus esquinas y en su centro devuelve la barra o el logo. Solo se transparenta, montado sobre el logo e ilegible. Funciona (Enter lleva el foco a `<main>`), pero no se puede leer.
- **Evidencia**: capturas `capturas-e1/estructura/R-NAV-12-escritorio.png`, `R-NAV-12-movil.png`, `R-NAV-13-escritorio.png` y `TECLADO-navbar-escritorio.png`. Captura en el repo: `capturas/fallo-h-013-r-nav-12-escritorio.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-EST-01

### H-014 · La hoja del menú móvil no se puede cerrar desde dentro
- **Categoría**: accesibilidad
- **Severidad**: importante
- **Ubicación**: hasta 640 px de ancho. La trampa de foco está en `src/components/NavBar.jsx:166-196`, el botón «Cerrar el menú» en `:260-270` (en la barra, fuera de la hoja) y `aria-modal="true"` en `:279`.
- **Reproducción**: ver R-NAV-07 y TECLADO-menu-movil. A 375 px, abrir el menú y recorrer la hoja con Tab y Mayús+Tab.
- **Esperado**: un control para cerrar dentro del diálogo, al que se llegue con teclado y con lector de pantalla.
- **Observado**: la hoja es `role=dialog aria-modal=true` y contiene los 6 destinos y la bombilla. La trampa de foco da la vuelta sin pasar por «Cerrar el menú», que queda fuera del diálogo y, por `aria-modal`, oculto para los lectores. Solo se cierra con Escape o eligiendo un destino. Si se abre después de bajar, la barra con ese botón ni siquiera se ve (H-010).
- **Evidencia**: R-NAV-07, comprobado por DOM y teclado; no se ha probado con un lector de pantalla real.
- **Entorno**: E1, móvil
- **Fase propuesta**: 2
- **Origen**: C-EST-06

### H-015 · Al cambiar de ruta no se mueve el foco ni se anuncia la página nueva
- **Categoría**: accesibilidad
- **Severidad**: importante
- **Ubicación**: `src/App.jsx` y `src/components/ScrollToTop.jsx`: ninguno lleva el foco a `<main>` o al `h1` ni anuncia el cambio.
- **Reproducción**: ver R-NAV-05. Con el teclado, ir a Drops, Crew y Estudio desde la barra.
- **Esperado**: el foco va a `<main>` o al `h1` de la página nueva, o una región viva anuncia el cambio.
- **Observado**: el foco se queda en el enlace pulsado de la barra. La única región viva es el aviso del modo demo y ningún cambio de ruta la actualiza (0 anuncios); solo cambia `document.title`.
- **Evidencia**: R-NAV-05.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-08

### H-016 · El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece
- **Categoría**: accesibilidad
- **Severidad**: importante. Es la que se dio en E2 simulado a C-CART-14: cada cambio de cantidad devuelve al principio de la página a quien navega con teclado. El resto de casos se propusieron como menores.
- **Ubicación**: el mismo patrón en seis componentes.
  - Carrito: `src/features/cart/Cart.jsx:168`, `:178` y `:189`, y `src/features/cart/AddToCartButton.jsx:46`, también desde las tarjetas de Rocky IA.
  - Rocky IA, preguntas rápidas: `src/features/chat/ChatComponent.jsx:150` y `:169-182`.
  - Estudio: `src/features/studio/ranking/PublishBeat.jsx:50-62` y `:108`, y `src/features/studio/Barra.jsx:56-68` y `:102-112`.
  - Spray: `src/features/night/spray/Spray.jsx:351-409`.
  - Aviso de drop: `src/features/catalog/DropAviso.jsx:98`, `:104` y `:53-56`.
  - Mi Crew: `src/features/crew/CrewProfile.jsx:172-207` (`RewardCard`).
- **Reproducción**: con el teclado, en cada sitio.
  - Carrito: Enter en «+», Espacio en «−» y Enter en «×» (R-CART-14, R-CART-22, TECLADO-carrito), y Enter en «Añadir al carrito» de una tarjeta de Rocky IA (TECLADO-chat).
  - Rocky IA: Enter en una pregunta rápida (R-CHAT-04, TECLADO-rockyIA).
  - Estudio: «Publicar en el ranking», «Cerrar» o «Rocky IA, rapéame» (R-STU-13, TECLADO-publicar, TECLADO-barra).
  - Spray: «Coge el spray», y después ✕ o Escape (R-NIGHT-20, TECLADO-spray).
  - Aviso de drop: enviarlo con error y con éxito (TECLADO-aviso-error).
  - Mi Crew: «Equipar» o «Canjear» (TECLADO-mi-crew).
- **Esperado**: el foco pasa a un destino lógico (el control siguiente, el campo de texto, el primer campo del formulario o el panel que se abre) y el cambio se anuncia.
- **Observado**: en todos los casos `document.activeElement` acaba en `<body>`. Chrome conserva el punto de partida y el siguiente Tab suele seguir donde estaba, pero se pierden el foco visible y el anuncio. En el estudio, además, los atajos de los pads dejan de sonar (0 golpes). En Mi Crew, el siguiente Tab empieza desde arriba.
- **Evidencia**: capturas `capturas-e1/e2/R-CART-22-escritorio.png`, `TECLADO-chat-escritorio.png` y `TECLADO-mi-crew-escritorio.png`; `capturas-e1/transversales/TECLADO-aviso-error-escritorio.png`; `capturas-e1/noche-musica/TECLADO-spray-escritorio.png`; `capturas-e1/estudio/R-STU-13-escritorio.png`. Captura en el repo: `capturas/fallo-h-016-r-cart-22-escritorio.webp` (muestra el estado del carrito; la pérdida de foco se prueba con el texto de TECLADO-carrito en `ejecucion.md`, no con la imagen).
- **Entorno**: E1 (chat, estudio, spray y aviso) y E2 simulado (carrito, tarjetas de Rocky IA y Mi Crew), en escritorio. Las preguntas rápidas también se comprobaron en móvil.
- **Fase propuesta**: 2
- **Origen**: C-CART-14, C-CHAT-11, C-STU-12, C-NOCHE-21 (solo la parte del foco; la de las flechas está en H-114), N-TRANS-2, N-E2-4

### H-017 · La política de cookies no cuenta lo que se guarda ni el reproductor de Spotify, que se carga sin aviso y pone cookies de terceros
- **Categoría**: legal/privacidad
- **Severidad**: importante
- **Ubicación**:
  - La política está en `/legal/cookies` (`src/features/legal/Legal.jsx:163-166` y `:174-178`).
  - Lo que se guarda de verdad: claves de `src/config/storageKeys.js:5-12`; la intro va en `sessionStorage` (`src/App.jsx:67`).
  - El iframe de Spotify de `/estudio` está en `src/features/studio/Studio.jsx:126-134`, con la URL de `src/data/studio.js:11` y `loading="lazy"`.
- **Reproducción**: ver R-LEGAL-06. Ver la intro, abrir un cromo en `/crew`, tocar un pad en `/estudio`, pintar de noche y comparar el almacenamiento del navegador con la política. En `/estudio`, bajar hasta «Escúchalo en serio».
- **Esperado**: la política describe lo que se guarda y lo que cargan terceros. El contenido de terceros no se carga sin una acción del usuario (por ejemplo, una fachada «pulsa para cargar Spotify»); si se carga, se declara y, cuando pone cookies que no son técnicas, se pide consentimiento.
- **Observado**:
  - La política dice que no hay «rastreadores de terceros», y que por eso no hay banner. Del almacenamiento local solo nombra la intro, el aviso y el apodo.
  - En realidad `localStorage` guarda además `rocky-album-abiertos`, `rocky-mesa-beats` y `rocky-spray`, y `rocky-beats-admin` en el navegador de quien modera (no probado). La intro va en `sessionStorage`.
  - Al acercarse a la sección de Spotify, el navegador pide el iframe de `open.spotify.com` sin consentimiento previo: 0 peticiones externas sin hacer scroll y 1 al bajar.
  - Con la red real, ese iframe pone las cookies de terceros `sp_t` y `sp_landing`.
- **Evidencia**: R-LEGAL-06 en FALLO, captura `capturas-e1/estructura/R-LEGAL-06-escritorio.png`; prueba aparte en `/estudio`, en escritorio y móvil; Lighthouse de `/estudio`, con «Buenas prácticas» en 77 por `third-party-cookies` (`metricas.md`, apartado 2.1). Captura en el repo: `capturas/fallo-h-017-r-legal-06-escritorio.webp`.
- **Entorno**: E1 (en los recorridos la red externa estaba bloqueada) y Lighthouse en local con la red real
- **Fase propuesta**: 2
- **Origen**: N-EST-4, C-EST-16

### H-018 · El historial de Rocky IA se guarda 30 días en el servidor: la política dice que no, y el usuario no lo ve ni lo puede borrar
- **Categoría**: legal/privacidad
- **Severidad**: importante
- **Ubicación**: lo que dice la política, `src/features/legal/Legal.jsx:141`. Lo que hace el servidor, `server/services/chat/orchestrator.mjs:95-104`, `:222` y `:320-326`, con sesiones de 30 días (`server/services/sessions.mjs:6`). En el cliente, `src/features/chat/ChatComponent.jsx:35`.
- **Reproducción**: ver R-CHAT-07 y R-CHAT-20. Conversar cinco turnos y leer la sesión en el almacén; ir a `/crew`, volver a `/rockyIA` y seguir conversando.
- **Esperado**: que se cumpla lo que dice la política («Mensajes de Rocky IA: no se guardan en nuestro servidor una vez respondidos»), o que la política cuente lo que se guarda y haya una forma de ver o borrar ese historial.
- **Observado**:
  - El almacén cifrado guarda `chatHistory` en la sesión: 8 mensajes, del usuario y de Rocky, tras cinco turnos, en una sesión de 30 días.
  - El servidor reenvía esos mensajes a OpenRouter en los turnos siguientes.
  - En pantalla la conversación se pierde al salir de `/rockyIA` (0 turnos y otra vez la bienvenida), pero el modelo recibe 4 mensajes previos al volver y 6 tras recargar.
  - No hay botón para borrar. Solo borrar la cookie o iniciar sesión deja el historial a cero.
- **Evidencia**: R-CHAT-07 y R-CHAT-20, leyendo el fichero cifrado con la clave de la instancia de prueba; la parte del cliente también en E1 (`out/probe-chat-extra.json`).
- **Entorno**: E2 simulado (servidor real y OpenRouter simulado); la parte visible, también en E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-03, C-CHAT-10

### H-019 · En modo Shopify, un producto a la venta sin foto se esconde «bajo llave»
- **Categoría**: funcional
- **Severidad**: importante (según N-E2-1, baja a menor si se garantiza por proceso que todo producto publicado lleva foto; falta ver la tienda real)
- **Ubicación**: `/`, `/products/:category?` y `/menudrop`.
  - `src/features/storefront/normalize.js:41`: sin imagen, la foto pasa a ser `PLACEHOLDER_IMAGE`.
  - `src/features/catalog/ProductPage.jsx:29-46`: `groupByDrop` decide solo por la imagen.
  - `src/features/catalog/ProductPage.jsx:49-70`: `LockedDesigns` solo pinta nombres, el aviso y el calendario.
  - `src/features/catalog/MenuDrop.jsx:32` lo cuenta como «bajo llave» antes de mirar el precio (y `:41`, `:47` lo usan para el estado y el contador).
  - Por el mismo motivo, la rama `isPlaceholder` de las tarjetas (`ProductPage.jsx:201-240`) no se ejecuta nunca.
- **Reproducción**: ver R-CAT-13 y R-CART-10. Con productos que tengan precio, variantes y stock pero ninguna foto, abrir la portada y `/menudrop`.
- **Esperado**: un producto a la venta sale como tarjeta, con su precio y «Añadir al carrito» (estado `BUY`). «Sin revelar» queda para lo que aún no se vende.
- **Observado**:
  - En E2 simulado, los 5 productos sin foto (35 RED, 35 WHITE, DWAG, Danger y Flora Blue) van al bloque «ROCKY DROP 4 · sin revelar · 5 diseños bajo llave».
  - Ese bloque muestra sus nombres en texto, el formulario «¿Te avisamos cuando caiga?» y el calendario, sin botón de compra ni enlace a la ficha. Sin embargo, `/product/35-red` existe y permite añadirlo al carrito.
  - Con el BFF simulado en E1, «Mock 3» (30,00 €, colección ROCKY DROP 5) sale en «1 diseño bajo llave» y `/menudrop` marca ese drop como «Sin revelar», mientras su ficha enseña el precio.
  - En la rejilla no hay ninguna tarjeta con la foto deshabilitada.
- **Evidencia**: R-CAT-13 en escritorio y móvil, y R-CART-10; `scratchpad/e1/catalogo/06-candidatos.out`.
- **Entorno**: E2 simulado y E1 con BFF simulado
- **Fase propuesta**: 2
- **Origen**: N-E2-1, N-CAT-3, C-CAT-12

### H-020 · Los avisos de un mismo drop se reparten en listas distintas y el envío no los junta
- **Categoría**: operación
- **Severidad**: importante
- **Ubicación**: el bloque bajo llave guarda el aviso con el handle del drop, `rocky-drop-4` (`src/features/catalog/ProductPage.jsx:64`), y la ficha con el del producto (`src/features/catalog/ProductDetail.jsx:219`). El script de envío está en `scripts/enviar-avisos.mjs:3`, `:34-50`, `:58-69` (`findTitle`) y `:80-81`.
- **Reproducción**: ver R-DROP-04 y R-DROP-05. Apuntar el mismo email desde el bloque bajo llave y desde dos fichas. Leer el script: no se ejecutó, porque necesita `APP_ENCRYPTION_KEY` y el almacén real.
- **Esperado**: quien se apunta a un drop, desde donde sea, recibe un solo aviso cuando cae, y la lista del bloque se puede enviar con un título y un enlace válidos.
- **Observado**:
  - El mismo email queda en tres listas: `rocky-drop-4`, `rockyracing` y `35-red`. El log tiene tres líneas «Aviso de drop apuntado».
  - El script envía una lista por handle. Quien se apuntó en la ficha de un diseño bajo llave no recibe el envío del drop, y quien se apuntó en varias listas recibe varios correos.
  - Con la lista del bloque, `findTitle('rocky-drop-4')` no encuentra el producto y el script se para pidiendo `--titulo`.
  - Con `--titulo` y sin `--url`, el correo enlaza a `/product/rocky-drop-4`, que muestra «Producto no encontrado». El simulacro enseña el correo antes de enviarlo.
- **Evidencia**: R-DROP-05 (log); `scratchpad/e1/catalogo/06-candidatos.out` («NUEVO enviar-avisos»); lectura del script.
- **Entorno**: E1 y lectura del código del script
- **Fase propuesta**: 2
- **Origen**: C-CAT-07, N-CAT-4

### H-021 · La sesión no suelta un carrito que Shopify ya no devuelve
- **Categoría**: funcional
- **Severidad**: importante. Según C-CART-01, puede impedir la siguiente compra tras pagar; sería bloqueante si Shopify real deja de devolver los carritos ya pagados, y eso solo se puede comprobar en la tienda de desarrollo.
- **Ubicación**: `server/services/cart-operations.mjs:104-111` con `server/integrations/shopify/storefront.mjs:228`.
- **Reproducción**: ver R-ACC-08, R-CART-08 y R-CART-19. Con una sesión que tiene carrito, hacer que Shopify deje de conocerlo (en el doble, reiniciando el servidor y conservando el almacén cifrado). Después, abrir `/cart` y añadir un producto.
- **Esperado**: si Shopify no devuelve el carrito, la sesión lo descarta y crea uno nuevo al añadir.
- **Observado**: `GET /api/shopify/cart` responde 200 `{"cart":null,"warnings":[]}` y `/cart` dice «Tu carrito está vacío». Pero «Añadir al carrito» falla con 422 `{"message":"Shopify ha rechazado la operación.","code":"USER_ERROR"}` dos veces seguidas: la sesión conserva el `cartId` muerto hasta salir de la cuenta o que caduque la cookie.
- **Evidencia**: E2 simulado, en la fase de reinicio de la cuenta. El doble responde con `userErrors` INVALID «The specified cart does not exist.»; está por ver qué devuelve Shopify real para un carrito ya convertido en pedido.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-01

### H-022 · Cerrar sesión depende de Shopify: si falla, tampoco se cierra en local
- **Categoría**: seguridad observada (también funcional)
- **Severidad**: importante
- **Ubicación**: `server/http/routes/shopify/account.mjs:116-119`. `createLogoutUrl` pide el descubrimiento OpenID antes de borrar los tokens y la sesión.
- **Reproducción**: ver R-ACC-10. Con una sesión de cliente, reiniciar el servidor (el descubrimiento queda sin caché), cortar la salida a Shopify y llamar a `POST /api/shopify/account/logout`.
- **Esperado**: la sesión y los tokens locales se borran siempre. El cierre en Shopify es un paso aparte.
- **Observado**: responde 502 `{"message":"No se ha podido conectar con Shopify.","code":"NETWORK_ERROR"}` y el almacén sigue guardando el token y la sesión de cliente. Con red, el mismo cierre responde 200 con `logoutUrl`. En la interfaz, inyectando ese 502, sale un aviso `role=alert` en `/mi-crew`.
- **Evidencia**: R-ACC-10, paso 2, por API en escritorio y móvil, leyendo el fichero cifrado.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-02

### H-023 · Con el token de cliente revocado, la cuenta se queda sin forma de entrar ni de salir
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: `src/features/storefront/useStorefrontStatus.js:93-102` con `server/http/routes/shopify/account.mjs:102-105`. La barra manda a la vista previa (`src/components/NavBar.jsx:107-111`).
- **Reproducción**: ver R-ACC-08. Con una sesión de cliente cuyo token Shopify ya no acepta (en el doble, reiniciándolo), recargar y abrir `/mi-crew`.
- **Esperado**: la web detecta que la sesión de cliente ya no vale, la limpia y ofrece volver a entrar.
- **Observado**: `GET /api/shopify/account` responde 401 `{"message":"Shopify no ha aceptado la petición.","code":"UNAUTHENTICATED"}` en cada carga, con el aviso «…no se pudieron cargar la cuenta…». «Mi Crew» lleva a la vista previa, y `/mi-crew` no ofrece «Entrar en la Crew» ni «Salir de la cuenta» mientras la sesión guarde `customerTokenId`.
- **Evidencia**: R-ACC-08, paso 3, en escritorio y móvil.
- **Entorno**: E2 simulado. Con qué frecuencia caduca o se revoca el token en Shopify real está por ver.
- **Fase propuesta**: 2
- **Origen**: C-CART-05

### H-024 · Los errores del login de cliente acaban en JSON crudo, sin vuelta a la tienda
- **Categoría**: funcional
- **Severidad**: importante. Se propuso menor al leer el código y se subió en E2 simulado: cancelar el login es un camino normal y acaba en una página sin salida.
- **Ubicación**: `server/http/routes/shopify/account.mjs:17-28`, `:53-68` y `:70-95`.
- **Reproducción**: ver R-ACC-05, R-ACC-06 y R-ACC-01.
  - Repetir el callback o usar un `state` ajeno.
  - Llegar al callback sin la cookie.
  - Cancelar en Shopify (`error=access_denied`).
  - Pedir un `returnPath` no permitido.
  - En E1, abrir `/api/shopify/account/login?returnPath=%2Fmi-crew`.
- **Esperado**: una página de la tienda que explique el error y lleve de vuelta.
- **Observado**: el navegador enseña el JSON en crudo, sin ningún enlace en la página. Los errores son 400 `INVALID_STATE`, 401 `OAUTH_SESSION_EXPIRED`, 400 `INVALID_CALLBACK` y 400 `INVALID_RETURN_PATH`; en E1, 503 «Las cuentas de cliente no están configuradas.».
- **Evidencia**: R-ACC-05 y R-ACC-06 en E2 simulado; R-ACC-01, pasos 5 y 6, en E1.
- **Entorno**: E2 simulado y E1
- **Fase propuesta**: 2
- **Origen**: C-CART-06

### H-025 · Faltan pruebas del checkout, del cierre de sesión, de los errores del callback y de los contratos de avisos y del `.ics`
- **Categoría**: operación (pruebas)
- **Severidad**: importante. Hay contradicción: la pasada de E1 la propuso importante y la de E2 simulado, menor. Se mantiene importante porque quedan sin probar el rechazo por host del checkout, que es un control de seguridad, y el cierre de sesión, que tiene un fallo confirmado (H-022).
- **Ubicación**:
  - Sin pruebas: `POST /api/shopify/checkout` y su rechazo por host (`server/services/cart-operations.mjs:7-18` y `:131-138`); `POST /api/shopify/account/logout` (`server/http/routes/shopify/account.mjs:110-122`); las ramas de error del callback (`account.mjs:75-80`).
  - Con aserciones incompletas: `server/http/routes/avisos.test.mjs:70-79` y `:152-176`, y `server/http/routes/drop.test.mjs:33-41`.
- **Reproducción**:
  - `grep -rln --include=*.test.mjs "api/shopify/checkout" server` y buscar los códigos de error del callback en los tests.
  - `npx vitest run server/http/routes/avisos.test.mjs server/services/avisos.test.mjs server/http/routes/drop.test.mjs src/features/catalog/AddToCalendar.test.jsx shared/drop-calendar.test.mjs` y leer las aserciones.
- **Esperado**: pruebas que fijen esos caminos y los contratos visibles que no se pueden reproducir en el navegador (R-DROP-13 y R-DROP-03).
- **Observado**:
  - Checkout y cierre de sesión:
    - Ningún test manda `POST /api/shopify/checkout` ni `POST /api/shopify/account/logout`. Lo único que se prueba del cierre es el olvido de la caché (`customer-account.test.mjs:366`).
    - `OAUTH_SESSION_EXPIRED` e `INVALID_CALLBACK` no aparecen en ningún test, e `INVALID_STATE` solo a nivel de integración (`customer-account.test.mjs:182`).
    - `cart-operations.test.mjs` tiene un único caso, sobre añadir.
  - Avisos y `.ics` (5 ficheros, 21 tests en verde):
    - El test de la lista llena comprueba el 429 y `Retry-After: 3600`, pero no el texto «La lista está a reventar; inténtalo más tarde.».
    - El de producción sin almacén solo mira el `code`, no el mensaje.
    - El del `.ics` no comprueba `Cache-Control: no-cache` ni que sea `attachment`. Hoy todo eso se cumple: se comprobó montando el router.
- **Evidencia**: búsquedas en `7d2bf57` sin ejecutar nada (R-CHK-04, R-ACC-05, R-ACC-09); ejecución de esos 5 ficheros de tests (R-DROP-13, R-DROP-03). En E2 el rechazo por host no se pudo provocar, porque el doble siempre da `*.myshopify.com`.
- **Entorno**: código y tests
- **Fase propuesta**: 2
- **Origen**: C-CART-27, N-CAT-5

### H-026 · Rocky IA llama al modelo aunque luego vaya a responder con la frase fija de compra
- **Categoría**: funcional (los candidatos la clasificaron como rendimiento y coste; se pasa a funcional porque provoca errores 502 y agota el cupo del chat)
- **Severidad**: importante
- **Ubicación**: `server/services/chat/orchestrator.mjs:270-288` y `:309-310`. `buildVerifiedCommerceReply` sustituye la respuesta después de reservar cupo y de llamar al modelo.
- **Reproducción**: ver R-CHAT-08, R-CHAT-12, R-CHAT-14 y R-CHAT-17. Mandar un mensaje con intención de compra en cuatro situaciones: con el catálogo bien, con el catálogo caído, con el cupo global a 2 y con el modelo caído.
- **Esperado**: con intención de compra se responde la frase fija sin llamar a OpenRouter y sin gastar cupo.
- **Observado**: siempre se hace una llamada al modelo y luego se responde la frase fija. Con el cupo a 2, una compra y un saludo lo agotan; el cupo global es de 45 al día y lo comparte la barra. Con el modelo caído, «Ver camisetas disponibles» devuelve 502, aunque la frase fija no lo necesita.
- **Evidencia**: R-CHAT-08, R-CHAT-12, R-CHAT-14 y R-CHAT-17.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-05

### H-027 · Rocky IA contesta con los primeros productos del catálogo cuando la búsqueda se queda sin términos
- **Categoría**: funcional
- **Severidad**: importante. Hay contradicción: la pasada de E1 propuso importante para C-CHAT-06 y la de E2 simulado, menor. Se mantiene importante porque «¿Qué hay del DROP 4?» es uno de los botones rápidos de la propia interfaz, y en E2 los productos solo coincidieron con el DROP 4 porque 8 de los 10 del doble son de ese drop.
- **Ubicación**: `server/services/chat/commerce.mjs`.
  - `:5-43`, `:97-116` y `:240-244`: la búsqueda se queda sin términos («drop» es término de comercio y «4» solo tiene un carácter).
  - `:299-311`: el seguimiento se detecta con el historial, pero la búsqueda solo usa el mensaje actual.
- **Reproducción**: ver R-CHAT-08 y R-CHAT-10. Pulsar «¿Qué hay del DROP 4?». Por otro lado, decir «Enséñame la camiseta Danger» y después «¿Y cuánto cuesta?».
- **Esperado**: productos del DROP 4 en el primer caso, y el producto del que se hablaba en el segundo.
- **Observado**:
  - En E1, con el catálogo de vista previa y a nivel de función, «¿Qué hay del DROP 4?» devuelve Night Runner, Pit Crew 035 y Airwave: lo mismo que «Ver camisetas disponibles», y ninguno es del DROP 4.
  - También en E1, tras «Enséñame la Solar Club», «¿Y cuánto cuesta?» devuelve esos mismos tres productos.
  - En E2 simulado, de punta a punta, las dos preguntas devuelven rocky-racing, rockydz-boyz y 35-red (la segunda, después de la tarjeta de Danger): por orden de catálogo, no por drop.
  - Matiz: «¿Y cuánto cuesta?» ya tiene intención de compra sin historial, porque «cuesta» está en `COMMERCE_INTENT_TERMS` (`commerce.mjs:52`). La premisa de C-CHAT-07 era inexacta, pero el síntoma se confirma.
- **Evidencia**: `out/funciones-chat.json`; R-CHAT-08 y R-CHAT-10.
- **Entorno**: E1 (funciones) y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-06, C-CHAT-07

### H-028 · El «Marco Tinta Azul» se canjea y se equipa, pero no se ve
- **Categoría**: funcional
- **Severidad**: importante. Hay contradicción: E1 la propuso importante y E2 simulado, menor. Se mantiene importante porque se pagan 9 tickets por una recompensa que no cambia nada.
- **Ubicación**: `server/services/crew/rewards.mjs:115-123` vende `frame-blue-ink` por 9 tickets, pero `src/styles/pages/crew-profile.css:153` y `:437` solo tienen reglas para `frame-red-squiggle`.
- **Reproducción**: ver R-CREW-11 y R-CREW-12. En `/mi-crew`, canjear y equipar el «Marco Tinta Azul» y compararlo con el «Marco Trazo Rojo».
- **Esperado**: el carnet y la muestra enseñan un borde azul.
- **Observado**: con el marco azul equipado, el carnet tiene el mismo estilo que sin marco: borde de 2 px discontinuo en `rgb(26,26,26)` y sin sombra. El marco rojo sí pinta un borde doble rojo de 8 px.
- **Evidencia**: R-CREW-11 en el navegador; lectura de `crew-profile.css`; `arte.md`, apartado 4 (fila de Crew).
- **Entorno**: E2 simulado
- **Fase propuesta**: 2. Hace falta diseñar el marco, y eso se puede resolver junto con la fase 3.
- **Origen**: C-CHAT-16

### H-029 · Si falla el perfil Crew, `/mi-crew` se queda en la pantalla de carga sin salida
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: `src/features/crew/CrewProfile.jsx:277-284` con `src/features/crew/useCrewProfile.js:28-33`.
- **Reproducción**: ver R-CREW-16. Con una sesión de cliente, bloquear `GET /api/shopify/account/crew` y abrir `/mi-crew`.
- **Esperado**: un mensaje con reintento y las salidas de siempre: entrar o salir de la cuenta.
- **Observado**: se queda en la pantalla «035» con «No se ha podido conectar con la tienda.», sin botones ni enlaces. Ni desbloquear la petición ni ir a la tienda y volver lo arregla.
- **Evidencia**: capturas `capturas-e1/e2/R-CREW-16-escritorio.png` y `R-CREW-16-movil.png`. Captura en el repo: `capturas/fallo-h-029-r-crew-16-movil.webp`.
- **Entorno**: E2 simulado, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-CHAT-17

### H-030 · «Remezclar» carga el beat de la URL anterior
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: `src/features/studio/Studio.jsx:33-37`, `src/main.jsx:14` y `src/features/studio/BeatMachine.jsx:104`. `BrowserRouter` aplica la URL nueva dentro de `startTransition` (`node_modules/react-router/dist/development/lib/dom/lib.js:162-165`), mientras que `setMesaKey` es una actualización urgente. Por eso la mesa nueva se monta leyendo la URL vieja.
- **Reproducción**: ver R-STU-29. Editar la mesa, pulsar «Remezclar» en un beat del ranking y confirmar «¿Sustituir tu mesa?». Después, remezclar otro beat.
- **Esperado**: la mesa carga el beat elegido.
- **Observado**: la URL pasa a `?beat=…&bpm=133&swing=0.12&tono=la`, sin entrada nueva en el historial, y la mesa se vuelve a montar, pero sigue con lo de antes: 60 bpm, 24 % de swing y Do menor, y `localStorage` guarda bpm 60. Al remezclar otro beat (House: 77 bpm, 5 % y Mi menor), carga el anterior (133 bpm, 12 % y La menor). Siempre lee la URL previa.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-29-escritorio.png` y `R-STU-29-movil.png` (script `s03-ranking.mjs`). Captura en el repo: `capturas/fallo-h-030-r-stu-29-escritorio.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-STU-01

### H-031 · Los parámetros de un enlace de beat se quedan en la URL y pisan las ediciones al recargar
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: `src/features/studio/BeatMachine.jsx:59-68` y `src/features/studio/Studio.jsx:33-36`.
- **Reproducción**: ver R-STU-16, R-STU-17 y R-STU-29. Abrir `/estudio?beat=House&bpm=124`, cambiar el patrón y el tempo, y recargar.
- **Esperado**: lo que se edita después de cargar el enlace se conserva al recargar, porque la URL deja de mandar o se actualiza.
- **Observado**: `beat`, `bpm`, `swing` y `tono` siguen en `location.search` y ganan a lo guardado en `localStorage`. Tras «Sorpréndeme» y tempo 60 (guardado con bpm 60), al recargar vuelve House a 124. Con la URL de una remezcla, una celda encendida vuelve a apagarse al recargar.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-17-escritorio.png` y `R-STU-17-movil.png`. Captura en el repo: `capturas/fallo-h-031-r-stu-17-escritorio.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-STU-02

### H-032 · Un beat del ranking sigue sonando sin botón para pararlo cuando su fila desaparece
- **Categoría**: funcional
- **Severidad**: importante
- **Ubicación**: `src/features/studio/ranking/useRankingPlayer.js:62-63` y `src/features/studio/ranking/Ranking.jsx:81-82` y `:182-203`.
- **Reproducción**: ver R-STU-25 y R-STU-30. Reproducir un beat del ranking y ocultarlo con el tercer reporte, o pulsar «Quitar» como moderador mientras suena.
- **Esperado**: el beat se para al desaparecer la fila, o queda un control para pararlo.
- **Observado**: la fila desaparece y el secuenciador sigue programando sonidos (62 voces en 2,5 s; 55 en 2 s al quitarlo como moderador), sin ningún botón con `aria-pressed=true`. Solo se calla al arrancar la mesa o la radio, o al salir de `/estudio`. El candidato también lo esperaba al cambiar de pestaña o al publicar, pero con 30 beats o menos no se reprodujo; no se probó con más.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-25-escritorio.png`, `R-STU-25-movil.png` y `R-STU-30-escritorio.png`. Captura en el repo: `capturas/fallo-h-032-r-stu-25-escritorio.webp`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-03

### H-033 · Una sola persona puede ocultar cualquier beat o inflar los «me mola» borrando la cookie
- **Categoría**: seguridad observada
- **Severidad**: importante
- **Ubicación**: `server/http/routes/beats.mjs:130` y `:144`; `server/services/beats.mjs:28`, `:170-173`, `:202-203` y `:216-217`. Los votos, los reportes y el tope diario van por sesión, y `sessions.open` crea una sesión nueva en cada petición sin cookie.
- **Reproducción**: ver R-STU-20, R-STU-21, R-STU-27 y R-STU-28. Hacer tres `POST /api/beats/:id/report` sin cookie y con el `Origin` de la web. Borrar la cookie y repetir un «me mola», o una publicación después de llegar al tope.
- **Esperado**: un reporte y un voto por persona, que no se reinicien al borrar la cookie.
- **Observado**: los tres reportes devuelven `hidden` false, false y true: el beat queda oculto. Al borrar la cookie, el «me mola» vuelve a sumar (de 0 a 1) y el tope diario de 10 publicaciones se reinicia (201 después del 429). Solo frena el límite por IP: 60 votos o 6 publicaciones cada 10 minutos.
- **Evidencia**: R-STU-20, R-STU-21 y R-STU-27; capturas `capturas-e1/estudio/R-STU-20-escritorio.png`, `R-STU-20-movil.png`, `R-STU-27-escritorio.png` y `R-STU-27-movil.png`. Captura en el repo: `capturas/fallo-h-033-r-stu-20-escritorio.webp`.
- **Entorno**: E1 (peticiones desde Node, como con `curl`)
- **Fase propuesta**: 2
- **Origen**: C-STU-07

### H-034 · En escritorio, el paso 16 del secuenciador no cabe
- **Categoría**: funcional (maquetación)
- **Severidad**: importante (según N-STU-1, baja a menor si se acepta el desplazamiento horizontal en escritorio)
- **Ubicación**: `/estudio`. En `src/styles/components/beat-machine.css:7-10` están `--celda: clamp(22px, 2.9vw, 32px)`, `--hueco-celda: 6px` y `--cabeza: 200px`, y en `:360-364` `.seq-scroll { overflow-x: auto }`. El ancho de la mesa lo limita `.page-container` (`src/styles/03-utilities.css:85`).
- **Reproducción**: ver R-STU-01 y R-STU-05. Abrir `/estudio` a 1440 × 900 o a 1200 px y mirar la rejilla.
- **Esperado**: en escritorio se ven las 16 celdas de cada pista. Las fichas solo prevén el desplazamiento horizontal a 640 px o menos.
- **Observado**: `.seq-scroll` mide 814 px de `scrollWidth` frente a 780 px de `clientWidth`, y el «paso 16» sobresale 34 px. La regla de pasos queda cortada en la última columna y el cabezal desaparece en ese paso. A 1024 px cabe justo; a partir de unos 1030 px, ya no.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-01-escritorio.png` y `R-STU-29-escritorio.png`. Medidas a 1440 y a 1200 px: `{"sw":814,"cw":780,"lastRight":1144,"sRight":1110}`; a 1024 px: `{"sw":780,"cw":780}`. `arte.md`, apartado 4 (fila del estudio). Captura en el repo: `capturas/fallo-h-034-r-stu-01-escritorio.webp`.
- **Entorno**: E1, Chrome a 1440 × 900. En modo headless no se ven las barras de desplazamiento; en un Chrome normal se vería la barra fina de `.seq-scroll`.
- **Fase propuesta**: 2
- **Origen**: N-STU-1

### H-035 · Al apagar el descontrol con MODO NEÓN sonando, la radio se calla pero la interfaz sigue «sonando»
- **Categoría**: funcional (también accesibilidad: se anuncia un estado falso)
- **Severidad**: importante
- **Ubicación**: `src/features/music/MusicContext.jsx`.
  - `:109-122` y `:115-117`: `setNightTape` llama a `audio.pause()` y, sin esperar, cambia el `src` y llama a `audio.load()`.
  - `:197`: `onPause` es lo único que pone `playing` a falso.
  - `:57-66`: `data-groove` y `--bpm`.
- **Reproducción**: ver R-MUS-05 (caso a), R-NIGHT-02 y R-NIGHT-03. Cargar `/` sin tocar la radio, pulsar «Activar el descontrol» (suena MODO NEÓN) y, sin pausar, pulsar «Apagar el descontrol».
- **Esperado**: vuelve BARRO, callada, con la píldora en «Reproducir BARRO» y sin `data-groove`. Tampoco se descarga audio que no va a sonar (`preload="none"`).
- **Observado**:
  - El `<audio>` queda en pausa con `/music/barro.m4a`, pero la píldora dice «Pausar BARRO» y conserva `is-playing`.
  - `body` mantiene `data-groove="1"` y `--bpm: 77`, así que los muñecos siguen cabeceando sin música.
  - Al pulsar «Pausar BARRO», BARRO empieza a sonar desde 0:00.
  - No pasa si se pausa MODO NEÓN antes de apagar.
  - Además, cada apagado pide `/music/barro.m4a` con `Range: bytes=0-` y cancela la descarga tras 131–134 KB.
  - Causa probable: `load()` descarta el evento `pause` que había quedado en cola, y `onPause` no llega.
- **Evidencia**: R-MUS-05 en los dos viewports. CDP Network: «206 … net::ERR_ABORTED», con 134 122 B en escritorio y 131 072 B en móvil, y el mismo corte en R-NIGHT-02, R-NIGHT-03 y R-NIGHT-08. Capturas `capturas-e1/noche-musica/R-MUS-05-escritorio.png`, `R-MUS-05-movil.png`, `R-NIGHT-02-movil.png`, `R-NIGHT-03-escritorio.png` y `R-NIGHT-03-movil-radio.png`. Captura en el repo: `capturas/fallo-h-035-r-night-03-escritorio.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: N-NOCHE-2, N-NOCHE-5

### H-036 · Bajo la oscuridad del modo noche, el texto secundario no llega al contraste mínimo
- **Categoría**: accesibilidad (contraste)
- **Severidad**: importante
- **Ubicación**: todas las rutas de noche. El comentario de `src/styles/components/descontrol.css:159-174` promete más de 4,5:1, y la capa de oscuridad está en `:25-47`. Los colores de noche están en `src/styles/00-tokens.css:228-283`.
- **Reproducción**: ver R-NIGHT-07 y R-NIGHT-23. Activar el descontrol, bajar hasta el final de una página y medir el contraste del texto en `--muted` fuera del haz de la linterna. En táctil, sin mover la linterna.
- **Esperado**: al menos 4,5:1 para el texto normal, como promete el comentario.
- **Observado**: fuera del haz, la oscuridad es negro con una opacidad de 0,08 + 0,34 × profundidad (0,114 arriba y 0,42 abajo del todo).
  - `--muted` (#9d97c4) sobre `--card` (#171129) da 6,67:1 sin oscuridad, 5,78 arriba de la página, 4,15 a media página y 2,86 abajo del todo. Sobre `--paper` llega a 2,96.
  - Baja de 4,5:1 a partir de una profundidad de 0,39 (sobre `--card`) y de 0,46 (sobre `--paper`). `--ink` sobre `--card` se queda en 5,81.
  - Abajo del todo, el 70 % del viewport en escritorio y el 82 % en móvil (con la linterna quieta) está a oscuridad máxima.
  - Afecta, entre otros, a «28 diseños», «ROCKY DROP 4 · sin revelar», los subtítulos de `/crew` y `/estudio`, «Sonando: MODO NEÓN», los tiempos de la radio, el texto del 404 y el pie legal.
- **Evidencia**: colores computados en R-NIGHT-23; capturas `capturas-e1/noche-musica/R-NIGHT-23-escritorio.png` y `R-NIGHT-23-movil.png`. Captura en el repo: `capturas/fallo-h-036-r-night-23-movil.webp`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 3
- **Origen**: C-NOCHE-08

### H-037 · Si la versión de API de un webhook no coincide exactamente, se rechaza y los créditos Crew no llegan
- **Categoría**: operación
- **Severidad**: importante
- **Ubicación**: `server/services/webhook-deliveries.mjs:34-39`, frente a `SHOPIFY_API_VERSION` (por defecto `2026-07`, `server/config/shopify.mjs:27`).
- **Reproducción**: por código y por el test «rejects an invalid signature, shop, topic, or API version», que pasa. Ver R-HOOK-01 y R-HOOK-03. No se puede lanzar desde el navegador: la capacidad de webhooks exige el secreto de Shopify.
- **Esperado**: un cambio de versión en la app de Shopify no corta la entrada de pedidos, o al menos avisa.
- **Observado**: el código exige `input.apiVersion === config.apiVersion`. Cualquier entrega con otra versión, también `orders/paid`, recibe 409 `API_VERSION_MISMATCH`.
- **Evidencia**: lectura de `webhook-deliveries.mjs` y el test en verde.
- **Entorno**: código y tests
- **Fase propuesta**: 2
- **Origen**: C-TRANS-04

### H-038 · La web usa dos nombres de marca: «ROCKY 35» y «ROCKY 035»
- **Categoría**: arte
- **Severidad**: importante
- **Ubicación**:
  - Dicen «ROCKY 35»: el logotipo de la barra (`src/images/Rockypng.png`, usado en `src/components/NavBar.jsx`) y la marquesina, «ロッキー・スリーファイブ» («Rocky three-five»).
  - Dicen «ROCKY 035»: el rótulo, el pie, el `<title>` y el dominio.
  - Las fotos de producto mezclan los prefijos `rocky35-` y `rocky-` (H-005).
- **Reproducción**: abrir cualquier pantalla y comparar el logotipo con el rótulo; ver la marquesina en `/cart` y en el 404.
- **Esperado**: un solo nombre de marca en toda la web. Hace falta una decisión de marca antes de la fase 3.
- **Observado**: el logotipo dice «ROCKY 35» y la marquesina «ロッキー・スリーファイブ»; el resto, «ROCKY 035».
- **Evidencia**: `capturas/arte-portada-dia.webp` (logotipo); `capturas/arte-carrito-dia.webp` y `capturas/arte-404-dia.webp` (marquesina); `arte.md`, apartado 4.
- **Entorno**: E1 (capturas de arte)
- **Fase propuesta**: 3
- **Origen**: N-ARTE-1

### H-169 · La animación del pie pesa 650 kB y se descarga en todas las páginas con pie
- **Categoría**: rendimiento
- **Severidad**: importante
- **Ubicación**: `src/images/optimized/characters/lata-spray-walk-seedance-224.webp` (pie: todas las rutas salvo `/rockyIA`, que no pinta el pie, `src/App.jsx:60` y `:194`)
- **Reproducción**: abrir cualquier página con la caché vacía y mirar las imágenes descargadas (Lighthouse `network-requests` o DevTools).
- **Esperado**: el arte decorativo común no domina el peso de cada página y se carga cuando se va a ver.
- **Observado**: es la imagen más pesada en 9 de las 10 páginas medidas (≈649 kB transferidos, 166 × 224 px, 81 fotogramas). Junto con `sentado-860.webp` (≈101 kB), pone un suelo de ≈1,1 MB de imágenes incluso en `/legal/privacidad` y el 404.
- **Evidencia**: `metricas.md`, apartados 2.1 y 3.1; inventario de `arte.md`.
- **Entorno**: E1 (build de producción servido en local)
- **Fase propuesta**: 4 (después de decidir en la fase 3 qué animaciones se quedan)
- **Origen**: métricas (tareas 6.2 y 6.3)

### H-170 · El pie se desplaza al cargar: CLS de 0,2 a 0,5 en cinco páginas
- **Categoría**: rendimiento
- **Severidad**: importante
- **Ubicación**: `<footer class="footer">` (todas las rutas salvo `/rockyIA`, que no pinta el pie); en `/estudio`, además, los muñecos del splash (`img.splash-muneco.neon-art`)
- **Reproducción**: Lighthouse móvil o escritorio sobre `/estudio`, `/crew`, `/legal/privacidad`, `/product/rockydz-boyz` y `/menudrop` (auditorías `layout-shifts` y `cls-culprits-insight`).
- **Esperado**: CLS ≤ 0,1.
- **Observado**: CLS móvil/escritorio de 0,45/0,52 (estudio), 0,39/0,44 (Crew), 0,39/0,43 (legal), 0,39/0,15 (ficha) y 0,23/0,22 (menú drop). El elemento desplazado es el pie: el contenido de encima cambia de alto después de pintarse (carga diferida de la ruta e imágenes). Lighthouse también marca `unsized-images` en el perro del 404 y en `dormido-esperando` (Crew).
- **Evidencia**: `metricas.md`, apartado 2.1.
- **Entorno**: E1 (build de producción servido en local)
- **Fase propuesta**: 4
- **Origen**: métricas (tareas 6.2 y 6.3)

### H-171 · LCP de 5 a 10 s en móvil
- **Categoría**: rendimiento
- **Severidad**: importante
- **Ubicación**: `dist/index.html` (JS y CSS comunes que bloquean el render: `index-*.js` 336,79 kB y `index-*.css` 66,40 kB); ilustración `sentado-860.webp` con `loading="lazy"` como elemento LCP en `/estudio`, `/crew` y `/menudrop`; foto de 5906 px como LCP de la ficha.
- **Reproducción**: Lighthouse móvil (limitación simulada) sobre las 10 páginas de `metricas.md`.
- **Esperado**: LCP ≤ 2,5 s en móvil.
- **Observado**: LCP móvil entre 5,18 s (`/rockyIA`) y 10,58 s (`/products`); FCP de 3 s en todas. Fallan `render-blocking-insight`, `unused-javascript`, `lcp-discovery-insight` (LCP con carga diferida) e `image-delivery-insight`. Rendimiento móvil de 50 a 75.
- **Evidencia**: `metricas.md`, apartado 2.1; tamaños del build en el apartado 1.
- **Entorno**: E1 (build de producción servido en local, sin Cloudflare)
- **Fase propuesta**: 4
- **Origen**: métricas (tareas 6.2 y 6.3)

### H-172 · Contraste insuficiente en las etiquetas «Próximamente» y en los rótulos pequeños grises
- **Categoría**: accesibilidad
- **Severidad**: importante
- **Ubicación**: `p.badge.badge--dashed` (rojo `--accent: #e63946` sobre `#fffdf8`); `span.kicker.drops-link-meta`, `p.kicker.product-locked-kicker`, `p.product-locked-names` y enlaces del pie (gris `#7c7668` sobre `#fffdf8`)
- **Reproducción**: Lighthouse, auditoría `color-contrast`, en portada, listado, ficha, menú drop, legal y Crew.
- **Esperado**: contraste ≥ 4,5:1 para texto normal (WCAG 1.4.3).
- **Observado**: 4,1:1 en las etiquetas «Próximamente» (36 apariciones en las pasadas) y 4,44:1 en los rótulos grises (de 8,6 a 11 pt). Afecta a tokens globales, así que se arregla en `00-tokens.css`.
- **Evidencia**: `metricas.md`, apartado 2.1 (auditoría `color-contrast`).
- **Entorno**: E1
- **Fase propuesta**: 3
- **Origen**: métricas (tareas 6.2 y 6.3)

### H-174 · La API de avisos revela si un email ya está apuntado
- **Categoría**: legal/privacidad
- **Severidad**: importante (expone un riesgo de privacidad: permite comprobar si un email ajeno está en una lista)
- **Ubicación**: `POST /api/avisos`, `server/http/routes/avisos.mjs:60` (`duplicate: result.status === 'duplicate'`); mensaje «Ya estabas en la lista: sin dobles.» en `src/features/catalog/DropAviso.jsx:78`
- **Reproducción**: ver R-DROP-09. Apuntar un email a un drop y repetir la petición con el mismo email desde un script con la cabecera `Origin` de la web.
- **Esperado**: la respuesta es idéntica tanto si el email ya estaba como si no; el «ya estabas» solo sale del recibo local del navegador que se apuntó.
- **Observado**: la segunda petición devuelve `{"ok":true,"duplicate":true,…}` y la web dice «Ya estabas en la lista». Solo lo frena el límite de 6 altas por IP cada 10 minutos.
- **Evidencia**: R-DROP-09 en `ejecucion.md` (E1, escritorio y móvil); código citado. Detectado por la revisión independiente de la auditoría.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: revisión independiente (tarea 8.2), sin candidato previo

## Menores

### H-004 · Hay pósters duplicados con distinto número
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**: `posters/img/` y `posters/miniaturas/`
- **Reproducción**: comparar los SHA-1 (columna «Duplicado de» de `arte.md`).
- **Esperado**: un fichero por póster.
- **Observado**: hay cinco pares idénticos en `img/`, y los mismos cinco en `miniaturas/`: `02`/`03-el-drop-4-existe`, `03`/`06-el-album-de-la-crew`, `04`/`07-faltan-tres-cromos`, `05`/`10-tu-sitio-en-la-colmena` y `06`/`12-la-colmena-ya-suena`.
- **Evidencia**: `arte.md`, apartado 2.
- **Entorno**: código (repositorio)
- **Fase propuesta**: 3, sin borrar nada de `posters/` sin acuerdo previo, como dice `CLAUDE.md`.
- **Origen**: registrado en el inventario de arte (tarea 5.2); no agrupa candidatos.

### H-005 · El arte no tiene una convención de nombres escrita
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**: `src/images/` y `public/products/`
- **Reproducción**: listar `src/images/optimized/` y `public/products/`.
- **Esperado**: una convención documentada y aplicada: kebab-case, sufijo de ancho para las variantes y un prefijo único para los productos.
- **Observado**: `src/images/Rockypng.png` rompe el kebab-case. En `src/images/optimized/`, 40 de los 76 ficheros no llevan sufijo de ancho y los demás usan 12 anchos distintos. Las fotos de producto mezclan los prefijos `rocky-`, `rocky35-` y `rockydz-` (relacionado con el nombre de marca, H-038).
- **Evidencia**: `arte.md`, apartado 2.
- **Entorno**: código (repositorio)
- **Fase propuesta**: 3
- **Origen**: registrado en el inventario de arte (tarea 5.2); no agrupa candidatos.

### H-006 · `.env.example` no documenta nueve variables que el servidor lee
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `.env.example`, frente a las lecturas de `server/` y `scripts/`
- **Reproducción**: `grep -rhoE "env\.[A-Z][A-Z0-9_]+" server scripts --include=*.mjs | grep -v test | sort -u` y compararlo con las claves de `.env.example`.
- **Esperado**: `.env.example` lista todas las variables, como pide la regla de documentación viva de `docs/README.md`.
- **Observado**: faltan `RESEND_API_KEY`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `BEATS_ADMIN_TOKEN`, `BEATS_PUBLISH_RATE_LIMIT_MAX`, `BEATS_VOTE_RATE_LIMIT_MAX`, `BEATS_RATE_LIMIT_WINDOW_MS`, `AVISOS_FROM`, `AVISOS_REPLY_TO` y `AVISOS_BATCH_SIZE`. Quien monte un entorno nuevo no sabe que existen, y entre ellas está la que activa el envío real de los correos de avisos. Tampoco dice cuál es el máximo de los límites numéricos (H-103).
- **Evidencia**: el comando anterior, ejecutado el 2026-11-08.
- **Entorno**: código (repositorio)
- **Fase propuesta**: 2
- **Origen**: registrado al revisar la configuración (tarea 1); no agrupa candidatos.

### H-039 · `preloadRecovery.js` lee `sessionStorage` sin protegerse de un almacenamiento bloqueado
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/preloadRecovery.js:8`, `:21` y `:29`, llamado desde `src/main.jsx:20`. `src/utils/storage.js:1-11` sí contempla el almacenamiento bloqueado.
- **Reproducción**: ver R-NAV-03, paso 5. Abrir la web en Chrome con las cookies y los datos del sitio bloqueados.
- **Esperado**: ningún error sin capturar con el almacenamiento bloqueado.
- **Observado**: cada carga lanza «SecurityError: Failed to read the 'sessionStorage' property from 'Window': Access is denied for this document» desde `clearPreloadRecoveryGuardAfterBoot`. La app se pinta igual, porque el error llega después de `root.render`, y la intro sale en cada carga. Pero la recuperación de `vite:preloadError` lanzaría el mismo error.
- **Evidencia**: R-NAV-03 en escritorio y móvil, con un perfil de Chrome con `default_content_setting_values.cookies=2`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-03

### H-040 · La intro no se puede saltar y la tienda de debajo sigue recibiendo el foco
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/components/SplashIntro.jsx:57` y `src/App.jsx:86-107`. La tienda está montada debajo de la capa, sin `inert` ni `aria-hidden`.
- **Reproducción**: ver R-NAV-04 y TECLADO-intro. En una pestaña nueva, pulsar Tab y Enter durante los 3 s de la intro, y probar Escape.
- **Esperado**: la intro deja inerte lo de debajo o se puede saltar.
- **Observado**: cuatro pulsaciones de Tab enfocan «Saltar al contenido», «Inicio», «Tienda» y «Drops», tapados por la capa (z-index 3000). Enter navega a `/menudrop` por debajo de la intro. Escape no la cierra y la capa no tiene ningún botón.
- **Evidencia**: captura `capturas-e1/estructura/TECLADO-intro-escritorio.png`.
- **Entorno**: E1, escritorio
- **Fase propuesta**: 2
- **Origen**: C-EST-04

### H-041 · `ScrollToTop` decide por el tipo de navegación: no sube en el segundo clic y sí sube al remezclar
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/components/ScrollToTop.jsx:10-13`, que depende de `[pathname, navigationType]` y solo se salta `POP`. React Router navega con `replace` cuando el destino es la ruta actual (`node_modules/react-router/dist/development/lib/dom/lib.js:628`). La remezcla hace `setSearchParams(…, { replace: true })` y después `scrollIntoView` (`src/features/studio/Studio.jsx:33-38`).
- **Reproducción**: ver R-NAV-20: en `/`, bajar y pulsar «Tienda» o el logo dos veces seguidas. Ver R-STU-29: abrir `/estudio`, bajar hasta el ranking, pulsar «Remezclar» y confirmar.
- **Esperado**: cada clic en el enlace de la página actual sube arriba, y la remezcla baja suavemente hasta la mesa.
- **Observado**:
  - El primer clic sube (y=0) y el segundo, seguido, no: la página se queda en 1500, y con un tercero desde 2300, en 2300. Pasa en escritorio y móvil.
  - En la primera remezcla, la navegación pasa de `POP` a `REPLACE`, `ScrollToTop` hace `scrollTo(0, 0)` y gana al desplazamiento suave. `scrollY` va de 3227 a 0, y la mesa queda a 1231 px del borde (1019 px en móvil).
  - En la segunda remezcla sí baja a la mesa.
  - Hoy lo tapa H-030.
- **Evidencia**: R-NAV-20; `resultados-e1/estudio.tsv`, línea R-STU-29 («scroll 3227→0 px»); capturas `capturas-e1/estudio/R-STU-29-escritorio.png` y `R-STU-29-movil.png`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-EST-07, N-STU-2

### H-042 · La carga de una página diferida no se indica ni se anuncia
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/App.jsx:117-122` pinta «Cargando...» sin `role="status"` ni `aria-live`, y la diana lleva `aria-hidden`. `BrowserRouter` navega dentro de `startTransition` (`node_modules/react-router/dist/development/lib/dom/lib.js:162-165`), y `src/App.jsx` no lee ningún estado pendiente.
- **Reproducción**: ver R-NAV-16. Con el trozo de Studio retrasado (o el de Cart, ChatComponent, Crew o ProductDetail), navegar desde la barra. Abrir `/crew` directamente con su módulo retrasado.
- **Esperado**: una señal visible y anunciada mientras llega la página.
- **Observado**: a los 400 ms la URL ya es `/estudio`, pero sigue la portada, el enlace activo sigue en «Tienda» y el título en «ROCKY 035», sin «Cargando...» ni `aria-busy`, hasta unos 2,6 s. Pasa lo mismo en `/cart`, `/rockyIA` y `/crew`, y al pulsar «Detalles». En una carga directa sí sale «Cargando...», pero sin rol ni región viva, así que no llega a los lectores.
- **Evidencia**: R-NAV-16; `scratchpad/e1/carrito-chat/out/probe-loading.json`; correcciones de R-CAT-04, R-CART-02 y R-CHAT-01 en `ejecucion.md`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-EST-09, C-EST-10

### H-043 · Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde
- **Categoría**: SEO
- **Severidad**: menor
- **Ubicación**:
  - En el servidor, `server/http/static.mjs:61-82`: solo `/assets` y `/products` cortan los ficheros inexistentes, y el fallback responde `index.html` con 200.
  - En el cliente, `src/components/NotFound.jsx:31-77` no fija título ni `noindex`.
  - Las páginas de producto y de categoría inexistentes: `src/features/catalog/ProductDetail.jsx:85-92` y `src/features/catalog/ProductPage.jsx:94-95` y `:97-117`.
- **Reproducción**: ver R-404-01, R-404-04, R-CAT-03, R-CAT-07, R-SYS-05 y R-SYS-06. Pedir `/loquesea`, `/legal/loquesea`, `/product/no-existe`, `/products/no-existe`, `/music/no-existe.m4a` y `/sitemap.xml`.
- **Esperado**: 404, o al menos `noindex`, y un título de página no encontrada.
- **Observado**: todas responden 200 `text/html` con la SPA, sin meta robots ni `X-Robots-Tag` y con el canónico de la portada (H-012). En el 404 el título se queda en «ROCKY 035». En una categoría inexistente el título es el slug crudo («no-existe · ROCKY 035», «Rocky-Drop-4 · ROCKY 035»), aunque el h1 dice «Nada por aquí». En cambio, `/assets/noexiste.js` da 404 y `/api/loquesea` da su 404 en JSON.
- **Evidencia**: R-404-04 (cabeceras del build y de Vite), R-CAT-03, R-CAT-07, R-SYS-05 y R-SYS-06.
- **Entorno**: E1 (build y Vite), escritorio y móvil
- **Fase propuesta**: 4
- **Origen**: C-EST-12, C-CAT-03, C-CAT-18, C-TRANS-13

### H-044 · En el 404 a oscuras en móvil, «Salir de aquí» puede quedar cortado fuera de la pantalla
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: la ruta `*` a 375 px. `src/components/NotFound.jsx:12-14` sortea la posición horizontal entre el 10 % y el 76 %, y `src/styles/pages/not-found.css:66-71` usa `position: fixed; left: var(--sx); white-space: nowrap`.
- **Reproducción**: ver R-404-02 y R-NIGHT-10. A 375 × 812, activar el descontrol y abrir una ruta inexistente varias veces.
- **Esperado**: el enlace cabe siempre en la pantalla; la posición aleatoria tendría que descontar su ancho.
- **Observado**: el enlace mide 146 px y se sale por la derecha cuando `--sx` pasa del 61 %, alrededor del 23 % del rango posible.
  - Con x = 75,3 % ocupa de 283 a 429 px y se lee «Salir de aq».
  - La parte visible se puede pulsar, y la barra sigue sirviendo de salida.
  - En escritorio haría falta x > 89,9 %.
  - Las tandas aleatorias dieron frecuencias distintas: 0 de 6 cargas en la comprobación de C-EST-14, 2 de 6 en R-404-02 (`ejecucion.md`), y 4 de 6 y 1 de 7 en las de N-NOCHE-3.
- **Evidencia**: capturas `capturas-e1/estructura/R-404-02-movil-salida-cortada.png`, `capturas-e1/noche-musica/NUEVO-3-movil.png` y `R-NIGHT-10-movil.png`.
- **Entorno**: E1, móvil emulado
- **Fase propuesta**: 2
- **Origen**: C-EST-14, N-NOCHE-3

### H-045 · La cinta del pie se mueve sin fin y no se puede parar
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/components/Footer.jsx:82-107` y `src/styles/components/ticker.css:95` (`ticker-scroll 30s linear infinite`); solo se para con movimiento reducido (`ticker.css:114-118`).
- **Reproducción**: ver R-NAV-21. En cualquier página, buscar un control para parar la cinta y la lata.
- **Esperado**: un control para pausar el movimiento continuo (WCAG 2.2.2).
- **Observado**: la cinta corre y la lata pasea sin fin, sin ningún control para pararlas. Solo se paran con `prefers-reduced-motion`: animación `none` y la lata quieta con el póster.
- **Evidencia**: R-NAV-21.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-17

### H-046 · La Estampida cuenta teclas que ya usa la mesa de beats
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/estampida/Estampida.jsx:86-98`, frente a `src/features/studio/BeatMachine.jsx:265-286`.
- **Reproducción**: ver R-EGG-05. En `/estudio`, con el foco en «Pad 1», teclear 0, 3 y 5.
- **Esperado**: una tecla que usa la mesa no cuenta para el código 035.
- **Observado**: suena «Pad 3: Caja» y además sale la Estampida, en escritorio y en móvil. Los dos componentes escuchan `keydown` en `window` y la Estampida se registra antes, así que mirar `defaultPrevented` no bastaría.
- **Evidencia**: R-EGG-05.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-18

### H-047 · La primera Estampida descarga 615 KiB de ilustraciones grandes para pintarlas pequeñas
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/estampida/Estampida.jsx:38-48` precarga el arte `-hd` de los 24 corredores (`src/data/crew.js:6-30`).
- **Reproducción**: ver R-EGG-04. Con la caché vacía, lanzar la Estampida tecleando 0, 3 y 5.
- **Esperado**: imágenes del tamaño al que se pintan, entre 70 y 140 px de alto.
- **Observado**: descarga 24 ilustraciones (`*-hd-*.webp` y `tumbado-800`), 615 KiB según `content-length`, y las pinta a entre 77 y 138 px de alto.
- **Evidencia**: R-EGG-04.
- **Entorno**: E1, escritorio
- **Fase propuesta**: 4
- **Origen**: C-EST-19

### H-048 · La preferencia de movimiento reducido no se sigue en vivo, y el hook que lo haría no se usa
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/peeker/CuriousPeeker.jsx:72`, `src/components/StreetWall.jsx:52` y `src/components/Footer.jsx:56` leen la preferencia al montar o al cambiar de ruta. `src/hooks/usePrefersReducedMotion.js:5-15`, que la sigue en vivo, no lo importa nadie: Descontrol, Spray y Footer usan `prefersReducedMotion()` de `utils/media.js`.
- **Reproducción**: ver R-EGG-03, R-EGG-06 y R-EGG-07. Activar el movimiento reducido a mitad de ruta, sin navegar, y luego desactivarlo. Ejecutar `grep -rn usePrefersReducedMotion src`.
- **Esperado**: el cambio de preferencia se aplica al momento.
- **Observado**: con el movimiento reducido ya activo, en 26 s el Curioso volvió a salir una vez y la sesión de fotos del muro siguió montando 2 fogonazos, aunque el CSS los oculta. La cinta sí se para, por CSS. Al desactivarlo, el Curioso no vuelve hasta navegar. La Estampida sí lee la preferencia al lanzarse. El `grep` solo encuentra la definición del hook.
- **Evidencia**: R-EGG-03, R-EGG-06, R-EGG-07 y R-NIGHT-04.
- **Entorno**: E1 y código
- **Fase propuesta**: 2
- **Origen**: C-EST-20, C-NOCHE-25

### H-049 · El Curioso rompe la app con ventanas de menos de unos 86 px de ancho
- **Categoría**: funcional
- **Severidad**: menor (no se puede alcanzar con dispositivos reales)
- **Ubicación**: `src/features/peeker/geometry.js:255`. Pasa `{ ...screen, alongRatio }`, y cuando `placeOnEdge` devuelve `null` el objeto ya no es falso, así que la comprobación de nulo no lo descarta.
- **Reproducción**: ver R-EGG-01. Estrechar la ventana a 80 px y esperar a que el Curioso intente asomarse.
- **Esperado**: si el escondite no cabe, se descarta.
- **Observado**: lanza «Cannot read properties of undefined (reading 'peek')» y «(reading 'height')». Como no hay ErrorBoundary (H-009), la app entera se desmonta y `#root` queda vacío. A 90 y a 120 px funciona.
- **Evidencia**: captura `capturas-e1/estructura/C-EST-21-80px.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-21

### H-050 · Los garabatos decorativos declaran a la vez `role="img"` y `aria-hidden="true"`
- **Categoría**: accesibilidad
- **Severidad**: menor (sin efecto práctico)
- **Ubicación**: `src/components/doodles/BeeDoodle.jsx:10-11`, `src/components/doodles/ColmenaSticker.jsx:9-10` y `src/components/doodles/CrosshairSpinner.jsx:8-9`.
- **Reproducción**: ver R-NAV-25. Leer el árbol de accesibilidad con la abeja, la pegatina LA COLMENA y la diana de carga en pantalla.
- **Esperado**: una declaración coherente: decorativo y oculto.
- **Observado**: los tres llevan las dos declaraciones. Como manda `aria-hidden`, no aparecen en el árbol.
- **Evidencia**: R-NAV-25.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-EST-22

### H-051 · Al ensanchar la ventana con la hoja del menú abierta, el foco a veces acaba en `<body>`
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/components/NavBar.jsx:150-164`, frente a `src/styles/components/navbar.css:457-462`, que oculta `.navbar-sheet` desde 641 px.
- **Reproducción**: ver R-NAV-08. A 375 px, abrir el menú, llevar el foco con Tab a «Estudio» y ensanchar la ventana por encima de 641 px. Repetir varias veces.
- **Esperado**: la hoja se cierra y el foco pasa al logo («Inicio»).
- **Observado**: la hoja se cierra y el scroll se libera siempre, pero el foco acaba en `<body>` en 4 de 5 intentos (en pruebas anteriores, en 2 de 5 y en 3 de 10). Es una carrera: Chrome le quita el foco al enlace oculto antes de que llegue el evento `change` del `matchMedia`. El registro de eventos muestra el `focusout` antes que `resize`.
- **Evidencia**: captura `capturas-e1/estructura/R-NAV-08-movil.png`.
- **Entorno**: E1, cambiando el tamaño con `page.setViewportSize`
- **Fase propuesta**: 2
- **Origen**: N-EST-2

### H-052 · Si falla `/api/shopify/status`, la tienda se queda sin productos aunque el catálogo de vista previa va embebido
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/storefront/useStorefrontStatus.js:106-120`, con `src/features/catalog/ProductPage.jsx:97` y `:133` y `src/features/catalog/MenuDrop.jsx:55`.
- **Reproducción**: ver R-CAT-11 y R-ERR-03. Bloquear `/api/shopify/status` o hacer que responda 502 sin cuerpo o 429.
- **Esperado**: un catálogo de respaldo, o un estado vacío que explique el fallo en cada pantalla.
- **Observado**: sale un aviso `role=alert` («No se ha podido conectar con la tienda…» o «La tienda no ha podido completar la operación…»).
  - La portada cuenta «0 diseños» con la rejilla vacía, sin estado vacío.
  - La categoría dice «Nada por aquí… Volaron.».
  - La ficha dice «Producto no disponible».
  - `/menudrop` queda vacía, sin ningún mensaje.
  - Después de un 429 pasajero pasa lo mismo: la tienda se queda sin ninguna ficha.
- **Evidencia**: R-CAT-11 en escritorio y móvil; capturas `capturas-e1/transversales/R-ERR-03-escritorio-aviso-429.png` y `R-ERR-03-movil-aviso-429.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-05, C-TRANS-29

### H-053 · Mientras carga, la portada dice «0 diseños» y la categoría enseña su handle
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductPage.jsx:94` y `:133`.
- **Reproducción**: ver R-CAT-01. Retrasar `/api/shopify/status` 1,5 s y abrir `/` y `/products/costa-035`.
- **Esperado**: un estado de carga, no cifras ni nombres provisionales.
- **Observado**: en la categoría, el h1 dice «costa-035», el título «costa-035 · ROCKY 035» y el contador «0 diseños», hasta que pasan a «COSTA 035» y «2 diseños». La portada dice «0 diseños» durante la carga.
- **Evidencia**: R-CAT-01.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-06

### H-054 · Con el aviso ya apuntado, «Avísame» y el enlace `#aviso` no hacen nada visible
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductDetail.jsx:54-62` y `:202-205`. Si ya hay recibo, `DropAviso` no pinta el campo de email.
- **Reproducción**: ver R-DROP-06. Apuntarse a un aviso y después pulsar «Avísame» en la ficha, o llegar a `/product/rockyracing#aviso`.
- **Esperado**: el botón lleva al recibo, y el foco va con él.
- **Observado**: el desplazamiento no cambia (de 0 a 0 en escritorio y de 596 a 596 en móvil) y el foco se queda en el botón. Al llegar con `#aviso`, la página se queda arriba con el foco en `body`.
- **Evidencia**: R-DROP-06.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-08

### H-055 · Controles repetidos con el mismo nombre accesible
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**:
  - Los enlaces «Detalles» de las tarjetas: `src/features/catalog/ProductPage.jsx:252-257`.
  - Los dos botones «Avísame» de la ficha: `src/features/catalog/ProductDetail.jsx:202-205` y `src/features/catalog/DropAviso.jsx:106`.
  - Los botones «↻ expediente» y «↻ volver» de los cromos: `src/features/crew/Crew.jsx:287` y `:342`.
- **Reproducción**: ver R-CAT-01, R-CAT-04, R-CAT-06, R-DROP-05, R-CREW-02, TECLADO-ficha, TECLADO-crew y TECLADO-mi-crew. Pedir al lector de pantalla la lista de enlaces y botones, o leer el árbol de accesibilidad.
- **Esperado**: cada control dice a qué producto o cromo pertenece, y dos botones que hacen cosas distintas no se llaman igual.
- **Observado**:
  - En la portada hay 9 enlaces «Detalles» con un único nombre accesible.
  - En `/product/35-red` hay dos botones «Avísame»: uno lleva al campo y el otro envía el alta.
  - En `/crew`, el teclado recorre 25 paradas seguidas que se llaman «↻ expediente», y en el reverso «↻ volver». El nombre incluye el glifo `↻`, que los lectores pronuncian.
- **Evidencia**: `ariaSnapshot` de R-CAT-01 y R-CAT-04; `out/teclado.json` (`crewSeq.seq`) y `out/crew.json`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-CAT-09, C-CAT-20, N-CHAT-3

### H-056 · Las fichas de demo enseñan «Próximamente» dos veces
- **Categoría**: funcional (contenido)
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductDetail.jsx:155-161` y `:197-201`, con `specifications: ["Próximamente"]` de `src/data/demoCatalog.json`.
- **Reproducción**: ver R-CAT-04 y R-CAT-06. Abrir `/product/rockyracing` o `/product/35-red`.
- **Esperado**: el dato aparece una sola vez.
- **Observado**: «Próximamente» sale en la lista de especificaciones y otra vez en la insignia.
- **Evidencia**: R-CAT-04 y R-CAT-06.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-10

### H-057 · La foto de la ficha y su lightbox pierden la descripción de la imagen
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductDetail.jsx:141` y `:228` usan `product.title` como `alt`. Las tarjetas sí usan `imageAlt` (`src/features/catalog/ProductPage.jsx:229` y `:288`).
- **Reproducción**: ver R-CAT-05 y R-CAT-08. Comparar el `alt` de Night Runner en la tarjeta, en la ficha y en el lightbox abierto desde la ficha.
- **Esperado**: la misma descripción que en la tarjeta.
- **Observado**: en la tarjeta, «Camiseta oversize negra Night Runner con mapa urbano nocturno». En la ficha y en el lightbox abierto desde ella, solo «Night Runner».
- **Evidencia**: R-CAT-05 y R-CAT-08.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-11

### H-058 · Errores respondidos a mano: sin `code` y sin línea de log
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**:
  - Errores escritos a mano, sin `code`:
    - `server/app.mjs:187`.
    - `server/http/middleware/origin-policy.mjs:11` y `:33`.
    - `server/http/middleware/rate-limit.mjs:37-40`.
    - `server/http/routes/health.mjs:19`.
    - `server/http/routes/shopify/catalog.mjs:26`, `cart.mjs:51`, `checkout.mjs:12` y `account.mjs:48`.
    - `server/http/routes/avisos.mjs:42-58`.
    - `server/services/chat/orchestrator.mjs:199`, `:203`, `:209`, `:220`, `:229`, `:273`, `:287`, `:298`, `:317` y `:334`.
  - Fallos y bloqueos de la puerta, sin línea de log: `server/http/access-gate.mjs:228-247`.
  - Código `SHOPIFY_ERROR` para errores que no son de Shopify: `server/services/cart-operations.mjs:81` y `:135`.
- **Reproducción**: provocar cada error y leer la respuesta y el log. Ver R-SYS-07, R-ERR-02 a R-ERR-05, R-ERR-09, R-DROP-08, R-DROP-12, R-CAT-12, R-CART-03, R-CART-18, R-CHK-01, R-CHK-03, R-ACC-01, R-CHAT-02, R-CHAT-05, R-CHAT-06 y R-GATE-04.
- **Esperado**: lo que pide `CLAUDE.md`. Se lanza un `HttpError` con `{ status, code }` y responde el middleware único, que además registra la petición rechazada. `SECURITY.md` pide alertas para los 401, 403 y 429.
- **Observado**:
  - Salen sin `code`:
    - 404 «Ruta no encontrada.». En `beats.mjs:159` sí lleva `NOT_FOUND`.
    - 403 «Origen no permitido.» y «Petición de origen no confiable.».
    - 429 «Demasiadas peticiones…».
    - 503 «… no está configurado.», de catálogo, carrito, checkout, cuentas y Rocky IA.
    - Los 400 de avisos.
  - El cliente recibe todos esos errores como `REQUEST_FAILED` (`src/api/http.js:39-43`).
  - Para el mismo 503, la barra de Rocky IA sí devuelve `AI_OFF`, y la API de Crew devuelve `CREW_UNAVAILABLE`.
  - «No existe un carrito activo.» (404) y «El carrito está vacío.» (409) llevan `SHOPIFY_ERROR`.
  - Sin línea de log quedan los 429 (cientos en `/api/shopify` sin rastro), los 403 de origen y los fallos y bloqueos de la puerta. Los 400, 413 y 415 del parser y de `validate` sí dejan «Request rejected».
  - El 400 sin `code` de `orchestrator.mjs:207-210` no sale nunca, porque `validateBody` lo para antes con `INVALID_MESSAGE`.
- **Evidencia**: respuestas y logs de las instancias de E1 y de E2 simulado en las fichas citadas.
- **Entorno**: E1 y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CAT-13, C-CART-23, C-CHAT-02, C-TRANS-16, C-TRANS-25

### H-059 · El mockup de un diseño bajo llave dice siempre «Drop 4 · sin revelar»
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/PlaceholderTee.jsx:30` usa siempre `CURRENT_DROP.shortTitle`, aunque `src/features/storefront/normalize.js:25-30` conserva la colección del producto.
- **Reproducción**: ver R-CAT-06 y R-CAT-13. Abrir la ficha de un producto sin foto de otra colección.
- **Esperado**: la etiqueta del drop al que pertenece.
- **Observado**: con el BFF simulado, un producto de «ROCKY DROP 5» tiene el antetítulo «ROCKY DROP 5» y la etiqueta «Drop 4 · sin revelar».
- **Evidencia**: `scratchpad/e1/catalogo/06-candidatos.mjs`. En E2 simulado no se pudo ver: los únicos productos de otra colección quedan fuera de los 8 que carga la web (H-008).
- **Entorno**: E1 con BFF simulado. Falta la tienda real.
- **Fase propuesta**: 2
- **Origen**: C-CAT-14

### H-060 · Un drop sale «Disponible» aunque todo esté agotado o el carrito no funcione
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/MenuDrop.jsx:33` y `:39` miran si hay precio, no `availableForSale`.
- **Reproducción**: ver R-DROP-01 y R-CAT-13. Con todas las variantes agotadas, abrir `/menudrop`.
- **Esperado**: «Agotado», o un estado coherente con el de las tarjetas.
- **Observado**: con el BFF simulado, «DROP MOCK», con 7 productos agotados, sale «Disponible» mientras sus tarjetas dicen «Agotado» o «Carrito no disponible». En E2 simulado, con las 8 referencias a 0, `/menudrop` enseña «ROCKY DROP 4 · 8 diseños · 5 bajo llave · Disponible →».
- **Evidencia**: R-DROP-01 y R-CAT-13.
- **Entorno**: E1 con BFF simulado y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CAT-15

### H-061 · El servidor solo reconoce los 50 productos más recientes para los avisos
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/services/known-products.mjs:61-63` con `server/services/catalog-cache.mjs:21`, que pide `first=50`.
- **Reproducción**: ver R-DROP-12. Con más de 50 productos en la tienda, apuntarse al aviso de uno antiguo.
- **Esperado**: se acepta el aviso de cualquier producto de la tienda.
- **Observado**: con un storefront simulado de 60 productos, `createCatalogCache` pide `first=50` una sola vez, y `knownProducts.includes` da true para mock-50 y false para mock-51 y mock-60. El aviso de un producto más antiguo recibiría un 400 «Ese producto no está en la tienda.».
- **Evidencia**: `07-known-products.mjs`, que ejecuta la lógica del servidor.
- **Entorno**: código del servidor con un storefront simulado. Falta E2 real con más de 50 productos.
- **Fase propuesta**: 2
- **Origen**: C-CAT-16

### H-062 · Hay URLs duplicadas en el catálogo, y en `/products/...` ningún enlace de la barra queda activo
- **Categoría**: SEO
- **Severidad**: menor
- **Ubicación**: `src/App.jsx:127-128`, `src/features/catalog/ProductPage.jsx:87-88` y `src/components/NavBar.jsx:57-58`.
- **Reproducción**: ver R-CAT-02. Abrir `/products`, `/products/ROCKY%20DROP%204` y `/products/rocky-drop-4`.
- **Esperado**: una sola URL por contenido, y la sección marcada en la barra.
- **Observado**: `/products` repite la portada (mismo h1, lema, muro y «28 diseños»). `/products/ROCKY%20DROP%204` repite `/products/rocky-drop-4` (mismo h1, «22 diseños» y mismo título). En `/products/...`, ningún enlace de la barra ni del menú móvil tiene `is-active`.
- **Evidencia**: R-CAT-02; `arte.md`, apartado 4 (fila del listado).
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-CAT-17

### H-063 · Las 19 fichas de diseños bajo llave no tienen ningún enlace
- **Categoría**: funcional (navegación)
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductPage.jsx:61-63`.
- **Reproducción**: ver R-CAT-06. Buscar enlaces a `/product/35-red` y al resto de fichas bajo llave en `/`, `/products/rocky-drop-4` y `/menudrop`.
- **Esperado**: o las fichas se enlazan, o no existen.
- **Observado**: las 19 fichas cargan con su h1, pero no hay ningún enlace a ellas: el bloque solo lista los nombres como texto. En modo Shopify esto agrava H-019.
- **Evidencia**: R-CAT-06.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-19

### H-064 · El campo de email del aviso no tiene etiqueta visible
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/DropAviso.jsx:89-100`.
- **Reproducción**: ver R-DROP-04 y TECLADO-avisos. Escribir en el campo.
- **Esperado**: una etiqueta visible que no desaparezca al escribir.
- **Observado**: el campo no tiene `<label>` (`labels.length` es 0). Solo tiene el `placeholder` «tu@email.com», que desaparece al escribir, y el `aria-label` «Tu email para el aviso del drop».
- **Evidencia**: R-DROP-04.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-21

### H-065 · El botón de la foto de un diseño bajo llave está deshabilitado pero se anuncia como «Ver … en grande»
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductDetail.jsx:127-133`.
- **Reproducción**: ver R-CAT-06 y R-CAT-09. Leer el árbol de accesibilidad de `/product/35-red`.
- **Esperado**: sin botón, o con un nombre que no prometa una acción imposible.
- **Observado**: aparece `button «Ver 35 RED en grande» [disabled]`, con la imagen «35 RED — diseño todavía sin revelar».
- **Evidencia**: R-CAT-06 y R-CAT-09.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-22

### H-066 · «← Volver a la tienda» lleva siempre a la portada
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/ProductDetail.jsx:106-108`.
- **Reproducción**: ver R-CAT-04. Desde `/products/costa-035`, abrir «Detalles» de Solar Club y pulsar «← Volver a la tienda».
- **Esperado**: volver a la categoría de la que se venía.
- **Observado**: el enlace (`href="/"`) lleva a la portada.
- **Evidencia**: R-CAT-04.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CAT-23

### H-067 · El anillo de foco de las fotos de las tarjetas queda recortado
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `/` y `/products/:category?`. La tarjeta tiene `overflow: hidden` (`src/styles/pages/home.css:301-302`) y el anillo es de 3 px separado 3 px (`src/styles/02-base.css:14-17`); ver también `src/styles/components/product-media.css:4-18`.
- **Reproducción**: ver TECLADO-listado y R-CAT-09. En la portada, tabular hasta «Ver RockyRacing en grande».
- **Esperado**: el anillo rojo de 3 px completo, como en el resto de la web.
- **Observado**: el contorno está calculado, pero la tarjeta lo recorta arriba y a los lados. Solo se ven una línea bajo la foto y el icono del ojo. Pasa en las 9 fotos de la portada; en la ficha el anillo se ve completo.
- **Evidencia**: captura `capturas-e1/catalogo/NUEVO-foco-foto-tarjeta-escritorio.png` y comparación de píxeles con y sin foco.
- **Entorno**: E1, escritorio
- **Fase propuesta**: 2
- **Origen**: N-CAT-2

### H-068 · En móvil, `/menudrop` descarga la ilustración que oculta
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/catalog/MenuDrop.jsx:81-88`, una imagen sin `loading="lazy"`, y `src/styles/pages/drops.css:147-149`, que la oculta con `display: none` a 640 px o menos.
- **Reproducción**: ver R-DROP-01. Abrir `/menudrop` a 375 px y mirar las imágenes descargadas.
- **Esperado**: lo que no se pinta no se descarga.
- **Observado**: se descarga `skater-ollie-hd-DGrLdje0.webp` (22 706 bytes) aunque no se ve.
- **Evidencia**: `scratchpad/resultados-e1/catalogo-imagenes.tsv`; `metricas.md`, apartado 3.1.
- **Entorno**: E1, móvil
- **Fase propuesta**: 4
- **Origen**: N-CAT-6

### H-069 · Salir de la cuenta destruye la sesión entera: se pierde el carrito y, con la puerta activa, el acceso
- **Categoría**: funcional
- **Severidad**: menor. Severidad ajustada: C-CART-03 se propuso importante, pero es una incoherencia con el login (que sí conserva el carrito), no impide comprar, y la parte de la puerta solo afecta mientras la puerta privada esté activa.
- **Ubicación**: `server/http/routes/shopify/account.mjs:119` con `server/services/sessions.mjs:152-161`. El login, en cambio, conserva `cartId` y `siteAccessGrant` (`account.mjs:87-92`). La puerta está en `server/http/access-gate.mjs:269-285`.
- **Reproducción**: ver R-ACC-09 y R-ACC-04: con artículos en el carrito y sesión de cliente, pulsar «Salir de la cuenta». Ver R-GATE-10: en E1 con la puerta, desbloquear y llamar a `POST /api/shopify/account/logout`.
- **Esperado**: salir cierra la cuenta y conserva el resto de la sesión, como hace el login.
- **Observado**: responde 200 `{loggedIn:false, logoutUrl}` con `Set-Cookie rocky_session=; Max-Age=0`. Al volver de Shopify, el contador del carrito desaparece y `GET /cart` responde `{"cart":null}`. Con la puerta activa, tras el logout la portada vuelve a ser la puerta y `/api/shopify/status` da 404 «Not found.». Ningún test cubre la puerta después del logout.
- **Evidencia**: R-ACC-09 en escritorio y móvil; R-GATE-10.
- **Entorno**: E2 simulado y E1 con la puerta
- **Fase propuesta**: 2
- **Origen**: C-CART-03, C-TRANS-05

### H-070 · `GET /account` manda al navegador el identificador y el email del cliente sin necesitarlos
- **Categoría**: legal/privacidad
- **Severidad**: menor
- **Ubicación**: `server/http/routes/shopify/account.mjs:105` con `server/integrations/shopify/customer-account.mjs:504-510`. La SPA solo usa `loggedIn` (`src/components/NavBar.jsx:78` y `src/features/storefront/useStorefront.js:30`).
- **Reproducción**: ver R-ACC-07. Con una sesión de cliente, leer la respuesta de `GET /api/shopify/account`.
- **Esperado**: solo lo que usa la web, por minimización de datos.
- **Observado**: responde 200 con `{"loggedIn":true,"customer":{…}}`, y `customer` trae el GID del cliente, `displayName`, `firstName`, `lastName` y `email`. La barra no muestra ni el nombre ni el email.
- **Evidencia**: R-ACC-07 en escritorio y móvil; R-NAV-11.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-07

### H-071 · Textos del carrito que no dicen lo que pasa
- **Categoría**: funcional (texto)
- **Severidad**: menor
- **Ubicación**: la plantilla «no se pudieron cargar ${…}» está en `src/features/storefront/useStorefrontStatus.js:77`; «Actualizando…», en `src/features/cart/Cart.jsx:240-243`; «Total», en `src/features/cart/Cart.jsx:213-221`.
- **Reproducción**: ver R-ACC-08 y R-CHAT-09, con un fallo solo de la cuenta o solo del carrito; R-CHK-02, pulsando «Ir al pago seguro»; y R-CART-10, con el resumen de un carrito con líneas.
- **Esperado**: concordancia («no se pudo cargar la cuenta»), un texto propio mientras se prepara el pago y un aviso de que el envío y los impuestos se calculan en el pago.
- **Observado**: sale «…no se pudieron cargar la cuenta…» y «…no se pudieron cargar el carrito…». El botón dice «Actualizando…» mientras se pide el enlace de pago. El resumen dice «Total» (106,90 €) sin ninguna nota sobre el envío y los impuestos; qué incluye el total de Shopify real está por ver.
- **Evidencia**: R-ACC-08, R-CHAT-09, R-CHK-02 y R-CART-10.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-09, C-CART-31, C-CART-33

### H-072 · El carrito no tiene estado de carga ni de error: dice que está vacío en los dos casos
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/cart/Cart.jsx:65` con `src/features/storefront/useStorefrontStatus.js:81-91`.
- **Reproducción**: ver R-CART-15, recargando `/cart` con líneas y la red lenta, y R-CART-21, con Shopify caído.
- **Esperado**: «Cargando…» y un mensaje de error distintos del carrito vacío.
- **Observado**: al recargar se ve «Cargando...», luego «Tu carrito está vacío» y por fin «Tu carrito». Con Shopify caído y un carrito guardado en la sesión, dice «Tu carrito está vacío».
- **Evidencia**: R-CART-15 y R-CART-21.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-10

### H-073 · Tras un error de carrito, la web sigue enseñando líneas que ya no existen
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/storefront/useCart.js:105-108`, que no vuelve a leer el carrito después de un error.
- **Reproducción**: ver R-CART-18, R-CART-19 y R-CHK-03. Quitar una línea en otra pestaña y tocarla en esta; borrar o falsear la cookie; ir al pago con el carrito vacío.
- **Esperado**: tras el error, se vuelve a leer el carrito.
- **Observado**: responde 404 `LINE_NOT_FOUND`, 404 «No existe un carrito activo.» o 409 «El carrito está vacío.», y la línea sigue pintada hasta recargar.
- **Evidencia**: R-CART-18, R-CART-19 y R-CHK-03.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-11

### H-074 · Los avisos y errores del carrito se duplican, se borran o reaparecen donde no toca
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/storefront/useCart.js:103` (`onError('')`), `:107` y `:133`; `src/features/cart/AddToCartButton.jsx:56-60`; `src/App.jsx:108-115`.
- **Reproducción**: ver R-ACC-08: añadir un producto con el aviso de arranque en pantalla. Ver R-CART-13 y R-CART-21: provocar un error al añadir desde la ficha, y provocar un aviso de Shopify en la ficha y luego abrir `/cart`.
- **Esperado**: cada mensaje sale una vez, en un solo sitio, y solo mientras aplica.
- **Observado**:
  - Añadir al carrito borra el aviso de arranque («…no se pudieron cargar la cuenta…»).
  - El mismo error sale dos veces, bajo el botón y en el aviso superior, los dos con `role=alert`.
  - Un aviso de Shopify de la ficha («The product 'DWAG' is already sold out.») reaparece al abrir `/cart`.
  - La segunda parte de C-CART-13, que en `/cart` el aviso superior quedara fuera de la vista en móvil, no se reprodujo.
- **Evidencia**: R-ACC-08, R-CART-13 y R-CART-21.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-12, C-CART-13, C-CART-30

### H-075 · Los cambios del carrito no se anuncian y la lista de avisos pierde su semántica de lista
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/cart/Cart.jsx:173-184` (cantidad y total sin región viva), `src/features/cart/AddToCartButton.jsx:52-53` («Añadido ✓») y `src/features/cart/Cart.jsx:58` (`role="alert"` en el `<ul>`).
- **Reproducción**: ver R-CART-11, R-CART-13 y R-CART-22. Cambiar cantidades, añadir productos y provocar avisos de Shopify.
- **Esperado**: los cambios se anuncian con una región viva, y la lista de avisos se lee como una lista.
- **Observado**: ni `.quantity-value` ni `.cart-summary-total` están dentro de una región viva. «Añadido ✓» es solo el texto del botón. Los avisos salen en `<ul class="cart-warnings" role="alert">`.
- **Evidencia**: R-CART-13 y R-CART-22.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-15, C-CART-16

### H-076 · Botones de cantidad de 28 px y cursor de espera sin nada pendiente
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/styles/pages/cart.css:126-128` y `:149-150`.
- **Reproducción**: ver R-CART-12 y R-CART-22. Abrir un carrito con líneas en móvil y llegar a 20 unidades de una línea.
- **Esperado**: botones más grandes para tocar, y el cursor de espera solo durante una operación.
- **Observado**: los botones miden 28 × 28 px, en escritorio y en móvil. Con 20 unidades, el «+» desactivado por el tope muestra `cursor: wait` sin que haya nada pendiente.
- **Evidencia**: R-CART-12 y R-CART-22.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-17

### H-077 · El icono del carrito no tiene estado activo visible en `/cart`
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/components/NavBar.jsx:244` y `src/styles/components/navbar.css`.
- **Reproducción**: ver R-CART-02. Abrir `/cart` y comparar el icono con el de `/`.
- **Esperado**: el mismo estado activo que las demás entradas de la barra, con la convención `is-*`.
- **Observado**: el enlace recibe `aria-current=page` y la clase por defecto de NavLink, «navbar-cart active», no `is-active`. Su estilo calculado es idéntico al de `/`. Las demás entradas sí se marcan (por ejemplo, «Crew» en `/crew`).
- **Evidencia**: R-CART-02 en escritorio y móvil.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CART-18

### H-078 · El servidor reenvía al navegador el `target` de los avisos de Shopify, con el token del carrito
- **Categoría**: seguridad observada
- **Severidad**: menor (los ids de línea ya llevan ese token)
- **Ubicación**: `server/integrations/shopify/storefront.mjs:199`, `:236`, `:262` y `:281`. Solo lo filtra el cliente (`src/features/storefront/useCart.js:128-132`).
- **Reproducción**: ver R-CART-13. Provocar un aviso en `PATCH /api/shopify/cart/lines` y leer la respuesta.
- **Esperado**: el servidor no manda campos que el cliente descarta.
- **Observado**: la respuesta trae `warnings[0].target = gid://shopify/CartLine/…?cart=<token del carrito>`.
- **Evidencia**: R-CART-13 y R-CART-08.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-22

### H-079 · La cookie de sesión caduca a los 30 días de crearse, aunque haya actividad
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/services/sessions.mjs:101-116`. `open` alarga el registro del servidor, pero no vuelve a mandar la cookie.
- **Reproducción**: ver R-CART-15. Crear una sesión y hacer una mutación después.
- **Esperado**: la actividad renueva la cookie igual que el registro del servidor.
- **Observado**: la cookie caduca a los 30 días de crearse; un `PATCH` posterior no trae `Set-Cookie`.
- **Evidencia**: R-CART-15.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-24

### H-080 · Volver a entrar sin haber salido deja huérfano el token de cliente anterior
- **Categoría**: operación (higiene de datos)
- **Severidad**: menor
- **Ubicación**: `server/http/routes/shopify/account.mjs:87-91`.
- **Reproducción**: ver R-ACC-04. Entrar dos veces seguidas sin salir y contar los registros del almacén.
- **Esperado**: al rotar la sesión se borra el token anterior.
- **Observado**: los registros `customerTokens` pasan de 5 a 6 mientras las sesiones con cliente siguen en 5. El token anterior queda 30 días huérfano en el almacén.
- **Evidencia**: lectura del fichero cifrado con la clave de la instancia de prueba (R-ACC-04, escritorio).
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-25

### H-081 · El login abre una sesión antes de validar la ruta de retorno
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/http/routes/shopify/account.mjs:61-62`.
- **Reproducción**: ver R-ACC-06. Pedir el login con `returnPath` `//evil.example`, `https://evil.example`, `/\evil.example` o `mi-crew`.
- **Esperado**: el 400 sale sin crear ninguna sesión.
- **Observado**: responde 400 `INVALID_RETURN_PATH` y el navegador ya tiene la cookie `rocky_session`. Con un `returnPath` de más de 500 caracteres, el 400 sale sin cookie.
- **Evidencia**: R-ACC-06, pasos 1 a 5.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CART-26

### H-082 · En modo demo no se puede comprar nada, así que el carrito demo y sus textos son código muerto
- **Categoría**: operación (mantenibilidad)
- **Severidad**: menor
- **Ubicación**: `src/features/storefront/normalize.js:72-90` con `availability.js:24-26`; el reductor demo de `src/features/storefront/useCart.js:18-45`; los textos de `src/features/cart/Cart.jsx:224-244`.
- **Reproducción**: ver R-CART-01, R-CART-02 y R-CHK-01. Recorrer el catálogo demo buscando «Añadir al carrito» y abrir `/cart`.
- **Esperado**: o el modo demo permite probar el carrito, o el código que lo haría no existe.
- **Observado**: ningún producto ofrece la compra. Los 3 diseños con foto muestran «Avísame», los 19 sin foto están en «19 diseños bajo llave» y los 6 conceptos tienen «Vista previa» desactivado. `/cart` está siempre vacío, sin «Pago desactivado en modo demo» ni «Vista previa local…», y no se hace ninguna petición de carrito.
- **Evidencia**: R-CART-01, R-CART-02 y R-CHK-01.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CART-28

### H-083 · Con la red lenta, el repartidor del carrito cruza sin dibujo la primera vez
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/cart/CartRunner.jsx:127-135`. La imagen solo se monta durante la carrera y no se precarga.
- **Reproducción**: ver R-CART-09. Con la red lenta (400 ms de latencia y 50 kB/s), añadir un producto por primera vez.
- **Esperado**: la imagen ya está lista cuando empieza la carrera.
- **Observado**: antes de añadir no se pide `corriendo-bolsa-*.webp`. La imagen llega a los 2126 ms en escritorio y a los 927 ms en móvil, y la carrera dura 1120 ms: en escritorio el repartidor cruza sin dibujo.
- **Evidencia**: `out/probe-runner.json`.
- **Entorno**: E2 simulado
- **Fase propuesta**: 4
- **Origen**: C-CART-29

### H-084 · El tope de 20 unidades por línea está escrito en cuatro sitios
- **Categoría**: operación (mantenibilidad)
- **Severidad**: menor
- **Ubicación**: `src/config/commerce.js:3`, `server/http/routes/shopify/cart.mjs:23` y `server/integrations/shopify/storefront.mjs:162` y `:247`.
- **Reproducción**: buscar el valor 20 en esos ficheros (R-CART-12).
- **Esperado**: una sola constante compartida.
- **Observado**: aparece como `MAX_LINE_QUANTITY = 20`, `max: 20`, `quantity > 20` y `parsedQuantity > 20`. Si ese tope también debería limitar el total de la línea queda pendiente (C-CART-08).
- **Evidencia**: búsqueda en `7d2bf57`.
- **Entorno**: código
- **Fase propuesta**: 2
- **Origen**: C-CART-32

### H-085 · Rocky IA no distingue por qué falla
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/api/chat.js:29` usa un solo texto para todos los 5xx que llegan de `server/services/chat/orchestrator.mjs:198-200`. El 429 del cupo global (`orchestrator.mjs:270-274`) se escribe a mano, sin `code` y con el mismo texto que el límite por IP (`server/http/middleware/rate-limit.mjs:39`). La barra, en cambio, usa `AI_DAILY_LIMIT` (`server/services/chat/barra.mjs:193-195`).
- **Reproducción**: ver R-CHAT-02, R-CHAT-05 y R-CHAT-15 a R-CHAT-17: mandar un mensaje sin clave (E1), con el proveedor ocupado, con tiempo de espera agotado y con todos los modelos caídos. Ver R-CHAT-14: con `CHAT_GLOBAL_DAILY_MAX=2`, mandar tres mensajes y llamar a la barra.
- **Esperado**: un mensaje distinto para «apagado», «ocupado», «sin respuesta» y «tope de hoy alcanzado», y un código que permita distinguirlos.
- **Observado**:
  - El 503 «Rocky IA no está configurado.», que significa que el chat está apagado para siempre, el 503 «ocupado» y los 502 salen todos como «Rocky IA se ha quedado sin señal un momento (el servidor no responde). Inténtalo en un rato.».
  - Con el cupo global agotado, el tercer mensaje recibe 429 «Demasiadas peticiones. Inténtalo más tarde.», sin `code` y con `Retry-After: 86400`. El texto culpa al usuario de un límite que es de todos.
  - La barra, con el mismo cupo agotado, dice «Rocky IA ha rapeado mucho hoy. Vuelve mañana.» (`AI_DAILY_LIMIT`).
  - Solo `RateLimit-Remaining` (17, no 0) distingue los dos límites.
- **Evidencia**: R-CHAT-02 y R-CHAT-05 en E1 (escritorio y móvil); R-CHAT-14 a R-CHAT-17 en E2 simulado; captura `capturas-e1/chat-crew/evidencia-R-CHAT-05-429-escritorio.png`.
- **Entorno**: E1 y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-01, N-E2-5

### H-086 · El filtro contra la manipulación del prompt bloquea preguntas con el verbo «dan»
- **Categoría**: funcional
- **Severidad**: menor. Severidad ajustada: la pasada de E1 la propuso importante y la de E2 simulado, menor. Se queda en menor porque solo afecta a mensajes con la palabra «dan» y el chat responde, aunque sea con la frase de bloqueo.
- **Ubicación**: `server/services/chat/prompt.mjs:77`. La expresión `\bDAN\b` con la bandera `i` también casa con el verbo «dan».
- **Reproducción**: ver R-CHAT-13. Preguntar «¿Cuándo dan el drop?» o «¿qué tallas dan?».
- **Esperado**: una respuesta normal del modelo.
- **Observado**: `isPromptManipulationAttempt` da true para las dos preguntas, y false para «¿Cuándo sale el drop?». De punta a punta, «¿Cuándo dan el drop?» responde 200 con «Esa personalidad no me la cambias ni pintando encima…», sin llamar al modelo.
- **Evidencia**: `out/funciones-chat.json` (E1); R-CHAT-13 en escritorio y móvil (E2).
- **Entorno**: E1 (función) y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-04

### H-087 · Una pregunta sobre el perfil Crew con una palabra de compra entra en modo compra
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/services/chat/orchestrator.mjs:115-121` y `server/services/chat/commerce.mjs:290-297`.
- **Reproducción**: ver R-CHAT-19. Con sesión de cliente, preguntar «¿Cuántos tickets tengo para comprar?» y después «¿Cuántos tickets tengo y en qué nivel estoy?».
- **Esperado**: una respuesta basada en el bloque PERFIL CREW VERIFICADO.
- **Observado**: la primera pregunta responde «No he encontrado una coincidencia verificable…». La segunda, que sin historial no tiene intención de compra, también entra en modo compra, porque la «y» cuenta como seguimiento de la anterior. Responde «He encontrado LEVEL ORANGE en el catálogo…», con su tarjeta.
- **Evidencia**: `out/funciones-chat.json`; R-CHAT-19 en escritorio y móvil.
- **Entorno**: E1 (función) y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-08

### H-088 · En modo Shopify, Rocky IA sigue usando el catálogo de vista previa
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**:
  - Las tarjetas se rellenan con conceptos de `shared/preview-products.mjs` (`server/services/chat/commerce.mjs:340-347`).
  - Los productos que reconoce por su nombre (`referencesKnownProduct`, `commerce.mjs:280-297`) también son los de vista previa, porque `server/app.mjs:154` fija `demoProducts` a `previewProducts` y así llegan a `server/services/chat/orchestrator.mjs:115-121`.
  - La SPA, en modo Shopify, solo carga los productos de la tienda (`src/features/storefront/useStorefrontStatus.js:70` y `src/features/catalog/ProductDetail.jsx:85-92`).
- **Reproducción**: ver R-CHAT-11 y R-CHAT-10. Escribir «Quiero una camiseta negra para salir de noche» y pulsar «Ver producto». Escribir «Enséñame Danger».
- **Esperado**: tarjetas solo de productos de la tienda, y que reconozca sus nombres.
- **Observado**: sale la tarjeta del concepto Night Runner, y «Ver producto» lleva a `/product/rocky-night-runner`, que dice «Producto no encontrado». «Enséñame Danger», con un producto de la tienda, no da ninguna tarjeta y contesta el modelo con un texto genérico. «Enséñame la camiseta Danger» sí da la tarjeta.
- **Evidencia**: capturas `capturas-e1/e2/C-CHAT-09-escritorio.png` y `C-CHAT-09-movil.png`; R-CHAT-10 en escritorio y móvil.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-09, N-E2-3

### H-089 · El historial del chat se lee mal con un lector de pantalla
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/chat/ChatComponent.jsx:199-205` y `:234-241`: los avatares tienen `alt=""` y el indicador de escritura pone su `aria-label` en un `<p>`. `src/styles/pages/chat.css:216-226` y `:720` añaden el adorno con `.chat-welcome::before { content: '✦' }`.
- **Reproducción**: ver R-CHAT-04. Leer el árbol de accesibilidad del `role="log"` de `/rockyIA`.
- **Esperado**: cada burbuja dice quién habla, el indicador de escritura tiene nombre y el adorno no se lee.
- **Observado**: el log expone «paragraph: hola» y la respuesta sin decir quién habla. El indicador de escritura sale como «paragraph», sin nombre. El primer nodo del log es `text: ✦`.
- **Evidencia**: árbol de accesibilidad de Chrome; `out/chat-ui.json` (`chat04-escritorio.ariaMain` y `chat04-movil.ariaMain`).
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-CHAT-12, N-CHAT-1

### H-090 · Cada mensaje fallido del chat deja un `console.error`
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `src/features/chat/ChatComponent.jsx:86`.
- **Reproducción**: ver R-CHAT-02 y R-CHAT-05. Mandar mensajes sin clave hasta llegar al 429.
- **Esperado**: los errores esperables no ensucian la consola.
- **Observado**: aparece un «Error al hablar con Rocky IA: ChatError: …» por cada mensaje fallido (2 de 2, y 6 de 6 contando el 429), además del «Failed to load resource» del navegador.
- **Evidencia**: R-CHAT-02 y R-CHAT-05.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-13

### H-091 · El CSS del chat tiene dos bloques `@media (max-width: 640px)` seguidos y el segundo pisa al primero
- **Categoría**: operación (mantenibilidad)
- **Severidad**: menor
- **Ubicación**: `src/styles/pages/chat.css:540-673` y `:675-684`.
- **Reproducción**: ver R-CHAT-01. Leer el estilo calculado de `.chat-header` y `.chat-header-player` a 375 px.
- **Esperado**: un solo bloque, sin reglas que nunca se aplican.
- **Observado**: `padding-right` vale 128 px y el ancho del reproductor 120 px, los valores del segundo bloque. Los 170 px y 160 px del primero (`:566` y `:572`) no se aplican nunca.
- **Evidencia**: `out/probe-chat-extra.json`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-14

### H-092 · El prompt de Rocky IA no incluye a «El Vigía» en LA CREW
- **Categoría**: funcional (contenido)
- **Severidad**: menor
- **Ubicación**: `server/services/chat/prompt.mjs:26-27`, frente a `src/data/crew.js:81-94`.
- **Reproducción**: comparar la lista del prompt con el álbum de `/crew` (R-CREW-01: 25 cromos).
- **Esperado**: la misma lista en los dos sitios.
- **Observado**: el prompt nombra 24 miembros (15 más 9 fichajes) y falta El Vigía. Cómo responde un modelo real queda pendiente de E2 real.
- **Evidencia**: lectura del código; R-CREW-01.
- **Entorno**: código
- **Fase propuesta**: 2
- **Origen**: C-CHAT-15

### H-093 · `/mi-crew` enseña la vista previa antes de saber si hay sesión
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/crew/CrewProfile.jsx:235` y `:275`, con `src/features/storefront/useStorefrontStatus.js:61-66` y `:99`.
- **Reproducción**: ver R-CREW-09. Con la lectura de la cuenta retrasada 700 ms, abrir `/mi-crew` directamente.
- **Esperado**: un estado de carga hasta saber si hay sesión.
- **Observado**: la página pasa por «Esto es una vista previa: aún no guardamos progreso…» antes de enseñar «Entrar en la Crew».
- **Evidencia**: R-CREW-09 en escritorio y móvil.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-18

### H-094 · Los botones de canjear y equipar ocultan el coste y el estado a los lectores de pantalla
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/crew/CrewProfile.jsx:183` y `:198`.
- **Reproducción**: ver R-CREW-13 y R-CREW-11. Leer el nombre accesible de un botón de canje sin tickets suficientes y el de «Equipar» mientras guarda.
- **Esperado**: el nombre accesible incluye el texto visible (WCAG 2.5.3).
- **Observado**: el botón muestra «Faltan 11.9», pero su nombre accesible es «Canjear Grafitero Spray». Los botones «Equipar X» conservan ese nombre mientras muestran «Guardando…».
- **Evidencia**: R-CREW-13 y R-CREW-11; TECLADO-mi-crew.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-19

### H-095 · Los números y plurales del perfil Crew no siguen el formato español
- **Categoría**: funcional (texto)
- **Severidad**: menor
- **Ubicación**: `src/features/crew/CrewProfile.jsx:204`, `:338`, `:362`, `:408` y `:445` usan punto decimal, frente a la coma de `:144` y el separador de miles de `:115`. El plural está en `:326` («{n} piezas»).
- **Reproducción**: ver R-CREW-10, R-CREW-13 y R-CREW-15. Abrir el perfil de una cuenta nueva y el de una cuenta con tickets.
- **Esperado**: coma decimal, separador de miles y singular cuando toca, como en la puerta de la Crew.
- **Observado**: el perfil muestra «11.7 Crew Tickets», «+11.7 tickets» y «Faltan 11.9», mientras la puerta usa «0,1 ticket» y «3.000 XP». Un perfil nuevo enseña «1 piezas en la taquilla».
- **Evidencia**: R-CREW-10, R-CREW-13 y R-CREW-15; R-CREW-07 para la puerta (E1).
- **Entorno**: E2 simulado y E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-20, C-CHAT-27

### H-096 · Leer el perfil Crew reescribe entero el almacén cifrado
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `server/services/crew/rewards.mjs:293-299` con `server/storage/encrypted-file-store.mjs:122-128`.
- **Reproducción**: ver R-CREW-10. Recargar `/mi-crew` con sesión y mirar la fecha de modificación del fichero del almacén.
- **Esperado**: una lectura (GET) no escribe.
- **Observado**: cada `GET /account/crew` cambia la fecha de modificación del fichero cifrado: lo reescribe entero.
- **Evidencia**: R-CREW-10.
- **Entorno**: E2 simulado
- **Fase propuesta**: 4
- **Origen**: C-CHAT-21

### H-097 · `useCrewProfile` devuelve un objeto nuevo en cada render y anula la memoización de la tienda
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/crew/useCrewProfile.js:52-59`, con `src/features/storefront/useStorefront.js:29-31`, `:63` y `:87`.
- **Reproducción**: lectura del código (R-CREW-10).
- **Esperado**: un valor estable, para que el `useMemo` sirva.
- **Observado**: `useStorefront` usa el objeto entero como dependencia de su `useMemo`, así que el objeto `commerce` se recrea en cada render. No se midió el coste en ejecución.
- **Evidencia**: lectura del código.
- **Entorno**: código
- **Fase propuesta**: 4
- **Origen**: C-CHAT-22

### H-098 · Un marco equipado no se puede quitar
- **Categoría**: funcional
- **Severidad**: menor (puede ser una carencia de producto)
- **Ubicación**: `server/services/crew/rewards.mjs:425-447` y `src/features/crew/CrewProfile.jsx:174-176`.
- **Reproducción**: ver R-CREW-11. Equipar un marco y buscar cómo quitarlo.
- **Esperado**: una opción «Sin marco», si el producto lo quiere.
- **Observado**: no hay ningún control para quitarlo («Quitar» o «Sin marco»). Solo se puede cambiar por el otro marco propio.
- **Evidencia**: R-CREW-11.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-CHAT-23

### H-099 · Cambiar el hash estando en `/crew` centra el cromo nuevo pero no lo gira
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/crew/Crew.jsx:139` (`useState(autoGirado)`) y `:144-158`.
- **Reproducción**: ver R-CREW-04. En `/crew#rocky`, cambiar el hash a `#ollie`, o ir atrás y adelante.
- **Esperado**: el cromo del enlace se gira, como al entrar en la página.
- **Observado**: centra a Ollie y lo apunta en la colección (2/25), pero el único cromo girado sigue siendo Rocky.
- **Evidencia**: R-CREW-04 en escritorio y móvil.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-24

### H-100 · Los lectores de pantalla no reciben la puntuación de las estadísticas del cromo
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/crew/Crew.jsx:42`: `StatDianas` pone un `aria-label` en un `<span>` sin rol, algo que ARIA no permite.
- **Reproducción**: ver R-CREW-02. Leer el árbol de accesibilidad de un cromo.
- **Esperado**: algo como «Pulso, 5 de 5».
- **Observado**: las estadísticas salen como «listitem: Pulso / Sigilo / Tinta», sin «N de 5»: Chrome no expone el `aria-label` del `span`. Lighthouse marca además `aria-prohibited-attr` en `/crew` (`metricas.md`, apartado 2.1); no se ha comprobado que sea por este elemento.
- **Evidencia**: `ariaSnapshot` de R-CREW-02. Lighthouse lo marca como `aria-prohibited-attr` en `/crew` (144 apariciones en las pasadas de `metricas.md`).
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-25

### H-101 · «¡Enlace copiado!» no se anuncia
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/crew/Crew.jsx:324-326`.
- **Reproducción**: ver R-CREW-05. Copiar el enlace de un cromo.
- **Esperado**: el aviso llega a los lectores de pantalla a través de una región viva.
- **Observado**: el botón cambia a «¡Enlace copiado!» durante 2,2 s, y ni él ni sus ancestros tienen `aria-live`.
- **Evidencia**: R-CREW-05 en escritorio y móvil.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-CHAT-26

### H-102 · El aro de foco de los cromos desaparece con el ratón encima
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/styles/pages/crew.css`. La regla de foco (`:287-289`, con `:has(:focus-visible)`) pierde frente a la de `:hover` (`:311-314`), que tiene la misma especificidad y va después. Además, `:478` quita el contorno del botón (`.crew-girar:focus-visible { outline: none }`).
- **Reproducción**: ver TECLADO-crew y R-CREW-02. Con el teclado, girar un cromo y volver a su botón; poner el ratón encima del cromo sin hacer clic.
- **Esperado**: el aro se mantiene mientras el cromo tiene el foco, con el ratón encima o sin él.
- **Observado**: sin el ratón, la sombra incluye el aro rojo (`rgb(230, 57, 70) 0 0 0 3px, …`). Con el ratón encima pasa a `rgb(26, 26, 26) 8px 8px 0 0`, sin aro, aunque el foco sigue en el cromo.
- **Evidencia**: `out/teclado.json`; capturas `capturas-e1/chat-crew/evidencia-TECLADO-crew-foco-sin-raton.png` y `evidencia-TECLADO-crew-foco-con-raton-encima.png`.
- **Entorno**: E1, escritorio
- **Fase propuesta**: 2
- **Origen**: N-CHAT-2

### H-103 · Un límite numérico fuera de rango vuelve en silencio al valor por defecto
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/config/env.mjs:5-12` (`readPositiveInteger`) y `server/config/app.mjs:110` (`CHAT_RATE_LIMIT_MAX`, máximo 50). Afecta también a `CHAT_GLOBAL_DAILY_MAX`, `SHOPIFY_RATE_LIMIT_MAX`, `AVISOS_RATE_LIMIT_MAX` y otras variables. `.env.example:17` no dice cuál es el máximo (ver también H-006).
- **Reproducción**: arrancar con `CHAT_RATE_LIMIT_MAX=500`, mandar `POST /api/chat` y leer `RateLimit-Limit` y el log de arranque. Repetir con 50.
- **Esperado**: que un valor fuera de rango haga fallar el arranque, o al menos deje un aviso en el log. El comentario de `env.mjs` ya contempla las dos salidas.
- **Observado**: con 500, `RateLimit-Limit` es 5, el límite más estricto, y el log solo dice «ROCKY 035 server listening». Con 50, `RateLimit-Limit` es 50. Durante la auditoría esto provocó 429 inesperados en una batería de pruebas del chat.
- **Evidencia**: `out/probe-config.json` (puertos 3308 y 3309).
- **Entorno**: E1, API
- **Fase propuesta**: 2
- **Origen**: N-CHAT-4

### H-104 · Las tarjetas de Rocky IA enseñan «Default Title» en los productos de variante única
- **Categoría**: funcional (contenido)
- **Severidad**: menor
- **Ubicación**: `server/services/chat/commerce.mjs:180-185`, donde `variantLabel` usa los valores de `selectedOptions`, y `src/features/chat/ChatProductCard.jsx:104`. El carrito sí lo oculta (`src/features/cart/Cart.jsx:145-149`).
- **Reproducción**: ver R-CHAT-09. Escribir «Enséñame camisetas disponibles» y mirar la tarjeta de 35 RED.
- **Esperado**: «Talla única».
- **Observado**: la tarjeta dice «Default Title» bajo el precio.
- **Evidencia**: R-CHAT-09 en escritorio y móvil. La forma de `selectedOptions` es la de la Storefront API real.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: N-E2-2

### H-105 · El «● REC» del LCD nunca se pone rojo ni parpadea
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:392` usa la clase `on`, pero `src/styles/components/beat-machine.css:124` y `:852` esperan `.is-on`; además, incumple la convención `is-*`.
- **Reproducción**: ver R-STU-15. Activar REC y mirar el LCD.
- **Esperado**: «● REC» en rojo y parpadeando.
- **Observado**: el nodo lleva la clase «lcd-rec on», con color `rgba(255,253,248,0.5)` y sin animación. El mismo nodo con «lcd-rec is-on» se pinta en `rgb(230,57,70)` con la animación `lcd-latido`. El LED del botón REC sí parpadea.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-15-escritorio-lcd.png` y `R-STU-15-movil-lcd.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-04

### H-106 · La mesa promete que un enlace «se abre sonando», y no suena
- **Categoría**: funcional (texto)
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:641-644`.
- **Reproducción**: ver R-STU-04. Abrir `/estudio?beat=<Trap>&bpm=120&swing=0.1&tono=re` y esperar.
- **Esperado**: o el beat suena tras un gesto del usuario, con un aviso claro, o el texto no lo promete. El navegador bloquearía la reproducción automática sin un gesto.
- **Observado**: la rejilla y los mandos se cargan, pero a los 5 s el LCD sigue en «■ STOP», sin AudioContext, sin voces y sin ningún aviso. La nota de la mesa dice «Comparte el enlace y tu beat se abre sonando.».
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-04-escritorio.png` y `R-STU-04-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-05

### H-107 · Publicar un beat repetido de uno oculto dice «te lo enseñamos», pero no se ve
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/services/beats.mjs:161-168` busca el beat repetido también entre los ocultos, frente a `:144`.
- **Reproducción**: ver R-STU-20. Ocultar un beat con 3 reportes y publicar uno idéntico.
- **Esperado**: el repetido se busca solo entre los beats visibles, o el mensaje no promete enseñarlo.
- **Observado**: la respuesta es 200 con `duplicate=true` y el id del beat oculto. La nota dice «Ese beat ya estaba en el ranking: te lo enseñamos.», pero la lista no lo incluye y ninguna fila tiene `is-new`. Pasa lo mismo con un repetido que ya no está entre los 30 más nuevos.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-20-escritorio.png` y `R-STU-20-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-06

### H-108 · `GET /api/beats` no tiene límite de peticiones y carga todo el almacén en cada lectura
- **Categoría**: seguridad observada (los candidatos la clasificaron como rendimiento y abuso)
- **Severidad**: menor
- **Ubicación**: `server/http/routes/beats.mjs:87-97` y `server/services/beats.mjs:135-139` y `:142-155`.
- **Reproducción**: ver R-STU-22. Lanzar 150 `GET /api/beats` en paralelo.
- **Esperado**: un límite de peticiones, como el del resto de rutas de beats.
- **Observado**: las 150 peticiones responden 200, sin cabeceras `RateLimit-*`. Según el código, cada lectura carga del almacén todos los registros, hasta 1000; no se midió el coste.
- **Evidencia**: R-STU-22.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-08

### H-109 · El filtro de palabras del ranking tiene falsos positivos y culpa al nombre cuando el rechazado es el apodo
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/services/beats-filter.mjs:20`, `:69`, `:83-85` y `:97`, y `server/services/beats.mjs:75-76`.
- **Reproducción**: ver R-STU-19. Publicar beats llamados «Cono de luz» y «Amar icono», y otro con un nombre limpio y el apodo «cabron».
- **Esperado**: los nombres legítimos se aceptan, y el mensaje dice qué campo falla.
- **Observado**: «Cono de luz» y «Amar icono» reciben 400 «Ese nombre no puede ir en el ranking. Prueba con otro.»: «coño» normalizado queda en «cono», y al pegar las palabras aparece un insulto. Con el apodo rechazado, el mensaje también habla del «nombre».
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-19-escritorio.png` y `R-STU-19-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-09

### H-110 · El chip «Boom bap» sale marcado aunque el patrón cargado sea otro
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:120`. `activePreset` arranca siempre en `boombap`.
- **Reproducción**: ver R-STU-07. Con Trap guardado, recargar; o abrir un enlace de Drill.
- **Esperado**: marcado el chip del patrón cargado, o ninguno.
- **Observado**: la rejilla es de Trap (o de Drill), pero el chip marcado es «Boom bap».
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-07-escritorio.png` y `R-STU-07-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-10

### H-111 · El atajo «Espacio arranca» no se puede usar
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:263`, `:268` y `:275-279`. El manejador solo actúa si el foco está dentro de la mesa y no está en un botón, un enlace o un campo.
- **Reproducción**: ver R-STU-06 y R-STU-13. Buscar en la mesa un elemento enfocable que no sea botón, enlace ni campo, y pulsar Espacio.
- **Esperado**: Espacio arranca y para el transporte.
- **Observado**: dentro de `.mesa-wrap` no hay ninguno. Con el foco en una celda, Espacio la cambia de estado en vez de arrancar; con el foco en Tempo no hace nada; y al hacer clic en el LCD el foco va a `main`, fuera de la mesa. La interfaz no promete el atajo: solo lo menciona un comentario del código.
- **Evidencia**: R-STU-06; captura `capturas-e1/estudio/R-STU-06-escritorio.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-11

### H-112 · Las celdas del secuenciador no distinguen fantasma, golpe y acento, y borrar en táctil depende del menú contextual
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:559-560` y `:562-565`.
- **Reproducción**: ver R-STU-05 y R-STU-06. Leer el árbol de accesibilidad de una celda con acento y de otra con golpe fantasma, e intentar borrar una celda con una pulsación larga.
- **Esperado**: el estado de la celda aparece en su nombre o en su valor, y hay una forma de borrar en táctil.
- **Observado**: «Bombo, paso 1» (con acento) y «Hi-hat, paso 3» (fantasma) solo difieren en el nombre: los dos son `button "…" [pressed]`. Borrar depende del evento `contextmenu`, y la ayuda dice «botón derecho borra» también en móvil. La pulsación larga no se pudo comprobar en Chrome emulado, y el caso de iOS queda pendiente de un iPhone real.
- **Evidencia**: `ariaSnapshot` de R-STU-06.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-13

### H-113 · El botón de silenciar se llama como la pista, y los chips de ritmo no exponen su estado
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:513-521` (silenciar) y `:484-491` (chips de ritmo), frente a los chips de banco (`:589`).
- **Reproducción**: ver R-STU-07 y R-STU-11. Leer el nombre y `aria-pressed` del botón de silenciar el bombo y de los chips.
- **Esperado**: un nombre como «Silenciar Bombo», con su estado, y chips de ritmo con `aria-pressed`, como los de banco.
- **Observado**: el botón de silenciar se llama «Bombo» y tiene `aria-pressed=true` cuando está silenciado; el estado solo se explica en el `title`. Los chips de ritmo tienen `aria-pressed=null`.
- **Evidencia**: R-STU-07 y R-STU-11.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-14

### H-114 · Las pestañas del ranking y los colores del spray usan roles compuestos, pero no responden a las flechas
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/Ranking.jsx:141-156` (`tablist` y `tab`) y `src/features/night/spray/Spray.jsx:351-409` (`role="radio"`).
- **Reproducción**: ver R-STU-22, TECLADO-pestañas, R-NIGHT-20 y TECLADO-spray. Con el foco en una pestaña o en un color, pulsar la flecha derecha.
- **Esperado**: las flechas mueven el foco dentro del grupo, y el grupo es una sola parada de Tab.
- **Observado**: las dos pestañas tienen `tabIndex` 0 y las flechas no hacen nada: se usan con Tab y Enter. Cada color del spray es una parada de Tab, y la flecha derecha en «Lima» no mueve ni el foco ni la selección.
- **Evidencia**: R-STU-22 y R-NIGHT-20; captura `capturas-e1/noche-musica/TECLADO-spray-escritorio.png`.
- **Entorno**: E1, escritorio
- **Fase propuesta**: 2
- **Origen**: C-STU-15, C-NOCHE-21 (solo la parte de las flechas; la del foco está en H-016)

### H-115 · La barra de Rocky IA anida un `role="status"` dentro de una región `aria-live`
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/Barra.jsx:71` y `:83-87`.
- **Reproducción**: ver R-STU-31 y R-STU-32. Leer la estructura de `.mesa-barra` cuando muestra un mensaje.
- **Esperado**: una sola región viva.
- **Observado**: `.mesa-barra` tiene `aria-live=polite` y dentro lleva el `<p role="status">` del mensaje (por ejemplo, «Barra copiada.»). No se pudo oír si un lector lo anuncia dos veces, porque no se usó lector de pantalla.
- **Evidencia**: R-STU-31 y R-STU-32.
- **Entorno**: E1 y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-STU-16

### H-116 · Los mensajes genéricos de error hablan de «la tienda» fuera de la tienda
- **Categoría**: funcional (texto)
- **Severidad**: menor
- **Ubicación**: los mensajes genéricos de `src/api/http.js:14-15`. La barra no usa `chatErrorMessage` (`src/api/chat.js:25-33` y `:53-55`, `src/features/studio/Barra.jsx:45`). Publicar un beat: `src/features/studio/ranking/PublishBeat.jsx:46`.
- **Reproducción**: ver R-STU-32, R-ERR-12 y R-GATE-09.
  - Pedir una barra con Express parado, con un 500 sin cuerpo y con un 403 de origen.
  - Publicar un beat sin red.
  - Provocar una respuesta que no sea JSON en Rocky IA y en avisos.
- **Esperado**: textos con la voz de cada sitio (Rocky IA, el estudio), no la de la tienda.
- **Observado**: la barra muestra «No se ha podido conectar con la tienda.», «La tienda no ha podido completar la operación.» y «Petición de origen no confiable.». Publicar un beat sin red da «No se ha podido conectar con la tienda.». La burbuja de Rocky IA y el formulario de avisos dicen «La tienda no ha podido completar la operación.».
- **Evidencia**: R-STU-32, R-ERR-12 y R-GATE-09; capturas `capturas-e1/estudio/R-STU-32-escritorio.png` y `R-STU-32-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-17, C-TRANS-30. Relacionado con H-148 (mismo síntoma, «La tienda no ha podido completar la operación.», con otra causa); conviene arreglarlos juntos

### H-117 · Al pasar de un beat del ranking a otro, el nuevo entra a mitad de compás
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/useRankingPlayer.js:62-63`.
- **Reproducción**: ver R-STU-25. Con «Lento» sonando en los pasos 5-6, pulsar ▶ en «Otro lento».
- **Esperado**: el beat nuevo empieza en el paso 1.
- **Observado**: el cabezal del beat nuevo sigue en los pasos 6, 7…
- **Evidencia**: R-STU-25 en escritorio y móvil.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-18

### H-118 · La mesa y el ranking crean cada uno su propio `AudioContext`
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/audio/engine.js:1` y `:139-141`; `src/features/studio/BeatMachine.jsx:157-167`; `src/features/studio/ranking/useRankingPlayer.js:51-57`.
- **Reproducción**: ver R-STU-24 y R-STU-26. Tocar la mesa y escuchar un beat del ranking; después, salir de `/estudio`.
- **Esperado**: un solo `AudioContext` para todo el estudio, como dice el comentario.
- **Observado**: hay 2 contextos `running`, y el del ranking sigue `running` después de pararlo. Los dos se cierran al salir de la página. La promesa de `ctx.resume()`, que nadie trata, solo se ve en el código: no hubo errores en la consola.
- **Evidencia**: R-STU-24 y R-STU-26.
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-STU-19

### H-119 · De noche, la setlist del estudio marca BARRO mientras suena MODO NEÓN
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/Studio.jsx:8` y `:75-97` recorren siempre `TRACKS`, mientras que de noche la radio usa `NIGHT_TRACKS` (`src/features/music/MusicContext.jsx:28-29` y `:50`).
- **Reproducción**: ver R-STU-02 y R-MUS-05. Activar el descontrol y abrir `/estudio`; pausar y pulsar la fila «BARRO».
- **Esperado**: la setlist enseña la cinta que suena.
- **Observado**: el radiocasete dice «Sonando: MODO NEÓN» y la setlist solo lista «BARRO», marcada como activa y con el indicador girando. Al pulsar esa fila suena `/music/modo-neon.m4a`.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-02-escritorio.png` y `R-STU-02-movil.png`, y `capturas-e1/noche-musica/R-MUS-05-estudio-noche-escritorio.png` y `R-MUS-05-estudio-noche-movil.png`.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-STU-20, C-NOCHE-01

### H-120 · Con REC encendido, los pads sin pista suenan pero no se graban, y nada lo avisa
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/BeatMachine.jsx:250-251` y `src/features/studio/audio/drumKit.js:56-58`.
- **Reproducción**: ver R-STU-15. Con REC activo y la mesa sonando, tocar Rim, Shaker, Crash, 808 caída y Redoble, y los bancos Teclas y Efectos.
- **Esperado**: o se graban, o la mesa avisa de que esos pads no se graban.
- **Observado**: suenan, la rejilla no cambia y no sale ningún aviso.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-15-escritorio.png` y `R-STU-15-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-21

### H-121 · El pad de una pista silenciada no suena
- **Categoría**: funcional
- **Severidad**: menor (puede ser intencionado: es una decisión de producto)
- **Ubicación**: `src/features/studio/audio/drumKit.js:20` y `:45`. El pad sale por el canal de su pista, y ese canal está a cero.
- **Reproducción**: ver R-STU-12. Silenciar el bombo y tocar el pad 1.
- **Esperado**: por decidir: o el pad suena siempre, o sigue el silencio de su pista y la interfaz lo deja claro.
- **Observado**: el pad arranca sus 2 voces, pero el nivel del canal maestro se queda en 0,0000 (0,5776 sin silenciar). Rim, que no tiene pista, sí suena (0,2164).
- **Evidencia**: R-STU-12 en escritorio y móvil.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-22

### H-122 · Si el autocompletado rellena el campo trampa, el beat se descarta y la web dice «Publicado»
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/PublishBeat.jsx:33`, `:37-41` y `:92-99`, y `server/http/routes/beats.mjs:106`.
- **Reproducción**: ver R-STU-21. Rellenar el campo oculto `web` y publicar.
- **Esperado**: si el beat no se guarda, el usuario no lee «Publicado».
- **Observado**: la respuesta es 201 con `{beat:null}`. La nota dice «Publicado. Ya suena en «Nuevos».», pero el servidor sigue con 11 beats y el ranking no cambia. El campo tiene `tabIndex -1`, `autocomplete=off` y `aria-hidden`, y está fuera de la pantalla; no se pudo reproducir que lo rellene el autocompletado de un navegador real.
- **Evidencia**: R-STU-21, paso 3.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-23

### H-123 · En móvil no se puede cambiar el volumen de cada pista
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/styles/components/beat-machine.css:774-782` oculta el control a 900 px o menos.
- **Reproducción**: ver R-STU-11. A 375 px, con niveles guardados, buscar el volumen de cada pista.
- **Esperado**: el nivel guardado se puede cambiar también en móvil.
- **Observado**: los 8 controles `.pista-nivel` tienen `display: none`. El motor sigue aplicando el nivel guardado (el bombo a 0,2), pero no hay forma de cambiarlo.
- **Evidencia**: R-STU-11 en móvil.
- **Entorno**: E1, móvil
- **Fase propuesta**: 2
- **Origen**: C-STU-25

### H-124 · Cerrar la barra de Rocky IA no cancela la petición: el panel vuelve a abrirse solo y gasta cupo
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/Barra.jsx:29-47`: `ask` no usa `AbortController` y, al llegar la respuesta, no mira si el panel se cerró. «Cerrar» solo pone el estado en `idle` (`:102-110`). El cupo se gasta en `server/services/chat/barra.mjs:34` y `:189-191`.
- **Reproducción**: ver R-STU-31 y R-STU-32. Pulsar «Rocky IA, rapéame» y, mientras sale «Rocky IA está escribiendo…», pulsar «Cerrar». Para tener tiempo, la respuesta se retrasó.
- **Esperado**: el panel se queda cerrado y la petición se cancela, o su resultado se descarta.
- **Observado**:
  - En E1, a los 150 ms el panel está cerrado y a los 2 s vuelve a abrirse con la respuesta («Rocky IA no está configurado.»). La petición no se cancela: no hay ningún `requestfailed`.
  - En E2 simulado, con el modelo tardando 2,5 s y «Cerrar» a los 200 ms, la petición responde 200 y cuenta como una llamada al modelo.
  - Que cada clic pueda gastar hasta 2 unidades del cupo diario se ve en el código.
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-32-escritorio.png` y `R-STU-32-movil.png`; R-STU-31 en E2.
- **Entorno**: E1 y E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-STU-26, N-STU-3

### H-125 · Un aviso del ranking sustituye para siempre a la nota de ayuda
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/Ranking.jsx:42`, `:93`, `:106`, `:108`, `:126` y `:253-255`.
- **Reproducción**: ver R-STU-27 y R-STU-28. Provocar «Ese beat no existe.» o reportar un beat («Gracias: lo miramos.») y después dar un «me mola» correcto a otro.
- **Esperado**: el aviso se limpia y vuelve la nota «* Un «me mola» por navegador…». Los errores tienen estilo de error.
- **Observado**: el aviso se queda. Además, el error tiene el mismo gris que la nota de ayuda (`rgb(124,118,104)`).
- **Evidencia**: capturas `capturas-e1/estudio/R-STU-27-escritorio.png` y `R-STU-27-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-27

### H-126 · Moderación del ranking: llave en claro, botón «Quitar» con cualquier valor y límite compartido con los votos
- **Categoría**: seguridad observada
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/Ranking.jsx:44`, `src/config/storageKeys.js:12` y `server/http/routes/beats.mjs:153-156`.
- **Reproducción**: ver R-STU-30. Guardar cualquier valor en `localStorage['rocky-beats-admin']`. Con la llave correcta, quitar beats después de muchos «me mola» desde la misma IP.
- **Esperado**: la llave no vive en claro en el navegador, «Quitar» solo aparece con una llave válida y moderar no compite con los votos.
- **Observado**: Aclaración tras la revisión independiente: `DELETE /api/beats/:id` responde 404 cuando el servidor no tiene `BEATS_ADMIN_TOKEN`, sea cual sea la llave enviada; con el token configurado, una llave incorrecta da 401 (`server/http/routes/beats.mjs:153-163`).
  - «Quitar» aparece con cualquier valor: con «cualquier-cosa» responde 404 «Ruta no encontrada.» y con otro valor, 401 «No autorizado.».
  - La llave, de 32 caracteres, se guarda en claro en `localStorage`, y no hay interfaz para ponerla.
  - Tras 57 «me mola» desde la misma IP, el `DELETE` recibe 429 «Demasiadas peticiones. Inténtalo más tarde.».
- **Evidencia**: R-STU-30; captura `capturas-e1/estudio/R-STU-30-escritorio.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-STU-28

### H-127 · Tras remezclar, la vista salta a la mesa pero el foco se queda en el ranking
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/Studio.jsx:32-39` desplaza la vista a `.mesa-section` sin mover el foco, y `src/features/studio/ranking/Ranking.jsx:112-117` deja el botón pulsado donde está.
- **Reproducción**: ver R-STU-29 y TECLADO-ranking. Con el teclado, pulsar Enter dos veces en «Remezclar».
- **Esperado**: el foco acompaña a la vista, o se anuncia que la mesa ha cambiado.
- **Observado**: la página baja a la mesa (cuando no sube arriba por H-041), pero `document.activeElement` sigue siendo «Remezclar». El siguiente Tab devuelve la vista al ranking, y no se anuncia nada.
- **Evidencia**: `resultados-e1/estudio.tsv` (TECLADO-ranking).
- **Entorno**: E1, escritorio
- **Fase propuesta**: 2
- **Origen**: N-STU-4

### H-128 · En táctil, los botones deshabilitados de publicar y de la barra no dicen por qué
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/studio/ranking/PublishBeat.jsx:50-61` y `src/features/studio/Barra.jsx:56-67`. El motivo solo va en el atributo `title`.
- **Reproducción**: ver R-STU-08. En móvil, pulsar «Limpiar» e intentar publicar o pedir la barra.
- **Esperado**: un texto visible que explique que hace falta algún golpe.
- **Observado**: los dos botones quedan `disabled`, con los `title` «Pon algún golpe antes de publicar» y «Pon algún golpe antes». En táctil el `title` no se muestra y no hay otro aviso.
- **Evidencia**: `resultados-e1/estudio.tsv` (R-STU-08, móvil).
- **Entorno**: E1, móvil
- **Fase propuesta**: 2
- **Origen**: N-STU-5

### H-129 · «Tema siguiente» y «Tema anterior» no hacen lo que dicen con un solo tema por cinta
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/music/MusicContext.jsx:126-139` y `src/features/music/Boombox.jsx:302-315`.
- **Reproducción**: ver R-MUS-03. Pulsar «Tema siguiente» con la cinta sonando y en pausa, y «Tema anterior» pasados 3 s y antes de 3 s.
- **Esperado**: o los mandos no aparecen cuando hay un solo tema, o hacen algo coherente con su nombre.
- **Observado**: «Tema siguiente» con la cinta sonando no hace nada visible (de 2,72 a 3,15 s), y en pausa la reanuda sin reiniciarla. «Tema anterior» reinicia el tema pasados 3 s; antes de 3 s, sigue sonando, o la pone a sonar si estaba en pausa.
- **Evidencia**: R-MUS-03 en los dos viewports.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-02

### H-130 · Si la cinta falla, la radio no avisa y no se recupera sin recargar
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/music/MusicContext.jsx:32-41`, `:91` y `:198`. `toggle` vuelve a intentar `play()` sin llamar antes a `load()`.
- **Reproducción**: ver R-MUS-07 y R-MUS-08. Hacer que `play()` se rechace (`NotAllowedError`) o bloquear la pista; después, desbloquearla y pulsar «Reproducir».
- **Esperado**: un aviso del fallo, y que el reintento vuelva a cargar la fuente.
- **Observado**: la píldora sigue en «Reproducir BARRO», sin aviso. Tras desbloquear la pista, el audio sigue con `paused=true`, `error=4` y `readyState=0`. De día no se recupera sin recargar la página; de noche, solo apagando y encendiendo el descontrol.
- **Evidencia**: capturas `capturas-e1/noche-musica/R-MUS-08-escritorio.png` y `R-MUS-08-movil.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-03

### H-131 · Encender el descontrol pone música sin avisar
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/components/NavBar.jsx:123-129` y `src/features/music/MusicContext.jsx:109-122`.
- **Reproducción**: ver R-NIGHT-01 y R-MUS-05. Sin haber tocado la radio, pulsar la bombilla.
- **Esperado**: el control avisa de que va a sonar audio, o la música no arranca sin que el usuario la pida.
- **Observado**: se pide `/music/modo-neon.m4a` (1 022 472 B) y empieza a sonar. El botón solo se llama «Activar el descontrol».
- **Evidencia**: R-NIGHT-01 y R-MUS-05 en los dos viewports.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-04

### H-132 · La barra de progreso de la radio avanza 0,1 s por pulsación de flecha y se anuncia sin unidad
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/features/music/Boombox.jsx:289-298`.
- **Reproducción**: ver R-MUS-10 y TECLADO-radio. Mover la barra con las flechas y leer el árbol de accesibilidad.
- **Esperado**: pasos útiles y un `aria-valuetext` con el tiempo.
- **Observado**: la barra va de 0 a 100 en pasos de 0,1, sin `aria-valuetext`. Diez pulsaciones de flecha avanzan 1 punto, unos 0,113 s por pulsación en un tema de 1:53, y se expone como «slider "Progreso del tema": "0.6"». Fin lleva al final del tema y, como la cinta va en bucle, en la práctica lo reinicia.
- **Evidencia**: R-MUS-10.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-05

### H-133 · El radiocasete dice 0:00 / 0:00 hasta el primer play, mientras la setlist dice 1:53
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/music/Boombox.jsx:279`, `:301` y `:316`, y `src/features/music/MusicContext.jsx:191` (`preload="none"`).
- **Reproducción**: ver R-MUS-03. Abrir `/estudio` sin tocar la radio.
- **Esperado**: la misma duración en los dos sitios.
- **Observado**: el radiocasete marca «0:00 / 0:00» y la setlist, «1:53». Tras pulsar Reproducir pasa a «0:01 / 1:53». Arrastrar la barra antes del primer play no hace nada.
- **Evidencia**: R-MUS-03 en los dos viewports.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-06

### H-134 · Un comentario y un test dicen que en Rocky IA no hay pared de noche, pero sí la hay
- **Categoría**: operación (pruebas)
- **Severidad**: menor
- **Ubicación**: `src/features/night/Descontrol.jsx:165-170` y `src/features/night/Descontrol.test.jsx:44-48`.
- **Reproducción**: ver R-NIGHT-11. Activar el descontrol en `/rockyIA`.
- **Esperado**: el comentario y el test describen lo que pasa, y el test lo comprueba.
- **Observado**: en `/rockyIA` se montan `uv-wall` y `uv-oscuridad`, sin bote ni lienzo. El comentario dice «ahí no hay pared», y el test «en el chat no hay pared ni spray» solo comprueba que no hay bote.
- **Evidencia**: R-NIGHT-11 en los dos viewports.
- **Entorno**: E1 y tests
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-07

### H-135 · El lienzo del spray ocupa toda la página en cada ruta de noche, aunque nadie pinte
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/night/spray/Spray.jsx:81-99` y `:110-129`.
- **Reproducción**: ver R-NIGHT-22. Activar el descontrol en `/` y en `/crew` sin coger el spray, y cambiar el ancho de la ventana con trazos guardados.
- **Esperado**: el lienzo se crea al coger el spray.
- **Observado**:
  - En escritorio el lienzo mide 5,76 Mpx (unos 23 MB) en `/` y 7,7 Mpx (unos 31 MB) en `/crew`. En móvil, 1,74 Mpx (unos 7 MB) y 5,78 Mpx (unos 23 MB). En estas páginas no se llega al tope de 12 Mpx.
  - Se crea una vez por página: al bajar por `/crew` y cargarse las imágenes no se rehízo, porque la altura no cambió.
  - Cada cambio de ancho lo rehace y lo repinta entero. Con 5800 puntos tarda entre 454 y 504 ms en móvil con la CPU ralentizada ×4 (tareas largas de 484 ms) y entre 66 y 81 ms en escritorio.
- **Evidencia**: R-NIGHT-22.
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-NOCHE-09

### H-136 · La linterna repinta la ventana entera en cada movimiento
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/night/torch.js:22-49`, `src/features/night/Descontrol.jsx:66-108` y `src/styles/components/descontrol.css:25-47` y `:163-174`.
- **Reproducción**: ver R-NIGHT-06, R-NIGHT-07 y R-NIGHT-22. Grabar una traza de 2 s moviendo el puntero y haciendo scroll, de día y de noche.
- **Esperado**: un coste de pintado acotado en móviles de gama baja.
- **Observado**: en móvil, con la CPU ralentizada ×4, hay 240 repintados de pantalla completa de noche frente a 2 de día; en escritorio, 681 frente a 304. En Chrome headless se mantuvieron los 60 fps; medir el coste en la GPU de un móvil de gama baja requiere un dispositivo real.
- **Evidencia**: trazas de R-NIGHT-22.
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-NOCHE-10

### H-137 · Cada componente con `useNightMode` crea su propio `MutationObserver`
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `src/features/night/useNightMode.js:7-15`.
- **Reproducción**: ver R-NIGHT-08 y R-NIGHT-09. Contar los `MutationObserver` que observan `<html>` filtrando por `data-theme`.
- **Esperado**: un solo observador compartido.
- **Observado**: hay 15 activos en `/`, 60 en `/crew` y 11 en `/estudio`.
- **Evidencia**: R-NIGHT-08 y R-NIGHT-09.
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-NOCHE-11

### H-138 · El spray arrastra estado de la página anterior al cambiar de ruta
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/features/night/spray/Spray.jsx`.
  - `:166-183`: los `requestAnimationFrame` del chorretón no se cancelan.
  - `:284-287`: si se cambia de ruta a mitad de un trazo, se guarda con la ruta vieja.
  - `:67`, `:291-295` y `:309-320`: `confirmClear` no se reinicia.
- **Reproducción**: ver R-NIGHT-15 y R-NIGHT-17.
  - Dejar crecer un chorretón y cambiar de ruta.
  - Pintar con el botón pulsado e ir atrás.
  - Armar «Borrar» y cambiar de ruta antes de 3 s.
- **Esperado**: cada página conserva solo su pintada.
- **Observado**:
  - En `/crew`, sin trazos propios, quedan entre 140 y 272 px pintados bajo el punto del chorretón de `/`.
  - `rocky-spray["/crew"]` acaba con los 2 trazos de `/`, y se pierde el de `/crew`.
  - «¿Borrar todo?», confirmado ya en `/crew`, deja esa página con 0 trazos.
- **Evidencia**: R-NIGHT-17; capturas `capturas-e1/noche-musica/R-NIGHT-17-escritorio.png` y `R-NIGHT-17-movil.png`.
- **Entorno**: E1. El chorretón y el caso de ir atrás, en escritorio.
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-12, C-NOCHE-14, C-NOCHE-20

### H-139 · La pintada guardada no coincide con lo que se ve: pierde el último trazo, recorta en silencio o no se guarda
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**:
  - `src/features/night/spray/Spray.jsx:101-107`, `:104` y `:131-139`: el guardado espera 300 ms, no hay `pagehide` y `timers.save` nunca vuelve a 0.
  - `src/features/night/spray/sprayStore.js:41-64`: el recorte a 6000 puntos solo se aplica a lo guardado.
  - `sprayStore.js:63` y `src/utils/storage.js:21-28`: nadie comprueba lo que devuelve `writeJson`.
- **Reproducción**: ver R-NIGHT-16, R-NIGHT-17 y R-NIGHT-21.
  - Pintar y recargar al momento.
  - Tras el primer guardado, navegar sin pintar.
  - Sembrar más de 6000 puntos.
  - Pintar con un `localStorage` que lanza errores.
- **Esperado**: tras recargar vuelve lo mismo que se veía, y si no se puede guardar, se avisa.
- **Observado**:
  - Recargar justo al soltar pierde el último trazo: había 1 guardado y sigue habiendo 1.
  - Tras el primer guardado, cada salida de esa página la reescribe y le renueva la marca de tiempo `t` (+1770 ms, +3823 ms). Ese dato es el que decide qué páginas se expulsan con `MAX_PAGES`.
  - Con 6600 puntos se guardan entre 5109 y 5113, y el trazo más viejo sigue visible hasta recargar.
  - Con `localStorage` roto, la ayuda sigue diciendo «se guarda sola hasta la próxima noche», y tras recargar la pared sale vacía.
- **Evidencia**: R-NIGHT-16, R-NIGHT-17 y R-NIGHT-21.
- **Entorno**: E1, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-13, C-NOCHE-15, C-NOCHE-17

### H-140 · Una pintada guardada con datos corruptos deja la página en blanco al encender el descontrol
- **Categoría**: funcional
- **Severidad**: menor (hace falta que `rocky-spray` tenga datos corruptos)
- **Ubicación**: `src/features/night/spray/sprayStore.js:23-33` (`isStroke` no valida `d`) y `src/features/night/spray/paint.js:139`.
- **Reproducción**: ver R-NIGHT-21. Guardar en `rocky-spray` un trazo con `"d": 5` y pulsar la bombilla.
- **Esperado**: el trazo inválido se descarta.
- **Observado**: salta «TypeError: (t.d || []).forEach is not a function», `#root` pasa de 2 hijos a 0 y la página queda en blanco, porque no hay ErrorBoundary (H-009). Al recargar vuelve el modo día, y encender otra vez en esa ruta lo repite.
- **Evidencia**: captura `capturas-e1/noche-musica/R-NIGHT-21-escritorio.png`.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-16

### H-141 · Si `toBlob` falla, la foto del spray dice «Pinta algo primero.»
- **Categoría**: funcional (texto)
- **Severidad**: menor
- **Ubicación**: `src/features/night/spray/Spray.jsx:327-329` y `src/features/night/spray/shareImage.js:153`.
- **Reproducción**: ver R-NIGHT-18. Con un trazo en la pared, forzar que `canvas.toBlob` devuelva `null` y pedir la foto.
- **Esperado**: un mensaje que corresponda al fallo real.
- **Observado**: el estado dice «Pinta algo primero.».
- **Evidencia**: R-NIGHT-18.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-19

### H-142 · En móvil, el bote y la caja del spray quedan por encima de la hoja del menú
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**:
  - La hoja (`.navbar-sheet`) tiene z-index 1000 (`src/styles/components/navbar.css:287-307` y `:293`).
  - El bote y la caja del spray tienen 1150 (`src/styles/components/spray.css:29`, `:54-73` y `:154-157`).
  - La hoja no está entre las zonas `INTERACTIVE` (`src/features/night/spray/Spray.jsx:18-19`).
  - El interruptor del descontrol está al pie de la hoja (`src/components/NavBar.jsx:297-299`).
- **Reproducción**: ver R-NIGHT-02 y R-NIGHT-03. A 375 px, con el descontrol activo:
  - abrir el menú y tocar el bote;
  - coger el spray y arrastrar el dedo por la hoja;
  - con el spray cogido, tocar «Apagar el descontrol».
- **Esperado**: el diálogo modal queda por encima, y no se pinta nada detrás.
- **Observado**:
  - Con la hoja abierta, tocar el bote abre la caja del spray.
  - Con el spray cogido, arrastrar el dedo por el papel vacío de la hoja guarda 1 trazo invisible en `/`.
  - El centro del interruptor (y = 734–780) queda bajo la caja (y = 692–800), así que para apagar hay que soltar antes el spray.
- **Evidencia**: capturas `capturas-e1/noche-musica/R-NIGHT-02-movil.png` y `R-NIGHT-03-movil.png`; `elementFromPoint` en el centro del interruptor devuelve `.spray-tools`.
- **Entorno**: E1, móvil emulado
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-22, N-NOCHE-1

### H-143 · El interruptor del descontrol cambia a la vez su nombre y `aria-pressed`
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: `src/components/NavBar.jsx:203-205`.
- **Reproducción**: ver R-NIGHT-20 y TECLADO-bombilla. Leer el árbol de accesibilidad de día y de noche.
- **Esperado**: o un nombre fijo con `aria-pressed`, o un nombre que cambia sin `aria-pressed`.
- **Observado**: de día es «button "Activar el descontrol"» y de noche «button "Apagar el descontrol" [pressed]». Cómo lo lee cada lector varía; en E1 no se pudo escuchar.
- **Evidencia**: `ariaSnapshot` de R-NIGHT-20.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-23

### H-144 · `modo-neon.m4a` y `theme-init.js` tienen permisos 600 en el árbol de trabajo y en `dist/`
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `public/music/modo-neon.m4a` y `public/theme-init.js`, y sus copias en `dist/`.
- **Reproducción**: ver R-MUS-08 y R-MUS-13. Comparar `ls -l` de esos ficheros con el modo que tienen en el índice de Git.
- **Esperado**: 644, como en el índice de Git.
- **Observado**: tienen 600 en el árbol de trabajo y en los builds hechos desde él, porque Vite conserva el modo; en Git son 100644. La instancia local los sirve sin error, y el `Dockerfile` copia con `--chown=node:node`. Pero cualquier despliegue que sirva `dist/` con otro usuario fallaría en la cinta de noche. `theme-init.js` no estaba en el candidato.
- **Evidencia**: R-MUS-08 y R-MUS-13.
- **Entorno**: código (árbol de trabajo)
- **Fase propuesta**: 2
- **Origen**: C-NOCHE-26

### H-145 · BARRO pesa 2,68 MB a 190 kbps, tres veces la tasa de MODO NEÓN
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `public/music/barro.m4a`, comparado con `public/music/modo-neon.m4a`.
- **Reproducción**: ver R-MUS-13. Pasar `ffprobe` por `dist/music/` y pulsar play con el panel de red abierto.
- **Esperado**: una tasa razonable para móvil y parecida entre las dos cintas.
- **Observado**: `barro.m4a` es AAC a 44,1 kHz, 2 679 868 B, 113,1 s y 189,5 kbps. `modo-neon.m4a` pesa 1 021 427 B, dura 127,2 s y va a 64,2 kbps. El primer play descarga BARRO entera, en una sola respuesta 206 a `bytes=0-`.
- **Evidencia**: `ffprobe` y R-MUS-13; `arte.md`, apartado 2.
- **Entorno**: E1
- **Fase propuesta**: 4
- **Origen**: C-NOCHE-27

### H-146 · El primer toque en una zona sin enlaces ni botones lleva la linterna al centro de `<main>`
- **Categoría**: funcional
- **Severidad**: menor. N-NOCHE-4 deja abierto subirla a importante por el 404 a oscuras en móvil, cuya pista dice «toca la pantalla para alumbrar».
- **Ubicación**: `src/features/night/torch.js:34-41`, donde `focusin` apunta la linterna al centro del elemento enfocado, y `src/App.jsx:107`, donde `<main>` tiene `tabIndex={-1}`.
- **Reproducción**: ver R-NIGHT-06 y R-NIGHT-10. Con el descontrol activo, en móvil, tocar un punto sin enlace ni botón (por ejemplo, 30,300) en `/` o en una ruta inexistente.
- **Esperado**: la linterna va al punto tocado.
- **Observado**:
  - El toque da el foco a `main`, y el `focusin` lleva la linterna a su centro.
  - En `/`, la deja en 188,2078 px en móvil y en 720,1748 px en escritorio, fuera de la pantalla.
  - En el 404, en móvil, la deja en 188,417 px se toque donde se toque.
  - Los toques siguientes sí mueven la linterna, hasta que el foco sale de `main`.
  - En escritorio lo corrige el siguiente movimiento del ratón.
- **Evidencia**: capturas `capturas-e1/noche-musica/R-NIGHT-06-movil.png` y `NUEVO-4-movil.png`.
- **Entorno**: E1, móvil emulado y escritorio
- **Fase propuesta**: 2
- **Origen**: N-NOCHE-4

### H-147 · En móvil, «MODO NEÓN» queda cortado en la cabecera del chat
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**: `/rockyIA` a 640 px o menos. `src/styles/components/mini-player.css:148-149` limita el título a `max-width: 48px`.
- **Reproducción**: ver R-MUS-12. A 375 × 812, abrir Rocky IA y activar el descontrol.
- **Esperado**: el título de la cinta se lee, o al menos se corta con puntos suspensivos.
- **Observado**: se ven 48 de sus 79 px: «MODO N». El nombre completo está en `title` y en `aria-label`. En escritorio cabe entero (88 de 92 px).
- **Evidencia**: captura `capturas-e1/noche-musica/R-MUS-12-chat-noche-movil.png`; `arte.md`, apartado 4 (fila de Rocky IA).
- **Entorno**: E1, móvil emulado
- **Fase propuesta**: 3
- **Origen**: N-NOCHE-6

### H-148 · Cuando caduca el acceso de la puerta, la web abierta solo dice «La tienda no ha podido completar la operación.»
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `src/api/http.js:37-43`, con `server/http/access-gate.mjs:204` y `:282`.
- **Reproducción**: ver R-GATE-09. Con la puerta activa, desbloquear y reiniciar el proceso (escritorio) o borrar la cookie (móvil); después, usar Rocky IA y los avisos.
- **Esperado**: la web detecta que el acceso ha caducado y lleva a la puerta.
- **Observado**: `/api/chat` y `/api/avisos` responden 404 `text/plain`. La burbuja de Rocky IA y el formulario de avisos muestran «La tienda no ha podido completar la operación.», sin decir nada del acceso. Al ir a `/estudio`, el trozo de la página da 404, la web recarga y aparece la puerta.
- **Evidencia**: R-GATE-09.
- **Entorno**: E1 con la puerta
- **Fase propuesta**: 2
- **Origen**: C-TRANS-06. Relacionado con H-116 (mismo síntoma, «La tienda no ha podido completar la operación.», con otra causa); conviene arreglarlos juntos

### H-149 · En algunos errores, la puerta responde con texto plano o JSON en vez de con su página
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/http/access-gate.mjs:121` y `:267`: tras un intento fallido la URL queda en `/access-gate`, y un GET a esa URL da 404. `server/http/access-gate.mjs:224`, con `server/http/middleware/error-handler.mjs:8-18`: un cuerpo demasiado grande se responde con JSON.
- **Reproducción**: ver R-GATE-05: fallar la clave y volver a cargar `/access-gate` con Intro en la barra de direcciones. Ver R-GATE-03: enviar más de 2 kB o más de 2 campos.
- **Esperado**: la página de la puerta, con su mensaje.
- **Observado**: el GET a `/access-gate` responde 404 `text/plain` «Not found.», también con el acceso ya desbloqueado. El POST con 3000 B o con 3 campos responde 413 `application/json` `{"message":"Petición demasiado grande."}`.
- **Evidencia**: R-GATE-05 y R-GATE-03 en los dos viewports.
- **Entorno**: E1 con la puerta
- **Fase propuesta**: 2
- **Origen**: C-TRANS-07, C-TRANS-27

### H-150 · Tras desbloquear la puerta se pierde la ruta que se había pedido
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/http/access-gate.mjs:260`.
- **Reproducción**: ver R-GATE-02. Con la puerta activa, pedir `/crew` y desbloquear.
- **Esperado**: volver a `/crew`.
- **Observado**: la respuesta es 303 `Location: /` y el navegador acaba en la portada.
- **Evidencia**: R-GATE-02.
- **Entorno**: E1 con la puerta
- **Fase propuesta**: 2
- **Origen**: C-TRANS-08

### H-151 · Con la puerta activa, `HEAD /` responde 404
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/http/access-gate.mjs:69-72`. `isDocumentRequest` solo acepta GET.
- **Reproducción**: ver R-GATE-07. Hacer `curl -I` a `/` con la puerta activa.
- **Esperado**: el mismo estado que el GET, para que los monitores de disponibilidad no vean la web caída.
- **Observado**: HEAD responde 404 `text/plain`, y GET, 200 con la puerta. Producción respondió igual el 2026-11-08.
- **Evidencia**: R-GATE-07; `metricas.md`, apartado 3.2 (producción).
- **Entorno**: E1 con la puerta y producción
- **Fase propuesta**: 2
- **Origen**: C-TRANS-09

### H-152 · El CSS y los medios de la puerta van con `no-store` y se descargan en cada visita
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `server/http/access-gate.mjs:23-27` y `:210-220`.
- **Reproducción**: ver R-GATE-08 y R-GATE-01. Cargar la puerta dos veces y mirar las cabeceras.
- **Esperado**: los recursos estáticos de la puerta se pueden guardar en caché.
- **Observado**: `style.css` (7 896 B) y 7 medios (166 334 B: el logo, 3 webp y 3 woff2) llevan `Cache-Control: no-store`, y al recargar se vuelven a pedir los 9. En producción, `/access-gate/style.css` también va con `no-store` (`cf-cache-status: BYPASS`).
- **Evidencia**: R-GATE-08; `metricas.md`, apartado 3.2.
- **Entorno**: E1 con la puerta y producción
- **Fase propuesta**: 4
- **Origen**: C-TRANS-10

### H-153 · `GET /products`, sin barra final, recibe un 301 sin las cabeceras de caché de la app
- **Categoría**: rendimiento
- **Severidad**: menor
- **Ubicación**: `server/http/static.mjs:61-64`. serve-static redirige los directorios por defecto.
- **Reproducción**: ver R-SYS-06. Pedir `/products` con `curl -I`.
- **Esperado**: la SPA, o una redirección con las cabeceras de la app.
- **Observado**: responde 301 `Location: /products/` (una página HTML «Redirecting») sin `Cache-Control` ni `Cloudflare-CDN-Cache-Control`. `/products/` sí da la SPA con 200.
- **Evidencia**: R-SYS-06.
- **Entorno**: E1 (build)
- **Fase propuesta**: 4
- **Origen**: C-TRANS-14

### H-154 · `/api`, sin barra final, devuelve la SPA con 200
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/app.mjs:186`. `app.all('/api/*')` no cubre `/api`.
- **Reproducción**: ver R-SYS-07. Hacer `fetch('/api')`.
- **Esperado**: un 404 JSON, como el resto de `/api/*`.
- **Observado**: responde 200 `text/html` con la SPA. `/api/loquesea` sí responde 404 JSON.
- **Evidencia**: R-SYS-07.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-TRANS-15

### H-155 · El servidor usa `NETWORK_ERROR` para una caída de Shopify, el mismo código que «el navegador no tiene red»
- **Categoría**: funcional (latente)
- **Severidad**: menor
- **Ubicación**: `server/integrations/shopify/graphql.mjs:12-14` y `customer-account.mjs:24-29` usan el mismo código que `src/api/http.js:34`. `src/api/chat.js:27` y `src/api/avisos.js:21` eligen el mensaje según ese código.
- **Reproducción**: ver R-ERR-10. Cortar la red del servidor hacia Shopify y pedir productos y carrito.
- **Esperado**: un código distinto para «Shopify no responde».
- **Observado**: el servidor responde 502 `{"code":"NETWORK_ERROR"}`. En la tienda se ve bien, porque `shopifyJson` lo convierte en `STOREFRONT_UNAVAILABLE` y conserva el texto. Hoy no llega a chat ni a avisos, porque esas rutas capturan el fallo del catálogo (`orchestrator.mjs:139` y `known-products.mjs:33`). Para ellas sigue latente: si les llegara, una caída de Shopify se presentaría como «Revisa tu red».
- **Evidencia**: R-ERR-10; lectura del código.
- **Entorno**: E2 simulado y código
- **Fase propuesta**: 2
- **Origen**: C-TRANS-17

### H-156 · Un 401 o un 403 de Shopify llegan al navegador como si el problema fuera del usuario
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/integrations/shopify/graphql.mjs:48-52`.
- **Reproducción**: ver R-ERR-10. Hacer que Shopify responda 401, 403 y 429.
- **Esperado**: un fallo de configuración del servidor (por ejemplo, un token mal puesto) se presenta como un error 5xx.
- **Observado**: llegan como 401 `UNAUTHENTICATED` y 403 `ACCESS_DENIED` («Shopify no ha aceptado la petición.»), y el 429 como `THROTTLED`. La portada dice «Shopify no ha aceptado la petición. No se pudo verificar el catálogo vivo…». El test de `app.test.mjs` «preserves safe domain error status and code…» solo cubre el 429.
- **Evidencia**: R-ERR-10.
- **Entorno**: E2 simulado
- **Fase propuesta**: 2
- **Origen**: C-TRANS-18

### H-157 · `RateLimit-Reset` lleva una fecha absoluta en vez de los segundos que faltan
- **Categoría**: funcional
- **Severidad**: menor
- **Ubicación**: `server/http/middleware/rate-limit.mjs:35`.
- **Reproducción**: ver R-ERR-03. Agotar un límite y leer las cabeceras.
- **Esperado**: los segundos que faltan, como define el borrador IETF de las cabeceras RateLimit.
- **Observado**: `RateLimit-Reset: 1794141693` (un instante Unix, ahora más unos 60 s), junto a `Retry-After: 60`.
- **Evidencia**: R-ERR-03.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-TRANS-19

### H-158 · Con la puerta activa, `/api/health` responde distinto que el resto y delata que existe
- **Categoría**: seguridad observada
- **Severidad**: menor
- **Ubicación**: `server/http/routes/health.mjs:17-19`, frente a `server/http/access-gate.mjs:150-153`.
- **Reproducción**: ver R-SYS-02 y R-GATE-07. Con la puerta activa, pedir `/api/health` y `/api/loquesea` desde una IP que no sea la local.
- **Esperado**: la misma respuesta para cualquier ruta oculta.
- **Observado**: `/api/health` responde 404 JSON `{"message":"Ruta no encontrada."}`, y `/api/loquesea`, 404 `text/plain` «Not found.». Producción respondió igual el 2026-11-08.
- **Evidencia**: R-SYS-02 y R-GATE-07; `metricas.md`, apartado 3.2.
- **Entorno**: E1 con la puerta y producción
- **Fase propuesta**: 2
- **Origen**: C-TRANS-21

### H-159 · La sonda de salud no detecta un almacén dañado después del arranque
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/storage/encrypted-file-store.mjs:86-89` y `:105-112`. La sonda solo descifra el fichero la primera vez; después solo comprueba que se puede escribir en el directorio.
- **Reproducción**: ver R-SYS-01 y R-SYS-09. Con un almacén cifrado de prueba, sobrescribir el fichero con basura con el proceso en marcha y pedir `/api/health`. Después, quitar el permiso de escritura del directorio, y por último reiniciar.
- **Esperado**: la sonda falla en cuanto el almacén no se puede leer.
- **Observado**: con el fichero dañado, `/api/health` sigue respondiendo 200; solo el directorio sin permiso de escritura da 503. Al reiniciar, el arranque falla con código 1: el daño se descubre en el siguiente despliegue.
- **Evidencia**: R-SYS-01 y R-SYS-09.
- **Entorno**: E1 con un almacén cifrado de prueba
- **Fase propuesta**: 2
- **Origen**: C-TRANS-22

### H-160 · Los avisos de desinstalación de la app de Shopify se guardan y nadie los lee
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/services/webhook-deliveries.mjs:63-69` (`shopifyLifecycle`).
- **Reproducción**: `grep -rn shopifyLifecycle server` (R-HOOK-01).
- **Esperado**: tras `app/uninstalled`, el servidor deja de anunciar capacidades y de llamar a Shopify.
- **Observado**: los avisos `app/uninstalled` y `app/scopes_update` se escriben en `shopifyLifecycle` (`:64`), pero ningún código lo lee ni cambia las capacidades.
- **Evidencia**: búsqueda en el código.
- **Entorno**: código
- **Fase propuesta**: 2
- **Origen**: C-TRANS-23

### H-161 · La entrega de un webhook se registra como aceptada antes de procesarla
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/services/webhook-deliveries.mjs:48-61` y `:71-86`.
- **Reproducción**: lectura del código, y buscar `INVALID_WEBHOOK_ID` e `INVALID_PAYLOAD` en los tests (R-HOOK-03, R-HOOK-06).
- **Esperado**: el registro refleja si la entrega se procesó, y esos dos errores tienen pruebas.
- **Observado**: `setIfAbsent` guarda `status: 'accepted'` antes del `JSON.parse` (`:73-80`) y el registro no cambia si después falla. Ningún test de `server/` ni de `src/` usa esos dos códigos.
- **Evidencia**: lectura del código y búsqueda.
- **Entorno**: código y tests
- **Fase propuesta**: 2
- **Origen**: C-TRANS-24

### H-162 · Un error de configuración tumba el servidor con una traza de Node, sin línea de log JSON
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `server/index.mjs:11`, `:33` y `:54`. El error sale de `startServer()` como un rechazo sin capturar, antes de registrar el manejador.
- **Reproducción**: ver R-GATE-11 y R-SYS-09. Arrancar con una contraseña corta, con `SITE_ACCESS_ENABLED=yes`, sin contraseña, con `PUBLIC_ORIGIN` en http en producción, con `TRUST_PROXY_HOPS=0`, con orígenes http o con un modelo de pago.
- **Esperado**: una línea JSON del logger con el motivo.
- **Observado**: el proceso termina con código 1 y una traza de Node (`file:///…/config/app.mjs:8` más la pila), sin ninguna línea JSON.
- **Evidencia**: R-GATE-11 y R-SYS-09.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: C-TRANS-26

### H-163 · Las líneas de log de error pierden el nombre del evento
- **Categoría**: operación
- **Severidad**: menor (el campo `reason` sigue presente, salvo en «Unhandled promise rejection»)
- **Ubicación**: `server/lib/logger.mjs:17-23` escribe los campos después de `message`, y `describeError` (`server/http/errors.mjs:50-56`) devuelve su propio campo `message`, que pisa el nombre del evento. Afecta a tres eventos:
  - «Unhandled request error» (`server/http/middleware/error-handler.mjs:59-63`);
  - «State store probe failed» (`server/http/routes/health.mjs:24-28` y `server/index.mjs:19-22`);
  - «Unhandled promise rejection» (`server/index.mjs:34`).
- **Reproducción**: ver R-SYS-01, R-SYS-09, R-ERR-11 y R-HOOK-06. Con un almacén cifrado de prueba, quitar el permiso de escritura del directorio y pedir `/api/health` o enviar un aviso. Después, reiniciar con un fichero que no se puede descifrar.
- **Esperado**: el campo `message` lleva el nombre del evento, por ejemplo «Unhandled request error».
- **Observado**: `message` lleva el texto del error, por ejemplo «EACCES: permission denied, open '…'» o «No se pudo descifrar el estado local. Revisa APP_ENCRYPTION_KEY.». Una alerta o una búsqueda por nombre de evento no lo encontraría. Los tests no lo detectan porque comprueban la llamada a un logger simulado (`error-handler.test.mjs:78`, `app.test.mjs:384` y `:510`). La respuesta al cliente es correcta y el log no lleva cuerpos, cookies ni emails.
- **Evidencia**: `obs/err11.json`, `obs/extras.json` y la salida del arranque fallido; capturas `capturas-e1/transversales/R-ERR-11-escritorio.png` y `R-ERR-11-movil.png`.
- **Entorno**: E1 con un almacén cifrado de prueba
- **Fase propuesta**: 2
- **Origen**: N-TRANS-3

### H-164 · El error de la puerta no se asocia al campo de la contraseña
- **Categoría**: accesibilidad
- **Severidad**: menor (comprobado en el DOM, sin un lector de pantalla real)
- **Ubicación**: `server/http/access-gate.mjs:121-136`. El mensaje va en `<p class="gate-message" role="status">`, y el campo `#access-password` tiene `autofocus` pero no `aria-invalid` ni `aria-describedby`.
- **Reproducción**: ver R-GATE-03, R-GATE-04 y TECLADO-puerta. Escribir una clave incorrecta (o agotar los intentos) y pulsar Enter.
- **Esperado**: al volver al campo, el lector de pantalla dice que la clave no vale.
- **Observado**: el 401 es un documento nuevo que ya trae el mensaje al cargar, y las regiones vivas presentes al cargar no suelen anunciarse. El foco va al campo, que no hace referencia al mensaje. Pasa lo mismo con el 429.
- **Evidencia**: `obs/limits.json` y `obs/gate.json`.
- **Entorno**: E1 con la puerta, escritorio y móvil
- **Fase propuesta**: 2
- **Origen**: N-TRANS-4

### H-165 · Estilos fuera del sistema de tokens: la tipografía monoespaciada del estudio y el CSS de la puerta
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**:
  - `src/styles/components/beat-machine.css:105` y `:294` declaran su propia lista de fuentes monoespaciadas, sin un token `--font-mono`.
  - `server/http/access-gate.css:27-32` define sus propios tokens con colores literales, y hay más colores literales en `:176`, `:211`, `:227` y `:260`.
  - La puerta usa cortes de 760 px (`:327`) y 390 px (`:368`).
  - Stylelint solo revisa `src/**/*.css` (`package.json:46`).
- **Reproducción**: leer esos ficheros (R-GATE-01).
- **Esperado**: los tokens de `src/styles/00-tokens.css` y los cortes del proyecto: 480, 640, 900 y 1200 px.
- **Observado**: la puerta usa los colores `#1a1a1a`, `#faf7f0`, `#e63946`, `#2f6fdb`, `#4b473f`, `#fff` y `#bd2632`, y cortes de 760 y 390 px. La mesa de beats usa una tipografía monoespaciada fuera de los tokens.
- **Evidencia**: lectura del código; `arte.md`, apartados 3 y 4.
- **Entorno**: código
- **Fase propuesta**: 3
- **Origen**: C-TRANS-28, N-ARTE-5

### H-166 · Con movimiento reducido, el patinador se queda detrás del botón de la portada
- **Categoría**: arte (también accesibilidad)
- **Severidad**: menor
- **Ubicación**: `/`. La ilustración `cruiser-patinando` se queda bajo «VER DROP 4».
- **Reproducción**: abrir `/` con `prefers-reduced-motion: reduce` a 900, 1200 o 1440 px.
- **Esperado**: el patinador no tapa el contenido cuando está quieto.
- **Observado**: se queda parado bajo «VER DROP 4» y tapa «28 diseños». Con la animación activa cruza la pantalla (de x = −715 a 1583 px en 4,5 s) y solo pasa por detrás un instante.
- **Evidencia**: `capturas/arte-portada-patinador-cta.webp`; posiciones medidas con Playwright.
- **Entorno**: E1 (capturas de arte)
- **Fase propuesta**: 3
- **Origen**: N-ARTE-2

### H-167 · A 900 px, la ficha deja el precio y la compra por debajo del pliegue
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**: `/product/:productId` a 900 px.
- **Reproducción**: abrir una ficha a 900 × 900.
- **Esperado**: el precio y la acción de compra se ven sin bajar, o la foto es más contenida.
- **Observado**: la foto ocupa todo el ancho de la única columna, y el precio, «Avísame» y el formulario quedan por debajo de los 900 px de alto.
- **Evidencia**: `capturas/arte-ficha-dia.webp` (cuarta columna).
- **Entorno**: E1 (capturas de arte)
- **Fase propuesta**: 3
- **Origen**: N-ARTE-3

### H-168 · A 480 px, el DJ tapa parte del subtítulo del estudio
- **Categoría**: arte
- **Severidad**: menor
- **Ubicación**: `/estudio` a 480 px.
- **Reproducción**: abrir `/estudio` a 480 px de ancho.
- **Esperado**: el subtítulo «maquetas, EPs y humo» se lee entero.
- **Observado**: el personaje tapa «EPs y».
- **Evidencia**: `capturas/arte-estudio-480-texto-tapado.webp`.
- **Entorno**: E1 (capturas de arte)
- **Fase propuesta**: 3
- **Origen**: N-ARTE-4

### H-173 · Nombres accesibles que no coinciden con el texto visible y encabezados fuera de orden
- **Categoría**: accesibilidad
- **Severidad**: menor
- **Ubicación**: enlace de Instagram del pie (`a.footer-social`), pads del estudio (`button.pad`, `aria-label="Pad 1: Bombo"`…), `h3.crew-nombre` fuera de orden
- **Reproducción**: Lighthouse, auditorías `label-content-name-mismatch` y `heading-order`.
- **Esperado**: el nombre accesible contiene el texto visible (WCAG 2.5.3); encabezados en orden.
- **Observado**: 17 elementos con nombre distinto del visible. Las 144 apariciones de `aria-label` en `span.stat-dianas` (auditoría `aria-prohibited-attr`) son el mismo defecto que H-100 y se tratan allí; `h3` sin `h2` previo en los cromos.
- **Evidencia**: `metricas.md`, apartado 2.1.
- **Entorno**: E1
- **Fase propuesta**: 2
- **Origen**: métricas (tareas 6.2 y 6.3)

### H-175 · El escáner de secretos no revisa los ficheros `.py` ni `.tsv`
- **Categoría**: operación
- **Severidad**: menor
- **Ubicación**: `scripts/check-secrets.mjs:8-27` (lista de extensiones de texto)
- **Reproducción**: crear un `.py` o `.tsv` con una asignación de secreto de prueba y ejecutar `npm run security:check`.
- **Esperado**: el escáner revisa todos los ficheros de texto versionados.
- **Observado**: solo lee ciertas extensiones; los `.py` y `.tsv` (por ejemplo, los de `docs/auditoria/2026-11/herramientas/`) nunca se escanean. La segunda ronda de la revisión independiente aplicó a mano los mismos patrones a esa carpeta y no encontró credenciales.
- **Evidencia**: código citado; segunda ronda de la revisión independiente (tarea 8.2).
- **Entorno**: repositorio
- **Fase propuesta**: 2
- **Origen**: revisión independiente, segunda ronda

## Sin confirmar, descartados y pendientes

Destino de todos los IDs revisados: candidatos `C-…`, hallazgos nuevos `N-…` y `N-ARTE-…`. Un ID con `H-NNN` está confirmado e integrado en ese hallazgo. Un ID pendiente sigue `SIN CONFIRMAR` y no cuenta como confirmado: la nota dice qué falta para cerrarlo. El área de carrito no dejó hallazgos nuevos (`carrito-nuevos.md`).

| ID | Destino | Hallazgo, motivo o lo que falta |
| --- | --- | --- |
| C-EST-01 | H-013 | «Saltar al contenido» queda tapado por la barra |
| C-EST-02 | H-009 | Un fallo al cargar o al pintar una página deja la web en blanco |
| C-EST-03 | H-039 | `preloadRecovery.js` lee `sessionStorage` sin protegerse de un almacenamiento bloqueado |
| C-EST-04 | H-040 | La intro no se puede saltar y la tienda de debajo sigue recibiendo el foco |
| C-EST-05 | H-010 | El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox |
| C-EST-06 | H-014 | La hoja del menú móvil no se puede cerrar desde dentro |
| C-EST-07 | H-041 | `ScrollToTop` decide por el tipo de navegación: no sube en el segundo clic y sí sube al remezclar |
| C-EST-08 | H-015 | Al cambiar de ruta no se mueve el foco ni se anuncia la página nueva |
| C-EST-09 | H-042 | La carga de una página diferida no se indica ni se anuncia |
| C-EST-10 | H-042 | La carga de una página diferida no se indica ni se anuncia |
| C-EST-11 | H-012 | El canónico y `og:url` apuntan a la portada en todas las rutas |
| C-EST-12 | H-043 | Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde |
| C-EST-13 | descartado | Con la imagen del perro retrasada 1,5 s, el h1 del 404 no se mueve (CLS 0,007 en escritorio y 0 en móvil): el ancho lo fija el CSS (`.notfound-dog`) y el alto de la fila lo marca el personaje (R-404-01). |
| C-EST-14 | H-044 | En el 404 a oscuras en móvil, «Salir de aquí» puede quedar cortado fuera de la pantalla |
| C-EST-15 | H-007 | Las páginas legales publican «PENDIENTE» en lugar de los datos del titular |
| C-EST-16 | H-017 | La política de cookies no cuenta lo que se guarda ni el reproductor de Spotify, que se carga sin aviso y pone cookies de terceros |
| C-EST-17 | H-045 | La cinta del pie se mueve sin fin y no se puede parar |
| C-EST-18 | H-046 | La Estampida cuenta teclas que ya usa la mesa de beats |
| C-EST-19 | H-047 | La primera Estampida descarga 615 KiB de ilustraciones grandes para pintarlas pequeñas |
| C-EST-20 | H-048 | La preferencia de movimiento reducido no se sigue en vivo, y el hook que lo haría no se usa |
| C-EST-21 | H-049 | El Curioso rompe la app con ventanas de menos de unos 86 px de ancho |
| C-EST-22 | H-050 | Los garabatos decorativos declaran a la vez `role="img"` y `aria-hidden="true"` |
| C-CAT-01 | H-008 | El catálogo vivo solo carga 8 productos: los demás no salen y su ficha dice «Producto no encontrado» |
| C-CAT-02 | H-012 | El canónico y `og:url` apuntan a la portada en todas las rutas |
| C-CAT-03 | H-043 | Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde |
| C-CAT-04 | H-003 | Dos fotos de producto miden 5906 × 5906 px |
| C-CAT-05 | H-052 | Si falla `/api/shopify/status`, la tienda se queda sin productos aunque el catálogo de vista previa va embebido |
| C-CAT-06 | H-053 | Mientras carga, la portada dice «0 diseños» y la categoría enseña su handle |
| C-CAT-07 | H-020 | Los avisos de un mismo drop se reparten en listas distintas y el envío no los junta |
| C-CAT-08 | H-054 | Con el aviso ya apuntado, «Avísame» y el enlace `#aviso` no hacen nada visible |
| C-CAT-09 | H-055 | Controles repetidos con el mismo nombre accesible |
| C-CAT-10 | H-056 | Las fichas de demo enseñan «Próximamente» dos veces |
| C-CAT-11 | H-057 | La foto de la ficha y su lightbox pierden la descripción de la imagen |
| C-CAT-12 | H-019 | En modo Shopify, un producto a la venta sin foto se esconde «bajo llave» |
| C-CAT-13 | H-058 | Errores respondidos a mano: sin `code` y sin línea de log |
| C-CAT-14 | H-059 | El mockup de un diseño bajo llave dice siempre «Drop 4 · sin revelar». Confirmado con el BFF simulado de E1; en E2 simulado no se pudo ver. |
| C-CAT-15 | H-060 | Un drop sale «Disponible» aunque todo esté agotado o el carrito no funcione |
| C-CAT-16 | H-061 | El servidor solo reconoce los 50 productos más recientes para los avisos |
| C-CAT-17 | H-062 | Hay URLs duplicadas en el catálogo, y en `/products/...` ningún enlace de la barra queda activo |
| C-CAT-18 | H-043 | Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde |
| C-CAT-19 | H-063 | Las 19 fichas de diseños bajo llave no tienen ningún enlace |
| C-CAT-20 | H-055 | Controles repetidos con el mismo nombre accesible |
| C-CAT-21 | H-064 | El campo de email del aviso no tiene etiqueta visible |
| C-CAT-22 | H-065 | El botón de la foto de un diseño bajo llave está deshabilitado pero se anuncia como «Ver … en grande» |
| C-CAT-23 | H-066 | «← Volver a la tienda» lleva siempre a la portada |
| C-CART-01 | H-021 | La sesión no suelta un carrito que Shopify ya no devuelve |
| C-CART-02 | H-022 | Cerrar sesión depende de Shopify: si falla, tampoco se cierra en local |
| C-CART-03 | H-069 | Salir de la cuenta destruye la sesión entera: se pierde el carrito y, con la puerta activa, el acceso |
| C-CART-04 | pendiente (`SIN CONFIRMAR`) | E2 real con cuentas de cliente y un descubrimiento OpenID sin `end_session_endpoint`. El doble siempre lo publica, así que `logoutUrl` nunca es null; por código sigue en pie (`useCustomerAccount.js:17-22`). |
| C-CART-05 | H-023 | Con el token de cliente revocado, la cuenta se queda sin forma de entrar ni de salir |
| C-CART-06 | H-024 | Los errores del login de cliente acaban en JSON crudo, sin vuelta a la tienda |
| C-CART-07 | H-070 | `GET /account` manda al navegador el identificador y el email del cliente sin necesitarlos |
| C-CART-08 | pendiente (`SIN CONFIRMAR`) | Shopify real (tienda de desarrollo). El BFF y el cliente no limitan el total: con el doble, añadir 1 desde la ficha a una línea de 20 la deja en 21 (R-CART-12). Falta ver qué acepta Shopify. |
| C-CART-09 | H-071 | Textos del carrito que no dicen lo que pasa |
| C-CART-10 | H-072 | El carrito no tiene estado de carga ni de error: dice que está vacío en los dos casos |
| C-CART-11 | H-073 | Tras un error de carrito, la web sigue enseñando líneas que ya no existen |
| C-CART-12 | H-074 | Los avisos y errores del carrito se duplican, se borran o reaparecen donde no toca |
| C-CART-13 | H-074 | Los avisos y errores del carrito se duplican, se borran o reaparecen donde no toca |
| C-CART-14 | H-016 | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| C-CART-15 | H-075 | Los cambios del carrito no se anuncian y la lista de avisos pierde su semántica de lista |
| C-CART-16 | H-075 | Los cambios del carrito no se anuncian y la lista de avisos pierde su semántica de lista |
| C-CART-17 | H-076 | Botones de cantidad de 28 px y cursor de espera sin nada pendiente |
| C-CART-18 | H-077 | El icono del carrito no tiene estado activo visible en `/cart` |
| C-CART-19 | H-008 | El catálogo vivo solo carga 8 productos: los demás no salen y su ficha dice «Producto no encontrado» |
| C-CART-20 | pendiente (`SIN CONFIRMAR`) | Shopify real: login de cliente y checkout en la tienda de desarrollo. El doble no modela `buyerIdentity` ni el checkout; por código, ninguna mutación lo envía (`storefront.mjs:60-97`). |
| C-CART-21 | pendiente (`SIN CONFIRMAR`) | Shopify real: textos reales de los avisos. La web pinta `warning.message` tal cual y, con el doble, llegan en inglés (R-CART-13). |
| C-CART-22 | H-078 | El servidor reenvía al navegador el `target` de los avisos de Shopify, con el token del carrito |
| C-CART-23 | H-058 | Errores respondidos a mano: sin `code` y sin línea de log |
| C-CART-24 | H-079 | La cookie de sesión caduca a los 30 días de crearse, aunque haya actividad |
| C-CART-25 | H-080 | Volver a entrar sin haber salido deja huérfano el token de cliente anterior |
| C-CART-26 | H-081 | El login abre una sesión antes de validar la ruta de retorno |
| C-CART-27 | H-025 | Faltan pruebas del checkout, del cierre de sesión, de los errores del callback y de los contratos de avisos y del `.ics` |
| C-CART-28 | H-082 | En modo demo no se puede comprar nada, así que el carrito demo y sus textos son código muerto |
| C-CART-29 | H-083 | Con la red lenta, el repartidor del carrito cruza sin dibujo la primera vez |
| C-CART-30 | H-074 | Los avisos y errores del carrito se duplican, se borran o reaparecen donde no toca |
| C-CART-31 | H-071 | Textos del carrito que no dicen lo que pasa |
| C-CART-32 | H-084 | El tope de 20 unidades por línea está escrito en cuatro sitios |
| C-CART-33 | H-071 | Textos del carrito que no dicen lo que pasa |
| C-CHAT-01 | H-085 | Rocky IA no distingue por qué falla |
| C-CHAT-02 | H-058 | Errores respondidos a mano: sin `code` y sin línea de log |
| C-CHAT-03 | H-018 | El historial de Rocky IA se guarda 30 días en el servidor: la política dice que no, y el usuario no lo ve ni lo puede borrar |
| C-CHAT-04 | H-086 | El filtro contra la manipulación del prompt bloquea preguntas con el verbo «dan» |
| C-CHAT-05 | H-026 | Rocky IA llama al modelo aunque luego vaya a responder con la frase fija de compra |
| C-CHAT-06 | H-027 | Rocky IA contesta con los primeros productos del catálogo cuando la búsqueda se queda sin términos |
| C-CHAT-07 | H-027 | Rocky IA contesta con los primeros productos del catálogo cuando la búsqueda se queda sin términos |
| C-CHAT-08 | H-087 | Una pregunta sobre el perfil Crew con una palabra de compra entra en modo compra |
| C-CHAT-09 | H-088 | En modo Shopify, Rocky IA sigue usando el catálogo de vista previa |
| C-CHAT-10 | H-018 | El historial de Rocky IA se guarda 30 días en el servidor: la política dice que no, y el usuario no lo ve ni lo puede borrar |
| C-CHAT-11 | H-016 | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| C-CHAT-12 | H-089 | El historial del chat se lee mal con un lector de pantalla |
| C-CHAT-13 | H-090 | Cada mensaje fallido del chat deja un `console.error` |
| C-CHAT-14 | H-091 | El CSS del chat tiene dos bloques `@media (max-width: 640px)` seguidos y el segundo pisa al primero |
| C-CHAT-15 | H-092 | El prompt de Rocky IA no incluye a «El Vigía» en LA CREW |
| C-CHAT-16 | H-028 | El «Marco Tinta Azul» se canjea y se equipa, pero no se ve |
| C-CHAT-17 | H-029 | Si falla el perfil Crew, `/mi-crew` se queda en la pantalla de carga sin salida |
| C-CHAT-18 | H-093 | `/mi-crew` enseña la vista previa antes de saber si hay sesión |
| C-CHAT-19 | H-094 | Los botones de canjear y equipar ocultan el coste y el estado a los lectores de pantalla |
| C-CHAT-20 | H-095 | Los números y plurales del perfil Crew no siguen el formato español |
| C-CHAT-21 | H-096 | Leer el perfil Crew reescribe entero el almacén cifrado |
| C-CHAT-22 | H-097 | `useCrewProfile` devuelve un objeto nuevo en cada render y anula la memoización de la tienda |
| C-CHAT-23 | H-098 | Un marco equipado no se puede quitar |
| C-CHAT-24 | H-099 | Cambiar el hash estando en `/crew` centra el cromo nuevo pero no lo gira |
| C-CHAT-25 | H-100 | Los lectores de pantalla no reciben la puntuación de las estadísticas del cromo |
| C-CHAT-26 | H-101 | «¡Enlace copiado!» no se anuncia |
| C-CHAT-27 | H-095 | Los números y plurales del perfil Crew no siguen el formato español |
| C-STU-01 | H-030 | «Remezclar» carga el beat de la URL anterior |
| C-STU-02 | H-031 | Los parámetros de un enlace de beat se quedan en la URL y pisan las ediciones al recargar |
| C-STU-03 | H-032 | Un beat del ranking sigue sonando sin botón para pararlo cuando su fila desaparece |
| C-STU-04 | H-105 | El «● REC» del LCD nunca se pone rojo ni parpadea |
| C-STU-05 | H-106 | La mesa promete que un enlace «se abre sonando», y no suena |
| C-STU-06 | H-107 | Publicar un beat repetido de uno oculto dice «te lo enseñamos», pero no se ve |
| C-STU-07 | H-033 | Una sola persona puede ocultar cualquier beat o inflar los «me mola» borrando la cookie |
| C-STU-08 | H-108 | `GET /api/beats` no tiene límite de peticiones y carga todo el almacén en cada lectura |
| C-STU-09 | H-109 | El filtro de palabras del ranking tiene falsos positivos y culpa al nombre cuando el rechazado es el apodo |
| C-STU-10 | H-110 | El chip «Boom bap» sale marcado aunque el patrón cargado sea otro |
| C-STU-11 | H-111 | El atajo «Espacio arranca» no se puede usar |
| C-STU-12 | H-016 | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| C-STU-13 | H-112 | Las celdas del secuenciador no distinguen fantasma, golpe y acento, y borrar en táctil depende del menú contextual. La parte de iOS (borrar sin `contextmenu`) queda pendiente de un iPhone real. |
| C-STU-14 | H-113 | El botón de silenciar se llama como la pista, y los chips de ritmo no exponen su estado |
| C-STU-15 | H-114 | Las pestañas del ranking y los colores del spray usan roles compuestos, pero no responden a las flechas |
| C-STU-16 | H-115 | La barra de Rocky IA anida un `role="status"` dentro de una región `aria-live` |
| C-STU-17 | H-116 | Los mensajes genéricos de error hablan de «la tienda» fuera de la tienda |
| C-STU-18 | H-117 | Al pasar de un beat del ranking a otro, el nuevo entra a mitad de compás |
| C-STU-19 | H-118 | La mesa y el ranking crean cada uno su propio `AudioContext` |
| C-STU-20 | H-119 | De noche, la setlist del estudio marca BARRO mientras suena MODO NEÓN |
| C-STU-21 | H-120 | Con REC encendido, los pads sin pista suenan pero no se graban, y nada lo avisa |
| C-STU-22 | H-121 | El pad de una pista silenciada no suena |
| C-STU-23 | H-122 | Si el autocompletado rellena el campo trampa, el beat se descarta y la web dice «Publicado» |
| C-STU-24 | pendiente (`SIN CONFIRMAR`) | Chrome y Safari reales (sobre todo en iOS), con la mesa sonando y la pestaña en segundo plano más de 5 minutos. Chrome headless no reproduce la ralentización de temporizadores (R-STU-03). |
| C-STU-25 | H-123 | En móvil no se puede cambiar el volumen de cada pista |
| C-STU-26 | H-124 | Cerrar la barra de Rocky IA no cancela la petición: el panel vuelve a abrirse solo y gasta cupo |
| C-STU-27 | H-125 | Un aviso del ranking sustituye para siempre a la nota de ayuda |
| C-STU-28 | H-126 | Moderación del ranking: llave en claro, botón «Quitar» con cualquier valor y límite compartido con los votos |
| C-NOCHE-01 | H-119 | De noche, la setlist del estudio marca BARRO mientras suena MODO NEÓN |
| C-NOCHE-02 | H-129 | «Tema siguiente» y «Tema anterior» no hacen lo que dicen con un solo tema por cinta |
| C-NOCHE-03 | H-130 | Si la cinta falla, la radio no avisa y no se recupera sin recargar |
| C-NOCHE-04 | H-131 | Encender el descontrol pone música sin avisar |
| C-NOCHE-05 | H-132 | La barra de progreso de la radio avanza 0,1 s por pulsación de flecha y se anuncia sin unidad |
| C-NOCHE-06 | H-133 | El radiocasete dice 0:00 / 0:00 hasta el primer play, mientras la setlist dice 1:53 |
| C-NOCHE-07 | H-134 | Un comentario y un test dicen que en Rocky IA no hay pared de noche, pero sí la hay |
| C-NOCHE-08 | H-036 | Bajo la oscuridad del modo noche, el texto secundario no llega al contraste mínimo |
| C-NOCHE-09 | H-135 | El lienzo del spray ocupa toda la página en cada ruta de noche, aunque nadie pinte |
| C-NOCHE-10 | H-136 | La linterna repinta la ventana entera en cada movimiento |
| C-NOCHE-11 | H-137 | Cada componente con `useNightMode` crea su propio `MutationObserver` |
| C-NOCHE-12 | H-138 | El spray arrastra estado de la página anterior al cambiar de ruta |
| C-NOCHE-13 | H-139 | La pintada guardada no coincide con lo que se ve: pierde el último trazo, recorta en silencio o no se guarda |
| C-NOCHE-14 | H-138 | El spray arrastra estado de la página anterior al cambiar de ruta |
| C-NOCHE-15 | H-139 | La pintada guardada no coincide con lo que se ve: pierde el último trazo, recorta en silencio o no se guarda |
| C-NOCHE-16 | H-140 | Una pintada guardada con datos corruptos deja la página en blanco al encender el descontrol |
| C-NOCHE-17 | H-139 | La pintada guardada no coincide con lo que se ve: pierde el último trazo, recorta en silencio o no se guarda |
| C-NOCHE-18 | pendiente (`SIN CONFIRMAR`) | Móvil real (Safari en iOS o Chrome en Android) en contexto seguro: Chrome en Linux no tiene `navigator.share`. Con un `share` simulado, el código hace lo previsto (R-NIGHT-19). |
| C-NOCHE-19 | H-141 | Si `toBlob` falla, la foto del spray dice «Pinta algo primero.» |
| C-NOCHE-20 | H-138 | El spray arrastra estado de la página anterior al cambiar de ruta |
| C-NOCHE-21 | H-016, H-114 | H-016: El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece · H-114: Las pestañas del ranking y los colores del spray usan roles compuestos, pero no responden a las flechas. H-016 recoge la parte del foco y H-114 la de las flechas. |
| C-NOCHE-22 | H-142 | En móvil, el bote y la caja del spray quedan por encima de la hoja del menú |
| C-NOCHE-23 | H-143 | El interruptor del descontrol cambia a la vez su nombre y `aria-pressed` |
| C-NOCHE-24 | descartado | Muestreando la opacidad fotograma a fotograma, hay como mucho 2 destellos en cualquier segundo, por debajo de los 3 de WCAG 2.3.1; con movimiento reducido el rótulo no se muestra (R-NIGHT-01, R-NIGHT-04). |
| C-NOCHE-25 | H-048 | La preferencia de movimiento reducido no se sigue en vivo, y el hook que lo haría no se usa |
| C-NOCHE-26 | H-144 | `modo-neon.m4a` y `theme-init.js` tienen permisos 600 en el árbol de trabajo y en `dist/` |
| C-NOCHE-27 | H-145 | BARRO pesa 2,68 MB a 190 kbps, tres veces la tasa de MODO NEÓN |
| C-TRANS-01 | H-011 | Abrir la web desde un origen no listado la deja en blanco: la política de origen bloquea los recursos de la propia página |
| C-TRANS-02 | H-009 | Un fallo al cargar o al pintar una página deja la web en blanco |
| C-TRANS-03 | H-012 | El canónico y `og:url` apuntan a la portada en todas las rutas |
| C-TRANS-04 | H-037 | Si la versión de API de un webhook no coincide exactamente, se rechaza y los créditos Crew no llegan |
| C-TRANS-05 | H-069 | Salir de la cuenta destruye la sesión entera: se pierde el carrito y, con la puerta activa, el acceso |
| C-TRANS-06 | H-148 | Cuando caduca el acceso de la puerta, la web abierta solo dice «La tienda no ha podido completar la operación.» |
| C-TRANS-07 | H-149 | En algunos errores, la puerta responde con texto plano o JSON en vez de con su página |
| C-TRANS-08 | H-150 | Tras desbloquear la puerta se pierde la ruta que se había pedido |
| C-TRANS-09 | H-151 | Con la puerta activa, `HEAD /` responde 404 |
| C-TRANS-10 | H-152 | El CSS y los medios de la puerta van con `no-store` y se descargan en cada visita |
| C-TRANS-11 | descartado | Es deliberado y está cubierto por `server/app.test.mjs:253`: con la puerta activa, hasta los assets van `private, no-store`. Solo implica que las medidas de E3 no se pueden comparar con la web pública. La ejecución lo marcó como confirmado, pero no es un defecto. |
| C-TRANS-12 | pendiente (`SIN CONFIRMAR`) | E3 con la puerta abierta, para ver si `/assets/*` llega comprimido. En local Express no comprime (confirmado, R-SYS-04). En producción, la puerta, su CSS y `robots.txt` ya llegan con `br` (`metricas.md`, apartado 3.2). La ejecución lo marcó como confirmado; queda pendiente porque el efecto solo importaría si Cloudflare no comprimiera. |
| C-TRANS-13 | H-043 | Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde |
| C-TRANS-14 | H-153 | `GET /products`, sin barra final, recibe un 301 sin las cabeceras de caché de la app |
| C-TRANS-15 | H-154 | `/api`, sin barra final, devuelve la SPA con 200 |
| C-TRANS-16 | H-058 | Errores respondidos a mano: sin `code` y sin línea de log |
| C-TRANS-17 | H-155 | El servidor usa `NETWORK_ERROR` para una caída de Shopify, el mismo código que «el navegador no tiene red» |
| C-TRANS-18 | H-156 | Un 401 o un 403 de Shopify llegan al navegador como si el problema fuera del usuario |
| C-TRANS-19 | H-157 | `RateLimit-Reset` lleva una fecha absoluta en vez de los segundos que faltan |
| C-TRANS-20 | H-011 | Abrir la web desde un origen no listado la deja en blanco: la política de origen bloquea los recursos de la propia página. Integrada la parte observable; si Cloudflare cachea el 403 queda pendiente de E3 o del panel. |
| C-TRANS-21 | H-158 | Con la puerta activa, `/api/health` responde distinto que el resto y delata que existe |
| C-TRANS-22 | H-159 | La sonda de salud no detecta un almacén dañado después del arranque |
| C-TRANS-23 | H-160 | Los avisos de desinstalación de la app de Shopify se guardan y nadie los lee |
| C-TRANS-24 | H-161 | La entrega de un webhook se registra como aceptada antes de procesarla |
| C-TRANS-25 | H-058 | Errores respondidos a mano: sin `code` y sin línea de log |
| C-TRANS-26 | H-162 | Un error de configuración tumba el servidor con una traza de Node, sin línea de log JSON |
| C-TRANS-27 | H-149 | En algunos errores, la puerta responde con texto plano o JSON en vez de con su página |
| C-TRANS-28 | H-165 | Estilos fuera del sistema de tokens: la tipografía monoespaciada del estudio y el CSS de la puerta |
| C-TRANS-29 | H-052 | Si falla `/api/shopify/status`, la tienda se queda sin productos aunque el catálogo de vista previa va embebido |
| C-TRANS-30 | H-116 | Los mensajes genéricos de error hablan de «la tienda» fuera de la tienda |
| N-EST-1 | H-010 | El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox |
| N-EST-2 | H-051 | Al ensanchar la ventana con la hoja del menú abierta, el foco a veces acaba en `<body>` |
| N-EST-3 | H-010 | El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox |
| N-EST-4 | H-017 | La política de cookies no cuenta lo que se guarda ni el reproductor de Spotify, que se carga sin aviso y pone cookies de terceros |
| N-CAT-1 | H-010 | El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox |
| N-CAT-2 | H-067 | El anillo de foco de las fotos de las tarjetas queda recortado |
| N-CAT-3 | H-019 | En modo Shopify, un producto a la venta sin foto se esconde «bajo llave» |
| N-CAT-4 | H-020 | Los avisos de un mismo drop se reparten en listas distintas y el envío no los junta |
| N-CAT-5 | H-025 | Faltan pruebas del checkout, del cierre de sesión, de los errores del callback y de los contratos de avisos y del `.ics` |
| N-CAT-6 | H-068 | En móvil, `/menudrop` descarga la ilustración que oculta |
| N-CHAT-1 | H-089 | El historial del chat se lee mal con un lector de pantalla |
| N-CHAT-2 | H-102 | El aro de foco de los cromos desaparece con el ratón encima |
| N-CHAT-3 | H-055 | Controles repetidos con el mismo nombre accesible |
| N-CHAT-4 | H-103 | Un límite numérico fuera de rango vuelve en silencio al valor por defecto |
| N-STU-1 | H-034 | En escritorio, el paso 16 del secuenciador no cabe |
| N-STU-2 | H-041 | `ScrollToTop` decide por el tipo de navegación: no sube en el segundo clic y sí sube al remezclar |
| N-STU-3 | H-124 | Cerrar la barra de Rocky IA no cancela la petición: el panel vuelve a abrirse solo y gasta cupo |
| N-STU-4 | H-127 | Tras remezclar, la vista salta a la mesa pero el foco se queda en el ranking |
| N-STU-5 | H-128 | En táctil, los botones deshabilitados de publicar y de la barra no dicen por qué |
| N-NOCHE-1 | H-142 | En móvil, el bote y la caja del spray quedan por encima de la hoja del menú |
| N-NOCHE-2 | H-035 | Al apagar el descontrol con MODO NEÓN sonando, la radio se calla pero la interfaz sigue «sonando» |
| N-NOCHE-3 | H-044 | En el 404 a oscuras en móvil, «Salir de aquí» puede quedar cortado fuera de la pantalla |
| N-NOCHE-4 | H-146 | El primer toque en una zona sin enlaces ni botones lleva la linterna al centro de `<main>` |
| N-NOCHE-5 | H-035 | Al apagar el descontrol con MODO NEÓN sonando, la radio se calla pero la interfaz sigue «sonando» |
| N-NOCHE-6 | H-147 | En móvil, «MODO NEÓN» queda cortado en la cabecera del chat |
| N-TRANS-1 | H-011 | Abrir la web desde un origen no listado la deja en blanco: la política de origen bloquea los recursos de la propia página |
| N-TRANS-2 | H-016 | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| N-TRANS-3 | H-163 | Las líneas de log de error pierden el nombre del evento |
| N-TRANS-4 | H-164 | El error de la puerta no se asocia al campo de la contraseña |
| N-E2-1 | H-019 | En modo Shopify, un producto a la venta sin foto se esconde «bajo llave» |
| N-E2-2 | H-104 | Las tarjetas de Rocky IA enseñan «Default Title» en los productos de variante única |
| N-E2-3 | H-088 | En modo Shopify, Rocky IA sigue usando el catálogo de vista previa |
| N-E2-4 | H-016 | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| N-E2-5 | H-085 | Rocky IA no distingue por qué falla |
| N-ARTE-1 | H-038 | La web usa dos nombres de marca: «ROCKY 35» y «ROCKY 035» |
| N-ARTE-2 | H-166 | Con movimiento reducido, el patinador se queda detrás del botón de la portada |
| N-ARTE-3 | H-167 | A 900 px, la ficha deja el precio y la compra por debajo del pliegue |
| N-ARTE-4 | H-168 | A 480 px, el DJ tapa parte del subtítulo del estudio |
| N-ARTE-5 | H-165 | Estilos fuera del sistema de tokens: la tipografía monoespaciada del estudio y el CSS de la puerta |


## Recorridos en FALLO y sus hallazgos

Con el criterio corregido (ver `ejecucion.md`): 313 ejecuciones en FALLO, cada una con al menos un hallazgo confirmado.

| Recorrido | Viewport | Hallazgos |
| --- | --- | --- |
| R-404-02 | movil | H-044 |
| R-404-04 | no aplica (HTTP) | H-043 |
| R-ACC-01 | escritorio | H-058 |
| R-ACC-01 | movil | H-058 |
| R-ACC-05 | escritorio | H-024 |
| R-ACC-05 | movil | H-024 |
| R-ACC-06 | escritorio | H-024, H-081 |
| R-ACC-07 | escritorio | H-070 |
| R-ACC-07 | movil | H-070 |
| R-ACC-08 | escritorio | H-023, H-071, H-074 |
| R-ACC-08 | movil | H-023, H-071, H-074 |
| R-ACC-09 | escritorio | H-069 |
| R-ACC-09 | movil | H-069 |
| R-ACC-10 | escritorio | H-022 |
| R-ACC-10 | movil | H-022 |
| R-CART-01 | escritorio | H-082 |
| R-CART-01 | movil | H-082 |
| R-CART-02 | escritorio | H-077, H-082 |
| R-CART-02 | movil | H-077, H-082 |
| R-CART-03 | api | H-058 |
| R-CART-08 | escritorio | H-078 |
| R-CART-08 | movil | H-078 |
| R-CART-10 | escritorio | H-008, H-071 |
| R-CART-10 | movil | H-008, H-071 |
| R-CART-11 | escritorio | H-075 |
| R-CART-11 | movil | H-075 |
| R-CART-12 | escritorio | H-076 |
| R-CART-12 | movil | H-076 |
| R-CART-13 | escritorio | H-074, H-075, H-078 |
| R-CART-13 | movil | H-074, H-075, H-078 |
| R-CART-14 | escritorio | H-016 |
| R-CART-14 | movil | H-016 |
| R-CART-15 | escritorio | H-072, H-079 |
| R-CART-15 | movil | H-072, H-079 |
| R-CART-18 | escritorio | H-058, H-073 |
| R-CART-18 | movil | H-058, H-073 |
| R-CART-19 | escritorio | H-073 |
| R-CART-19 | movil | H-073 |
| R-CART-21 | escritorio | H-072, H-074 |
| R-CART-21 | movil | H-072, H-074 |
| R-CART-22 | escritorio | H-016, H-075, H-076 |
| R-CART-22 | movil | H-016, H-075, H-076 |
| R-CAT-01 | escritorio | H-003, H-053 |
| R-CAT-01 | movil | H-003, H-053 |
| R-CAT-02 | escritorio | H-062 |
| R-CAT-02 | movil | H-062 |
| R-CAT-03 | escritorio | H-043 |
| R-CAT-03 | movil | H-043 |
| R-CAT-04 | escritorio | H-003, H-055, H-056, H-066 |
| R-CAT-04 | movil | H-003, H-055, H-056, H-066 |
| R-CAT-05 | escritorio | H-057 |
| R-CAT-05 | movil | H-057 |
| R-CAT-06 | escritorio | H-056, H-059, H-063, H-065 |
| R-CAT-06 | movil | H-056, H-059, H-063, H-065 |
| R-CAT-07 | escritorio | H-043 |
| R-CAT-07 | movil | H-043 |
| R-CAT-08 | escritorio | H-003, H-010, H-057 |
| R-CAT-08 | movil | H-003, H-010, H-057 |
| R-CAT-11 | escritorio | H-052 |
| R-CAT-11 | movil | H-052 |
| R-CAT-12 | api | H-058 |
| R-CAT-13 | escritorio | H-008, H-019 |
| R-CAT-13 | movil | H-008, H-019 |
| R-CAT-14 | escritorio | H-008 |
| R-CAT-14 | movil | H-008 |
| R-CHAT-01 | escritorio | H-091 |
| R-CHAT-01 | movil | H-091 |
| R-CHAT-02 | escritorio | H-085, H-090 |
| R-CHAT-02 | movil | H-085, H-090 |
| R-CHAT-04 | escritorio | H-016, H-089 |
| R-CHAT-04 | movil | H-016, H-089 |
| R-CHAT-05 | escritorio | H-058, H-085, H-090 |
| R-CHAT-05 | movil | H-058, H-085, H-090 |
| R-CHAT-06 | api | H-058 |
| R-CHAT-07 | escritorio | H-018 |
| R-CHAT-07 | movil | H-018 |
| R-CHAT-08 | escritorio | H-016, H-026, H-027 |
| R-CHAT-08 | movil | H-016, H-026, H-027 |
| R-CHAT-09 | escritorio | H-071, H-104 |
| R-CHAT-09 | movil | H-071, H-104 |
| R-CHAT-10 | escritorio | H-027, H-088 |
| R-CHAT-10 | movil | H-027, H-088 |
| R-CHAT-11 | escritorio | H-088 |
| R-CHAT-11 | movil | H-088 |
| R-CHAT-12 | escritorio | H-026 |
| R-CHAT-13 | escritorio | H-086 |
| R-CHAT-13 | movil | H-086 |
| R-CHAT-14 | escritorio | H-026, H-085 |
| R-CHAT-15 | escritorio | H-085 |
| R-CHAT-16 | escritorio | H-085 |
| R-CHAT-16 | movil | H-085 |
| R-CHAT-17 | escritorio | H-026, H-085 |
| R-CHAT-19 | escritorio | H-087 |
| R-CHAT-19 | movil | H-087 |
| R-CHAT-20 | escritorio | H-018 |
| R-CHAT-20 | movil | H-018 |
| R-CHK-01 | escritorio | H-058, H-082 |
| R-CHK-01 | movil | H-058, H-082 |
| R-CHK-02 | escritorio | H-071 |
| R-CHK-02 | movil | H-071 |
| R-CHK-03 | escritorio | H-058, H-073 |
| R-CHK-03 | movil | H-058, H-073 |
| R-CHK-04 | escritorio | H-025 |
| R-CHK-04 | movil | H-025 |
| R-CREW-02 | escritorio | H-055, H-100, H-102 |
| R-CREW-02 | movil | H-055, H-100, H-102 |
| R-CREW-04 | escritorio | H-099 |
| R-CREW-04 | movil | H-099 |
| R-CREW-05 | escritorio | H-101 |
| R-CREW-05 | movil | H-101 |
| R-CREW-09 | escritorio | H-093 |
| R-CREW-09 | movil | H-093 |
| R-CREW-10 | escritorio | H-095, H-096 |
| R-CREW-10 | movil | H-095, H-096 |
| R-CREW-11 | escritorio | H-028, H-098 |
| R-CREW-11 | movil | H-028, H-098 |
| R-CREW-13 | escritorio | H-094, H-095 |
| R-CREW-15 | escritorio | H-095 |
| R-CREW-15 | movil | H-095 |
| R-CREW-16 | escritorio | H-029 |
| R-CREW-16 | movil | H-029 |
| R-DROP-01 | escritorio | H-068 |
| R-DROP-01 | movil | H-068 |
| R-DROP-04 | escritorio | H-020, H-064 |
| R-DROP-04 | movil | H-020, H-064 |
| R-DROP-05 | escritorio | H-020, H-055 |
| R-DROP-05 | movil | H-020, H-055 |
| R-DROP-06 | escritorio | H-054 |
| R-DROP-06 | movil | H-054 |
| R-DROP-08 | escritorio | H-058 |
| R-DROP-08 | movil | H-058 |
| R-DROP-12 | api | H-058 |
| R-DROP-13 | código y tests | H-025 |
| R-EGG-01 | escritorio | H-049 |
| R-EGG-03 | escritorio | H-048 |
| R-EGG-03 | movil | H-048 |
| R-EGG-04 | escritorio | H-047 |
| R-EGG-05 | escritorio | H-046 |
| R-EGG-05 | movil | H-046 |
| R-ERR-01 | escritorio | H-011 |
| R-ERR-01 | movil | H-011 |
| R-ERR-02 | api | H-058 |
| R-ERR-03 | escritorio | H-052, H-058, H-157 |
| R-ERR-03 | movil | H-052, H-058, H-157 |
| R-ERR-04 | escritorio | H-058 |
| R-ERR-04 | movil | H-058 |
| R-ERR-05 | escritorio | H-058 |
| R-ERR-05 | movil | H-058 |
| R-ERR-09 | escritorio | H-058 |
| R-ERR-09 | movil | H-058 |
| R-ERR-10 | escritorio | H-155, H-156 |
| R-ERR-10 | movil | H-155, H-156 |
| R-ERR-11 | tests | H-163 |
| R-ERR-12 | escritorio | H-009, H-116 |
| R-ERR-12 | movil | H-009, H-116 |
| R-GATE-01 | escritorio | H-165 |
| R-GATE-01 | movil | H-165 |
| R-GATE-02 | escritorio | H-150 |
| R-GATE-02 | movil | H-150 |
| R-GATE-03 | escritorio | H-149, H-164 |
| R-GATE-03 | movil | H-149, H-164 |
| R-GATE-04 | escritorio | H-058 |
| R-GATE-04 | movil | H-058 |
| R-GATE-05 | escritorio | H-149 |
| R-GATE-05 | movil | H-149 |
| R-GATE-06 | escritorio | H-011 |
| R-GATE-06 | movil | H-011 |
| R-GATE-07 | api | H-151, H-158 |
| R-GATE-08 | api | H-152 |
| R-GATE-09 | escritorio | H-116, H-148 |
| R-GATE-09 | movil | H-116, H-148 |
| R-GATE-10 | tests | H-069 |
| R-GATE-11 | api | H-162 |
| R-HOOK-01 | tests | H-037, H-160 |
| R-HOOK-03 | tests | H-037, H-161 |
| R-HOOK-06 | tests | H-161, H-163 |
| R-LEGAL-03 | escritorio | H-007 |
| R-LEGAL-03 | movil | H-007 |
| R-LEGAL-06 | escritorio | H-017 |
| R-MUS-03 | escritorio | H-129, H-133 |
| R-MUS-03 | movil | H-129, H-133 |
| R-MUS-05 | escritorio | H-035, H-119, H-131 |
| R-MUS-05 | movil | H-035, H-119, H-131 |
| R-MUS-07 | escritorio | H-130 |
| R-MUS-07 | movil | H-130 |
| R-MUS-08 | escritorio | H-130 |
| R-MUS-08 | movil | H-130 |
| R-MUS-10 | escritorio | H-132 |
| R-MUS-12 | movil | H-147 |
| R-MUS-13 | escritorio | H-035, H-144, H-145 |
| R-MUS-13 | movil | H-035, H-144, H-145 |
| R-NAV-01 | escritorio | H-010 |
| R-NAV-01 | movil | H-010 |
| R-NAV-03 | escritorio | H-039 |
| R-NAV-03 | movil | H-039 |
| R-NAV-04 | escritorio | H-010, H-040 |
| R-NAV-05 | escritorio | H-015 |
| R-NAV-07 | movil | H-010, H-014 |
| R-NAV-08 | movil | H-051 |
| R-NAV-12 | escritorio | H-013 |
| R-NAV-12 | movil | H-013 |
| R-NAV-13 | escritorio | H-013 |
| R-NAV-16 | escritorio | H-042 |
| R-NAV-16 | movil | H-042 |
| R-NAV-17 | escritorio | H-009 |
| R-NAV-20 | escritorio | H-041 |
| R-NAV-20 | movil | H-010, H-041 |
| R-NAV-21 | escritorio | H-045 |
| R-NAV-21 | movil | H-045 |
| R-NAV-24 | escritorio | H-012, H-043 |
| R-NAV-25 | escritorio | H-050 |
| R-NAV-25 | movil | H-050 |
| R-NIGHT-01 | escritorio | H-131 |
| R-NIGHT-02 | movil | H-035, H-142 |
| R-NIGHT-03 | escritorio | H-035 |
| R-NIGHT-03 | movil | H-035, H-142 |
| R-NIGHT-04 | escritorio | H-048 |
| R-NIGHT-04 | movil | H-048 |
| R-NIGHT-06 | escritorio | H-136 |
| R-NIGHT-06 | movil | H-136, H-146 |
| R-NIGHT-07 | escritorio | H-036, H-136 |
| R-NIGHT-07 | movil | H-036, H-136 |
| R-NIGHT-08 | escritorio | H-137 |
| R-NIGHT-08 | movil | H-137 |
| R-NIGHT-09 | escritorio | H-137 |
| R-NIGHT-09 | movil | H-137 |
| R-NIGHT-10 | movil | H-044, H-146 |
| R-NIGHT-11 | escritorio | H-134 |
| R-NIGHT-11 | movil | H-134 |
| R-NIGHT-16 | escritorio | H-139 |
| R-NIGHT-16 | movil | H-139 |
| R-NIGHT-17 | escritorio | H-138, H-139 |
| R-NIGHT-17 | movil | H-138, H-139 |
| R-NIGHT-18 | escritorio | H-141 |
| R-NIGHT-18 | movil | H-141 |
| R-NIGHT-20 | escritorio | H-016, H-114, H-143 |
| R-NIGHT-21 | escritorio | H-139, H-140 |
| R-NIGHT-21 | movil | H-139 |
| R-NIGHT-22 | escritorio | H-135, H-136 |
| R-NIGHT-22 | movil | H-135, H-136 |
| R-NIGHT-23 | escritorio | H-036 |
| R-NIGHT-23 | movil | H-036 |
| R-STU-01 | escritorio | H-034 |
| R-STU-02 | escritorio | H-119 |
| R-STU-02 | movil | H-119 |
| R-STU-04 | escritorio | H-106 |
| R-STU-04 | movil | H-106 |
| R-STU-05 | movil | H-112 |
| R-STU-06 | escritorio | H-111, H-112 |
| R-STU-07 | escritorio | H-110, H-113 |
| R-STU-07 | movil | H-110, H-113 |
| R-STU-08 | movil | H-128 |
| R-STU-11 | movil | H-123 |
| R-STU-12 | escritorio | H-121 |
| R-STU-12 | movil | H-121 |
| R-STU-13 | escritorio | H-016 |
| R-STU-15 | escritorio | H-105, H-120 |
| R-STU-15 | movil | H-105, H-120 |
| R-STU-16 | escritorio | H-031 |
| R-STU-16 | movil | H-031 |
| R-STU-17 | escritorio | H-031 |
| R-STU-17 | movil | H-031 |
| R-STU-19 | escritorio | H-109 |
| R-STU-19 | movil | H-109 |
| R-STU-20 | escritorio | H-033, H-107 |
| R-STU-20 | movil | H-033, H-107 |
| R-STU-21 | escritorio | H-122 |
| R-STU-22 | escritorio | H-108, H-114 |
| R-STU-22 | movil | H-108, H-114 |
| R-STU-24 | escritorio | H-118 |
| R-STU-24 | movil | H-118 |
| R-STU-25 | escritorio | H-032, H-117 |
| R-STU-25 | movil | H-032, H-117 |
| R-STU-27 | escritorio | H-033, H-125 |
| R-STU-27 | movil | H-033, H-125 |
| R-STU-28 | escritorio | H-125 |
| R-STU-28 | movil | H-125 |
| R-STU-29 | escritorio | H-030, H-031, H-041, H-127 |
| R-STU-29 | movil | H-030, H-031, H-041, H-127 |
| R-STU-30 | escritorio | H-032, H-126 |
| R-STU-31 | escritorio | H-115, H-124 |
| R-STU-31 | movil | H-115, H-124 |
| R-STU-32 | escritorio | H-115, H-116, H-124 |
| R-STU-32 | movil | H-115, H-116, H-124 |
| R-SYS-01 | api | H-159, H-163 |
| R-SYS-02 | api | H-158 |
| R-SYS-05 | api | H-012, H-043 |
| R-SYS-06 | api | H-043, H-153 |
| R-SYS-07 | api | H-058, H-154 |
| R-SYS-08 | api | H-011 |
| R-SYS-09 | tests | H-159, H-162, H-163 |
| TECLADO-aviso-error | escritorio | H-016 |
| TECLADO-avisos | escritorio | H-064 |
| TECLADO-barra | escritorio | H-016 |
| TECLADO-bombilla | escritorio | H-143 |
| TECLADO-carrito | escritorio | H-016, H-075, H-076 |
| TECLADO-chat | escritorio | H-016 |
| TECLADO-crew | escritorio | H-055, H-102 |
| TECLADO-ficha | escritorio | H-055 |
| TECLADO-intro | escritorio | H-040 |
| TECLADO-listado | escritorio | H-055, H-067 |
| TECLADO-menu-movil | movil | H-014 |
| TECLADO-mi-crew | escritorio | H-055, H-102 |
| TECLADO-mi-crew | escritorio | H-016, H-094 |
| TECLADO-navbar | escritorio | H-013 |
| TECLADO-pestañas | escritorio | H-114 |
| TECLADO-publicar | escritorio | H-016 |
| TECLADO-puerta | escritorio | H-164 |
| TECLADO-radio | escritorio | H-132 |
| TECLADO-ranking | escritorio | H-127 |
| TECLADO-rockyIA | escritorio | H-016 |
| TECLADO-secuenciador | escritorio | H-111 |
| TECLADO-spray | escritorio | H-016, H-114 |

## Hallazgos y los recorridos que los reproducen

Trazabilidad inversa: de cada hallazgo a las fichas cuya ejecución lo reproduce o lo cita.

| Hallazgo | Recorridos |
| --- | --- |
| H-001 | ninguno (sale de código, métricas, inventario o revisión) |
| H-002 | ninguno (sale de código, métricas, inventario o revisión) |
| H-003 | R-CAT-01, R-CAT-04, R-CAT-08 |
| H-004 | ninguno (sale de código, métricas, inventario o revisión) |
| H-005 | ninguno (sale de código, métricas, inventario o revisión) |
| H-006 | ninguno (sale de código, métricas, inventario o revisión) |
| H-007 | R-LEGAL-03 |
| H-008 | R-CART-10, R-CAT-13, R-CAT-14 |
| H-009 | R-ERR-12, R-NAV-17 |
| H-010 | R-CAT-08, R-NAV-01, R-NAV-04, R-NAV-07, R-NAV-20 |
| H-011 | R-ERR-01, R-GATE-06, R-SYS-08 |
| H-012 | R-NAV-24, R-SYS-05 |
| H-013 | R-NAV-12, R-NAV-13, TECLADO-navbar |
| H-014 | R-NAV-07, TECLADO-menu-movil |
| H-015 | R-NAV-05 |
| H-016 | R-CART-14, R-CART-22, R-CHAT-04, R-CHAT-08, R-NIGHT-20, R-STU-13, TECLADO-aviso-error, TECLADO-barra, TECLADO-carrito, TECLADO-chat, TECLADO-mi-crew, TECLADO-publicar, TECLADO-rockyIA, TECLADO-spray |
| H-017 | R-LEGAL-06 |
| H-018 | R-CHAT-07, R-CHAT-20 |
| H-019 | R-CAT-13 |
| H-020 | R-DROP-04, R-DROP-05 |
| H-021 | ninguno (sale de código, métricas, inventario o revisión) |
| H-022 | R-ACC-10 |
| H-023 | R-ACC-08 |
| H-024 | R-ACC-05, R-ACC-06 |
| H-025 | R-CHK-04, R-DROP-03, R-DROP-13 |
| H-026 | R-CHAT-08, R-CHAT-12, R-CHAT-14, R-CHAT-17 |
| H-027 | R-CHAT-08, R-CHAT-10 |
| H-028 | R-CREW-11 |
| H-029 | R-CREW-16 |
| H-030 | R-STU-29 |
| H-031 | R-STU-16, R-STU-17, R-STU-29 |
| H-032 | R-STU-25, R-STU-30 |
| H-033 | R-STU-20, R-STU-27 |
| H-034 | R-STU-01 |
| H-035 | R-MUS-05, R-MUS-13, R-NIGHT-02, R-NIGHT-03 |
| H-036 | R-NIGHT-07, R-NIGHT-23 |
| H-037 | R-HOOK-01, R-HOOK-03 |
| H-038 | ninguno (sale de código, métricas, inventario o revisión) |
| H-039 | R-NAV-03 |
| H-040 | R-NAV-04, TECLADO-intro |
| H-041 | R-NAV-20, R-STU-29 |
| H-042 | R-NAV-16 |
| H-043 | R-404-04, R-CAT-03, R-CAT-07, R-NAV-24, R-SYS-05, R-SYS-06 |
| H-044 | R-404-02, R-NIGHT-10 |
| H-045 | R-NAV-21 |
| H-046 | R-EGG-05 |
| H-047 | R-EGG-04 |
| H-048 | R-EGG-03, R-NIGHT-04 |
| H-049 | R-EGG-01 |
| H-050 | R-NAV-25 |
| H-051 | R-NAV-08 |
| H-052 | R-CAT-11, R-ERR-03 |
| H-053 | R-CAT-01 |
| H-054 | R-DROP-06 |
| H-055 | R-CAT-04, R-CREW-02, R-DROP-05, TECLADO-crew, TECLADO-ficha, TECLADO-listado, TECLADO-mi-crew |
| H-056 | R-CAT-04, R-CAT-06 |
| H-057 | R-CAT-05, R-CAT-08 |
| H-058 | R-ACC-01, R-CART-03, R-CART-18, R-CAT-12, R-CHAT-05, R-CHAT-06, R-CHK-01, R-CHK-03, R-DROP-08, R-DROP-12, R-ERR-02, R-ERR-03, R-ERR-04, R-ERR-05, R-ERR-09, R-GATE-04, R-SYS-07 |
| H-059 | R-CAT-06 |
| H-060 | ninguno (sale de código, métricas, inventario o revisión) |
| H-061 | ninguno (sale de código, métricas, inventario o revisión) |
| H-062 | R-CAT-02 |
| H-063 | R-CAT-06 |
| H-064 | R-DROP-04, TECLADO-avisos |
| H-065 | R-CAT-06 |
| H-066 | R-CAT-04 |
| H-067 | TECLADO-listado |
| H-068 | R-DROP-01 |
| H-069 | R-ACC-09, R-GATE-10 |
| H-070 | R-ACC-07 |
| H-071 | R-ACC-08, R-CART-10, R-CHAT-09, R-CHK-02 |
| H-072 | R-CART-15, R-CART-21 |
| H-073 | R-CART-18, R-CART-19, R-CHK-03 |
| H-074 | R-ACC-08, R-CART-13, R-CART-21 |
| H-075 | R-CART-11, R-CART-13, R-CART-22, TECLADO-carrito |
| H-076 | R-CART-12, R-CART-22, TECLADO-carrito |
| H-077 | R-CART-02 |
| H-078 | R-CART-08, R-CART-13 |
| H-079 | R-CART-15 |
| H-080 | ninguno (sale de código, métricas, inventario o revisión) |
| H-081 | R-ACC-06 |
| H-082 | R-CART-01, R-CART-02, R-CHK-01 |
| H-083 | ninguno (sale de código, métricas, inventario o revisión) |
| H-084 | ninguno (sale de código, métricas, inventario o revisión) |
| H-085 | R-CHAT-02, R-CHAT-05, R-CHAT-14, R-CHAT-15, R-CHAT-16, R-CHAT-17 |
| H-086 | R-CHAT-13 |
| H-087 | R-CHAT-19 |
| H-088 | R-CHAT-10, R-CHAT-11 |
| H-089 | R-CHAT-04 |
| H-090 | R-CHAT-02, R-CHAT-05 |
| H-091 | R-CHAT-01 |
| H-092 | ninguno (sale de código, métricas, inventario o revisión) |
| H-093 | R-CREW-09 |
| H-094 | R-CREW-13, TECLADO-mi-crew |
| H-095 | R-CREW-10, R-CREW-13, R-CREW-15 |
| H-096 | R-CREW-10 |
| H-097 | ninguno (sale de código, métricas, inventario o revisión) |
| H-098 | R-CREW-11 |
| H-099 | R-CREW-04 |
| H-100 | R-CREW-02 |
| H-101 | R-CREW-05 |
| H-102 | R-CREW-02, TECLADO-crew, TECLADO-mi-crew |
| H-103 | ninguno (sale de código, métricas, inventario o revisión) |
| H-104 | R-CHAT-09 |
| H-105 | R-STU-15 |
| H-106 | R-STU-04 |
| H-107 | R-STU-20 |
| H-108 | R-STU-22 |
| H-109 | R-STU-19 |
| H-110 | R-STU-07 |
| H-111 | R-STU-06, TECLADO-secuenciador |
| H-112 | R-STU-05, R-STU-06 |
| H-113 | R-STU-07 |
| H-114 | R-NIGHT-20, R-STU-22, TECLADO-pestañas, TECLADO-spray |
| H-115 | R-STU-31, R-STU-32 |
| H-116 | R-ERR-12, R-GATE-09, R-STU-32 |
| H-117 | R-STU-25 |
| H-118 | R-STU-24 |
| H-119 | R-MUS-05, R-STU-02 |
| H-120 | R-STU-15 |
| H-121 | R-STU-12 |
| H-122 | R-STU-21 |
| H-123 | R-STU-11 |
| H-124 | R-STU-31, R-STU-32 |
| H-125 | R-STU-27, R-STU-28 |
| H-126 | R-STU-30 |
| H-127 | R-STU-29, TECLADO-ranking |
| H-128 | R-STU-08 |
| H-129 | R-MUS-03 |
| H-130 | R-MUS-07, R-MUS-08 |
| H-131 | R-MUS-05, R-NIGHT-01 |
| H-132 | R-MUS-10, TECLADO-radio |
| H-133 | R-MUS-03 |
| H-134 | R-NIGHT-11 |
| H-135 | R-NIGHT-22 |
| H-136 | R-NIGHT-06, R-NIGHT-07, R-NIGHT-22 |
| H-137 | R-NIGHT-08, R-NIGHT-09 |
| H-138 | R-NIGHT-17 |
| H-139 | R-NIGHT-16, R-NIGHT-17, R-NIGHT-21 |
| H-140 | R-NIGHT-21 |
| H-141 | R-NIGHT-18 |
| H-142 | R-NIGHT-02, R-NIGHT-03 |
| H-143 | R-NIGHT-20, TECLADO-bombilla |
| H-144 | R-MUS-13 |
| H-145 | R-MUS-13 |
| H-146 | R-NIGHT-06, R-NIGHT-10 |
| H-147 | R-MUS-12 |
| H-148 | R-GATE-09 |
| H-149 | R-GATE-03, R-GATE-05 |
| H-150 | R-GATE-02 |
| H-151 | R-GATE-07 |
| H-152 | R-GATE-08 |
| H-153 | R-SYS-06 |
| H-154 | R-SYS-07 |
| H-155 | R-ERR-10 |
| H-156 | R-ERR-10 |
| H-157 | R-ERR-03 |
| H-158 | R-GATE-07, R-SYS-02 |
| H-159 | R-SYS-01, R-SYS-09 |
| H-160 | R-HOOK-01 |
| H-161 | R-HOOK-03, R-HOOK-06 |
| H-162 | R-GATE-11, R-SYS-09 |
| H-163 | R-ERR-11, R-HOOK-06, R-SYS-01, R-SYS-09 |
| H-164 | R-GATE-03, TECLADO-puerta |
| H-165 | R-GATE-01 |
| H-166 | ninguno (sale de código, métricas, inventario o revisión) |
| H-167 | ninguno (sale de código, métricas, inventario o revisión) |
| H-168 | ninguno (sale de código, métricas, inventario o revisión) |
| H-169 | ninguno (sale de código, métricas, inventario o revisión) |
| H-170 | ninguno (sale de código, métricas, inventario o revisión) |
| H-171 | ninguno (sale de código, métricas, inventario o revisión) |
| H-172 | ninguno (sale de código, métricas, inventario o revisión) |
| H-173 | ninguno (sale de código, métricas, inventario o revisión) |
| H-174 | ninguno (sale de código, métricas, inventario o revisión) |
| H-175 | ninguno (sale de código, métricas, inventario o revisión) |
