# Diseño: carga y estabilidad

## Context

Ver `proposal.md` para el motivo y las cifras. Hechos del código (leídos el 2026-11-10):

- **`src/App.jsx`** importa de forma estática `SplashIntro`, `ProductPage`,
  `CuriousPeeker`, `CartRunner`, `Descontrol`, `Estampida`, `NotFound`,
  `MusicProvider`/`MiniPlayer`, `demoCatalog.json` y `shared/preview-products.mjs`. Las
  demás rutas van con `React.lazy` bajo un único `<Suspense>`.
  - `Descontrol` devuelve `null` de día y solo monta un observador; de noche monta la
    pared UV, la linterna y `Spray`. Él y todo `spray/`, `graffiti.js`, `ModeStroke.jsx`
    y `scribble.js` solo se alcanzan desde `App.jsx`. `torch.js` lo usa también `NotFound`.
  - `CuriousPeeker` no pinta nada hasta un temporizador de 4,5 a 10 s.
  - `CartRunner` solo pinta durante una carrera.
  - `Estampida` solo escucha el teclado, y es el único módulo del chunk principal que
    importa `src/data/crew.js`.
  - `useNightMode` y `nightArt.js` (50 rutas de imagen) los usan muchos componentes del
    chunk principal: se quedan.
- **Chunk compartido** `useDocumentTitle-*.js`: contiene `react` y `react-router` y va
  precargado. Su nombre es casual; `vite.config.mjs` no configura el reparto.
- **CSS común**: entran por su componente `descontrol.css` (8,7 kB), `spray.css` (7,6),
  `curious-peeker.css` (6,6), `estampida.css` (3,5), `cart-runner.css` (2,8),
  `not-found.css` (2,5) y `lightbox.css` (1,9): el 22 % de la fuente del CSS común.
- **Fuentes**: tres WOFF2 con `font-display: swap`, las tres precargadas (82 kB). El
  título y el cartel usan Luckiest Guy (17 kB), el cuerpo Archivo (35 kB) y el pie, el
  aviso de carga y el aviso de comercio, Fredoka (30 kB).
- **Maquetación**: `.app` es una columna de `min-height: 100vh`; `.app-main` no tiene
  alto mínimo. El pie se pinta en el primer render, fuera del `<Suspense>`. El aviso de
  carga mide unos 327 px, así que en un móvil el pie arranca dentro de la pantalla y
  baja cuando llega la ruta; `Muro` y `ProductDetail` vuelven a pintar su propio aviso
  mientras cargan los datos. La portada sí reserva alto. No tienen medidas el perro del
  404, los cuatro muñecos de `Studio.jsx` y el desfile de `/crew`.
- **LCP**: `.cartel-cinta` no existe hasta que responde `/api/shopify/status` (demo) o
  `/api/drops`. `prioritizeFirstImage={!showSplash}` hace que la primera foto nazca
  diferida y pase a prioritaria a los 3 s; además la prioridad va al elemento 0 del
  catálogo, que puede ser un cartel o una cabecera.
- **Neón en reposo**: no hay ningún bucle `requestAnimationFrame` que se realimente. Las
  animaciones vivas son `tubo-roto` (11 s, `opacity` sobre un `text-shadow` de tres capas)
  en los dos `.page-title`, y las dos de la cinta del pie, que de día ya corren con
  33–45 recálculos en 10 s. Capas fijas a pantalla completa: `.uv-wall` (degradado y
  máscara radiales), `.uv-oscuridad` y el `<canvas>` del spray, que se monta en cada ruta
  de noche con tope de 12 Mpx. La linterna escribe `--tx`/`--ty` en dos de esas capas.
- **`useNightMode`** crea un `MutationObserver` por suscripción.
- **Mesa**: `setStep` vive en `BeatMachine` y no hay ningún `memo` en
  `src/features/studio/`: cada paso repinta el LCD, el público, la rejilla (128 botones),
  los pads, la consola (9 canales), la publicación y la barra. `paintMeter` llama a
  `window.matchMedia` en cada fotograma. Los 17 layouts por segundo medidos no tienen
  causa identificada: ninguna propiedad geométrica cambia por paso.
- **Audio**: `createEngine()` crea un `AudioContext` por llamada; lo llaman la mesa y el
  reproductor del ranking, y «Remezclar» remonta la mesa. `spray/rattle.js` tiene otro.
