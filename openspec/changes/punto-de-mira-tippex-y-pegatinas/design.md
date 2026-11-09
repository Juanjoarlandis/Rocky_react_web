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

Estado final tras el prototipo aprobado y la primera ronda de las dos revisiones
independientes (más abajo, «Revisiones»).

### D1. Mira en SVG en línea dentro de la foto, con trazo que no escala

`ProductReticle` (`src/components/doodles/ProductReticle.jsx`, `aria-hidden`):

- **Dibujo**: aro de radio 27 sobre un `viewBox` de 100, marcas que lo tocan, como en el
  cursor de diana, y un punto central. Enmarca el estampado en vez de taparlo.
- **Colores**: aro de tinta y marcas en el acento, con un halo `--card` debajo para que se
  lea sobre camisetas negras. De noche hereda `--ink` y `--accent`.
- **Trazo**: `vector-effect: non-scaling-stroke`, tinta de 3 px y halo de 7 px, igual en
  una tarjeta de 240 px que en una ficha de 900.
- **Tamaño en la ficha**: `clamp(200px, 56%, 360px)`, centrada.
- **Movimiento**: oculta y algo abierta (`scale(1.3) rotate(-14deg)`); con `:hover` (solo
  si el dispositivo tiene hover) o con `:focus-visible` se cierra con `--ease-bounce`.
- **Agotados**: no se renderiza en ellos.
- **Foco**: el anillo de foco de la foto va por dentro (`outline-offset: -6px`), porque el
  `overflow: hidden` de la tarjeta lo recortaba.
- Alternativa descartada: dibujarla con `::before` y `::after` y gradientes. Un aro con
  marcas «a mano» pide trazos con extremos redondeados, y el SVG los da sin trucos.

### D2. El impacto, solo con CSS: `:has(.btn--added)`

El contenedor que agrupa la foto y el botón (`.product-card`, y `.detail-grid` en la
ficha) marca el impacto mientras el botón tiene `btn--added`. Es «cerrar → disparar →
irse»:

- la mira se cierra y desaparece en 420 ms;
- 120 ms después entra una pegatina de diana (`span.product-reticle-hit`, fuera del SVG
  para no escalar con la foto).

La pegatina:

- **Tamaño y dibujo**: `clamp(28px, 13%, 44px)`, anillos de paradas duras en
  `--ink-fixed`, `--accent` y `--white`, como la mini-diana del pecho de los muñecos.
- **Borde y sombra**: dura, en `--ink-fixed`, porque la foto sigue clara de noche.
- **Giro**: −8°.
- **Posición**: arriba a la derecha en las tarjetas y abajo a la izquierda en la ficha,
  donde arriba la pisan los pies del muñeco sentado en el marco.

No hace falta estado nuevo ni tocar `AddToCartButton`.

- **Movimiento**: todo el movimiento va dentro de `@media (prefers-reduced-motion:
  no-preference)`. Anularlo dentro de `reduce` no basta, porque `:has()` gana por
  especificidad.
- Alternativa descartada: un callback `onAdded` desde el botón hasta la tarjeta. Añade
  estado y props para algo que el DOM ya expresa.
- `:has()` existe en todos los navegadores objetivo (Chrome 105+, Safari 15.4+, Firefox
  121+). Donde no exista, no hay impacto y nada más se rompe.

### D3. Transiciones de modo: una capa SVG a pantalla completa

`ModeStroke` (`src/features/night/ModeStroke.jsx`, prop `variant`: `marker` o `tippex`)
pinta un garabato calculado para la pantalla que hay (`scribble.js`):

- **Pasadas**: de ida y vuelta, en diagonal y algo combadas.
- **Separación**: 150 px, o en móvil el 22 % del lado corto, con un mínimo de 80.
- **Grosor**: 1,8 veces la separación.
- **Giros**: fuera de la pantalla.

Se anima con `stroke-dashoffset` sobre `pathLength="1"`. Las pruebas de geometría
comprueban que tapa la pantalla sin franjas en 8 tamaños.

- **Encender**:
  - el tema ya es de noche al pulsar, así que la capa empieza siendo la hoja de día
    (`--paper-rgb` y el punteado, que no cambian con el tema);
  - el rotulador de tinta (`--ink-rgb`) la tapa en el primer 28 % de los 1,4 s (392 ms);
  - el rótulo se enciende entre el 29 % y el 49 %;
  - con la pantalla tapada (450 ms), `Descontrol` avisa para ir a la portada (decisión
    del usuario, ver `menu-movil-y-descontrol`).
- **Apagar**:
  - un rectángulo del papel de noche y un borde blanco (grosor + 12) bajo una máscara,
    rectángulo blanco menos el mismo garabato animado;
  - los brochazos abren agujeros por los que se ve el día de verdad, y el borde blanco es
    el corrector;
  - 0,7 s, con un fundido solo en el último 9 % para limpiar las juntas;
  - el id de la máscara sale de `useId`.
