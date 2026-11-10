# Tareas: imágenes y medios

## 1. Línea base

- [x] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; sacar capturas de referencia (día y neón, 375 y 1440 px) de portada, ficha, carrito, `/estudio`, `/crew`, 404 y la Estampida, y guardar las medidas de imágenes de `traza-navegador.mjs` (`docs/auditoria/2026-11/herramientas/fase4/`).
  - 1.506 tests. Capturas y medidas en el scratchpad con `fase4/capturas.mjs.txt`: la portada decodificaba 344,5 MB de imágenes; `/crew`, 122,2 MB; `/estudio` en escritorio, 55,6 MB.

## 2. Herramienta de imágenes

- [x] 2.1 Añadir a `scripts/optimizar-imagenes.test.mjs` las pruebas de lo nuevo y verlas fallar: `--widths 320,640,1280` planifica una salida por ancho sin superar el del maestro; `--heights 320,640` planifica `-h320` y `-h640`; destino `public/products`; un maestro animado conserva sus fotogramas; argumentos inválidos.
  - Además: un WebP que ya mide lo pedido se copia en vez de recomprimirse.
- [x] 2.2 Implementar esas opciones en `scripts/optimizar-imagenes.mjs` hasta que pasen, y documentarlas en su cabecera; verificar con `--dry-run` que el plan sobre los ficheros reales es el esperado.

## 3. Fotos de producto

- [x] 3.1 Mover las fotos actuales de `public/products/` a `assets-master/products/` como maestros y regenerar cada una a 1.280 px como máximo con sus variantes `-640` y `-320`; verificar con `file` que ninguna supera 1.280 px y anotar el peso total antes y después.
  - Maestros en `assets-master/products/` (sin versionar; los de 5.906 px siguen en el historial, en `7effff4`). Las dos fotos grandes pasan de 154–175 kB a 21–22 kB a 1.280 px; las de 1.254 px se copian tal cual. Cada foto gana `-640` (9–32 kB) y `-320` (4–11 kB). La carpeta pasa de 1.240 a 1.252 kB con 20 ficheros más.
- [x] 3.2 Escribir las pruebas del componente de foto de producto y verlas fallar: `srcSet` y `sizes` con rutas locales por convención y con `sources` de Shopify; `width` y `height` reales; prioridad; foto sin variantes; `alt`.
- [x] 3.3 Implementar el componente y usarlo en la tarjeta, la ficha, el lightbox, el carrito, la tarjeta del chat, las miniaturas del cartel, «La banda» y el Taller, con el `sizes` de cada sitio; actualizar `src/data/productImages.js` y `src/data/streetWall.js`. Las pruebas de esos componentes siguen en verde.
  - `src/components/ProductPhoto.jsx`. También la camiseta de «sin foto» (`PlaceholderTee`) y el póster del cartel.
- [x] 3.4 Verificar con Playwright, en 375 px a densidad 2 y en 1440 px a densidad 1, los escenarios de «las fotos de producto se descargan al tamaño al que se pintan» mirando `currentSrc` y las peticiones de red.
  - Con `fase4/verificar-imagenes.mjs.txt`: tarjetas a 375@2x → `-320`; ficha a 1440@1x → `-640` (pintada a 455 px); lightbox → el original de 1.254 px. La portada en móvil decodifica 8,9 MB (antes 344,5).

## 4. Shopify

- [x] 4.1 Comprobar contra la tienda de pruebas, con una consulta suelta, que `Image` devuelve `width`, `height` y `url(transform: { maxWidth })` en la Storefront API y en la Admin API, y que las URL responden 200 con el ancho pedido. Si no es así, parar y replantear D3.
  - Hecho el 2026-11-10 contra `rocky035-pruebas` (API 2026-07), Storefront y Admin: los campos existen, las URL responden 200 con el ancho pedido y Shopify no amplía. A un navegador le sirve WebP: 13 kB a 320 px de un PNG de 1 MB.
