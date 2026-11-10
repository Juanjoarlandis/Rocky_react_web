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
