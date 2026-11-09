# Design

## Context

Lo medido y el porqué están en `proposal.md`. Para el cómo importa lo siguiente:

- **La mesa** (`BeatMachine.jsx`, 651 líneas):
  - Guarda en estado de React el patrón, el tempo, el swing, el tono, los niveles, los mutes, los solos, el banco y REC.
  - Persiste en `localStorage` (`STORAGE_KEYS.beatTable`): el código del patrón, el BPM, el swing, el tono, `niveles` y `mudas`.
  - El transporte vive en `useStepSequencer` y el kit en `audio/drumKit.js`.
- **El motor** (`src/audio/engine.js`): un `AudioContext` con un bus por pista, un `padBus`, mezcla, saturación, compresor y maestro, y un único analizador sobre el maestro que alimenta el vúmetro (`engine.level()`). El vúmetro se pinta con una variable CSS en el bucle de animación del secuenciador (`onFrame`), sin renderizar React.
- **Las voces** (`src/audio/voices.js`) se sintetizan sin samples. `engine.chokes` ya existe para cortar voces.
- **El baile.** `05-motion.css` ya sabe hacer cabecear a los muñecos: `[data-groove] .al-ritmo` anima con `--bpm` y una `--fase` por muñeco, y con movimiento reducido se apaga. La radio pone `data-groove` y `--bpm` en el `body`.
- **Los puntos de corte del proyecto** son 480, 640, 900 y 1200. `.studio` fija `--container: 900px`.
- **BARRO** (`/music/barro.m4a`) son unos 2,7 MB de AAC y 1:53. Decodificado entero en estéreo a 48 kHz serían unos 43 MB de `Float32`.

## Goals / Non-Goals

**Goals:**
- Que en ordenador la mesa quepa y se toque sin desplazar la página, con un único estado de mezcla y sin tocar el formato de los enlaces.
- Que la mesa siga siendo ligera: nada de audio de BARRO si no se usa, y nada que haga renderizar React a 60 fps.

**Non-Goals:**
- Grabar los cortes de BARRO en la rejilla: obligaría a cambiar el formato del patrón y el del enlace.
- Rediseñar en esta tanda la radio, el setlist, el ranking, la escucha o los EPs. Solo se mueve la mesa.
- Un canal de consola para el bus de pads, ni panorámica o envíos por pista.
- Estirar el tempo de los cortes: suenan a su velocidad original.

## Decisions

### D1 · La mesa sale de la columna de 900 px solo desde 1200 px
- **Distribución.** Desde 1200 px, `.mesa-section` pasa a un contenedor ancho de unos 1180 px como máximo, y la mesa usa una rejilla de áreas:
  - `cabecera`, todo el ancho;
  - `transporte` y `ritmos`, todo el ancho;
  - `rejilla | pads`, en proporción de unos 3 a 2;
  - `consola`, todo el ancho;
  - `pie`, todo el ancho.
- **Presupuesto de alto** (lo comprueba la verificación):
  - de la cabecera a los pads, como mucho 832 px (900 menos la barra), así que a 1440×900 cabe sin desplazar;
  - con la consola, como mucho 1012 px, así que a 1920×1080 cabe entera.
- El resto de la página sigue en 900 px.
- **Alternativas descartadas:**
  - Ensanchar toda la página: la radio y el setlist, que tienen poco contenido, quedarían aún más vacíos.
  - Un modo «pantalla completa» aparte: otro estado más que mantener, y no resuelve la página por defecto.

### D2 · La mesa se parte en piezas con el estado arriba
- `BeatMachine` conserva todo el estado y lo pasa a piezas nuevas en `src/features/studio/mesa/`: `Rejilla.jsx`, `Consola.jsx` y `Publico.jsx`.
- La persistencia no cambia de clave ni de forma, para cumplir la compatibilidad con lo guardado antes.
- **Alternativa descartada:** un contexto o un store para la mezcla. Hay un solo consumidor por dato y basta con props.

