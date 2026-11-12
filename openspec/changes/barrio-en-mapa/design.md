# Design

## Context

Ver `proposal.md` (Why). Lo que condiciona el cómo:

- **El presupuesto.**
  - JavaScript inicial: 99,93/100 kB, así que una ruta nueva no cabe.
  - Mayor chunk diferido: 20,97/21 kB (Estudio).
  - Total de imágenes: 8743/8750 kB, y un `.svg` en `dist/` cuenta en ese total.
  - El 404 (`NotFound`) y el pie (`Footer`) ya se cargan aparte (`App.jsx`).
- **Dónde vive cada uno.** Cada cromo de `src/data/crew.js` tiene `vistoEn: { label, to }`. Hay
  tres `to` que no son secciones: `/te-has-perdido` (el 404, a propósito),
  `/product/rockyracing` y `/products/agotado`. Ninguno vive en `/crew` ni en `/mi-crew`.
- **La cabeza recortada.** Hoy está solo en la ficha: el marcado en `ProductDetail.jsx` y el
  recorte (`.detail-firma-cabeza`, foco y ×1,7) en `product-detail.css`. El foco de cada
  muñeco está en `src/data/voces.js`.
- **Los diálogos.** El lightbox usa un `<dialog>` nativo con `showModal()`, que se ocupa del
  foco y de Escape (`Lightbox.jsx`).
- **Lacoma en OpenStreetMap** (consultado el 2026-11-11). No hay un contorno con ese nombre;
  está la estación de metro Lacoma (línea 7, calle de los Riscos de Polanco), entre Peñagrande y
  Mirasierra, en Fuencarral-El Pardo, 28035.
- **Los cuatro sitios**, con su punto y de dónde sale:

  | Sitio | Latitud, longitud | Fuente |
  |---|---|---|
  | Los bancos de La Salle | 40.484200, -3.717077 | Punto del usuario en Google Maps, junto a la estatua de Ernestina Manuel de Villena. En OpenStreetMap cae en el parque de Ana Tutor. |
  | Bar Mundus | 40.4849508, -3.72053 | Nodo de OpenStreetMap 6652751372, «Mundus» (`amenity=cafe`). |
  | El callejón | 40.483911, -3.720633 | Punto del usuario en Google Maps, al este de la calle del Pico Balaitus. |
  | El kebab (Todo natural) | 40.483645, -3.72705 | Dirección del usuario (calle de Ramón Gómez de la Serna, 99): el nodo de dirección 3145903328 de OpenStreetMap. |

  Google Maps solo sirvió para que el usuario señalara los puntos; el dibujo sale entero de
  OpenStreetMap.
- **El encuadre:** latitud de 40.4811 a 40.4875 y longitud de -3.72881 a -3.71531, unos
  1150 × 710 m. Se proyecta en plano (equirectangular local) sobre el `viewBox` de 1000 × 620. El
  metro cae en (423, 231).
- **La consulta a Overpass** de la que sale el trazado está en `scripts/plano-lacoma.mjs`
  (`--consulta`): calles de `motorway` a `living_street`, parques (`leisure=park`) y estaciones,
  en la caja 40.4801,-3.7337,40.4901,-3.7125, algo mayor que el encuadre para que las calles que
  lo cruzan no se corten antes. El encuadre y la proyección viven en `shared/lacoma.mjs`, que
  comparten el script y la web.
- **Las pruebas.**
  - `estabilidad.test.js` exige ancho y alto en todas las imágenes de `NotFound.jsx`.
  - `svgTokens.test.js` revisa una lista de componentes con SVG para que no haya colores
    literales.
  - `NotFound.test.jsx` fija el 404 de día y de noche.

## Goals / Non-Goals

**Goals:**
- El mapa fuera del JavaScript y del CSS iniciales, y ningún fichero de imagen nuevo. Lo único
  que toca el inicial es la lista de precarga de la ficha, por la cabeza compartida (D3).
- Una sola fuente para quién vive dónde (el álbum) y otra para cómo se recorta una cabeza.
- Que alguien de Lacoma reconozca su barrio, con cada sitio en su punto real.
- Que sea navegación accesible: enlaces reales en una lista, dibujo decorativo.

**Non-Goals:**
- Página propia, animación y cambios en el menú (ver la propuesta).

## Decisions

### D1 · El mapa vive en el 404 y en un diálogo del pie, sin ruta
`src/features/mapa/MapaDelBarrio.jsx` es una pieza diferida que importan dos sitios:
- **El 404**, de día, con `tuEstasAqui`.
- **Un diálogo** que abre el botón «El mapa de Lacoma» del pie.