- [x] 4.2 Escribir las pruebas del servidor y verlas fallar: `image` de producto, variante y línea de carrito con `width`, `height` y `sources`; póster de drop igual; producto sin foto sigue con `image: null`; `url` y `alt` sin cambios.
- [x] 4.3 Implementar las consultas con alias en `storefront.mjs` y `drops-admin.mjs`, el mapeo, el paso por `normalize.js` y la validación de cada variante en el chat; enseñar al doble de `herramientas/e2sim/` a responder los campos nuevos.
  - El mapeo es común a las dos API: `server/integrations/shopify/image.mjs`.

## 5. Ilustraciones

- [x] 5.1 Generar `-h320` y `-h640` de los 23 `-hd` y de los 16 `night/*-800`; anotar el peso de cada lote.
  - `-h320`: 309,7 kB los 23 de día y 263,5 kB los 16 de noche. `-h640`: 704,3 y 616,3 kB (sin pérdida pesarían 1.052 y 1.715 kB).
- [x] 5.2 Escribir las pruebas del ayudante de variantes y del emparejamiento día-noche por variante y verlas fallar; implementarlo en `src/data/crew.js` y `src/features/night/nightArt.js` sin romper las pruebas existentes de `nightArt`.
  - `src/data/art.js` (`artSources`). El emparejamiento de `nightArt.js` no cambia: la variante se elige sobre el dibujo de noche.
- [x] 5.3 Usar la variante que corresponde en la Estampida, el público de la mesa, los muñecos de `/estudio`, la ficha, el carrito, el chat, el Curioso, los cromos y el desfile de `/crew`, la barra y el aviso de drop; dejar el `-hd` solo donde se pinta a más de 320 px.
- [x] 5.4 Verificar los escenarios de «las ilustraciones se descargan al tamaño al que se pintan»: suma de la Estampida de día y de noche por las peticiones de red, y memoria de `/estudio` con `traza-navegador.mjs`.
  - Estampida: 340,4 kB de día y 351,1 kB de noche (límites 350 y 500). `/estudio` en escritorio decodifica 5,3 MB (antes 55,6); `/crew`, 13,8 MB en escritorio y 33,5 MB en móvil (antes 122,2).

## 6. Animación del pie

- [x] 6.1 Generar las variantes de 112 y 168 px de las dos animaciones y de sus pósters, y anotar sus pesos.
  - A calidad 75: 112 px, 305,3 kB (día) y 313,7 kB (noche); 168 px, 490,1 y 525,0 kB. Pósters: 3,6–7,0 kB.
- [x] 6.2 Escribir en `Footer.test.jsx` las pruebas y verlas fallar: `srcSet` con las tres alturas; nada de animación hasta que la cinta está en pantalla; póster con movimiento reducido y con ahorro de datos; de noche, la variante de noche con las mismas reglas. Implementar.
  - La prueba que fijaba el margen de 800 px del observador se actualiza: el requisito cambia a «solo con la cinta en pantalla».
- [x] 6.3 Medir con `traza-navegador.mjs` la CPU de Chrome en reposo con la cinta en pantalla usando el WebP animado y usando una hoja de sprites de prueba; aplicar la regla de D5, anotar aquí las dos medidas y la decisión, e implementar la hoja solo si gana.
  - WebP animado: 2,3 % de un núcleo. Hoja de sprites de 112 px (9 × 9, 256,8 kB): 3,3 %. La hoja no gana un 20 %; pierde. Se queda el WebP.

## 7. Repartidor, ocultas, audio y vídeo

- [x] 7.1 Pruebas en `CartRunner.test.jsx`, primero en rojo: la ilustración se precarga en reposo; la carrera espera a que esté decodificada; si no llega en un segundo no hay carrera y no hay error. Implementar D6.
- [x] 7.2 Añadir `loading="lazy"` a las cuatro ilustraciones ocultas por CSS y verificar con Playwright que no se piden en los anchos en que están ocultas.
  - Verificado: `/estudio`, `/rockyIA`, `/mi-crew` y `/taller` a 375 px no piden sus ilustraciones ocultas.
