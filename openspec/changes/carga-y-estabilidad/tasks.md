# Tareas: carga y estabilidad

## 1. Línea base

- [x] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; repetir el build limpio, `composicion-chunk.mjs`, la traza de navegador y Lighthouse (`docs/auditoria/2026-11/herramientas/fase4/`) sobre el commit de partida, y sacar capturas de referencia de las once rutas en 375 y 1440 px, de día y de noche.
  - Partida (commit `85a6838`): `npm run check` → 154 ficheros, 1.680 pruebas en verde; JS inicial 125,37 kB, CSS inicial 18,52 kB, fuentes precargadas 81,76 kB, mayor chunk diferido 20,36 kB. Traza y Lighthouse de partida: las de `linea-base-fase-4.md` (secciones 2 y 3.2) más las de «Tras imagenes-y-medios». Capturas de referencia: las de después de `imagenes-y-medios` (once rutas, 375 y 1440 px, día y noche) y, para el neón, una tanda propia del commit de partida (`capturas-neon.mjs`).

## 2. Piezas diferidas

- [x] 2.1 Escribir en `src/App.test.jsx` las pruebas y verlas fallar: de día y sin interacción no se ha cargado el módulo del spray; tras el reposo se han pedido las piezas diferidas; teclear «035» lanza la Estampida; un chunk diferido que falla no deja la página en blanco.
  - `src/App.pieces.test.jsx` (qué módulos se han importado y cuándo): mientras carga el catálogo, ninguno; de día y en reposo, el descontrol, el Curioso, la Estampida y el lightbox, y el spray no; al encender el neón, el spray. `App.test.jsx`: las piezas no se montan hasta el reposo o el primer gesto, y «035» lanza la Estampida. `pieces.test.jsx`: un chunk que falla, también como lo hace Vite (`vite:preloadError`), no tumba ni recarga la página.
  - **Prueba existente cambiada a propósito**: «Curioso» esperaba verlo montado de inmediato; ahora espera al reposo.

- [x] 2.2 Diferir `Descontrol` con su precarga en reposo y al acercar puntero o foco a la bombilla; verificar los dos escenarios de la bombilla (tras cinco segundos y nada más cargar) y anotar el JS y el CSS inicial que da el build.
  - `Descontrol` va con `lazyPiece` y lleva `announceIfNight` (ver design.md): pulsar la bombilla antes de que llegue su código hace el apagón igual.
  - La precarga «al acercar puntero o foco a la bombilla» no se hizo aparte: la cubre el primer gesto, que trae todas las piezas (design.md). Limitación conocida: si el chunk tardase varios segundos, el apagón llegaría tarde.
- [x] 2.3 Diferir `CuriousPeeker`, `CartRunner`, `Estampida` (con la escucha de «035» en `App`), `Lightbox` y `NotFound`, midiendo tras cada uno; las pruebas existentes de esos componentes siguen en verde.
  - Las seis piezas van con `lazyPiece`/`React.lazy`. Con ellas solas el JS inicial seguía por encima de 100 kB (por eso 2.4); aquí solo queda anotada la medida final.
  - **Prueba existente cambiada a propósito**: en `ProductPage.test.jsx` el lightbox se espera con `findBy` (ahora llega en su chunk).
- [x] 2.4 Si el JS inicial sigue por encima de 100 kB gzip, aplicar las palancas siguientes de D1 en su orden y anotar cuál hizo falta; verificar con `npm run budget:check`.
  - Hicieron falta, en este orden: catálogo de muestra solo en modo demo (`src/data/demoProducts.js`), `StreetWall` aparte, miniaturas directas en la barra y en el aviso de drop, y que Vite no incruste en base64 las imágenes de `src/images/`. Resultado: **99,75 kB** de JS inicial y **14,04 kB** de CSS inicial (`npm run budget:check`).
  - **Prueba existente cambiada a propósito**: `App.storefront.test.jsx` (el catálogo de muestra es ahora un cargador).
  - Añadido al medir el LCP: las piezas opcionales no se piden mientras el catálogo está cargando (`usePiecesReady({ hold })`); un gesto las trae igual.

