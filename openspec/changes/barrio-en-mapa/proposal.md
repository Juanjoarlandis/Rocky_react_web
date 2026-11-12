# Proposal

## Why

El perdido del 404 lleva un mapa en las manos y dice «Te has salido del mapa», pero en la web
no hay ningún mapa. La crew vive repartida por las secciones, y cada cromo dice dónde se le
ve («La Colmena», «Los Drops», «El carrito»…), pero nadie puede ver el barrio entero. Un mapa
dibujado convierte esa geografía en algo que se recorre, y es la idea más original de la lista
del 2026-11-11, inspirada en webs que se pasean como un sitio (KidSuper World).

El usuario pidió pasar a este punto («Y pasa al siguiente punto») y, al empezar la
implementación, dijo que el barrio de la marca es Lacoma: el mapa se titula así.

Después corrigió el alcance: «te he dicho que es Lacoma para que lo bases en su mapa y luego te
digo yo los sitios». La primera versión había dibujado un barrio inventado con las secciones de la
web como sitios. La segunda sigue el plano real de Lacoma, y los sitios son los cuatro del barrio
que él nombró: el callejón, el Bar Mundus, el kebab Todo natural y los bancos del parque de La
Salle, «el banco donde todo esto se ideó». Pidió quedarse «solo [con] estos cuatro».

## What Changes

- **El 404 enseña el mapa, de día.** Bajo «Te has salido del mapa» aparece el barrio, con «Tú
  estás aquí: fuera del mapa, con El Turista y Rocky, que viven en el 404» junto a una
  chincheta en el canto roto.
- **El pie lo abre en cualquier página.** Un botón «El mapa de Lacoma» abre el mismo mapa en un
  diálogo, sin el «tú estás aquí».
- **El dibujo es el plano real de Lacoma.** Sus calles, sus parques y el metro salen de
  OpenStreetMap, simplificados y redibujados con la línea y los tokens de la casa. Van horneados
  en un SVG, sin teselas ni peticiones al abrirlo, y con «© colaboradores de OpenStreetMap»
  debajo.
- **Cuatro sitios, en su punto real:** Los bancos de La Salle, el Bar Mundus, el callejón y el
  kebab. Cada uno es un enlace a una sección de la web y lo dice; enseña la cabeza de un vecino
  y quién vive allí, sacado del «visto en» de su cromo. Ver «Supuestos» para qué abre cada uno.

Prototipo: `docs/design/barrio-en-mapa-preview.html`.

## Capabilities

### New Capabilities

- `mapa-del-barrio`: el mapa de Lacoma sobre su plano real, sus sitios, quién vive en cada uno,
  dónde se enseña (404 de día y diálogo del pie) y cómo se navega desde él.

### Modified Capabilities

Ninguna en `openspec/specs/`, que sigue vacío.

## Fuera de alcance

- **Una página propia (`/mapa`).** Una ruta nueva va en el JavaScript inicial (`shared/routes.mjs`
  y `App.jsx`), al que le quedan 0,07 kB, y toca el servidor de estáticos. Es una decisión de
  presupuesto del usuario, como la migración del router.
- **Sustituir el menú.** El mapa es una entrada más; la navegación de siempre no cambia.
- **El mapa en el 404 de noche.** De noche el 404 esconde la salida bajo la linterna, y un mapa
  de enlaces la delataría. El diálogo del pie sí funciona de noche.
- **Animar el mapa** o moverse por él como en un juego.
- **Más sitios que los cuatro.** La Colmena y el quiosco de la crew dejan de salir como sitios:
  el usuario pidió solo estos cuatro. Sus cromos no salen en el mapa.
- **Textos sobre los negocios reales.** Las tarjetas del Bar Mundus y del kebab dicen su nombre,
  la sección y quién vive allí, nada más.
- **Enlaces muertos del álbum.** Dos cromos dicen que viven en `/product/rockyracing` y
  `/products/agotado`, que con la tienda de pruebas probablemente no existen. Sin comprobar; se
  anota como hallazgo aparte y aquí no se toca. En el mapa esos vecinos van a La Tienda.

## Supuestos

Aprobados por el usuario con el segundo prototipo el 2026-11-11 («Apruebo el mapa», tarea 0.2);
ya son decisiones:

- **Qué abre cada sitio.** Lo decidí yo, con una regla: cada sitio va a la sección cuyos cromos le
  pegan por su oficio y su frase (diseño, D2).
  - Los bancos de La Salle → La Tienda (`/`): allí viven Los Fundadores, «el banco que lo vio
    todo».
  - Bar Mundus → Rocky IA (`/rockyIA`): sus dos vecinos son porteros.
  - El callejón → Los Drops (`/menudrop`).
  - El kebab → El carrito (`/cart`): se pide y se paga, y allí vive El Paquetes.
- **Los nombres de las tarjetas.** «Los bancos de La Salle», «Bar Mundus», «El callejón» y «El
  kebab». El usuario llamó a los bancos de tres maneras.
- **El encuadre.** Unos 1150 × 710 m alrededor de los cuatro sitios, con el metro Lacoma casi en
  medio. OpenStreetMap no tiene un contorno con el nombre de Lacoma.

Siguen de la primera versión:

- **Las fichas y las categorías son parte de La Tienda**, y el 404 es «fuera del mapa».
- **Un vecino con cabeza por sitio** y el resto en texto («Los Fundadores, El Spray y 7 más»),
  para no cargar 25 dibujos.
- **Texto:** «Lacoma» y «Dónde vive cada uno de la crew en Lacoma».

## Impact

- **Código:**
  - `src/features/mapa/` (nuevo): el componente, la tabla de sitios, el diálogo y el plano
    generado (`plano.js`).
  - `shared/lacoma.mjs` (nuevo): el encuadre y la proyección, que comparten la web y el script.
  - `scripts/plano-lacoma.mjs` (nuevo): el generador del plano.
  - `src/styles/components/mapa.css` (nuevo) y el token `--park` en `src/styles/00-tokens.css`.
  - `.prettierignore`: deja fuera `plano.js`, que es código generado.
  - `src/components/NotFound.jsx`.
  - `src/components/Footer.jsx` y `footer.css`.
  - Una pieza común para la cabeza recortada, que hoy está solo en la ficha (`ProductDetail.jsx` y `product-detail.css`).
- **Datos:** un extracto de OpenStreetMap (licencia ODbL), simplificado por un script de
  `scripts/` y guardado como trazos en el código. Lleva la atribución que pide la licencia.
- **Presupuesto:** el mapa no entra en el JavaScript inicial, porque el 404 y el pie ya se
  cargan aparte. El trazado pesa unos 2,6 kB con gzip y el chunk del mapa, 4,9 kB.
  El color de los parques es un token nuevo en el CSS inicial: +0,02 kB, hasta 13,78/15. En
  el JavaScript inicial solo crece la lista de precarga de la ficha, al compartir la cabeza con
  el mapa: pasa de 99,93 a 99,95–99,97/100 kB, según los hashes de cada build (diseño, D3). El mapa descarga
  como mucho cuatro cabezas de unos 13 kB, solo al verlo.
- **Sin rutas, servidor, dependencias ni ficheros de imagen nuevos.**