- **`useCrewProfile`** devuelve un objeto literal nuevo en cada render, que entra en las
  dependencias del `useMemo` de `useStorefront`.

## Goals / Non-Goals

**Goals:**

- Cumplir los presupuestos de `carga-inicial` y `coste-en-ejecucion` sin cambiar lo que
  se ve.
- Que cada mejora quede fijada en el guardián de presupuesto.

**Non-Goals:**

- Memoizar por sistema: solo donde una medida lo pida.
- Cambiar la intro, el router o el reparto de rutas ya diferidas.

## Decisions

### D1. Piezas diferidas con `React.lazy` y precarga en reposo

`Descontrol`, `CuriousPeeker`, `CartRunner`, `Estampida`, `Lightbox` y `NotFound` pasan a
importarse con `React.lazy`, cada una bajo su propio `<Suspense fallback={null}>` y un
límite de error que la descarta si su chunk no llega. Un único ayudante las precarga
con `requestIdleCallback` tras la primera pintura. La bombilla precarga `Descontrol` al
recibir el puntero o el foco, y la escucha de «035» se queda en `App` como un efecto
mínimo que carga la Estampida al completarse la secuencia.

- *Por qué*: Vite separa solo el CSS de cada chunk diferido, así que el mismo cambio
  baja el JS y el CSS inicial. El orden de trabajo es de mayor a menor ganancia y se
  mide tras cada pieza.
- *Bombilla antes de tiempo*: el tema (`data-theme`) cambia en el clic, como hoy, porque
  lo hace `NavBar`; los efectos de `Descontrol` entran cuando llega su chunk.
- *Si no basta para los 100 kB*: siguiente palanca, cargar `demoCatalog.json` y
  `shared/preview-products.mjs` solo cuando `/api/shopify/status` dice `demo`; después,
  `StreetWall` al acercarse a la pantalla. Se anota en `tasks.md` cuál hizo falta.
- *Alternativa descartada: `manualChunks`.* Reparte ficheros, pero no evita que se
  descarguen al entrar.
- `preloadRecovery.js` ya recarga una vez ante un chunk que falla; el límite de error de
  cada pieza evita que una pieza opcional dispare esa recarga.

### D2. Fuentes: precargar Luckiest Guy y Archivo

Se retira la precarga de Fredoka, que solo pinta el pie y los avisos.

- *Por qué*: 30 kB menos compitiendo con el JavaScript en la primera conexión. Con
  `font-display: swap` no bloquea nada.
- Se mide el LCP con las dos precargadas y solo con Luckiest Guy; se deja la opción con
  mejor LCP y el guardián baja su límite de fuentes precargadas.

### D3. El contenido reserva el alto de la pantalla

`.app-main` gana un alto mínimo igual al de la pantalla menos la barra, de modo que el
pie empieza siempre por debajo del pliegue. Los avisos de carga de `Muro` y
`ProductDetail` usan el mismo contenedor que el del `<Suspense>`, y las imágenes sin
medidas las declaran.

- *Por qué*: un desplazamiento fuera de la pantalla no cuenta ni se ve, y el pie deja de
  ser candidato a LCP y de descargar sus imágenes diferidas antes de tiempo.
- *Alternativa descartada: esqueletos por página.* Más código y más arte para lo mismo.
- En páginas cortas (404, carrito vacío) el pie queda un poco más abajo que hoy. Es el
  único cambio visible y se revisa con capturas.

### D4. Fotos de la primera fila desde el principio

`prioritizeFirstImage` deja de depender de la intro: las fotos de la primera fila nacen
con `loading="eager"` y la prioridad alta va al primer elemento del catálogo que sea un
producto. Con las variantes de 320 px de `imagenes-y-medios` son unos kB por foto.

- Para el LCP que depende de datos (`.cartel-cinta`), se prueba precargar en
  `index.html` las tres peticiones de arranque (`/api/shopify/status`,
  `/api/shopify/products` y `/api/drops`) con `<link rel="preload" as="fetch">`; se
  conserva solo si Lighthouse mide mejora, porque depende de cómo case el navegador una
  precarga con un `fetch` sin caché.

### D5. Neón: diagnosticar y arreglar la causa del recálculo por fotograma

Primero se aísla: con la traza, se desactiva cada candidato por separado (`tubo-roto`,
la capa `.uv-wall`, `.uv-oscuridad`, el lienzo) y se mide el reposo. Después se corrige
lo que resulte, en este orden de sospecha:

