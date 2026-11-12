# Proposal

## Why

El 12-nov el usuario vio en producción que, al girar un cromo del álbum (`/crew`), no salía el
expediente: se veía la cara de delante del revés, como en un espejo. Su orden fue «revísalo, no
puede ocurrir un error así nunca».

En Chrome, con o sin ventana, en escritorio y en móvil, el giro sale bien. En Firefox 158 sale mal
siempre que el cromo lleva el sello «FICHADO», que aparece en cuanto se abre el expediente una vez:
la carta sale en espejo y el sello se transparenta por el reverso. Producción sirve exactamente el
mismo código que el build local (los 64 ficheros JS, CSS y HTML son idénticos), así que el fallo
depende del navegador, no de la release.

La causa, aislada en Firefox con cambios comprobados uno a uno, son dos propiedades del sello, que
vive en la cara de delante:

- **`mix-blend-mode: multiply`.** Una mezcla necesita un grupo aislado en el contexto de apilamiento
  más cercano, que es la carta que gira (`.crew-card-inner`, con `preserve-3d`). Ese grupo aplana el
  3D, y la carta sale en espejo. Con el sello en `normal`, la orientación vuelve a estar bien.
- **`z-index: 2` en una cara que no es un contexto de apilamiento.** El sello se pinta en el de la
  carta, fuera de su cara, así que no le afecta que la cara oculte su reverso y se transparenta al
  girar. Pasa también en Los Fundadores, cuyo sello no mezcla, y con el brillo de los cromos con
  rareza (`.foil .crew-card-front::before`, con `z-index: 3`), aunque no estén fichados.

Las dos se resuelven si cada cara es su propio contexto de apilamiento aislado: lo que hay dentro
(mezclas, `z-index`) se queda dentro, y la carta conserva su 3D.

## What Changes

- **Cada cara del cromo aísla sus capas** (`isolation: isolate` en `.crew-card-face`). El sello sigue
  mezclándose como tinta con el dibujo, pero dentro de su cara.
- **Una prueba recorre todas las hojas de estilo:** cualquier cara que oculte su reverso
  (`backface-visibility: hidden`) tiene que aislar sus capas, para que el fallo no vuelva con otro
  sello, otra pegatina u otra carta que gire.
- **No cambia el aspecto en Chrome**, donde ya salía bien.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `album-de-la-crew`: el giro del cromo enseña el expediente en cualquier navegador.

## Impact

- `src/styles/pages/crew.css`: una propiedad en `.crew-card-face`.
- `src/styles/giro-3d.test.js` (nuevo): el contrato sobre todas las hojas.
- Sin cambios de JavaScript, servidor, imágenes ni presupuesto.

## Alternativas descartadas

- **Quitar la mezcla del sello.** Arregla la orientación, pero el sello se sigue transparentando por
  su `z-index`, y pierde la tinta multiplicada sobre el dibujo.
- **Esconder la cara que no toca con `visibility` a mitad del giro.** Tapa el síntoma en vez de la
  causa y no evita que el 3D se aplane.
- **Dar a la cara de delante su propio `transform`.** No basta: en Firefox, la mezcla del sello
  sigue aplanando la carta.
- **Aislar con `z-index: 0` en la cara.** También crea un contexto de apilamiento, pero no deja
  clara la intención y depende de que la cara siga posicionada.

## Límites

- **Safari y WebKit quedan sin verificar:** en este equipo no hay WebKit. `isolation` existe en
  Safari desde la versión 8 y la cara ya recortaba su contenido, así que no se espera regresión,
  pero es razonamiento, no una prueba.
- **La prueba de contrato vigila las caras, no la carta que gira.** Una mezcla o un `z-index`
  puestos directamente en `.crew-card-inner`, o un `isolation: auto` en otra regla que pise a la
  cara, volverían a romper el giro sin que falle. Está escrito en su cabecera.
- **Deuda:** `cssFiles` está repetida en `giro-3d.test.js` y `hover-tactil.test.js`. Llevarla a
  `cssRules.js` obliga a importar `node:fs` desde `src/`, y se deja para un cambio aparte.

## Supuestos

- **El usuario lo vio en Firefox** o en otro motor que aplana igual: en su captura se ve la cara de
  delante en espejo, y en Firefox de este equipo el reverso en espejo con el sello transparentado.
  Son dos síntomas de la misma carta aplanada: el revisor lo reprodujo en Firefox con una carta
  mínima, que a 120° de giro enseña la cara de delante en espejo. Se le pregunta qué navegador usó
  para confirmarlo.