Como el pie y el 404 ya se cargan aparte, el mapa no entra en el JavaScript inicial. En el 404 va
además como pieza propia (`lazyPiece`): importado sin más, su chunk entraba en la lista de precarga
del 404, que vive en el inicial, y lo ponía en 100,00 kB.
- **Alternativas descartadas:**
  - **Una ruta `/mapa`.** No cabe en el JavaScript inicial y toca `static.mjs`; queda como
    decisión del usuario.
  - **Un enlace en la barra.** La barra es inicial.

### D2 · Una tabla cerrada de sitios; los vecinos salen del álbum
`src/features/mapa/lugares.js` define los cuatro sitios del usuario:
- `id`, `nombre` y `to`;
- `seccion`: el nombre de la sección que abre;
- `lat` y `lon`: su punto real, de la tabla de Context;
- `carta`: dónde va el centro de su tarjeta en el dibujo, en unidades del `viewBox`;
- `giro` y `cabeza`: el vecino cuya cabeza sale.

Una función proyecta `lat` y `lon` al dibujo con el encuadre, para que el punto no se mueva nunca;
lo que se coloca a mano es la tarjeta.

**Qué abre cada sitio** (aprobado por el usuario con el segundo prototipo, tarea 0.2). La regla: cada sitio va a la
sección cuyos cromos le pegan por su oficio y su frase. El banco no lo elijo yo, sale del álbum:
Los Fundadores son «el banco que lo vio todo» y viven en `/`.

| Sitio | Abre | Vecinos | Cabeza | Por qué |
|---|---|---|---|---|
| Los bancos de La Salle | La Tienda (`/`) | Los Fundadores, El Spray y 7 más | Los Fundadores | Su cromo es el banco. |
| Bar Mundus | Rocky IA (`/rockyIA`) | El Portero y El Estrella | El Portero | Dos porteros: «Recepción de Rocky IA» y «Portero de la pared». |
| El callejón | Los Drops (`/menudrop`) | El Tumbao, El Ollie y El Dado | El Ollie | La calle, el skate y la suerte del drop. |
| El kebab | El carrito (`/cart`) | El Curioso, El Dormilón y 2 más | El Paquetes | Se pide y se paga; El Paquetes, «Llega. Siempre llega.» |

Se quedan sin sitio La Colmena (5 cromos) y el quiosco del álbum. La Colmena no le pega a
ninguno de los cuatro sitios, y lo que necesita quien se pierde en el 404 es la tienda, los drops,
el chat y el carrito. Quitar la prueba «ningún cromo se queda sin sitio» es un cambio de
especificación que viene de que el usuario quiso solo cuatro sitios; no es una prueba relajada.
La sustituye una que fija que los de una sección sin sitio no salen.

`vecinosDe(crew)` agrupa los cromos por `vistoEn.to` con una tabla de rutas a sitio:
- `/product/*` y `/products/*` van a La Tienda;
- `/te-has-perdido` va a «fuera del mapa»;
- cualquier otra ruta que no sea de un sitio no se pinta.

Los nombres van en el orden del álbum: todos si son tres o menos y, si no, dos y «y N más».
Una prueba fija que ningún enlace del mapa apunta a una ruta que no esté en `APP_ROUTES`.
- **Alternativa descartada:** escribir los vecinos a mano en la tabla. Se desincroniza del
  álbum, que ya dice dónde vive cada uno.

### D3 · Una pieza común para la cabeza recortada
`src/components/CabezaMuneco.jsx` pinta el círculo con el dibujo ampliado hacia su foco, a partir
de la voz de `voces.js`, con el dibujo de noche si toca. Su CSS genérico va en
`src/styles/components/cabeza-muneco.css`.
- **En la ficha:** usa la pieza con su clase de siempre (`detail-firma-cabeza`), así que sus
  pruebas no cambian.
- **En el mapa:** la usa a 44 px.
- **Su precio en el JavaScript inicial: +0,02 a +0,04 kB** (de 99,93 a 99,95–99,97/100; los
  hashes de los nombres comprimen distinto en cada build). La ficha y el mapa
  comparten ahora `voces.js`, la pieza y su CSS, así que Vite los saca a un chunk común
  (`voces-*.js` y `voces-*.css`). Las dos rutas entran en la lista de precarga de la ficha, que
  vive en el inicial. Lo vio la revisión independiente; antes esta decisión decía «nada en el
  inicial».
- **Alternativa descartada:** quitar la entrada del CSS (≈0,02 kB) llevando las reglas a un
  `@import` desde `product-detail.css` y `mapa.css`. La pieza dejaría de traer su propio CSS y
  cada nuevo uso tendría que acordarse de importarlo.