1. `tubo-roto`: que su parpadeo lo componga la GPU (capa propia, o el brillo en un
   pseudo-elemento animado solo con `opacity`), y que se pause fuera de pantalla.
2. Lienzo del spray: no montarlo hasta coger el bote o haber trazos que enseñar (H-135).
3. Linterna: mover una capa con `transform` en vez de reescribir la posición de dos
   degradados y una máscara a pantalla completa (H-136).

- *Por qué diagnosticar primero*: la lectura del código da candidatos, no culpables; el
  objetivo son tres cifras, no tres refactors.
- Las capturas de antes y después deciden si el efecto es el mismo.

### D6. Un observador del tema compartido

`useNightMode` usa un único `MutationObserver` de módulo que avisa a un conjunto de
suscriptores; se crea con el primero y se desconecta con el último.

### D7. Mesa: el paso deja de vivir en la raíz

El paso actual se entrega a quien lo pinta (LCD, columna activa y público) sin pasar por
el estado de `BeatMachine`, y la rejilla, los pads y la consola se memoizan con
funciones estables. `paintMeter` lee el punto de corte de 1200 px una vez, con el
listener de `matchMedia`, no en cada fotograma. Los 17 layouts por segundo se investigan
con la traza antes de tocar nada más: si desaparecen con lo anterior, no se hace más.

- *Alternativa descartada: marcar la columna con una variable CSS en el contenedor.*
  Evita el render pero obliga a 16 selectores por columna.

### D8. Un `AudioContext` compartido para el estudio

`src/audio/engine.js` guarda un contexto de módulo con contador de usos: la mesa y el
ranking piden el mismo y se cierra cuando lo suelta el último. Cada uno conserva su
motor y su secuenciador. El del traqueteo del bote se queda aparte: es de otra pantalla
y se crea al primer uso.

### D9. Perfil Crew estable

`useCrewProfile` devuelve su objeto con `useMemo`.

### D10. El guardián se aprieta en el mismo cambio

Los límites de JavaScript inicial, CSS inicial y fuentes precargadas de
`scripts/performance-budget.json` bajan a lo medido; sus objetivos (100 y 15 kB) no
cambian.

## Decisiones tomadas al implementar

Lo que la medida cambió respecto a lo previsto arriba. Las cifras completas están en
`tasks.md` y en `docs/auditoria/2026-11/linea-base-fase-4.md`.

- **D1, palancas que hicieron falta para los 100 kB.** Además de las seis piezas:
  el catálogo de muestra (`src/data/demoProducts.js`) se importa solo en modo demo;
  `StreetWall` y `Lightbox` se cargan aparte; la barra de navegación y el aviso de drop
  importan sus miniaturas directamente en vez de pasar por la tabla de variantes de
  `art.js`; y Vite deja de incrustar en base64 las imágenes de `src/images/` (el logo
  y los pósters sumaban 13 kB al JavaScript inicial).
- **D1, bombilla antes de tiempo.** `Descontrol` recibe `announceIfNight`: si al
  montarse ya es de noche, es que se pulsó la bombilla antes de que llegara su código, y
  hace el apagón igual que si lo hubiera visto encenderse. La web arranca siempre de día,
  así que no hay otro camino para llegar de noche al montaje.
- **D5, la causa era otra.** El recálculo por fotograma no venía de la capa de la pared
  ni del lienzo, sino de que el título de noche tenía dos animaciones de `opacity`
  (`neon-encendido` y `tubo-roto`): Chrome no compone en la GPU animaciones que se pisan
  la propiedad (`kTargetHasIncompatibleAnimations` en la traza) y `tubo-roto`, que es
  infinita, se quedaba para siempre en el hilo principal. `neon-encendido` anima ahora
  `filter: opacity()`. Ni una capa propia ni `will-change` lo arreglaban.
- **D5, la linterna.** Tres capas ya pintadas que solo se mueven con `transform` (el
  haz, la ventana de la tinta y el hueco de la oscuridad); la hondura de la noche es la
  `opacity` de la tercera y el estrechamiento del haz, una escala. La tinta está dos
  veces: una copia tenue que es parte de la página (sube con ella, sin capa) y otra
  entera dentro de una ventana del tamaño del haz, que es lo único con máscara.
  - *Descartado: una sola copia con la máscara en una lona a pantalla completa.* Se
    midió: la superficie enmascarada costaba 30 puntos de CPU de la GPU al hacer scroll.
  - *Descartado: tapar la tinta con un velo del color del papel.* El papel lleva
    dibujo y el velo lo borraría.
