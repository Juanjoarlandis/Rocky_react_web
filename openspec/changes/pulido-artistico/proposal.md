# Proposal

## Why

La revisión visual del 2026-11-10 (commit `2df457e`, a 375, 900, 1280, 1440 y 1920 px, de día y en neón, con la mesa sonando y con varios visitantes pintando) encontró cinco fallos que se ven y cuatro piezas que funcionan pero se quedan cortas de arte:

- **Las firmas de la pared casi nunca se leen.** De cinco firmas en dos paredes de escritorio, ninguna quedó entera: se colocan en la esquina de la caja que une *todos* los trazos del autor y el texto crece hacia fuera, así que acaban cortadas por una tarjeta, fuera del borde o lejos de lo pintado.
- **La barra del spray ocupa todo el ancho** (1365 px para unos 560 px de contenido) y casi media pantalla en móvil con la lista abierta.
- **Las pestañas «Drops / La pared» de El Taller salen como botones nativos**: su estilo solo existe en la hoja de la mesa, que se carga con el Estudio.
- **La página del drop dice la fecha dos veces seguidas.**
- **La mesa no cabe en una pantalla**: mide 1119 px de alto y a 1440×900 quedan 832; la consola entera cae bajo el pliegue. Además la consola parece un formulario, el modo neón no tiene tratamiento propio en la mesa y el público solo sabe cabecear.
- El bote son tres puntos, las firmas parecen etiquetas de interfaz y no se sabe qué pintó cada una; el cartel no invita a arrancar y la pestaña arrancada desaparece; el muro tiene cerca del 40 % vacío.

El usuario aprobó implementar los cuatro bloques de mejora («Todo, por bloques»).

## What Changes

**Bloque A — fallos**
- Las firmas se agrupan por pintada (trazos cercanos de la misma firma), cada grupo lleva su firma bajo lo pintado, alineada hacia dentro y sin salirse de la página. Señalar para reportar usa esos mismos grupos.
- La barra del spray mide lo que sus herramientas; la lista de firmas se desplaza dentro.
- Las secciones de El Taller usan los botones de la casa y sus rótulos van en mayúsculas.
- La página del drop dice la fecha una sola vez.

**Bloque B — la mesa**
- Desde 1200 px, la consola pasa bajo la rejilla y los pads ocupan toda la columna derecha: la mesa entera cabe en 1440×900.
- Consola de máquina: cinta rotulada a mano por canal, fader con capuchón sobre ranura con escala y vúmetro de segmentos al lado.
- Leyendas del aparato en letra de serigrafía.
- Modo neón propio: pantalla, mandos y faders en ultravioleta, pasos y cursor con resplandor.
- El público reacciona: la pista silenciada duerme, la que va en solo recibe el foco y con las ocho sonando El Freeze hace su truco.

**Bloque C — la pared como pieza**
- Las firmas se dibujan con mano: inclinación y remate propios de cada una, siempre iguales.
- Los colores son botes de spray dibujados; el elegido se levanta y suena un traqueteo.
- Pasar el cursor o el foco por una firma destaca sus trazos, en la web y en El Taller.

**Bloque D — cartel y muro**
- Nota a mano «arranca una» junto a las pestañas.
- La pestaña arrancada se queda como resguardo y se sella «APUNTADO» al dejar el email.
- Restos de carteles, pegatinas y tags en los huecos del muro.

Nada de esto toca el servidor, los datos guardados ni los enlaces.

## Capabilities

### New Capabilities
- `firmas-en-la-pared`: dónde y cómo se dibuja cada firma junto a su pintada, y cómo se sabe qué pintó cada una.
- `barra-del-spray`: el tamaño de la barra de herramientas del spray y los botes de color.
- `mesa-en-una-pantalla`: la distribución de la mesa de beats en ordenador para que quepa entera.
- `mesa-como-maquina`: el aspecto de aparato de la mesa (consola, serigrafía y modo neón).
- `reacciones-del-publico`: cómo reacciona el público de La Colmena a silencios, solos y al beat completo.
- `pared-en-el-taller`: el aspecto de la sección «La pared» de El Taller y cómo identifica los trazos de una firma.
- `cartel-anunciado`: la fecha, la invitación a arrancar y el resguardo del cartel de un drop anunciado.
- `muro-empapelado`: los restos pegados en los huecos del muro de drops.

### Modified Capabilities
Ninguna en `openspec/specs/` (aún no hay especificaciones archivadas). Este cambio afina requisitos de cambios activos sin archivar:
- `pared-compartida-neon` → «Firmas generadas, sin texto libre» (la firma sigue junto a lo pintado; cambia el sitio exacto) y `moderacion-de-la-pared` → «Cualquiera puede reportar una pintada» (señalar usa la pintada, no la unión de todo lo del autor).
- `estudio-en-escritorio` → `mesa-de-beats` «En ordenador, rejilla y pads a la vez» (ahora cabe también la consola a 1440×900) y `publico-de-la-colmena` «Baila quien suena» (se añaden reacciones; bailar no cambia).

## Supuestos

- «Por grupo de trazos» significa que una misma firma puede aparecer varias veces en una pared, una por cada pintada separada. El tope de 150 rótulos se aplica a los grupos.
- La mesa entera en una pantalla se garantiza desde 1200 px de ancho y 880 px de alto de ventana; en ventanas más bajas (1366×768) se desplaza como hoy.
- No se añade ninguna tipografía: la «mano» de las firmas sale de inclinar y rematar la rotulación que ya hay.
- El traqueteo del bote es un sonido corto sintetizado en el navegador con el motor de audio que ya existe; si el navegador no deja sonar, no pasa nada.
- Los restos del muro son decoración dibujada con CSS y los muñecos que ya hay; no se generan imágenes nuevas.
- Las pruebas existentes que fijan la colocación antigua de la firma (esquina de la caja de todo lo del autor) se reescriben para el requisito nuevo: es un cambio de requisito aprobado, no una relajación.

## Corrección durante la implementación

La revisión dio por vacío el cartel de un drop archivado («VOLÓ» como hoja en blanco). Era un fallo de la captura: en una captura de página entera la imagen, de carga perezosa, no había llegado. Con la imagen cargada el cartel ya sale rasgado, en gris y con su sello. Se retira del cambio el requisito de los jirones y su tarea (4.4): no había nada que arreglar.

## Impact

- Cliente: `src/features/night/spray/` (`paint.js`, `Spray.jsx`), `src/features/studio/` (`BeatMachine.jsx`, `mesa/Consola.jsx`, `mesa/Publico.jsx`), `src/features/taller/` (`Taller.jsx`, `ParedTaller.jsx`), `src/features/drops/` (`Cartel.jsx`, `Pestanas.jsx`, `Muro.jsx`), `src/features/catalog/DropAviso.jsx`, `src/data/mesa.js`.
- Estilos: `spray.css`, `beat-machine.css`, `taller.css`, `cartel.css`, `muro.css` y, si hace falta, tokens nuevos en `00-tokens.css`.
- Sin cambios en `server/`, en la API, en el almacenamiento ni en dependencias.
- Compatibilidad: los trazos guardados no cambian de formato; los enlaces de beats y el ranking no se tocan.