### D4 · El dibujo es el plano de OpenStreetMap, horneado
`scripts/plano-lacoma.mjs` lee un extracto de Overpass (la consulta de Context) y escribe
`src/features/mapa/plano.js`: el trazado en cadenas de `d` para el SVG, por capas.
- **Las capas:** vías anchas (de `tertiary` para arriba), calles, parques y el metro Lacoma.
- **Qué entra:** una vía entra si alguno de sus tramos pisa el dibujo con 40 unidades de margen
  (Liang-Barsky), aunque no tenga ningún vértice dentro. Lo que queda fuera de la hoja lo tapa
  el `clipPath`.
- **La simplificación:** Douglas-Peucker con la distancia al tramo, no a la recta, para que una
  horquilla no se recorte. La tolerancia es de 1,2 unidades (1,5 en los parques) y las
  coordenadas se redondean a enteros. Fuera las calles de menos de 12 unidades y los parques
  cuya caja envolvente mide menos de 900 unidades². Pesa unos 2,6 kB con gzip.
- **Los rótulos** van a mitad del tramo seguido más largo que queda dentro: si la calle sale del
  dibujo y vuelve a entrar, el rótulo no cae en el hueco.
- **El script no corre en el build ni en la web.** Se ejecuta a mano si cambia el encuadre, y su
  salida va al repositorio. El navegador no pide nada a OpenStreetMap.
- **De qué extracto sale `plano.js`:**
  - Viene del extracto de `overpass-api.de` del 2026-11-11 a las 12:17:05 UTC (sha256
    `d31839cceaeaad30ffcf5554e1dc799bc69581acb98214817cbea1781d8bf4e7`). Su consulta pedía
    lo mismo que `--consulta` y además caminos, zonas verdes y edificios, que el script
    descarta.
  - Comprobado: `--consulta` contra el espejo `overpass.kumi.systems` (datos del 2026-06-01,
    sha256 `eabc4a64affe710dc94904dd187e6ffd8067995c8f88f4fa259d4611c283e5f1`) da las mismas
    capas, salvo dos coordenadas que se mueven 1 y 2 unidades. Los extractos no se guardan en
    el repositorio (unos 300 kB); se vuelven a pedir con `--consulta`.

`MapaDelBarrio.jsx` pinta un `<svg aria-hidden="true">` con:
- la hoja con el canto roto (del prototipo aprobado), que recorta el trazado con un `clipPath`;
- los parques, las calles con su borde de tinta y unos pocos rótulos de calle a mano, con el
  nombre corto: Valle de Pinares Llanos, Ramón Gómez de la Serna, Pico Balaitus y Herrera Oria;
- el metro, los cuatro puntos numerados con una guía punteada hacia su tarjeta, y la chincheta
  del 404.

Más detalles:
- **Los colores** son clases que pintan con tokens, sin literales. Los parques piden un verde que
  no existe: un token nuevo, `--park`, con su versión de neón, en `00-tokens.css`. Va al CSS
  inicial y se mide. El fichero sigue en la lista de `svgTokens.test.js`.
- **Por qué dentro del componente.** No es un fichero de imagen, así que no cuenta en el total
  de imágenes, y va en el chunk diferido del mapa.
- **Alternativa descartada:** teselas o un mapa interactivo (Leaflet, MapLibre). Piden red y una
  dependencia, y no se parecen a la casa.

### D5 · Navegación: enlaces sobre el dibujo y lista en el móvil
- **El marcado.** Los sitios son `<a>` de React Router dentro de `<nav aria-label="El mapa de
  Lacoma"><ul>`. La tarjeta va encima del dibujo, con su centro en `carta` (`--x` y `--y`), y
  dice el sitio, la sección que abre y los vecinos. El punto real queda en el dibujo, unido a la
  tarjeta por una guía. El Bar Mundus y el callejón están a unos 115 m en la misma vertical: si
  dos tarjetas chocan, se mueve la tarjeta y nunca el punto.
- **La tarjeta no se encoge cerca del borde.** Con `width: max-content` mide lo mismo en todo el
  dibujo. Sin eso, la de Los bancos se estrechaba al acercarse al canto derecho.
- **En el móvil**, hasta 900 px, el dibujo va arriba en el flujo, con los puntos y el metro al
  doble de tamaño y sin guías ni rótulos. La lista va debajo, con el número de cada punto, en dos
  columnas si caben (mínimo de 260 px por columna) y en una si no. El corte es el de 900 px y no
  el de 640, porque los rótulos no se encogen con el dibujo.
- **Medido en el prototipo:** sin tarjetas pisadas, ninguna fuera del dibujo y sin scroll
  horizontal a 1440, 1000, 901, 768 y 375 px, de día y de noche.
- **El hover.** El que mueve va bajo `(hover: hover)`, como exige `hover-tactil.test.js`.
- **Las clases** llevan el prefijo `mapa-`, que hoy no usa nadie (comprobado con grep).

### D6 · El diálogo del pie
- **El botón.** «El mapa de Lacoma» va en el pie, junto a los enlaces legales. Al pulsarlo carga
  la pieza (`lazyPiece`) y la abre en un `<dialog>` con `showModal()`, como el lightbox. El
  diálogo tiene un botón «Cerrar el mapa».
