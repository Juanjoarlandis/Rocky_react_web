# Propuesta: carga y estabilidad

## Why

Con las imágenes en su sitio (`imagenes-y-medios`) y el origen comprimiendo
(`servidor-ligero`), lo que queda entre la web y un móvil lento es el código y cómo se
ejecuta. La línea base de la fase 4 (`docs/auditoria/2026-11/linea-base-fase-4.md`) y la
auditoría (cambio C16 de `plan-fases.md`) lo miden:

- **Carga.** Todas las páginas descargan 370 kB de JavaScript (123 kB gzip) y 85 kB de
  CSS antes de pintar. De ese JavaScript, unos 60 kB son cosas que no pintan nada al
  entrar: el modo neón con su spray (32 kB), el Curioso (11 kB), la Estampida, el
  repartidor del carrito y sus datos.
- **LCP de 5,9 a 9,8 s en móvil** (H-171). En seis páginas el elemento más grande es una
  ilustración del pie con `loading="lazy"` o un cartel que no existe hasta que responde
  la API.
- **CLS de 0,10 a 0,52 en seis páginas** (H-170): el pie se pinta arriba y baja cuando
  llega el contenido.
- **El modo neón gasta en reposo** el 15,8 % del hilo principal en un móvil lento (13,6 %
  con la radio parada) y un cuarto de núcleo en escritorio, con un recálculo de estilos
  por fotograma; de día, menos del 1 %. Mover el puntero lo sube a 0,86 núcleos.
- **La mesa de beats sonando** ocupa el 30 % del hilo en móvil: cada paso del
  secuenciador vuelve a pintar la mesa entera.
- Hay dos `AudioContext` en el estudio (H-118), un `MutationObserver` por cada uso de
  `useNightMode` (H-137, catorce en la portada) y un perfil Crew que cambia de identidad
  en cada render (H-097).

Es de nivel 2. Va después de `imagenes-y-medios` y de `servidor-ligero`, porque sus
presupuestos de Lighthouse se miden con las imágenes ya reducidas y el origen
comprimiendo.

## What Changes

- **El JavaScript y el CSS de lo que no se ve al entrar se cargan aparte**: modo neón y
  spray, Curioso, Estampida, repartidor, lightbox y página 404, cada uno con su hoja de
  estilos. Se piden en reposo o al primer uso.
- **Solo se precargan las fuentes que pinta el primer pantallazo.**
- **El pie nace fuera de la pantalla**: el contenido reserva su alto mientras carga, de
  modo que nada visible se desplaza y el elemento más grande deja de ser una
  ilustración del pie.
- **La primera fila de fotos se pide desde el principio**, también durante la intro, y
  la prioridad va a la primera foto de producto aunque antes haya un cartel.
- **El neón en reposo deja de recalcular estilos en cada fotograma**, el lienzo del spray
  solo existe cuando se coge el bote, la linterna deja de repintar la ventana entera y
  hay un único observador del tema.
- **La mesa de beats solo repinta lo que cambia en cada paso**, y la mesa y el ranking
  comparten un único `AudioContext`.
- **El perfil Crew conserva su identidad** entre renders.

## Capabilities

### New Capabilities

- `carga-inicial`: cuánto código y qué recursos descarga una página antes de pintar, y
  qué estabilidad y qué tiempos debe dar la primera vista.
- `coste-en-ejecucion`: cuánta CPU gasta la web una vez cargada, en reposo y en sus
  estados más caros (modo neón y mesa de beats).

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- La duración de la intro (3 s): es una decisión de marca que no cambia aquí. La intro
  no retrasa el LCP si el contenido de debajo ya está pintado, que es lo que se asegura.
- Sustituir `react-router` o React: las librerías son el 61 % del JavaScript inicial y
  quedan como suelo.
- Render en servidor.
- El peso de las imágenes y de las animaciones: `imagenes-y-medios`.

## Supuestos

- Los presupuestos de Lighthouse se comprueban con `servidor-ligero` e
  `imagenes-y-medios` ya integrados. Si este cambio se implementa antes, se comprueban
  los de build y los de la traza, y los de Lighthouse quedan pendientes.
- Cargar el modo neón al primer uso no se nota: se precarga cuando la página queda en
  reposo y al acercar el puntero o el foco a la bombilla.

## Impact

`src/App.jsx`, `src/components/NavBar.jsx`, `Footer.jsx`, `NotFound.jsx`,
`src/features/night/` (Descontrol, spray, linterna, `useNightMode`),
`src/features/peeker/`, `estampida/`, `cart/CartRunner.jsx`, `catalog/ProductPage.jsx` y
`Lightbox.jsx`, `src/features/studio/` (mesa, secuenciador, ranking) y `src/audio/engine.js`,
`src/features/crew/useCrewProfile.js`, `index.html`, varias hojas de `src/styles/` y
`scripts/performance-budget.json`. Sin cambios en el servidor ni en la API. Sin
dependencias nuevas.