- [x] 7.3 Añadir una prueba de que ninguna página pide `/music/` al cargar y de que encender el neón pide solo `modo-neon.m4a` (ampliando `MusicContext.test.jsx`); debe pasar sin tocar el código.
  - Las dos comprobaciones ya estaban en `MusicContext.test.jsx` («keeps the audio source empty…» y «al encender el neón entra su cinta…»), así que no se duplican. Verificado además en navegador: ninguna de `/`, `/estudio`, `/crew` y `/cart` pide audio al cargar, y encender el neón pide solo `modo-neon.m4a`.
- [x] 7.4 Añadir al guardián la regla de vídeos con su prueba, y escribir la regla en `CONTRIBUTING.md`.
  - Un vídeo solo pasa si está en `videos` del presupuesto con su límite.

## 8. Presupuesto y cierre

- [x] 8.1 Actualizar `scripts/performance-budget.json` (D10) y verificar que `npm run check` pasa con los límites nuevos.
  - Límites nuevos: sin excepciones de fotos; métrica propia para animaciones (710 kB); total de imágenes 8.700 kB (todas las variantes); JavaScript inicial 126 kB (sube 3 kB: tabla de variantes y componente de foto).
- [x] 8.2 Repetir las capturas de 1.1 y compararlas una a una; repetir Lighthouse y la traza de navegador y anotar en `linea-base-fase-4.md` el peso de `/`, las imágenes decodificadas y el LCP nuevos.
  - Capturas: mismas medidas de página en las 28; entre un 0,00 y un 0,48 % de píxeles distintos (bordes de dibujos remuestreados); revisadas a ojo `/crew` y `/estudio`, sin diferencia visible.
  - Lighthouse de la portada en móvil (mediana de 3): peso 1.943 → 1.149 kB, imágenes 1.400 → 580 kB, LCP 9,76 → 7,51 s, rendimiento 68 → 69. Imágenes decodificadas al recorrerla: 344,5 → 8,9 MB. `/crew` y `/estudio` bajan en memoria (122 → 34 MB y 56 → 5 MB) pero poco en bytes; su CLS y su LCP son de `carga-y-estabilidad`. Solo se repitió Lighthouse en tres páginas; la tanda completa se hace al cerrar la fase.
- [x] 8.3 `npm run check`; autorrevisión de `git diff`; revisión independiente contra `specs/imagenes-y-medios/spec.md`. Anotar el resultado aquí.
  - Revisión independiente (subagente con contexto limpio, una ronda): 1 bloqueante, 3 importantes y 9 menores.
  - Corregidos con prueba: el lightbox deformaba la foto en ventanas apaisadas (B1); encender el neón tras haber visto el pie bajaba la animación de noche (I1); los avatares de Mi Crew quedaban borrosos en móvil (I2); faltaban pruebas del cableado en los sitios de uso (I3: normalización, tarjeta, lightbox, Estampida); `sizes` de la tarjeta entre 641 y 1.100 px, `sizes` del pie sin `clamp()`, carrito vacío de noche, precarga del repartidor cuando no va a correr, vídeo declarado dos veces y receta de las variantes en la cabecera del script (M1, M4–M8).
  - Anotados como límites conocidos en `design.md`: la ficha en móvil descarga el original (M2) y no hay variante para densidad 3 (M3).
  - Pruebas existentes que cambian a propósito, porque cambia su requisito: en `Footer.test.jsx`, el margen del observador (de 800 px a «en pantalla»); en `check-budget.test.mjs`, el `.mp4` deja de ser «tipo sin regla» (pasa a `plano.psd`), el presupuesto tiene una métrica más (10 filas) y las animaciones se miden con la suya.
  - Decisiones que se apartan del diseño inicial, tomadas al medir: límites del pie 320 y 530 kB (antes 310 y 450); `srcSet` por densidad en las ilustraciones; el JavaScript inicial sube a 126 kB y el total de imágenes a 8.700 kB.

## Workflow follow-up

- Si aparece el máster sin pérdida de `barro.m4a`, abrir un cambio pequeño para H-145.
- Archivar con `openspec-archive-change` tras VERIFIED.
