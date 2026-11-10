# Design

## Context

Ver `proposal.md` para el porqué. Lo que condiciona el diseño:

- La pared es un `<canvas>` detrás del contenido (`z-index: -1`): lo pintado bajo una tarjeta no se ve. Las firmas se colocan en `paint.js` (`cajasPorFirma` une todos los trazos de un autor; `posicionesDeFirmas` pone el texto en `maxX − NOZZLE` creciendo a la derecha).
- La barra del spray es un `flex` con `width: max-content` y tres hijos a `flex-basis: 100%`; el ancho «máximo» de un flex que envuelve es la suma de todos sus hijos, de ahí los 1365 px.
- La mesa es una rejilla CSS de seis filas desde 1200 px (`beat-machine.css`); mide 95 + 84 + 31 + 439 + 289 + 73 más huecos y relleno: 1119 px.
- `beat-machine.css` no tiene una sola regla de modo neón; todo el ámbar sale de `--gold` y `--gold-rgb`.
- Stylelint prohíbe colores literales fuera de `00-tokens.css` y especificidad por encima de 0,3,0.
- El público recibe ya `pattern`, `mutes`, `solos` y `playing`; `pistasQueSuenan` dice quién suena.
- jsdom no pinta: lo visual se comprueba con capturas y medidas en navegador real (Playwright, fuera del repo, como en los dos cambios anteriores).

## Goals / Non-Goals

**Goals:**
- Arreglar los fallos sin cambiar formatos guardados ni la API.
- Que cada mejora de arte salga de CSS y de los muñecos, fuentes y tokens que ya hay.
- Mantener intactos teclado, lector de pantalla y movimiento reducido.

**Non-Goals:**
- Tocar el servidor, la moderación o los límites de la pared.
- Tipografías, imágenes o dependencias nuevas.
- Encajar la mesa en ventanas de menos de 880 px de alto.
- Evitar que una firma caiga bajo una tarjeta en todos los casos (haría falta leer el DOM en cada repintado): se reduce colocándola bajo lo pintado, que es pared visible para quien pintó.
- Rediseñar el cartel o el muro: solo se añaden la nota, el resguardo y los restos.

## Decisions

### D1. Pintadas: agrupar los trazos de una firma por cercanía
`paint.js` gana `pintadas(strokes, centerX)`: recorre los trazos en orden y une cada uno a la pintada de su misma firma cuya caja (con el aire del chorro) quede a menos de `HUECO_PINTADA = 48` px; si une dos pintadas, se funden. Cada pintada guarda caja, firma, color del último trazo y orden del último trazo. `posicionesDeFirmas` y `firmaEn` pasan a trabajar sobre pintadas.
- *Alternativa descartada*: una firma por trazo — llena la pared de rótulos al pintar letras.
- *Alternativa descartada*: rotular solo la pintada más reciente de cada autor — las demás quedarían sin firma y no se podrían señalar con claridad.
- Coste: O(trazos × pintadas del mismo autor). Se acota como hoy: solo se rotulan las 150 pintadas más recientes y la agrupación compara cajas, no puntos.

### D2. La firma, bajo la pintada y hacia dentro
`posicionesDeFirmas` devuelve una lista `{ firma, x, y, c, ancho }` donde `x` es el **borde derecho** del texto: `min(maxX − NOZZLE, ancho de página − MARGEN)`, y nunca menos que `MARGEN + ancho`. `y = maxY − NOZZLE`, con la bajada de línea que ya existe (ahora compara cajas alineadas a la derecha). Recibe el ancho de la página como tercer argumento.
- La forma del resultado cambia de `Map` a lista porque una firma puede repetirse. Solo la usa `Spray.jsx`.

### D3. La mano de la firma
`manoDe(firma)` deriva del texto (hash) una inclinación entre −8° y 8° y un remate de tres (subrayado en onda, flecha, estrella). `drawTag` traslada al ancla, gira, escribe alineado a la derecha y dibuja el remate con trazo del mismo color. Sin tipografía nueva.

### D4. Destacar una firma: atenuar el lienzo y repintar encima
Con una firma destacada, `redraw` pinta todo, baja la opacidad de lo pintado con `globalCompositeOperation = 'destination-out'` y vuelve a pintar encima los trazos de esa firma. No hace falta un segundo lienzo del tamaño de la página (que en iOS no cabría). En El Taller, `VistaPrevia` recibe la firma destacada y hace lo mismo sobre su lienzo de 640×360.
- El estado vive en `Spray.jsx` (`resaltada`) y lo cambian `onPointerEnter/Leave` y `onFocus/Blur` de cada fila de la lista.

