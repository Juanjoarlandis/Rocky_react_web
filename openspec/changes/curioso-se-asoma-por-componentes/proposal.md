# Propuesta: el Curioso se asoma por los cantos de los componentes, no de las imágenes

## Why

El usuario ha visto el 2026-11-09 que el muñeco que se asoma por todas las vistas (el
Curioso, `src/features/peeker/`) a veces sale desde detrás de una imagen y no desde
detrás del componente que la contiene. Como las imágenes son recortes, queda partido en
zonas raras y se nota que es una imagen dentro de un elemento.

Diagnóstico en Chrome con el propio `domProbe.js` (10 rutas, escritorio y móvil):

- **Tarjetas de producto**: el canto superior de la tarjeta es la foto, así que al
  asomarse «por arriba» se esconde detrás de la foto. En la portada salieron 9
  escondites así en escritorio y 7 en móvil. En sus laterales altos pasa igual.
- **Fotos de Crew y Mi Crew**: `crew-card-media` tiene el canto superior pintado por la
  foto.
- **Bloques que solo pintan una imagen de fondo**: el punteado del cuaderno, las líneas
  garabateadas (`squiggle-baseline`) y el marco con celo cuentan como opacos porque
  `hasOwnBackground` acepta cualquier `background-image`. Entre los trazos son
  transparentes, así que el recorte del muñeco queda en el aire.

## What Changes

- Un bloque solo vale de escondite si pinta un fondo de color opaco. Una imagen de
  fondo, sin color opaco debajo, no cuenta.
- Cada colocación se comprueba contra lo que hay pintado de verdad en el tramo del canto
  donde se esconde. Si ese tramo lo pinta una imagen (`img`, `picture`, `svg`, `canvas`
  o `video`) u otro elemento que no es del bloque, la colocación se descarta.
- Sigue valiendo la franja bajo la foto de una tarjeta: su canto es la línea dibujada
  del borde inferior de la foto, que es parte del componente.

## Capabilities

### New Capabilities

- `muneco-curioso`: dónde puede esconderse el Curioso.

### Modified Capabilities

Ninguna en `openspec/specs/`.

## Fuera de alcance

- H-049 (la app se rompe con ventanas de menos de unos 86 px), que va en C12.
- Los tiempos, poses y dibujos del Curioso.

## Supuestos

- Un SVG dentro del tramo cuenta como imagen. Es conservador: puede quitar algún
  escondite válido, pero nunca deja al muñeco partido.
- Si un tramo lo tapa otro elemento que no es del bloque, tampoco vale: el muñeco
  quedaría detrás de algo que no es su escondite.

## Impact

- `src/features/peeker/domProbe.js`: el fondo opaco y la comprobación del tramo.
- `geometry.js`: `choosePlacement` acepta un filtro opcional.
- `CuriousPeeker.jsx`: pasa ese filtro.
- Pruebas de los tres.
- Sin cambios de API ni de datos.