- **D7, lo que medía la traza.** Los 17 layouts por segundo eran las barras del vúmetro
  cruzando la opacidad 1 (tope en 0,999), y el coste de estilos, la transición de
  `border-color` que el cabezal arrancaba en dieciséis celdas a cada paso (ahora solo
  al pasar el puntero). El paso sale del estado de `BeatMachine` con un almacén
  (`createStepStore`): la rejilla marca su columna a mano y el contador de la pantalla
  y la barra de Rocky IA se suscriben. `useStepSequencer` conserva `step` para quien lo
  quiera como estado (el ranking) y la mesa lo apaga con `trackStep: false`.
  Con eso `BeatMachine` ya no se pinta a cada paso, así que la memoización que
  preveía D7 no hizo falta.
  - *La alternativa de D7 (16 selectores por columna) sigue descartada*; marcar a mano
    16 clases es lo mismo sin CSS generado.
- **LCP: la intro pesaba más que la página.** Sus dieciséis ilustraciones (343 kB) se
  piden con la página y compiten con sus datos. Llevan ahora una variante a la mitad
  (96 kB) que es la que baja un móvil con densidad de pantalla de hasta 2 (con 3 sigue
  bajando la entera: haría falta una tercera medida); la intro en sí no cambia. El total
  de imágenes en disco sube por ello de 8.700 a 8.750 kB, y `CLAUDE.md` recoge que esa es
  la única métrica del presupuesto que puede subir.
- **LCP: el catálogo se pinta de una vez.** Productos y drops llegan por separado; si los
  productos se pintaban antes, el cartel del drop entraba después por encima (CLS de 0,30
  medido contra la tienda de pruebas). `ProductPage` espera a los dos. La prioridad de
  imagen va a la primera foto de producto contando solo productos, no carteles ni
  cabeceras.
- **D1, quién se precarga y cuándo.** Las piezas esperan a que llegue el catálogo
  (`usePiecesReady({ hold })`): antes, el hilo está libre pero la red no. Entonces se
  montan las que se pintan solas y se piden las demás (`preloadPieces()`: Estampida y
  lightbox). El spray queda fuera de esa tanda (`idle: false`) y va en su propio chunk,
  que solo se pide de noche: de día su código ni se descarga ni se ejecuta. La precarga
  «al acercar el puntero a la bombilla» no se hizo aparte: la cubre el primer gesto
  (`pointerdown`, `focusin`…), que trae todas las piezas.
- **D1, un chunk opcional que falla no recarga la página.** Vite avisa de un fallo de
  precarga con `vite:preloadError` y `preloadRecovery` recargaba; con una pieza opcional
  en vuelo (`asOptionalLoad`) ya no lo hace y el límite de error la descarta.
- **`StreetWall` no espera al reposo**: es contenido de la portada (bajo el pliegue), no
  una pieza opcional; sale del JavaScript inicial pero se pide con el primer render.

## Risks / Trade-offs

- [Una pieza diferida llega tarde y se nota] → Precarga en reposo y por intención
  (puntero o foco en la bombilla); escenarios de «bombilla nada más cargar».
- [El alto mínimo deja el pie más abajo en páginas cortas] → Capturas en los cuatro
  cortes de pantalla; si alguna página queda rara, se ajusta su contenido, no la regla.
- [El neón pierde carácter al componer el parpadeo] → Capturas y vídeo corto de antes y
  después; si no se ve igual, se busca otra forma de quitar el recálculo.
- [Los presupuestos de Lighthouse no se alcanzan solo con este cambio] → Dependen
  también de la compresión y de las imágenes; lo dice el supuesto de `proposal.md`. Si
  con todo integrado alguna página no llega a 85 o a 3,0 s, se anota con su medida y se
  decide ahí si se baja el listón o se trabaja más.
- [Memoizar la mesa rompe un caso de interacción] → Las pruebas de `BeatMachine` y de la
  mesa existentes tienen que seguir en verde sin tocarlas.

## Migration Plan

Solo cliente: llega con la siguiente release y se revierte con `release:revertir`.