- [x] 2.5 (Añadida al implementar `seo-y-cache`, cuyo código dejaba el JavaScript inicial en 101,3 kB: el guardián falló.) Sacar de la carga inicial el pie de página y los drops de muestra.
  - El pie queda siempre bajo el pliegue desde 4.1, así que va en su propio chunk (`React.lazy`, no pieza opcional: si no llega, se recupera como una ruta) y se pide cuando ha llegado el catálogo o al primer gesto. Con él salen su CSS, el de la marquesina y las URL de sus imágenes. Los drops de muestra (`shared/demo-drops.mjs`) se importan solo en modo demo, como el catálogo de muestra.
  - `src/App.pieces.test.jsx`: mientras el catálogo carga no hay pie; después llega sin esperar al reposo. Resultado: JS inicial **98,36 kB** y CSS inicial **13,10 kB**.
  - Lighthouse en móvil con el pie aparte (mediana de tres): `/` 87 de rendimiento, LCP 3,90 s, 509 kB (antes 84 · 4,51 s · 608 kB); `/cart` 87 · 3,83 s (antes 85 · 4,05 s); `/no-existe` 90 · 3,46 s (antes 88 · 3,68 s). CLS igual (0,030 · 0,000 · 0,000). El LCP sigue por encima de los 3,0 s.

## 3. Fuentes

- [x] 3.1 Quitar de `index.html` la precarga de Fredoka; medir el LCP de `/` en móvil con Lighthouse (mediana de tres) precargando Luckiest Guy y Archivo, y solo Luckiest Guy; dejar la mejor, anotar las dos medidas y comprobar que el texto del pie y de los avisos sigue saliendo con su fuente.
  - Medido con Lighthouse en móvil contra la tienda de pruebas (mediana de tres): con Luckiest Guy y Archivo, `/` LCP 4,88 s, CLS 0,000, rendimiento 81; solo con Luckiest Guy, LCP 4,81 s pero **CLS 0,300** y rendimiento 67 (el texto salta al llegar Archivo); `/menudrop` 4,96 s frente a 5,26 s. **Se quedan las dos**: 52,05 kB precargados.
  - **Prueba existente cambiada a propósito**: `src/utils/fontPreloads.test.js` esperaba tres familias precargadas; ahora dos, y que lo precargado esté declarado.

## 4. Estabilidad

- [x] 4.1 Añadir pruebas, primero en rojo, de que el aviso de carga de la ruta y los de `Muro` y `ProductDetail` usan el mismo contenedor con alto reservado, y de que las imágenes del 404, del estudio y del desfile declaran medidas; implementar D3.
  - `src/styles/estabilidad.test.js` (alto mínimo de `.app-main`, el chat sin él, medidas de las imágenes) y avisos de carga con `.page-loading` de alto reservado.
- [x] 4.2 Verificar con Lighthouse en móvil y escritorio que el CLS de las diez páginas es 0,05 o menos y que el elemento LCP de `/estudio`, `/crew` y `/cart` ya no es la ilustración del pie; comparar capturas de las páginas cortas (404, carrito vacío, legal) en los cuatro cortes.
  - Lighthouse de las diez páginas (mediana de tres, `linea-base-fase-4.md`, «Tras carga-y-estabilidad»): CLS de 0,030 como mucho en móvil y 0,016 en escritorio (antes, hasta 0,52). Elemento LCP en móvil: `/estudio` y `/crew`, el subtítulo de la página; `/cart`, su ilustración de carrito vacío. Ya no es la del pie en ninguna.
  - Contra la tienda de pruebas apareció un salto que el catálogo de muestra no enseña: si los productos llegaban antes que los drops, el cartel empujaba las tarjetas (**CLS 0,30**). `ProductPage` espera ahora a los dos; con el build definitivo, CLS 0,000 en `/` y `/menudrop`.
  - **Prueba existente cambiada a propósito**: «celebrates only an effective cart addition» (`App.test.jsx`) espera las tarjetas con `findBy`.
  - Capturas de la ficha no encontrada, el carrito vacío y el 404 en 375 y 1440 px, de día y de noche: el pie baja hasta quedar bajo el pliegue y entre el contenido y él queda papel en blanco; revisadas a ojo, no se ajusta nada. No se han sacado los cortes de 640 y 900 px.

