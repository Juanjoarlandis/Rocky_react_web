# Proposal

## Why

La revisión de dirección artística del 2026-11-11 encontró que la web no anda corta de
animación: tiene unas 60 animaciones, el modo noche, el spray, la Estampida, el Curioso y el
álbum de la crew. Lo que pasa es que casi nada de eso se ve. Lo medido y comprobado en el
código:

- **La portada en reposo está quieta.** A los 8 s, de día y en escritorio, solo seguían en
  marcha la cinta del pie y la lata, las dos fuera de pantalla.
- **La escena de la portada se gasta bajo la intro.** En la primera visita la intro tapa la
  pantalla 3 s (`App.jsx:42`). El trazo del spray dura 2,4 s y la Cruiser arranca a los
  2,2 s (`home.css:139`, `home.css:227`), así que, cuando la intro se va, ya ha pasado casi
  todo.
- **Lo que reacciona es para ratón.** De las 67 reglas `:hover` de la web, solo una se
  limita a pantallas con ratón (`product-media.css:92`). Las que mueven algo se quedan
  pegadas tras un toque, y el punto de mira no existe en táctil.
- **La Estampida solo se lanza tecleando «035»** (`secret.js:16`): en un móvil no hay forma
  de verla.
- **Lo underground ya está construido, pero escondido** detrás del teclado, del ratón o del
  modo noche. Faltan además dos marcas baratas de fanzine: el texto que se corrige a la
  vista y la segunda tinta mal registrada.

El usuario eligió este bloque («El primer bloque») de la lista de propuestas: lo que da vida
sin arte nuevo y cabe en el presupuesto de rendimiento.

## What Changes

- **La portada espera a la intro.** El trazo del spray, el chorro y la Cruiser se quedan
  quietos mientras la intro tapa la pantalla y arrancan cuando se va.
- **El hover se queda en el ratón.** Las reglas `:hover` que mueven, giran o escalan algo
  solo se aplican en pantallas con hover. El foco de teclado y `:active` siguen igual.
- **El punto de mira barre el catálogo en táctil.** En pantallas sin hover, la retícula se
  cierra sobre la foto de cada tarjeta mientras cruza el centro de la pantalla y se abre al
  irse. Es una mejora progresiva: donde el navegador no tiene animaciones ligadas al scroll,
  queda como hoy.
- **La Estampida también sale del pie.** El dibujo de Los del Banco del pie es un botón,
  «Llamar a la crew», que lanza la Estampida con ratón, dedo o teclado. «035» sigue
  funcionando.
- **La crew celebra la caída de un drop.** Si la página está abierta cuando un drop
  anunciado sale a la venta, la Estampida cruza la pantalla una vez. El cierre de un drop no
  la lanza.
- **Tachones con intención.** Tres frases se corrigen a la vista con un tachón de rotulador:
  el carrito vacío, el 404 de día y el muro vacío. El tachón es decorativo: los lectores de
  pantalla leen solo la frase buena.
- **Títulos con la segunda tinta corrida.** De día, los rótulos `.page-title` llevan una
  segunda pasada en azul de la casa ligeramente desplazada, como una risografía, y al llegar
  esa tinta entra en registro. De noche manda el neón, como hoy.

## Capabilities

### New Capabilities

- `escena-de-portada`: cuándo se reproduce la escena del encabezado de la portada (el
  grafitero, su trazo y la Cruiser).
- `interaccion-tactil`: cómo se comportan en pantallas táctiles los efectos pensados para
  el puntero.
- `estampida`: cómo se llama a la crew para que cruce la pantalla (teclado, pie y caída de
  un drop).
- `tachones`: el texto que se corrige a la vista y cómo lo leen los lectores de pantalla.
- `rotulos-impresos`: el aspecto de impresión de los rótulos de página.

### Modified Capabilities

- `punto-de-mira`: se añade el comportamiento en pantallas sin hover. Hoy esa capacidad
  solo está en el cambio sin archivar `punto-de-mira-tippex-y-pegatinas`; aquí se añade un
  requisito nuevo sin tocar los suyos.

## Fuera de alcance

- **Inclinar los cromos de la Crew con el dedo.** Arrastrar choca con el scroll, y en
  táctil el toque ya da la vuelta al cromo (`Crew.jsx:226-229`).
- **Que el Pegador encole el cartel al caer el drop.** Pide arte o coreografía nueva en el
  muro. La celebración de este cambio es la Estampida, que ya existe.
- **Misregistro en sellos y pegatinas.** Se empieza por los rótulos; los sellos ya tienen
  sombra dura y su propio golpe.
- **Tachones en la línea de la fecha del drop, en precios o en frases que las pruebas fijan**
  (`ProductPage.test.jsx:653`, `ProductDetail.test.jsx:300`). Un precio tachado se lee como
  rebaja.
- **El logotipo.** No se toca (decisión del usuario del 2026-11-09). El «ROCKY 035» de la
  portada es un rótulo de texto, no el logo.
- **Imágenes nuevas, transiciones entre páginas y «se sale de la camiseta».** Quedan como
  decisiones del usuario: el total de imágenes está a 7 kB de su límite, `viewTransition`
  exige migrar al router de datos y la relación producto → personaje no existe.
- **Que la Estampida siga en vivo el cambio de movimiento reducido** (H-048 de la auditoría).

## Supuestos

- **Gesto del pie: un toque, no tres.** Como botón con nombre es descubrible jugando y
  accesible. Si se quiere más secreto, se cambia en un cambio aparte.
- **Copy de los tachones** (decidido aquí, ver `design.md`): «Tu carrito está ~~lleno~~
  vacío», «La página que buscas ~~está aquí~~ no existe» y «El Pegador está ~~durmiendo~~ en
  ello».
- **La celebración de la caída** solo la ve quien tiene la página abierta en ese momento.
  Quien entra después no la ve.

## Impact

- **Código:**
  - `src/styles/pages/home.css`: pausa de la escena y mira en táctil.
  - `src/styles/components/product-media.css`: barrido de la mira.
  - `src/styles/03-utilities.css`: tachón y misregistro.
  - `src/styles/00-tokens.css`: máscara del tachón.
  - Las hojas con `:hover` que mueven algo.
  - `src/components/Footer.jsx` y `footer.css`: botón «Llamar a la crew».
  - `src/App.jsx`: conecta el pie y la caída con la Estampida.
  - `src/features/drops/useDrops.js`: aviso de caída, una sola vez.
  - `Cart.jsx`, `NotFound.jsx` y `Muro.jsx`: tachones.
- **Presupuesto:** el JavaScript inicial tiene 0,19 kB de margen; el CSS inicial, 1,9 kB.
  Lo nuevo en JavaScript va sobre todo en piezas diferidas (pie, carrito, 404 y muro).
- **Sin dependencias nuevas, sin imágenes nuevas, sin cambios en el servidor ni en la API.**