- **Movimiento reducido**: ni trazos ni corrector.
- El prototipo descartó un `viewBox` fijo de 100 × 100 recortado a la pantalla: en un
  móvil vertical los trazos salían como bandas rectas.
- Alternativa descartada: hacer una captura de la noche antes de cambiar el tema y
  borrarla. El navegador no permite capturar el DOM sin librerías.
- Alternativa descartada: retrasar el cambio de tema hasta el final del Tipp-Ex. La
  bombilla, la música y el `aria-pressed` cambiarían tarde respecto al clic.

### D4. Pegatina arrancada: clase de estado y SVG del resto de papel

Una tarjeta en `SOLD_OUT` lleva `is-sold-out`. Dentro de la foto se pinta `TornSticker`
(`aria-hidden`):

- **El papel**:
  - un polígono con un desgarro que sigue una curva con barriga, de (100,30) a (0,78);
  - dientes en grupos de 1 a 3 unidades, dos tramos lisos y dos mordiscos;
  - deja ver unos dos tercios de la foto, con el estampado.
- **Variedad**: la mitad de los productos lo llevan en espejo (`scale: -1 1`), con el rótulo
  y la lupa del lado contrario. La variante sale de un hash del handle (`tornVariant.js`,
  clase `product-card--flip`): el mismo producto siempre igual. Se descartó alternar por
  posición, porque con 2 columnas ponía en espejo toda la columna derecha.
- **Color y trazo**: relleno de `--card` y trazo `--ink` de 2 px.
- **Rótulo**: «Agotado» en `--font-display`, `clamp(.9rem, 9cqi, 1.45rem)`, en
  `--accent-dark` (AA de día; lima suave de noche), girado −9°. Es decorativo, porque el
  estado ya lo anuncia el botón.
- **Lupa**: sube a la esquina de foto lejana al desgarro.
- **Hover**: la tarjeta no se levanta.
- **Lightbox**: la foto sigue abriéndose con la imagen completa.
- La accesibilidad no cambia: el estado ya lo anuncia el botón y el `alt` de la foto sigue
  siendo el del producto.
- Alternativa descartada: `clip-path` sobre la propia imagen. Recorta pero no dibuja el
  borde de tinta ni el papel que queda, que es lo que cuenta la historia.

## Contratos

Sin cambios de API ni de datos. Los componentes nuevos son `ProductReticle`, `TornSticker`
y `ModeStroke` (este último con la prop `variant`). Las tarjetas ganan la clase de estado
`is-sold-out`. `Descontrol` avisa con `onActivated` a los 450 ms en vez de a los 1,4 s.

## Revisiones

**Código, ronda 1** (revisor con contexto limpio):

- 1 bloqueante, corregido: con movimiento reducido el impacto seguía rebotando. La prueba
  comprueba que no hay transiciones fuera de `no-preference`, y en Chrome la duración
  calculada es 0 s.
- Menores corregidos: la prueba del impacto comprueba `:has()` y la pegatina, y el
  `viewBox` usa el tamaño saneado.
- Menores pendientes: este documento (ya al día), Prettier y `eslint.config.mjs` en un
  commit aparte.

**Arte, ronda 1** (revisor con contexto limpio y capturas propias, porque las primeras de
noche no eran válidas):

- 3 bloqueantes:
  - B1: el trazo de la mira escalaba con la foto;
  - B2: la pegatina quedaba bajo el muñeco de la ficha;
  - B3: el rotulador negro pasaba sobre una noche ya puesta.
- 11 importantes, I1–I11: la pegatina parecía un aviso, el impacto no tenía causa y efecto,
  la mira tapaba el estampado, el rótulo gritaba sin contraste AA, el desgarro era siempre
  igual, había colisiones en el agotado, el foco salía recortado, el Tipp-Ex era un
  fundido blanco, el trazo era un telón en móvil, el rótulo quedaba apretado y había un
  doble corte al navegar.
- Todos corregidos tal como se describe arriba.

**Arte, ronda 2**: aprobado. Los 3 bloqueantes y los 11 importantes quedan resueltos, sin
regresiones. Dejó dos menores nuevos, también corregidos:

- el rótulo se retira antes, al 88 %, para no cruzarse con el titular de la portada que
  ya asoma debajo;
- la variante del desgarro va por producto, y los dos acantilados del borde se suavizaron
  a unas 4,5 unidades de caída.
- I11 cambia un requisito de otro cambio: lo decidió el usuario viendo dos tiras
  comparadas.
- La segunda ronda de las dos revisiones se limita a estas correcciones.

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