### D3 · Consola y controles de fila: los dos en el DOM, uno visible
- La consola se renderiza siempre, pero por debajo de 1200 px se oculta con `display: none`.
- Desde 1200 px, la cabeza de cada fila de la rejilla oculta su deslizador y su botón S, y conserva el nombre, que sigue haciendo de mute.
- `display: none` saca el control oculto del árbol de accesibilidad, así que el lector de pantalla nunca ve el control duplicado.
- Por lo mismo, desde 1200 px se oculta el volumen general del transporte: lo sustituye el fader del maestro, que mueve el mismo valor.
- `.mesa-wrap` pasa a `position: relative` desde 1200 px para que la grada del público se coloque respecto a la mesa ensanchada y no respecto a la página.
- **Alternativa descartada:** decidir con `matchMedia` en JavaScript. Es más código, da parpadeos al redimensionar y obliga a simular la anchura en las pruebas.

### D4 · Faders verticales con `<input type="range">` nativo
- Se gira con `writing-mode: vertical-lr; direction: rtl`. Se conservan el teclado, el valor anunciado y el nombre accesible («Volumen de Caja»).
- Las medidas van en propiedades lógicas (`inline-size` 112 px, `block-size` 28 px). Un navegador que no gire el range (Chrome < 124 da verdadero en `@supports (writing-mode: vertical-lr)` pero lo pinta en horizontal) lo deja horizontal y a lo ancho del canal, no metido en una caja de 28 px.
- **Alternativas descartadas:**
  - Un `role="slider"` hecho a mano: más código y más riesgo de accesibilidad.
  - Girar el input con `transform`: rompe la caja y la zona de clic.

### D5 · Un vúmetro por pista con analizadores en derivación
- **El motor.** Cada bus de pista se conecta, además de a la mezcla, a un `AnalyserNode` propio (`fftSize` 1024, unos 21 ms) que no sale a ningún sitio. Es una derivación, así que no cambia el sonido. El motor expone `levels()` con el **pico** de cada pista, en el orden de `TRACK_IDS`.
  - Se pasó del RMS con 256 muestras al pico con 1024 en la verificación. Con 256, la ventana solo cubría 5 ms de cada fotograma de 16 ms, y la media aplastaba los golpes secos: el bombo llenaba el vúmetro y la caja apenas lo movía.
- **El pintado.** Va en el mismo `onFrame` que el vúmetro maestro y escribe una variable CSS por canal. Lee cada fotograma solo mientras suena y solo si la consola se ve (`matchMedia('(min-width: 1200px)')`). Cada canal sube al pico y cae un 14 % cada 1/60 s, medido por tiempo, para que en pantallas de 120 Hz no caiga el doble de rápido.
- El nivel se lee después del fader del bus, así que un fader bajo o un mute se ven en su vúmetro.
- **Alternativas descartadas:**
  - Calcular un «nivel» por los disparos del secuenciador: no refleja el sonido real.
  - Un solo analizador: no hay nivel por pista.

### D6 · Los cortes de BARRO: se descarga una vez y se guardan solo los trozos
- **El módulo.** `src/features/studio/audio/barro.js` hace tres cosas:
  1. descarga `/music/barro.m4a` una sola vez por pestaña y guarda en memoria el `ArrayBuffer`; si la descarga falla, lo olvida para que el reintento vuelva a pedirlo;
  2. lo decodifica con el `AudioContext` del motor, una vez por mesa montada; si la decodificación falla, conserva los bytes (reintentar no vuelve a bajar 2,7 MB);
  3. copia a buffers pequeños solo los 16 tramos de `CORTES_BARRO` y suelta el buffer entero.

  Así pasa de unos 43 MB a lo que sumen los cortes: con 16 cortes de unos 2 s, unos 12 MB.
- **La lista de cortes.** `CORTES_BARRO`, en `src/data/mesa.js`, lleva por cada corte `id`, `label`, `inicio` y `duracion` en segundos, y `tipo`, que da el color del pad.
- **La voz `corte`.** Toca un buffer por el `padBus` con rampas de 5 ms al entrar y al salir, para que no haya clics. Usa `engine.chokes` con una clave por pad, de modo que repetir un pad corta el anterior y pads distintos se superponen.
- **El estado del banco** está en `BeatMachine`: `reposo`, `cargando`, `listo` o `fallo`.
  - Al elegir BARRO se crea el motor si hace falta y se carga.
  - Con `fallo`, los pads del banco muestran el error (distinto si falló la descarga o la decodificación) y un botón «Reintentar»; al pulsarlo el foco pasa al grupo de pads.
  - «Cargando» y el aviso de REC van en una sola región viva (`role="status"`) que siempre está en el DOM, para que el lector anuncie los cambios.
  - El tono no afecta a los cortes, y el selector se desactiva con BARRO elegido.
  - Con REC encendido y BARRO elegido aparece un aviso de que los cortes no se graban. Los pads de BARRO no llevan pista, así que `trackIndexOf` ya devuelve -1 y no se graban.