## 5. Primera vista

- [x] 5.1 Pruebas en `ProductPage.test.jsx`, primero en rojo: la prioridad alta va a la primera foto de producto aunque el catálogo empiece por un cartel o una cabecera; la primera fila es `eager` con y sin intro. Implementar D4.
  - `FIRST_ROW = 4`: la primera foto de producto lleva prioridad alta y la primera fila es `eager` (`ProductPhoto` gana `eager`). Se cuentan solo productos (`ordinal` en `buildCatalog`): la revisión independiente encontró que con un cartel o una cabecera delante la prioridad no llegaba a ninguna foto; corregido con su prueba («con cartel y cabecera delante…»).
- [x] 5.2 Probar la precarga de las tres peticiones de arranque en `index.html` y medir el LCP de `/` y `/menudrop` con y sin ella (mediana de tres); conservarla solo si mejora, y anotar las medidas.
  - Probado con Lighthouse en móvil contra la tienda de pruebas (`lh-real.mjs`, mediana de tres), precargando `status`, `products?first=8` y `drops` con `<link rel="preload" as="fetch">`: `/` 4,73 s frente a 4,88 s sin ella (ejecuciones 4,81 · 3,60 · 4,73 frente a 5,04 · 4,80 · 4,88) y `/menudrop` 4,95 s frente a 4,96 s. La diferencia está dentro del ruido: **no se conserva**. La prueba destapó el salto del cartel (ver 4.2).

## 6. Modo neón

- [x] 6.1 Ampliar `traza-navegador.mjs` para medir el neón en reposo desactivando, de uno en uno, `tubo-roto`, `.uv-wall`, `.uv-oscuridad` y el lienzo del spray; anotar aquí la tabla y qué causa el recálculo por fotograma.
  - `fase4/diagnostico-neon.mjs.txt` (6 s en reposo, radio parada). Recálculos de estilo, móvil ×4 / escritorio: base 364 / 365; sin `tubo-roto` **38 / 9**; sin `lata-patrulla` 368 / 362; sin `ticker-scroll` 366 / 364; sin `.uv-wall` 366 / 364; sin `.uv-oscuridad` 364 / 364; sin lienzo 366 / 363; sin ninguna animación CSS 17 / 0.
  - Causa (`fase4/traza-animaciones.mjs.txt`): `neon-encendido` y `tubo-roto` animaban las dos `opacity` en el mismo título; Chrome marca ambas con `kTargetHasIncompatibleAnimations` (código 64) y no las compone, así que la infinita recalculaba estilos a cada fotograma. Ni `will-change`, ni una capa propia, ni quitar la sombra o los pseudo-elementos lo cambiaban.
- [x] 6.2 Corregir la causa (D5) y verificar los dos escenarios de reposo de `specs/coste-en-ejecucion/spec.md`, con capturas y un vídeo corto de antes y después del parpadeo de los títulos.
  - `neon-encendido` anima `filter: opacity()`; `tubo-roto` se queda con `opacity` y ya se compone (`src/styles/estabilidad.test.js`). Traza final, 10 s, dos tandas: con la cinta sonando, hilo principal 1,5–1,6 % en móvil ×4 (antes 15,8 %; tope 5 %) y **6,9–8,5 % de un núcleo en escritorio** (antes 26,5 %; tope 8 %: en el límite, una tanda dentro y otra fuera); con la radio parada, 1,1–1,2 % y 4,4–5,1 %.
  - Recálculos en 10 s: 35–75 con la radio parada y **100–136 con la cinta sonando** (el escenario pide 100 o menos: no se cumple de forma estable). Ya no son uno por fotograma: los marca el ritmo de fotogramas de los WebP animados (`fase4/traza-invalidaciones.mjs.txt`), unos 10 por segundo, y cuestan 14 ms en 10 s.
  - Capturas de antes y después del neón (`fase4/capturas-neon.mjs.txt`: portada y `/crew`, móvil y escritorio, arriba, a media página y abajo, con las animaciones paradas): 9 de 12 idénticas con umbral 18 sobre 765; las otras tres difieren en un 0,15–0,44 % de los píxeles (la cuenta atrás y el brillo de la ilustración del pie). **Sin vídeo del parpadeo**: se comprueba por construcción (mismos fotogramas clave, misma propiedad), no por grabación.
