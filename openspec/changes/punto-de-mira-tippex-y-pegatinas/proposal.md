# Propuesta: punto de mira, rotulador y Tipp-Ex, y pegatina arrancada

## Why

La dirección artística de la web es un barrio dibujado en un cuaderno que te mira. La
diana está en las gafas de los muñecos, en la O del logotipo y en el cursor de las fotos.
De día es papel, tinta y pegatinas; de noche, luz negra y spray. Hoy esos motivos son
decorado: las interacciones de compra y el cambio de modo usan señales genéricas. Por
ejemplo, el «Agotado» es solo el texto de un botón desactivado, y apagar el descontrol
no tiene transición.

El usuario eligió el 2026-11-09, de la lista de ideas de dirección artística, las tres
que más identidad aportan sin muñecos nuevos: la 2, la 5 y la 7.

## What Changes

- **Punto de mira (idea 2).** Sobre la foto de producto (tarjetas del catálogo y ficha),
  el puntero o el foco de teclado hacen aparecer una retícula dibujada que se cierra
  sobre la foto. Al añadir al carrito con éxito, la retícula se cierra del todo y estampa
  un punto rojo de pegatina en la esquina de la foto («impacto»).
- **Rotulador y Tipp-Ex (idea 5).** Al encender el descontrol con la bombilla, unos
  trazos de rotulador negro tapan la pantalla y sobre ellos se enciende el rótulo de
  siempre. Al apagarlo, unos brochazos de corrector borran la noche y dejan ver el día.
- **Pegatina arrancada (idea 7).** En el catálogo, un producto agotado se ve como una
  pegatina medio rascada de una farola: queda un trozo de la foto y el resto es papel
  blanco con el borde roto.

## Capabilities

### New Capabilities

- `punto-de-mira`: la retícula sobre la foto de producto y el impacto al añadir.
- `transicion-de-modo`: cómo se pasa del día a la noche y de la noche al día.
- `producto-agotado`: cómo se ve un producto agotado en el catálogo.

### Modified Capabilities

Ninguna en `openspec/specs/`, que sigue vacío. La transición de encendido convive con
el requisito «Activar el descontrol lleva a la portada tras el rótulo» del cambio
`menu-movil-y-descontrol`: la duración del rótulo no cambia.

## Fuera de alcance

- **El logotipo no se cambia.** Se queda como está («ROCKY 35»), por decisión del usuario
  del 2026-11-09. La idea 3 («la O que te sigue») queda descartada.
- **Ideas 1, 3, 4, 6, 8, 9 y 10**: más adelante. Las que piden imágenes nuevas esperan a
  la API de generación de imágenes que aportará el usuario.
- **Tarjetas de Drops (`MenuDrop`) y del chat de Rocky IA**: no usan la foto de
  producto común.
- **La pegatina arrancada en la ficha**: allí la foto grande tiene que verse entera.

## Supuestos

- **Duración del impacto**: igual que la del «Añadido ✓» del botón (1,2 s), y solo cuando
  el añadido sale bien. No marca de forma permanente los productos que ya están en el
  carrito.
- **Foco de teclado**: la retícula se suma al anillo de foco rojo de la web, no lo
  sustituye.
- **Duraciones de la transición**:
  - Al encender, los trazos caben dentro de los 1,4 s actuales del rótulo, así que la
    navegación a la portada llega en el mismo momento que hoy.
  - Al apagar, el Tipp-Ex dura 0,7 s.
  - Con movimiento reducido no hay ninguna de las dos transiciones, como ya pasa con el
    rótulo.
- **Agotado**: la foto de un producto agotado sigue abriéndose entera en el lightbox, y
  la tarjeta no se levanta al pasar el puntero (está pegada a la farola).
- **Material**: sin imágenes nuevas. Todo es SVG y CSS con los tokens de
  `00-tokens.css`, en versión de día y de noche.

## Impact

- Código:
  - `src/features/catalog/ProductPage.jsx` y `ProductDetail.jsx`;
  - componentes nuevos de retícula, trazos y pegatina rota en `src/components/doodles/`
    o junto a su uso;
  - `src/features/night/Descontrol.jsx`;
  - CSS en `product-media.css`, `pages/home.css` y `descontrol.css`.
- Sin cambios de API, servidor ni datos. Sin dependencias nuevas.
- Prototipo de aprobación en `docs/design/punto-de-mira-tippex-pegatina-preview.html`.