- **Alternativas descartadas:**
  - Cortar automáticamente por golpes al cargar: el resultado es impredecible y difícil de probar.
  - Cortar por compases iguales: musicalmente pobre.
  - Ficheros sueltos ya cortados en el build: duplican el audio y añaden un paso de build.

### D7 · El público: datos fijos, baile con `al-ritmo`, en el contenedor de la mesa
- **El reparto.** `PUBLICO` (en `src/data/mesa.js`) asigna un personaje fijo a cada pista. Todos tienen versión de noche y ninguno tiene coreografía propia en otra parte:

  | Pista | Personaje |
  | --- | --- |
  | Bombo | `perro-rocky` |
  | Caja | `bombilla-eureka` |
  | Hi-hat | `skater-ollie` |
  | Diana | `diana-jefe` |
  | Palmas | `estrella-apoyado` |
  | Hat abierto | `cruiser-patinando` |
  | Tom | `sentado-borde-rojo` |
  | 808 | `sentado-borde-blanco` |

  El reparto puede cambiar en la revisión de arte sin tocar las especificaciones.
- **Quién baila** lo decide una función pura, `pistasQueSuenan(pattern, { mutes, solos })`: pistas con algún paso encendido y audibles según `isAudible`. Con la mesa parada no baila nadie.
- **El pulso.** El contenedor de la grada lleva `data-groove` y `--bpm` con el BPM de la mesa solo mientras suena. Solo el personaje de una pista que suena lleva `.al-ritmo`, y cada uno tiene su `--fase`. No se toca `data-groove` del `body`, que es de la radio.
- **El aspecto.** Quien no baila se queda sentado: postura recogida y opacidad baja. Con movimiento reducido no hay animación y se distingue solo por opacidad.
- Imágenes con `alt=""`, `aria-hidden` y `useNightArt`.
- **Alternativa descartada:** los márgenes laterales. A 1280 px solo quedan unos 50 px.

### D8 · Cómo se verifica
- **Lógica**, con Vitest en jsdom:
  - `pistasQueSuenan`;
  - que la consola y las filas compartan el estado;
  - que lo guardado antes se cargue;
  - el estado del banco BARRO (carga, fallo, reintento, sin grabación);
  - la voz `corte` y el corte con choke, con un `AudioContext` falso;
  - la lista de cortes dentro de la duración del tema;
  - `levels()` del motor;
  - los nombres accesibles de los faders.
- **Distribución:** un recorrido de Playwright que mide las cajas a 375, 900, 1280, 1440×900 y 1920×1080 con los presupuestos de D1, y que comprueba que la grada no se superpone con ningún control. Se acompaña de capturas de día y de noche para la revisión de arte.

## Risks / Trade-offs

- **[Riesgo] Firefox en Linux puede no decodificar AAC sin los códecs del sistema.** → Se cumple la ruta de fallo (mensaje y reintento) y el resto de la mesa sigue. Si pasa a menudo, se añade una copia en Opus en otro cambio.
- **[Riesgo] Los faders verticales nativos varían entre navegadores.** → `@supports` con caída a horizontal, y capturas en Chromium y WebKit en la verificación.
- **[Riesgo] Ocho personajes más en la página pesan.** → Se usan las versiones `-600.webp` y `loading="lazy"`, y no se cargan por debajo de 1200 px.
- **[Compromiso] Los cortes no se graban en la rejilla.** → La mesa lo dice con REC encendido. Grabarlos queda para otro cambio que versione el formato del patrón.
- **[Supuesto] Uso de BARRO.** El tema es del propio estudio (ASAKO KACO) y ya se sirve en la web. Se da por hecho que se puede trocear para tocarlo.

## Migration Plan

Es solo cliente: se publica con la release normal (`docs/ops/publicar.md`) y la vuelta atrás es `npm run release:revertir`. Lo guardado en el navegador no cambia de clave ni de forma, así que no hay migración de datos.

## Open Questions

- Los 16 cortes exactos de BARRO (dónde empieza y cuánto dura cada uno, y cómo se llaman) se eligen escuchando el tema durante la implementación y los revisa el usuario. Cambiarlos no toca ni las especificaciones ni el diseño.