### D5. La barra del spray: una columna
`.spray-tools` pasa a `flex` en columna con las herramientas en una fila interior (`.spray-fila`, nuevo contenedor en el JSX) y el aviso, la confirmación y la lista como filas propias. `width: fit-content`, `max-width: min(720px, 100vw − 2·--space-4)`, centrada con `inset-inline: 0` y márgenes automáticos (con `left: 50%` el ancho disponible era media ventana). El aviso y la lista no cuentan para el ancho (`inline-size: 0; min-inline-size: 100%`) y se parten dentro del que marcan las herramientas. En móvil la barra tiene `max-block-size: 33dvh` y la lista se queda con lo que sobra; con menos de 480 px de alto (apaisado) la ayuda fija se oculta y la lista es una fila.

### D6. Botes en lugar de puntos
Cada opción del `radiogroup` sigue siendo un `<button role="radio">` con su `aria-label`; dentro lleva un SVG en línea de un bote (tapa, boquilla, cuerpo y etiqueta) que toma `--spray-color`. El elegido sube 6 px y enseña una nube de pintura. El traqueteo es `spray/rattle.js`: tres ráfagas cortas de ruido filtrado con Web Audio, ganancia baja, todo dentro de `try/catch`.
- *Por qué no `triggerVoice('shaker')`*: exige crear el motor de la mesa (ocho buses y analizadores) y arrastra `voices.js` al trozo del modo neón; una ráfaga de ruido son veinte líneas.

### D7. La mesa en una pantalla: la consola bajo la rejilla
Desde 1200 px:
```
cabecera    cabecera
transporte  transporte
ritmos      pads
rejilla     pads
consola     pads
pie         pie
```
La columna izquierda (3fr) apila ritmos, rejilla y consola; los pads (2fr) ocupan las tres filas y su rejilla 4×4 se estira (`grid-auto-rows: 1fr`, sin `aspect-ratio`). Se compactan cabecera (vúmetro de 10 segmentos más bajos), transporte (play de 44 px), consola (≈164 px) y pie. Objetivo medido: ≤ 800 px de alto a 1440 de ancho.
- *Alternativa descartada*: mover los ritmos al transporte — no cabe a 1200 px sin envolver.
- *Alternativa descartada*: escalar toda la mesa con `zoom`/`transform` — emborrona el texto y rompe los objetivos táctiles.
- La consola en 670 px da 74 px por canal: deja de verse vacía sin tocar su marcado.

### D8. Consola de máquina con el `range` nativo
Se mantiene `<input type="range">` (teclado y lector intactos) con `appearance: none`: ranura en `::-webkit-slider-runnable-track` / `::-moz-range-track` y capuchón rectangular en `::-webkit-slider-thumb` / `::-moz-range-thumb`, con medidas en propiedades lógicas para que el respaldo en horizontal siga valiendo. La escala es un fondo de rayas en el canal; el vúmetro pasa a segmentos con una máscara de rayas sobre la barra que ya mueve `--nivel`. El nombre va en una tira `--tape` con la letra de mano y un giro fijo por canal. `TRACKS` gana `cinta` (nombre corto legible: «Bombo», «Hat ab.»).

### D9. Neón de la mesa: reapuntar el ámbar
`[data-theme='neon'] .mesa-wrap` redefine `--gold` y `--gold-rgb` a `--uv-violet-soft` / `--uv-violet-soft-rgb` (token nuevo). Va en `.mesa-wrap` y no en `.mesa` para que alcance también al público y a su foco. Todo lo que era ámbar pasa a violeta sin tocar cada regla; se añaden sombras de luz a pasos encendidos, cursor, pantalla y capuchones. El contraste del texto de la pantalla sobre `--mesa-panel-lo` se comprueba con el violeta suave.
- *Alternativa descartada*: reglas neón por componente — veinte selectores duplicados y fáciles de olvidar.

### D10. Reacciones del público: una función pura y clases de estado
`estadosDelPublico(pattern, { mutes, solos, playing })` en `audio/drumKit.js` devuelve por pista `'baila' | 'duerme' | 'sentado'` y si va en solo, más `lleno` (las ocho suenan). `Publico` pinta `is-bailando`, `is-dormido`, `is-solo`; `BeatMachine` pone `is-lleno` a El Freeze. Las zetas y el foco son pseudo-elementos, así que cada personaje pasa a ir en un `<span>` contenedor. El escalonado es CSS por posición. Movimiento reducido: sin animaciones; el dormido se distingue por la opacidad y la cabeza caída, y El Freeze con las ocho, por otra postura (girado y algo más grande).

