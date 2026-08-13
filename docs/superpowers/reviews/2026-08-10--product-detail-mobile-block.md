# Rocky 035 — bloque de detalle de producto móvil

Fecha: 2026-08-10
Estado: implementación y verificación local completas; revisión posterior de Oracle pendiente por indisponibilidad; producción sin cambios

## Problema observado

Oracle señaló en la ronda inicial un problema de severidad alta en el detalle móvil: la galería ocupaba el primer viewport y retrasaba la identidad del producto, el precio y la acción principal. Las capturas locales inmediatamente anteriores confirmaron el síntoma a 360, 400 y 500 px.

## Corrección acotada

- La información del producto y sus controles de compra preceden ahora a la galería en el DOM.
- En móvil, ese mismo orden se conserva visualmente y al navegar con teclado.
- En escritorio, CSS coloca explícitamente la galería en la columna izquierda y la información en la derecha, preservando la composición existente.
- La reserva ornamental anterior a la imagen se redujo sin retirar ilustraciones ni sustituir recursos de marca.
- El CTA principal garantiza 44 px de altura.
- No se modificaron datos, variantes, lógica de carrito, Shopify ni producción.

Archivos del bloque:

1. `src/components/ProductDetail.jsx`
2. `src/styles/ProductDetail.css`
3. `src/components/ProductDetail.test.jsx`

## Evidencia visual

Atlas confirmó el contrato en cinco anchos:

- 360 y 400 px: identidad, descripción, precio y CTA están dentro del primer viewport, y el comienzo de la imagen sigue visible;
- 768 px: la composición móvil ocupa todo el ancho sin desborde;
- 769 y 820 px: la composición de dos columnas se mantiene sin saltos ni cambio de jerarquía.

Los pares antes/después y las mediciones están catalogados en `output/visual-audit/round-04-product-detail/manifest.md`.

## Orden y medición

La prueba de componente exige que el título preceda al CTA y que el CTA preceda al botón de galería en el orden fuente. La comprobación de navegador midió un CTA de 44 px de alto y `clientWidth === scrollWidth` a 360, 400 y 500 px.

En el ancho más exigente, 360 × 900, el CTA termina aproximadamente en `y=665` y la galería comienza en `y=758`; ambos quedan representados en el primer viewport. A 400 × 900 terminan/comienzan en `y=636` y `y=728`, respectivamente.

## Pruebas

- pruebas enfocadas del bloque y regresiones relacionadas: 4 archivos, 11 pruebas correctas;
- `npm run check`: 35 archivos, 230 pruebas, build Vite y secret scan correctos;
- `git diff --check`: correcto después de documentar el bloque.

## Riesgo restante

Oracle no pudo recibir la revisión posterior del diff: tres intentos sobre la misma conversación fallaron antes de crear un turno, según el registro `docs/superpowers/reviews/2026-08-10--oracle-round-03-miniplayer-implementation.md`. Este bloque sigue el contrato visual de severidad alta de la ronda inicial y cuenta con evidencia Atlas y automatizada, pero su contraste artístico posterior queda pendiente. Antes de producción también conviene repetir 360/400 px en hardware móvil real para safe areas, zoom y comportamiento táctil.
