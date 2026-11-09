# Diseño: punto de mira, rotulador y Tipp-Ex, y pegatina arrancada

## Context

- **La foto de producto** es un `<button class="product-media">` cuadrado que abre el
  lightbox. Ya lleva un cursor de diana en SVG (`product-media.css`) y una lupa que
  aparece con hover o foco. La usan las tarjetas del catálogo (`ProductPage.jsx`) y la
  ficha (`ProductDetail.jsx`).
- **Añadir al carrito** pasa por `AddToCartButton`, que pone `btn--added` durante 1,2 s
  cuando el añadido sale bien.
- **El agotado** sale de `purchaseState()` (`PURCHASE_STATES.SOLD_OUT`): en modo Shopify,
  una variante con `availableForSale === false`. Hoy solo cambia el texto del botón.
- **El cambio de modo** lo hace la bombilla de `NavBar` sobre `<html data-theme>`.
  `Descontrol` detecta el encendido y pinta el rótulo «Descontrol activado» (1,4 s; al
  terminar avisa para ir a la portada). Al apagar no pasa nada visible.
- **Las tarjetas ya son «pegatinas»**: están ligeramente giradas y tienen sombra dura.

## Goals / Non-Goals

**Goals:** que la diana, el rotulador, el corrector y las pegatinas se usen en la
interacción, no solo como decorado. Todo debe funcionar de día y de noche, con
movimiento reducido y sin imágenes nuevas.

**Non-Goals:** cambiar el logotipo, la composición de las páginas o el comportamiento de
compra.

## Decisions

### D1. Retícula en SVG en línea dentro de `.product-media`

Es un componente `Reticle` (`aria-hidden`), con un círculo, cuatro marcas y un punto
central, en el mismo dibujo que el cursor actual: aro de tinta y marcas en el acento. Por
defecto está oculta y algo abierta (`scale(1.25) rotate(-12deg)`). Con `:hover` o
`:focus-visible` de la foto se cierra hasta `scale(1) rotate(0)` con `--ease-bounce`. De
noche hereda `--ink` y `--accent`, que ya son lavanda y lima.

- Alternativa descartada: dibujarla con `::before` y `::after` y gradientes. Un aro con
  marcas «a mano» pide trazos con extremos redondeados, y el SVG los da sin trucos.

### D2. El impacto, solo con CSS: `:has(.btn--added)`

El contenedor que agrupa la foto y el botón (`.product-card`, y `.detail-layout` en la
ficha) estampa el punto rojo mientras el botón tiene `btn--added`:

- la retícula se cierra del todo;
- aparece un círculo rojo (`--accent`, sombra `--shadow-ink-xs`) en la esquina superior
  derecha de la foto, con un rebote de `--dur-slow`.

No hace falta estado nuevo ni tocar `AddToCartButton`. El punto vive en el propio SVG de
la retícula, así que no añade nodos al DOM.

- Alternativa descartada: un callback `onAdded` desde el botón hasta la tarjeta. Añade
  estado y props para algo que el DOM ya expresa.
- `:has()` existe en todos los navegadores objetivo (Chrome 105+, Safari 15.4+, Firefox
  121+). Donde no exista, no hay impacto y nada más se rompe.

### D3. Transiciones de modo: una capa SVG a pantalla completa con trazos que se dibujan

`ModeStroke` pinta un garabato calculado para la pantalla que hay (`viewBox` del tamaño
de la ventana). Son pasadas de ida y vuelta, en diagonal y algo combadas, con un grosor de
1,5 veces la separación entre pasadas. Los giros caen fuera de la pantalla. Se anima con
`stroke-dashoffset` sobre `pathLength="1"`.

- El prototipo descartó un `viewBox` fijo de 100 × 100 recortado a la pantalla: en un
  móvil vertical los trazos salían como bandas rectas.

- **Encender**: la capa del rótulo deja de ser un negro instantáneo. En el primer 35 % de
  los 1,4 s (unos 0,5 s) los trazos de tinta negra la cubren; después se enciende el
  rótulo como ahora. La duración total no cambia, así que la navegación a la portada
  tampoco.
- **Apagar**: `Descontrol` detecta el paso de noche a día y monta durante 0,7 s una capa
  del color del papel de noche. Esa capa tiene una máscara con trazos de corrector que se
  dibujan y van abriendo agujeros por los que se ve el día. Cada trazo lleva un borde
  blanco ligeramente más ancho, que es el corrector.
- **Movimiento reducido**: ni trazos ni corrector. Al encender, el comportamiento actual
  (sin rótulo); al apagar, nada.
- Alternativa descartada: hacer una captura de la noche antes de cambiar el tema y
  borrarla. El navegador no permite capturar el DOM sin librerías.
- Alternativa descartada: retrasar el cambio de tema hasta el final del Tipp-Ex. La
  bombilla, la música y el `aria-pressed` cambiarían tarde respecto al clic.

### D4. Pegatina arrancada: clase de estado y SVG del resto de papel

Una tarjeta en `SOLD_OUT` lleva `is-sold-out`. Dentro de la foto se pinta `TornSticker`
(`aria-hidden`):

- **El papel**: un polígono con borde desgarrado irregular (pasos y alturas desiguales) que
  tapa algo más de un tercio de la foto, en diagonal desde la esquina inferior derecha.
  Deja ver unos dos tercios, con el estampado.
- **Color y trazo**: relleno de `--card` y trazo `--ink` de 2 px.
- **Rótulo**: sobre el papel, «Agotado» a mano en `--font-display` y `--accent`, girado
  −9°. Es decorativo; el estado lo anuncia el botón.

El prototipo descartó tres cosas:

- un diente de sierra regular, que no se leía como desgarro;
- tapar dos tercios, porque el producto dejaba de reconocerse;
- dejar tiras sueltas de papel, que parecían un fallo de interfaz. La tarjeta agotada no se
levanta con el hover. La foto sigue abriendo el lightbox con la imagen completa.

- La accesibilidad no cambia: el estado ya lo anuncia el botón («Agotado») y el `alt` de
  la foto sigue siendo el del producto.
- Alternativa descartada: `clip-path` sobre la propia imagen. Recorta pero no dibuja el
  borde de tinta ni el papel que queda, que es lo que cuenta la historia.

## Contratos

Sin cambios de API ni de datos. Hay componentes nuevos sin props públicas (`Reticle`,
`ModeStroke`, `TornSticker`). Las tarjetas ganan la clase de estado `is-sold-out`.

## Risks / Trade-offs

- **Rendimiento de la transición en móviles modestos**: una capa a pantalla completa con
  máscara SVG animada. Mitigación: pocos trazos, sin filtros ni desenfoques, y la capa se
  desmonta al terminar. Se mide con Chrome a 4× de CPU.
- **Legibilidad del agotado**: si el trozo de foto que queda es demasiado pequeño, no se
  reconoce el producto. El prototipo fija la proporción antes de implementar.

## Migration Plan

Sin migración. Rollback: revertir los commits de la rama.

## Open Questions

Las del prototipo (`docs/design/punto-de-mira-tippex-pegatina-preview.html`): el aspecto
de la retícula, el grosor de los trazos y cuánta foto queda en el agotado. Se cierran con
la aprobación del usuario.
