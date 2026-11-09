# Proposal

## Why

En ordenador, La Colmena (`/estudio`) desaprovecha la pantalla. Lo medí a 1280, 1440 y 1920 px, y en los tres casos:

- `.studio` limita el ancho a 900 px y todo va en una sola columna de 852 px;
- la página mide 5217 px de alto y a 1920 px sobran unos 1000 px de ancho;
- la mesa de beats mide 1438 px de alto, así que nunca se ven a la vez la rejilla y los pads. Para grabar con REC hay que bajar a los pads y la rejilla queda fuera de la vista;
- el mezclador se reduce a un deslizador diminuto por fila, sin vúmetro por pista.

Hay espacio para que la mesa sea un instrumento de verdad y para que La Colmena tenga piezas que solo puede tener esta web.

## What Changes

- **La mesa a pantalla completa (desde 1200 px).** La mesa se sale de la columna de 900 px y se reparte en dos columnas: la rejilla de 16 pasos a la izquierda y los pads 4×4 a la derecha.
  - A 1440×900 se ven a la vez el transporte, la rejilla y los pads.
  - A 1920×1080 cabe la mesa entera, consola incluida.
  - Por debajo de 1200 px la mesa sigue como hoy.
- **La consola.** Una tira de canales con un fader vertical por pista, mute, solo y un vúmetro por pista que se mueve con lo que suena, más el maestro. En ordenador sustituye al deslizador de cada fila. Usa el mismo estado de niveles, mutes y solos que hoy, que se sigue guardando igual.
- **Los cortes de BARRO.** Un banco de pads nuevo, «BARRO», que trocea en 16 cortes el tema real de ASAKO KACO (`/music/barro.m4a`, el mismo que suena en la radio). Se tocan con ratón y teclado como los demás pads.
  - El audio solo se descarga al elegir el banco.
  - Si falla la descarga, el banco lo dice y los demás siguen funcionando.
- **El público de La Colmena.** En ordenador, ocho personajes de la crew sentados en el canto de arriba de la mesa como en una grada, uno por pista, junto a El Freeze. La grada va en el hueco que ya existe sobre la mesa, porque a 1280 px los márgenes laterales solo miden unos 50 px. El de una pista se une al baile cuando esa pista suena y se sienta cuando se calla.
  - Cabecean al BPM de la mesa con la animación `al-ritmo` que ya existe.
  - Con movimiento reducido, se quedan quietos.
  - Usan su versión de noche en el modo neón.

## Capabilities

### New Capabilities
- `mesa-de-beats`: la distribución de la mesa según el ancho de pantalla y la consola de mezcla (faders, mute, solo y vúmetros por pista).
- `cortes-de-barro`: el banco de pads que toca cortes del tema BARRO; cómo se cargan, cómo se tocan y qué pasa si el audio no llega.
- `publico-de-la-colmena`: los personajes que bailan en la grada de la mesa al pulso de su BPM, según las pistas que suenan.

### Modified Capabilities
- Ninguna: aún no hay especificaciones principales del estudio.

## Impact

- **Código del cliente:**
  - `src/features/studio/BeatMachine.jsx`: se reparte en piezas: rejilla, consola y público.
  - `src/features/studio/BeatPads.jsx`.
  - `src/features/studio/audio/drumKit.js` y `src/audio/engine.js`: un analizador por bus, en derivación, para los vúmetros, y la reproducción de cortes de un `AudioBuffer`.
  - `src/audio/voices.js` o un módulo de muestras nuevo.
  - `src/data/mesa.js`: el banco BARRO y la lista de cortes.
  - `src/features/studio/Studio.jsx`.
  - `src/styles/components/beat-machine.css` y `src/styles/pages/studio.css`.
- **Sin cambios en el servidor ni en contratos.** El formato del enlace para compartir (`?beat=…&bpm=…&swing=…&tono=…`), el de publicar en el ranking y el de Rocky IA «rapéame» no cambian: los cortes de BARRO se tocan en directo y no se graban en la rejilla.
- **Textos.** «Sonidos cocinados en el navegador, sin un solo sample» deja de ser cierto con los cortes, así que se ajusta.
- **Rendimiento.** Descargar y decodificar BARRO son unos 2,7 MB y solo ocurre al elegir el banco. Los ocho analizadores son nodos pequeños (`fftSize` 256) que se leen en el bucle de animación que ya pinta el vúmetro maestro.
- **Sin dependencias nuevas.**
