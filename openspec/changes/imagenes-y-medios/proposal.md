# Propuesta: imágenes y medios

## Why

Las imágenes son el 72 % del peso de la portada (1.400 de 1.943 kB en móvil) y casi toda
la memoria que gasta el navegador. La línea base de la fase 4
(`docs/auditoria/2026-11/linea-base-fase-4.md`, apartados 2 y 3) y la auditoría (cambio
C15 de `plan-fases.md`) lo concretan:

- **Dos fotos de producto miden 5906 × 5906 px** (H-003). Recorrer la portada sube la
  memoria del navegador en unos 385 MB para pintarlas a menos de 300 px.
- **Ninguna foto de producto ofrece variantes**: la tarjeta del catálogo se pinta a
  159 px en móvil y descarga 1254 px (hasta 199 kB). En modo Shopify llega la URL del
  CDN tal cual y todas las fotos declaran 1254 × 1254, midan lo que midan.
- **Las ilustraciones `-hd`** (unos 1000 × 1400 px) se pintan entre 16 y 476 veces más
  pequeñas de lo que miden. La Estampida descarga 615 KiB para corredores de 70–140 px
  (H-047); de noche, 1.113 KiB.
- **La animación del pie pesa 663 kB** (709 kB la de noche) y es la imagen más pesada en
  7 de 10 páginas (H-169): se descarga en cuanto la cinta queda a 800 px de la pantalla.
- El repartidor del carrito cruza sin dibujo la primera vez con red lenta (H-083), y
  varias ilustraciones ocultas en móvil se descargan igual (el patrón de H-068).

Es el segundo cambio de la fase 4, de nivel 2.

## What Changes

- **Fotos de producto con variantes de 320, 640 y 1.280 px** y `srcSet`/`sizes` en todos
  los sitios donde se pintan: tarjeta, ficha, lightbox, carrito, chat, miniaturas del
  cartel, «La banda» y el Taller. Las dos fotos de 5906 px se sustituyen por versiones
  de 1.280 px.
- **En modo Shopify, la API de catálogo añade a cada imagen su tamaño real y sus
  variantes**, pedidas a Shopify con la transformación de imagen de sus API. Los
  pósters de los drops, igual. Es un añadido compatible: `url` y `alt` no cambian.
- **Ilustraciones en dos tamaños** (320 y 640 px de alto), de día y de noche, y cada
  sitio usa el que corresponde a lo que pinta.
- **Animación del pie** en tres alturas (112, 168 y 224 px), descargada solo cuando la
  cinta se ve y nunca con movimiento reducido o ahorro de datos.
- **El repartidor del carrito se precarga** en reposo y no arranca hasta estar dibujado.
- **Las ilustraciones ocultas por el ancho de pantalla dejan de descargarse.**
- **Regla para vídeos**: no entra ninguno en `dist/` sin presupuesto ni carga diferida;
  queda escrita en `CONTRIBUTING.md` y vigilada por el guardián de presupuesto.
- **El audio no se toca**: no hay máster sin pérdida de `barro.m4a` en el repo y
  recodificar desde un fichero con pérdida degrada la pista (H-145 queda anotado).

## Capabilities

### New Capabilities

- `imagenes-y-medios`: a qué tamaño y cuándo se descargan las fotos, las ilustraciones,
  las animaciones, el audio y el vídeo de la web.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío). La respuesta de `GET /api/shopify/products` y de
`GET /api/drops` gana campos; los requisitos de `catalogo-vivo` y `calendario-de-drops`
(cambio `sistema-de-drops`, sin archivar) no cambian.

## Fuera de alcance

- Recodificar el audio (H-145) y el banco BARRO de la mesa, que descarga `barro.m4a`
  entero al elegirlo.
- Reducir fotogramas o pasar a vídeo las animaciones del pie: medido y descartado en
  `design.md` porque cambia el arte o complica la compatibilidad para ahorrar poco.
- Qué imagen es el LCP y con qué prioridad se carga: `carga-y-estabilidad`.
- Cambiar el logotipo, redibujar arte o mover `posters/` y `prompts-munecos/`.

## Supuestos

- Las API de Shopify (Storefront y Admin) aceptan `url(transform: { maxWidth })` en el
  tipo `Image` y devuelven `width` y `height`. Se comprueba contra la tienda de pruebas
  antes de dar por buena la parte de Shopify.
- Las dos fotos de 5906 px son su propio máster: no hay originales en el repo. Se
  conservan en `assets-master/` (sin versionar) y en el historial de git.
- Servir las ilustraciones pequeñas con pérdida (calidad 82, como ya hacen las `-600`)
  no se nota al tamaño al que se pintan; se comprueba con capturas antes y después.

## Impact

`scripts/optimizar-imagenes.mjs` y sus pruebas, `public/products/`,
`src/images/optimized/`, un componente nuevo de foto de producto y los ocho sitios que
pintan una, `src/data/art.js` (ayudante de variantes), `src/components/ProductPhoto.jsx`, `Footer.jsx`,
`Estampida.jsx`, `CartRunner.jsx`, cuatro ilustraciones ocultas por CSS,
`server/integrations/shopify/` (consultas de imagen), `src/features/storefront/normalize.js`,
el doble de Shopify de la auditoría, `scripts/performance-budget.json` y `CONTRIBUTING.md`.
Sin dependencias nuevas (`sharp` se sigue instalando con `--no-save` para regenerar).