- **El foco.** Escape y ese botón lo cierran, y el foco vuelve al botón del pie. El pie le pasa
  el botón por ref (`vuelveA`) en vez de leer `document.activeElement` al abrir, porque Safari no
  enfoca un botón al pulsarlo con el ratón.
- **Navegar desde él.** Pulsar un sitio cierra el diálogo y navega sin devolver el foco al pie,
  que queda fuera de la vista en la página nueva. Con Ctrl, ⌘, Mayús o Alt el navegador abre el
  sitio aparte y el diálogo sigue abierto.
- **Por qué no un hook común con el lightbox.** Comparten cuatro líneas: `showModal()` y el
  primer foco. El foco de vuelta ya no es el mismo, y extraerlo tocaría `Lightbox.jsx`, que está
  fuera de este cambio. El lightbox tiene el mismo problema con Safari: queda como deuda aparte.
  Pinchar el fondo no cierra el mapa, porque la especificación pide el botón y Escape.
- **De noche** se ve con los tokens de neón.

### D7 · De noche, el 404 sin mapa
En el 404 de noche el juego es encontrar la salida con la linterna, y un mapa de enlaces lo
estropea: `NotFound` solo pinta el mapa si no es de noche, como hace con el tachón.

### D9 · La atribución de OpenStreetMap
La licencia ODbL pide citar la fuente en lo que se hace con sus datos. Bajo el dibujo, en el 404
y en el diálogo, va «Plano: © colaboradores de OpenStreetMap», con un enlace a
`https://www.openstreetmap.org/copyright`. Va en HTML y no dentro del SVG, para que se lea en el
móvil y no quede tapada por las tarjetas.

### D8 · El lema es el mismo en el 404
El prototipo aprobado añadía en el 404 «Tú, ahora mismo, fuera del mapa.» al lema. No se pone:
la nota «Tú estás aquí: fuera del mapa, con El Turista y Rocky…» ya lo dice bajo el dibujo, y
la especificación fija un solo lema.

## Risks / Trade-offs

- **[Riesgo] Margen del JavaScript inicial** → queda en 99,95–99,97/100 kB (D3). El próximo cambio que
  lo toque tendrá que hacer sitio antes.
- **[Riesgo] Salto de maquetación al llegar el mapa al 404** → medido el 2026-11-11 en Chrome sin
  ventana, con carga en frío y 150 ms de latencia: CLS de 0,0001 a 1440, 1000, 768 y 375 px, sin
  ninguna entrada del mapa ni del pie. El pie espera al catálogo (`App.jsx`) y llega después del
  mapa. Al navegar dentro de la web, el salto cae dentro de los 500 ms del clic, que el CLS no
  cuenta. No se reserva hueco. Si un día el pie llegara antes, la cinta bajaría en las
  pantallas de más de 900 px de alto.
- **[Deuda] Si el chunk del mapa no llega, el botón del pie no hace nada** → `React.lazy` guarda
  el fallo, como en el resto de piezas opcionales, lightbox incluido. Arreglarlo pide que
  `lazyPiece` pueda reintentar, fuera de este cambio.

- **[Riesgo] El mapa pesa en el 404** → como mucho cuatro cabezas de unos 13 kB con
  `loading="lazy"`, solo al bajar hasta él, más el trazado (unos 2,5 kB con gzip) en el chunk del
  mapa.
- **[Riesgo] OpenStreetMap cambia** → el trazado es una foto del 2026-11-11. Si el barrio cambia,
  se vuelve a ejecutar el script; nada se rompe mientras tanto.
- **[Riesgo] Negocios reales en la web** → el Bar Mundus y el kebab salen con su nombre, como los
  nombró el usuario, sin textos sobre ellos.
- **[Riesgo] El chunk del mapa o el del pie crecen** → `crew.js` lo comparten la Crew y el mapa.
  Vite lo separa en su propio chunk; se mide con `budget:check` frente a los 21 kB del mayor
  diferido.
- **[Riesgo] Un cromo nuevo con un `vistoEn` raro** → no se pinta si su ruta no es de un sitio ni
  si le falta el `vistoEn` (los vecinos se calculan al cargar el módulo, y un fallo ahí tumbaría
  el mapa). La prueba de D2 avisa si un enlace apunta fuera de `APP_ROUTES`, y la de los cromos sin
  sitio fija cuáles se quedan fuera.
- **[Compromiso] Sin URL propia** → no se puede enlazar el mapa desde fuera; queda para cuando
  haya margen en el JavaScript inicial.

## Migration Plan

Sin datos ni API. Se publica como cualquier release del cliente; `npm run release:revertir`
vuelve atrás.
