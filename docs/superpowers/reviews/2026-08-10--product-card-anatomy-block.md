# Rocky 035 — bloque de anatomía de tarjetas

Fecha: 2026-08-10
Estado: implementación y verificación local completas; producción sin cambios

## Resultado

La jerarquía comercial de la tarjeta ya no depende del wrapping accidental. Los títulos estrechos disponen de dos líneas estables, el CTA de compra recibe más anchura que `Detalles` cuando comparten fila y ambos controles alcanzan 44 px como mínimo.

## Decisiones visuales

- Se conserva la fotografía cuadrada y toda la construcción de papel, borde, sombra e inclinación.
- No se añadieron badges, iconos, colores ni animaciones nuevas.
- El título se limita a dos líneas y reserva esa altura para alinear precios y acciones entre tarjetas.
- En filas amplias, la relación de pistas es `0.85fr / 1.15fr` a favor de la compra.
- En móvil las acciones siguen apiladas, porque 360 px ya demostraba una jerarquía clara y no necesitaba otra composición.

La auditoría de producto se realizó con capturas nuevas de Atlas, no con memoria ni evidencia antigua. El manifiesto completo está en `output/visual-audit/round-05-product-cards/manifest.md`.

## Archivos del bloque

1. `src/styles/ProductPage.css`
2. `src/components/ProductPage.test.jsx`

## Verificación

- TDD: los dos contratos nuevos fallaron antes de editar CSS y pasaron después;
- prueba enfocada: 1 archivo, 4 pruebas correctas;
- `npm run check`: 35 archivos, 232 pruebas, build Vite y secret scan correctos;
- Atlas: antes/después a 360, 400 y 820 px, más control final a 1326 px;
- medición Atlas: acciones de 45 px de alto, CTA primario más ancho en escritorio y `clientWidth === scrollWidth` a 400/1326 px.

## Riesgo restante

El bloque no modifica la lógica de carrito. Aún deben probarse en una ronda controlada los estados pendiente, añadido, error, agotado, variantes y carrito con artículos. El contraste y el recorrido de foco requieren comprobaciones específicas adicionales; no se declara conformidad WCAG completa a partir de capturas.