- [x] 6.3 Pruebas en `Spray.test.jsx`, primero en rojo: de noche sin coger el bote y sin trazos no hay lienzo; con trazos propios o compartidos sí; al soltar el bote sin nada pintado se libera. Implementar.
  - `Spray.test.jsx`: sin bote y sin trazos no hay lienzo; con trazos propios o compartidos sí; al soltar el bote sin nada pintado se libera; con algo pintado, o con un trazo todavía subiendo, se queda. El spray va además en su propio chunk, que solo se pide de noche.
  - **Pruebas existentes cambiadas a propósito**: tres de `Descontrol.test.jsx` esperan el bote con `findBy` (llega en su chunk).
- [x] 6.4 Cambiar la linterna para que mueva una capa compuesta y verificar los escenarios de puntero y de scroll (43 % y 74 % de un núcleo como máximo en escritorio); las pruebas de `torch.js` y de `Descontrol` siguen en verde.
  - Tres capas que solo se mueven con `transform` y la `opacity` de la tercera (design.md); pruebas nuevas en `Descontrol.test.jsx`. Traza final en escritorio, dos tandas: puntero **25,9–26,2 %** de un núcleo (antes 85,6 %; tope 43 %) y scroll **65,1–65,2 %** (antes 147,3 %; tope 74 %).
- [x] 6.5 Prueba en `useNightMode.test.js`, primero en rojo, de que catorce suscriptores crean un solo observador y todos reciben el cambio; implementar D6.
  - `useNightMode.test.js`: catorce suscriptores, un observador.

## 7. Estudio

- [x] 7.1 Medir con la traza, mientras suena la mesa, de dónde salen los layouts (registro de `Layout` con su pila) y anotarlo aquí.
  - `fase4/traza-invalidaciones.mjs.txt` y `fase4/diagnostico-mesa.mjs.txt` (6 s sonando, móvil ×4). Los layouts (113 en 6 s) venían de las diez barras del vúmetro al cruzar la opacidad 1; el coste de estilos, de la transición de `border-color` que el cabezal arrancaba en dieciséis celdas a cada paso. Base: hilo 28,1 %, 113 layouts. Vúmetro con tope 0,999: 27,3 %, 3 layouts. Sin la transición del borde: 16,2 %, 109 layouts. Las dos: **14,1 %, 3 layouts**.
- [x] 7.2 Pruebas, primero en rojo, de que avanzar un paso no vuelve a pintar la consola, los pads ni los controles (contando renders con un espía), y de que `matchMedia` no se llama en cada fotograma; implementar D7 sin tocar las pruebas existentes de la mesa.
  - `useStepSequencer` lleva un almacén de pasos (`createStepStore`, `trackStep: false`); `Rejilla` marca su columna a mano; el contador de la pantalla y la barra de Rocky IA se suscriben. Pruebas: `useStepSequencer.test.jsx`, `mesa/Rejilla.test.jsx`, `src/styles/estabilidad.test.js` y, en `BeatMachine.test.jsx`, que con la mesa sonando la rejilla, la consola y los pads no se vuelven a pintar y `matchMedia` no se consulta (verificada por mutación: con `trackStep: true` falla).
  - Las pruebas existentes de la mesa no se han tocado; `BeatMachine.test.jsx` gana tres `vi.mock` que envuelven los componentes reales con un espía.
- [x] 7.3 Verificar el escenario «mesa sonando» (20 % o menos del hilo en móvil ×4, sin tareas de más de 50 ms).
  - Traza final, 10 s con un ritmo de fábrica: hilo principal **12,0–12,6 %** en móvil ×4 (antes 30,2 %; tope 20 %) y 2 layouts (antes 167–176). **Queda una tarea larga de 72–78 ms** en la ventana, que incluye el clic de «play» (crear el contexto y el motor de audio y pintar el estado); la línea base tenía la misma, de 72 ms. El escenario pide ninguna: no se cumple en ese punto. Los búferes del motor son unos 15 ms de esos 78 (`bucle` cronometrado con CPU ×4), así que partirlos no bastaba.
