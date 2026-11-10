# Spec Delta

## Purpose

Que cualquier página de la web pinte pronto y sin saltos en un móvil con red lenta:
descargar antes de pintar solo lo que la primera vista necesita, y reservar el sitio de
lo que llega después.

## ADDED Requirements

### Requirement: Lo que no se ve al entrar no va en la carga inicial
El JavaScript y el CSS del modo neón y su spray, del Curioso, de la Estampida, del
repartidor del carrito, del lightbox y de la página 404 no SHALL formar parte de lo que
una página descarga antes de pintar. El JavaScript inicial de la portada SHALL medir
100 kB como máximo, comprimido con gzip, y el CSS inicial, 15 kB.

#### Scenario: Portada de día
- **WHEN** se carga la portada y no se toca nada
- **THEN** el JavaScript inicial mide 100 kB gzip o menos, el CSS inicial 15 kB o menos, y no se ha ejecutado el código del spray

#### Scenario: Presupuesto en la comprobación del proyecto
- **WHEN** un cambio vuelve a meter una de esas piezas en la carga inicial y se pasa de 100 kB
- **THEN** `npm run check` falla

### Requirement: Lo diferido llega a tiempo
Cada pieza diferida SHALL pedirse sola cuando la página queda en reposo, y antes si
el visitante va a usarla, de modo que su primer uso no muestre esperas ni fallos.

#### Scenario: Encender el neón
- **WHEN** se pulsa la bombilla por primera vez tras cinco segundos en la página
- **THEN** el modo neón se enciende con su transición completa, igual que hoy

#### Scenario: Bombilla nada más cargar
- **WHEN** se pulsa la bombilla antes de que la página haya quedado en reposo
- **THEN** el tema cambia de inmediato y los efectos del neón aparecen en cuanto llega su código, sin error

#### Scenario: Estampida
- **WHEN** se teclea «035»
- **THEN** la Estampida sale como hoy

#### Scenario: Falla la descarga de una pieza diferida
- **WHEN** el chunk de una pieza diferida no se puede descargar
- **THEN** la página sigue funcionando sin esa pieza y sin pantalla en blanco

### Requirement: Solo se precargan las fuentes de la primera vista
`index.html` SHALL precargar únicamente las fuentes que usa el texto visible sin hacer
scroll en la portada. Las demás SHALL cargarse cuando el CSS las pida.

#### Scenario: Fuentes precargadas
- **WHEN** se inspecciona el `index.html` construido
- **THEN** la fuente manuscrita del pie no está precargada y las precargadas suman 55 kB como máximo

### Requirement: Nada visible se desplaza mientras carga la página
Mientras llegan el código de la ruta o sus datos, el contenido SHALL reservar el alto
suficiente para que el pie quede fuera de la pantalla, y toda imagen SHALL declarar sus
medidas. El desplazamiento acumulado (CLS) de Lighthouse SHALL ser 0,05 como máximo en
todas las páginas, en móvil y en escritorio.

#### Scenario: Ruta diferida en móvil
- **WHEN** se abre `/crew`, `/estudio`, `/cart`, `/menudrop`, una ficha o una página legal en un móvil
- **THEN** el pie no aparece en pantalla antes que el contenido y el CLS es 0,05 o menos

#### Scenario: Estados de carga en dos tiempos
- **WHEN** una página muestra primero el aviso de carga de la ruta y luego el de sus datos
- **THEN** el pie no cambia de posición entre uno y otro

#### Scenario: Imágenes sin medidas
- **WHEN** se revisan las imágenes del 404, del estudio y del desfile de la crew
- **THEN** todas declaran ancho y alto

### Requirement: El elemento más grande llega pronto
El LCP de Lighthouse en móvil SHALL ser de 3,0 s como máximo en todas las páginas, y la
puntuación de rendimiento, de 85 como mínimo. El elemento más grande de la primera vista
no SHALL ser una imagen con carga diferida.

#### Scenario: Páginas medidas
- **WHEN** se ejecuta la tanda de Lighthouse de la línea base
- **THEN** las diez páginas dan en móvil un LCP de 3,0 s o menos y un rendimiento de 85 o más

#### Scenario: El pie ya no es el LCP
- **WHEN** se mide `/estudio`, `/crew` o `/cart` en móvil
- **THEN** el elemento LCP es contenido de la propia página, no la ilustración del pie

### Requirement: La primera fila de fotos se pide desde el principio
Las fotos de producto visibles sin hacer scroll SHALL pedirse en la carga inicial,
también mientras dura la intro, y la prioridad alta SHALL ir a la primera foto de
producto aunque en el catálogo haya antes un cartel o una cabecera.

#### Scenario: Primera visita con intro
- **WHEN** se abre la portada por primera vez en la sesión
- **THEN** al levantarse la intro, las fotos de la primera fila ya están pintadas

#### Scenario: Catálogo que empieza por un cartel
- **WHEN** el primer elemento del catálogo es el cartel de un drop anunciado
- **THEN** la primera foto de producto que le sigue se pide con prioridad alta
