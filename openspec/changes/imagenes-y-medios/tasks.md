# Tareas: imágenes y medios

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; sacar capturas de referencia (día y neón, 375 y 1440 px) de portada, ficha, carrito, `/estudio`, `/crew`, 404 y la Estampida, y guardar las medidas de imágenes de `traza-navegador.mjs` (`docs/auditoria/2026-11/herramientas/fase4/`).

## 2. Herramienta de imágenes

- [ ] 2.1 Añadir a `scripts/optimizar-imagenes.test.mjs` las pruebas de lo nuevo y verlas fallar: `--widths 320,640,1280` planifica una salida por ancho sin superar el del maestro; `--heights 320,640` planifica `-h320` y `-h640`; destino `public/products`; un maestro animado conserva sus fotogramas; argumentos inválidos.
- [ ] 2.2 Implementar esas opciones en `scripts/optimizar-imagenes.mjs` hasta que pasen, y documentarlas en su cabecera; verificar con `--dry-run` que el plan sobre los ficheros reales es el esperado.

## 3. Fotos de producto

- [ ] 3.1 Mover las fotos actuales de `public/products/` a `assets-master/products/` como maestros y regenerar cada una a 1.280 px como máximo con sus variantes `-640` y `-320`; verificar con `file` que ninguna supera 1.280 px y anotar el peso total antes y después.
- [ ] 3.2 Escribir las pruebas del componente de foto de producto y verlas fallar: `srcSet` y `sizes` con rutas locales por convención y con `sources` de Shopify; `width` y `height` reales; prioridad; foto sin variantes; `alt`.
- [ ] 3.3 Implementar el componente y usarlo en la tarjeta, la ficha, el lightbox, el carrito, la tarjeta del chat, las miniaturas del cartel, «La banda» y el Taller, con el `sizes` de cada sitio; actualizar `src/data/productImages.js` y `src/data/streetWall.js`. Las pruebas de esos componentes siguen en verde.
- [ ] 3.4 Verificar con Playwright, en 375 px a densidad 2 y en 1440 px a densidad 1, los escenarios de «las fotos de producto se descargan al tamaño al que se pintan» mirando `currentSrc` y las peticiones de red.

## 4. Shopify

- [ ] 4.1 Comprobar contra la tienda de pruebas, con una consulta suelta, que `Image` devuelve `width`, `height` y `url(transform: { maxWidth })` en la Storefront API y en la Admin API, y que las URL responden 200 con el ancho pedido. Si no es así, parar y replantear D3.
- [ ] 4.2 Escribir las pruebas del servidor y verlas fallar: `image` de producto, variante y línea de carrito con `width`, `height` y `sources`; póster de drop igual; producto sin foto sigue con `image: null`; `url` y `alt` sin cambios.
- [ ] 4.3 Implementar las consultas con alias en `storefront.mjs` y `drops-admin.mjs`, el mapeo, el paso por `normalize.js` y la validación de cada variante en el chat; enseñar al doble de `herramientas/e2sim/` a responder los campos nuevos.

## 5. Ilustraciones

- [ ] 5.1 Generar `-h320` y `-h640` de los 23 `-hd` y de los 16 `night/*-800`; anotar el peso de cada lote.
- [ ] 5.2 Escribir las pruebas del ayudante de variantes y del emparejamiento día-noche por variante y verlas fallar; implementarlo en `src/data/crew.js` y `src/features/night/nightArt.js` sin romper las pruebas existentes de `nightArt`.
- [ ] 5.3 Usar la variante que corresponde en la Estampida, el público de la mesa, los muñecos de `/estudio`, la ficha, el carrito, el chat, el Curioso, los cromos y el desfile de `/crew`, la barra y el aviso de drop; dejar el `-hd` solo donde se pinta a más de 320 px.
- [ ] 5.4 Verificar los escenarios de «las ilustraciones se descargan al tamaño al que se pintan»: suma de la Estampida de día y de noche por las peticiones de red, y memoria de `/estudio` con `traza-navegador.mjs`.

## 6. Animación del pie

- [ ] 6.1 Generar las variantes de 112 y 168 px de las dos animaciones y de sus pósters, y anotar sus pesos.
- [ ] 6.2 Escribir en `Footer.test.jsx` las pruebas y verlas fallar: `srcSet` con las tres alturas; nada de animación hasta que la cinta está en pantalla; póster con movimiento reducido y con ahorro de datos; de noche, la variante de noche con las mismas reglas. Implementar.
- [ ] 6.3 Medir con `traza-navegador.mjs` la CPU de Chrome en reposo con la cinta en pantalla usando el WebP animado y usando una hoja de sprites de prueba; aplicar la regla de D5, anotar aquí las dos medidas y la decisión, e implementar la hoja solo si gana.

## 7. Repartidor, ocultas, audio y vídeo

- [ ] 7.1 Pruebas en `CartRunner.test.jsx`, primero en rojo: la ilustración se precarga en reposo; la carrera espera a que esté decodificada; si no llega en un segundo no hay carrera y no hay error. Implementar D6.
- [ ] 7.2 Añadir `loading="lazy"` a las cuatro ilustraciones ocultas por CSS y verificar con Playwright que no se piden en los anchos en que están ocultas.
- [ ] 7.3 Añadir una prueba de que ninguna página pide `/music/` al cargar y de que encender el neón pide solo `modo-neon.m4a` (ampliando `MusicContext.test.jsx`); debe pasar sin tocar el código.
- [ ] 7.4 Añadir al guardián la regla de vídeos con su prueba, y escribir la regla en `CONTRIBUTING.md`.

## 8. Presupuesto y cierre

- [ ] 8.1 Actualizar `scripts/performance-budget.json` (D10) y verificar que `npm run check` pasa con los límites nuevos.
- [ ] 8.2 Repetir las capturas de 1.1 y compararlas una a una; repetir Lighthouse y la traza de navegador y anotar en `linea-base-fase-4.md` el peso de `/`, las imágenes decodificadas y el LCP nuevos.
- [ ] 8.3 `npm run check`; autorrevisión de `git diff`; revisión independiente contra `specs/imagenes-y-medios/spec.md`. Anotar el resultado aquí.

## Workflow follow-up

- Si aparece el máster sin pérdida de `barro.m4a`, abrir un cambio pequeño para H-145.
- Archivar con `openspec-archive-change` tras VERIFIED.
