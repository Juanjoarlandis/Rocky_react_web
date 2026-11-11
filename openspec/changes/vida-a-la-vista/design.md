# Design

## Context

Ver `proposal.md` (Why). Lo que condiciona el cómo:

- **Presupuesto** (`npm run budget:check` del 2026-11-11):
  - JavaScript inicial: 99,81/100 kB. `ProductPage` se importa de forma estática (`App.jsx:9`), así que todo lo que se añada a la portada, a `App` o a `useDrops` cuenta como inicial.
  - CSS inicial: 13,10/15 kB. Van en él `index.css`, `home.css`, `product-media.css` y las hojas de los componentes estáticos.
  - Pie, carrito, 404, muro, Crew y Estampida se cargan aparte.
- **La intro** se pinta con `{showSplash && <SplashIntro />}` (`App.jsx:130`), con la raíz `.splash-intro`, y la portada se monta debajo a la vez.
- **El punto de mira** es un `<g class="product-reticle-aim">` dentro de un SVG (`ProductReticle.jsx`).
  - En hover aparece con transición (`product-media.css:92-99`).
  - Al añadir, `.product-card:has(.btn--added) .product-reticle-aim` lanza `product-reticle-shot` con el atajo `animation` (`product-media.css:162-166`).
- **La Estampida** está en `App`:
  - escucha «035» con `listenForSecret` y sube `estampidas`;
  - monta la pieza diferida con `launchSignal={estampidas}` (`App.jsx:72-76`, `157-158`);
  - la pieza ignora las llamadas mientras corre (`Estampida.jsx:67-68`).
- **`useDrops`** vuelve a pedir los drops en cada frontera (una caída o un cierre). Cuando el servidor confirma el cambio, llama a `announce()`, que avisa a `onLaunch` al momento y otra vez a los 5, 15 y 35 s (`useDrops.js:69-74`, `108-136`). Un drop ya a la venta sigue trayendo su `launchAt`.
- **No hay `postcss` entre las dependencias directas.** Las pruebas de CSS del repo leen las hojas como texto (`reducedMotion.test.js`, `styles/estabilidad.test.js`).

## Goals / Non-Goals

**Goals:**
- Que todo lo de este cambio quepa en el presupuesto sin subir ningún límite.
- Usar CSS siempre que el comportamiento pueda vivir en CSS, y dejar el JavaScript nuevo en piezas diferidas.
- Comprobar con pruebas sobre el código lo que jsdom no puede pintar.

**Non-Goals:**
- Cambiar duraciones, dibujos ni la coreografía de la escena de la portada o de la Estampida.
- Mover los efectos de color del `:hover` (subrayados, cambios de tinta): no se quedan «levantados» y envolverlos gastaría CSS inicial sin arreglar nada que se note.

## Decisions

### D1 · La escena de la portada se pausa con `:has(.splash-intro)`
Mientras exista `.splash-intro` en el documento, una regla de `home.css` deja en
`animation-play-state: paused` la línea del spray, las gotas y la Cruiser. Con la animación
pausada tampoco corre su retardo, así que la Cruiser sigue esperando sus 2,2 s después de la
intro. Cuesta 0 bytes de JavaScript.
- **Alternativas descartadas:**
  - Pasar `showSplash` a `ProductPage` o avisar con un evento al cerrarse la intro. Es JavaScript inicial, que no cabe.
  - Montar la escena después de la intro. Cambia el reparto del encabezado y su espacio reservado.
- **Sin `:has()`** (navegadores antiguos), todo queda como hoy.

### D2 · El hover que mueve, solo con `@media (hover: hover)`
Las reglas `:hover` que cambian `transform`, `translate`, `rotate` o `scale` pasan dentro de
`@media (hover: hover)`.
- **Selectores compartidos.** Cuando una regla comparte selector con `:focus-visible`, `:focus-within` o `:active`, se parte en dos: la parte de foco o pulsación se queda fuera del media query con las mismas declaraciones.
- **La prueba.** El invariante se comprueba con una prueba que recorre todas las hojas de `src/styles/`. Usa un analizador de llaves propio, para no depender de `postcss` de forma indirecta. Cada regla con `:hover` en el selector y una de esas propiedades tiene que estar dentro de un bloque `@media` cuya condición contenga `hover: hover`.
- **Alternativas descartadas:**
  - Envolver los 67 `:hover`: más bytes en el CSS inicial sin beneficio visible (ver Non-Goals).
  - Detectar el táctil con JavaScript y poner una clase: JavaScript inicial y un parpadeo al cargar.

### D3 · El barrido de la mira es una animación ligada al scroll, con la línea de tiempo en la tarjeta
- **La línea de tiempo.** `.product-card` declara `view-timeline: --tarjeta block`, y la retícula la usa con `animation-timeline: --tarjeta`. Va en la tarjeta y no en la retícula porque la retícula es un elemento interno de SVG, cuya caja no sirve para una línea de tiempo de vista.
- **Los rangos.** La animación va de `cover 20%` a `cover 80%`, y sus fotogramas la tienen cerrada entre el 40 % y el 60 % (en el tramo central, con la tarjeta en medio de la pantalla).
- **El foco manda.** Una animación gana a las declaraciones normales, así que dentro del mismo bloque `.product-media:focus-visible .product-reticle-aim` pone `animation: none`, para que con teclado se vea la mira del foco de siempre.
- **Cuándo se aplica.** Todo va dentro de `@media (hover: none) and (prefers-reduced-motion: no-preference)` y de `@supports (animation-timeline: view())`, y excluye las tarjetas `.is-sold-out`.
- **El disparo al añadir sigue ganando.** Su regla `:has(.btn--added)` es más específica y usa el atajo `animation`, que devuelve `animation-timeline` a `auto`. Una prueba fija esa precedencia.
- **Alternativa descartada:** un `IntersectionObserver` en `ProductPage`. Es JavaScript inicial y pinta a saltos.