- [x] 7.4 Pruebas en `engine.test.js` y `useRankingPlayer.test.js`, primero en rojo: mesa y ranking reciben el mismo contexto; se cierra al soltarlo el último; «Remezclar» no crea otro. Implementar D8.
  - `engine.test.js` (contexto compartido con contador de usos) y `ranking/useRankingPlayer.test.jsx` (mesa y ranking en el mismo contexto; «Remezclar» no crea otro; al sonar la mesa el ranking calla).
  - **Prueba existente cambiada a propósito**: `src/audio/voices.test.js` cierra sus motores en `afterEach` (el contexto ya no muere con cada motor).

## 8. Perfil Crew, presupuesto y cierre

- [x] 8.1 Prueba en `useCrewProfile.test.js`, primero en rojo, de que el objeto devuelto es el mismo entre renders sin cambios; implementar D9.
  - `useCrewProfile.test.js`.
- [x] 8.2 Bajar en `scripts/performance-budget.json` los límites de JS inicial, CSS inicial y fuentes precargadas a lo medido, y verificar `npm run check`.
  - JS inicial 100 (medido 99,8), CSS inicial 15 (14,0) y fuentes precargadas 55 (52,1). El total de imágenes sube de 8.700 a 8.750 kB por las variantes de la intro (design.md y `CLAUDE.md`).
- [x] 8.3 Repetir Lighthouse y la traza completas y anotar en `linea-base-fase-4.md` las cifras nuevas frente a los presupuestos; lo que no se alcance, con su medida y su causa.
  - Hecho: sección «Tras carga-y-estabilidad» de `linea-base-fase-4.md`, con dos tandas de la traza y Lighthouse de las diez páginas. **No se alcanzan**: LCP en móvil (3,7–4,5 s; presupuesto 3,0 s; antes 5,9–9,8 s), por la cadena documento → JavaScript → datos de una SPA sin render en servidor; rendimiento en móvil de cuatro páginas (83–84; presupuesto 85); el neón en reposo en escritorio, en el límite (6,9–8,5 % para un tope del 8 %; 100–136 recálculos para un tope de 100); y la tarea larga de 72–78 ms al pulsar «play» en la mesa. Todo lo demás, dentro.
- [x] 8.4 Comparar las capturas de 1.1 una a una; `npm run check`; autorrevisión de `git diff` y revisión independiente contra las dos especificaciones. Anotar el resultado aquí.
  - Capturas de siete rutas en 375 y 1440 px, de día y de noche, contra el commit de partida (`capturas.mjs` + `diferencias-capturas.mjs`, umbral 60): portada, crew, estudio y chat, idénticas o con menos de un 0,18 % de píxeles distintos; ficha, carrito y 404 cambian de alto (lo de 4.2). Las once rutas de 1.1 no: `capturas.mjs` cubre siete.
  - `npm run check` → 161 ficheros, **1.754 pruebas en verde** (partida: 1.680); ESLint, Stylelint, build, presupuesto y secretos, bien. `openspec validate carga-y-estabilidad --strict`, válido. `diff-check.sh`, limpio.
  - Revisión independiente (subagente con contexto limpio, una ronda): sin bloqueantes; cuatro importantes, todos corregidos con su prueba — prioridad de la primera foto con cartel delante (5.1), Estampida que se relanzaba al cambiar el tema, recarga de la página al fallar un chunk opcional, y Estampida y lightbox sin precarga en reposo (2.1). De los menores: corregidos el trazo en vuelo del spray, el comentario descolocado de la mesa y el alcance real de las variantes de la intro (DPR ≤ 2); aceptada y escrita en `CLAUDE.md` la subida del total de imágenes; quedan como deuda `StreetWall` sin esperar al reposo, el apagón tardío si el chunk del descontrol llegase con segundos de retraso, y el `instanceof` de `engine.js` que solo sirve a las pruebas.
  - No comprobado: nada en un teléfono real ni en Safari (la lona de la oscuridad, de `(100vw + 100vh) × 3,1` de lado, convendría verla ahí).

## Workflow follow-up

- Archivar con `openspec-archive-change` tras VERIFIED.
