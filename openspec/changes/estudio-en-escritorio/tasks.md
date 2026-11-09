# Tasks

Nivel 2. TDD en cada tarea de lógica: prueba en rojo, implementación mínima y refactor en verde. Antes de empezar, línea base de `npm run test:run` en el área del estudio.

## 1. Motor y datos

- [x] 1.1 `src/audio/engine.js`: un `AnalyserNode` en derivación por bus de pista (`fftSize` 1024) y `levels()` con el pico de cada pista en el orden de `TRACK_IDS`, leído después del fader. Verifica: prueba con un `AudioContext` falso que comprueba la derivación (el bus sigue conectado a la mezcla) y el orden de `levels()`; las pruebas existentes del estudio siguen verdes.
- [x] 1.2 `src/data/mesa.js`:
  - `CORTES_BARRO`: 16 cortes con `id`, `label`, `inicio`, `duracion` y `tipo`, elegidos escuchando BARRO y apuntados como provisionales para la revisión del usuario;
  - el banco `barro` en `BANCOS`;
  - `PUBLICO`, con un personaje por pista según D7.

  Verifica: una prueba comprueba que son 16 cortes con ids únicos, todos dentro de 0–113 s y con duración mayor que 0, y que `PUBLICO` cubre las 8 pistas sin repetir.
- [x] 1.3 Función pura `pistasQueSuenan(pattern, { mutes, solos })` en `audio/drumKit.js`. Verifica: pruebas para pista vacía, pista con pasos, mute y solo de otra pista.

## 2. Los cortes de BARRO

- [x] 2.1 `src/features/studio/audio/barro.js`: descarga única por pestaña, decodificación con el contexto del motor y copia de los 16 tramos a buffers pequeños, soltando el buffer entero. Verifica: pruebas con `fetch` y `decodeAudioData` falsos para la descarga única, que los tramos salen con la longitud correcta y que un error se propaga sin dejar caché a medias.
- [x] 2.2 La voz `corte`: reproduce un tramo por el `padBus` con rampas de 5 ms, y repetir el mismo pad corta el anterior (`engine.chokes`). Verifica: prueba con un contexto falso para el inicio, las rampas, el corte del mismo pad y la superposición de pads distintos.
- [x] 2.3 El banco en `BeatMachine` y `BeatPads`:
  - estados `reposo`, `cargando`, `listo` y `fallo` con «Reintentar»;
  - el tono desactivado con BARRO;
  - el aviso de REC;
  - los cortes no se graban en la rejilla;
  - la nota del pie corregida.

  Verifica: pruebas de componente para cada escenario de `cortes-de-barro` (sin descarga si no se elige, cargando, listo, fallo con reintento, REC sin grabar, texto del pie).

## 3. La consola y la distribución

- [x] 3.1 Partir la mesa en `src/features/studio/mesa/Rejilla.jsx` y `Consola.jsx` con el estado en `BeatMachine`, sin cambiar nada de lo que se ve. Verifica: las pruebas actuales de `BeatMachine.test.jsx` siguen verdes sin tocarlas.
- [x] 3.2 `Consola.jsx`:
  - un canal por pista con fader vertical nativo, mute, solo y vúmetro;
  - el maestro;
  - el pintado de los vúmetros en el `onFrame` con variables CSS.

  Verifica: pruebas de que la consola y las filas comparten estado, de que lo guardado con la versión anterior aparece en la consola, de los nombres accesibles de los faders («Volumen de Caja»), de `aria-pressed` en mute y solo, y de que los vúmetros quedan fuera del lector.
- [x] 3.3 CSS (`beat-machine.css`, `studio.css`):
  - la mesa ancha desde 1200 px con las áreas de D1;
  - el fader vertical con `@supports`;
  - ocultar la consola por debajo de 1200 px y el deslizador y la S de las filas desde 1200 px.

  Verifica: `npm run lint:css` en verde (tokens, especificidad, puntos de corte del proyecto) y el recorrido de la tarea 5.2.

## 4. El público de La Colmena

- [x] 4.1 `src/features/studio/mesa/Publico.jsx`:
  - la grada sobre la mesa desde 1200 px, con los 8 personajes, `useNightArt`, `alt=""`, `aria-hidden` y `loading="lazy"`;
  - `data-groove` y `--bpm` en su contenedor solo mientras suena;
  - `.al-ritmo` solo en quien baila.

  Verifica: pruebas de componente que comprueban quién lleva `.al-ritmo` según el patrón, los mutes y los solos, nadie con la mesa parada, el `--bpm` con el tempo y que nada recibe foco.
- [x] 4.2 CSS de la grada: postura y opacidad de quien no baila; con movimiento reducido, sin animación y diferenciado por opacidad. Verifica: `npm run lint:css` y capturas de la tarea 5.3.

## 5. Verificación y cierre

- [x] 5.1 `npm run check` en verde.
- [x] 5.2 Recorrido de Playwright contra el servidor de desarrollo que mide las cajas:
  - a 1440×900, de la cabecera a los pads ≤ 832 px y rejilla y pads visibles a la vez;
  - a 1920×1080, la mesa con la consola ≤ 1012 px;
  - a 375 y 900 px, sin desbordar el ancho y sin consola ni grada;
  - la grada sin solaparse con ningún control a 1280 y 1920 px;
  - el banco BARRO cargando y sonando de verdad en Chromium (el `AudioContext` reporta reproducción).

  Verifica: el script termina con todas las comprobaciones OK y deja capturas.
- [ ] 5.3 Revisión de arte con capturas de día y de noche a 1280, 1440 y 1920 px. Incluye la consola, la grada bailando y en reposo y el banco BARRO en sus estados, y corrige lo que no encaje. Los cortes de BARRO los escucha y aprueba el usuario.
- [ ] 5.4 Revisión independiente (`engineering-review`) contra estas especificaciones y el diff, y corrección de los bloqueantes en dos rondas como mucho.

## Workflow follow-up

- Publicar con `docs/ops/publicar.md` cuando el usuario lo pida.
- Archivar el cambio con estado VERIFIED y la conformidad del usuario.