### D11. El Taller
Las secciones usan `btn btn--sm` con `btn--primary` para la activa (clases globales). `.taller-subtitulo` y el título de cada pared ganan `text-transform: uppercase`.

### D12. Cartel: fecha única, nota y resguardo
- En `cabecera` no se pinta `.cartel-cuando`: la fecha la dice `AddToCalendar`, junto a sus botones.
- `Pestanas` pinta una nota («arranca una», con flecha) en el primer hueco de la tira, que ya es `aria-hidden`, mientras `arrancadas` esté vacío: ahí no pisa texto a ningún ancho.
- La nota va **fuera** de la hoja (que lleva un filtro de sombra y le doblaría las letras), posicionada sobre el primer hueco con el ancho del hueco menos 10 px, en dos líneas.
- Al arrancar, dentro de `.pestanas-aviso` aparece el resguardo: la misma pestaña, en vertical como en la tira, con el borde de arriba rasgado. `DropAviso` gana `onApuntado`, que llama al pasar a `listo` (también si ya lo estaba al montarse); `Pestanas` guarda `apuntado` y pinta el sello.

### D13. Restos del muro
`Muro` añade dentro de `.muro-pared` una capa `aria-hidden` (`.muro-restos`) con nueve piezas posicionadas en porcentajes y `z-index: 0`: tres jirones (papel con `clip-path` rasgado y media palabra), el «fantasma» de un cartel arrancado (su marca y cuatro esquinas de papel), tres tags a rotulador, una pegatina redonda dibujada con CSS (las pegatinas SVG que ya había llevan `role="img"` y aquí no debe haber roles) y un trozo de cinta. Los carteles ya van con `z-index ≥ 1`, así que los restos solo asoman en los huecos. La capa recorta lo suyo (`overflow: hidden`), así no ensancha la página ni toca el desborde de los carteles. El cartel archivado no se toca: ya sale rasgado y en gris (ver la corrección en `proposal.md`).

## Risks / Trade-offs

- **Reescribir pruebas de la colocación antigua** → se hace con el requisito nuevo delante (RED primero) y se lista en el informe qué pruebas cambiaron y por qué.
- **`appearance: none` en un `range` vertical** varía entre navegadores → se conserva el respaldo en horizontal y se comprueba en Chrome; Firefox y Safari quedan como comprobación manual pendiente.
- **Reapuntar `--gold` en neón** afecta a todo lo que herede dentro de `.mesa` (incluida la barra de publicar) → se revisa en captura que nada pierda contraste.
- **Una firma puede caer aún bajo una tarjeta** si se pinta pegado a ella → asumido (ver Non-Goals).
- **La mesa no cabe en ventanas de menos de 880 px de alto** → se desplaza como hoy.
- **Más rótulos en la pared** (uno por pintada) → acotado a 150 y a ocho bajadas de línea, como antes.
- **Sonido inesperado** → traqueteo corto y bajo, solo con gesto del usuario y solo al cambiar de bote.

## Tras la revisión independiente

- **D2/D3**: la línea de firma sube a 26 px (cabe el remate) y las firmas reservan 16 px a su izquierda para la estrella; el remate se ajusta al ancho medido del texto. Las posiciones se calculan una vez con la pared entera y al destacar se repinta la firma donde estaba.
- **D4**: cursor y foco se llevan por separado; cuenta el cursor que se mueve (no el que se queda quieto bajo una lista que se abre) y con 80 ms de espera para no repintar la pared en cada fila. Solo se destaca una firma que siga en la pared.
- **D7/D8**: el carril del fader baja a 82 px y los huecos entre filas a 8 px (la mesa mide 798 px en Chrome); el fader lleva `min-width: 0` para no heredar el ancho mínimo de los mandos del transporte.
- **Deuda anotada**: el hash de texto está ya en tres sitios (`manoDe`, `giroDe`, `tornVariant`): pide una utilidad común en un cambio aparte.

## Migration Plan

Solo cliente. Se publica como cualquier release; volver atrás es `npm run release:revertir`. No hay datos que migrar.

## Open Questions

Ninguna que cambie lo que se construye. Para el usuario, al ver el resultado: si los nombres de las cintas («Hat ab.») y el remate de las firmas le encajan.