### D4 · «Llamar a la crew» es un botón real en el pie diferido
- **El botón.** La ilustración de Los del Banco se envuelve en `<button type="button" aria-label="Llamar a la crew">`. El botón hereda la posición y el tamaño que hoy tiene la imagen, y la imagen pasa a ocupar todo el botón, con `alt=""` porque el nombre lo da el botón. El botón no tiene fondo, borde ni relleno, y su foco usa el anillo de la casa.
- **La conexión.** `Footer` recibe `onLlamada`, y `App` le pasa la misma subida de `estampidas` que usa «035». Así la Estampida no cambia y solo se añade una puerta.
- **Coste.** En JavaScript inicial, solo la prop y su función en `App`.
- **Alternativa descartada:** poner el control en la cinta del pie. La cinta es `aria-hidden` y no puede contener controles.

### D5 · La caída se detecta en `useDrops` y avisa una sola vez
- **Al programar la frontera.** `useDrops` acepta `onFall` y calcula si esa frontera es el `launchAt` de un drop anunciado.
- **Al confirmarse.** Cuando el servidor confirma el cambio (en `attempt`), llama a `announce()` como hoy y además, solo si era una caída, a `onFall` una vez.
- **Lo que no avisa.** Los repasos de `announce()` no llaman a `onFall`, y un cierre tampoco.
- **La conexión.** `App` pasa `onFall` con la misma subida de `estampidas`.
- **Alternativas descartadas:**
  - Reutilizar `onLaunch`: salta cuatro veces y también en los cierres.
  - Detectarlo en `CuentaAtras`: solo existe donde se ve el cartel y no sabe si el servidor ya confirmó.

### D6 · El tachón es un `<s aria-hidden>` con un trazo enmascarado
- **El marcado.** En la frase se escribe `<s className="tachon" aria-hidden="true">lleno</s>` seguido de un espacio y la palabra buena. Las tres frases están en piezas diferidas: `Cart`, `NotFound` y `Muro`.
- **El trazo.** `.tachon` quita el `line-through` nativo y dibuja el trazo con un `::after`: `background-color: var(--accent)` y, como máscara, un garabato SVG (token `--tachon-trazo` en `00-tokens.css`). Sigue el acento de cada tema sin colores literales. Primero se probó con `currentColor`, pero en la captura del carrito vacío un trazo negro sobre letras negras solo asomaba por los bordes.
- **El movimiento.** Se dibuja de izquierda a derecha con `clip-path: inset()` una vez; con movimiento reducido, ya dibujado. Bajo la intro espera, con la misma pausa que el rótulo (D7).
- **Alternativa descartada:** `text-decoration: line-through` con `text-decoration-thickness`. Es recto y no parece rotulador.

### D7 · La segunda tinta es un `text-shadow` duro que entra en registro
- **La tinta.** `.page-title` lleva `text-shadow: 0.05em 0.045em 0 rgba(var(--blue-rgb), 0.9)`.
- **La entrada.** Con `prefers-reduced-motion: no-preference`, la animación `tinta-registro` (0,6 s, una vez) la trae desde un desfase mayor.
- **Bajo la intro,** en cualquier ruta, el rótulo espera con su propia regla en `03-utilities.css`, `:where(:root:has(.splash-intro))`, que es la misma que la del tachón. Es el criterio de D1: no suma especificidad y gana por ir después, y el neón de noche, más específico, sigue como siempre.
- **De noche,** la regla `[data-theme='neon'] .page-title` ya fija su propio `text-shadow` y su `animation`, y gana por especificidad; no hace falta tocarla.
- **Alternativas descartadas:**
  - Un pseudo-elemento con `content: attr()`: el `::before` y el `::after` del rótulo ya son la estrella y el garabato.
  - Dos desfases, rojo y azul: se lee como aberración cromática de vídeo, no como imprenta.

### D8 · Orden y salida si el JavaScript inicial no cabe
Las piezas que tocan JavaScript inicial se implementan en este orden, con `build` y
`budget:check` después de cada una:
1. La prop `onLlamada` en `App`.
2. `onFall` en `useDrops` y `App`.

Si la segunda no cabe sin subir el límite, se queda fuera de este cambio, se anota en el
informe y el límite no se toca. Lo demás no depende de ella.

## Risks / Trade-offs

- **[Riesgo] Firefox no tiene animaciones ligadas al scroll** → el barrido no aparece allí y el catálogo táctil se queda como hoy. Es mejora progresiva y lo cubre un escenario.
- **[Riesgo] Una línea de tiempo con nombre puede no activarse** si la retícula no es descendiente de la tarjeta en algún sitio (la ficha). → Se aplica solo dentro de `.product-card`; la ficha no tiene barrido. Se comprueba en el panel con el preajuste móvil.
- **[Riesgo] El botón del pie añade una parada de Tab** → es un control real con nombre; el orden queda: ilustración, Instagram, enlaces legales.
- **[Riesgo] El `text-shadow` animado repinta el rótulo** durante 0,6 s. Es una vez por página y no afecta a la estabilidad del diseño.
- **[Riesgo] Partir reglas de `:hover` puede cambiar la especificidad o el orden** → las mitades conservan el selector y el orden de la regla original. La prueba de contrato y la revisión visual en escritorio lo vigilan.
- **[Compromiso] La celebración de la caída solo se ve con la página abierta** a la hora en punto. No se puede comprobar en vivo antes del próximo drop; las pruebas lo hacen con reloj falso.

## Migration Plan

Sin datos ni API. Se publica como cualquier release del cliente; si algo falla,
`npm run release:revertir` vuelve a la release anterior.
