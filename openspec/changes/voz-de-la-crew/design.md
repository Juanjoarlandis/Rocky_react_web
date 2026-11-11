# Design

## Context

Ver `proposal.md` (Why). Lo que condiciona el cómo:

- **Lo que llega a la ficha.** La ficha recibe `description` de la Storefront API de Shopify (`server/integrations/shopify/storefront.mjs:9`): texto sin HTML que, según la documentación de Shopify, llega en una sola línea. El Taller guarda la descripción como HTML (`descriptionToHtml` en `server/services/drops/taller.mjs:26`), con párrafos y saltos, hasta 1000 caracteres (`server/http/routes/taller.mjs:110`). Los saltos no llegan a la ficha y no se puede contar con un espacio antes de la raya.
- **La regla del teaser.** Un drop anunciado no publica nombres ni textos de sus diseños (`sistema-de-drops/specs/catalogo-vivo/spec.md:32-39`), así que nada que diga qué muñeco es de qué producto puede viajar en el cliente antes del drop.
- **El presupuesto.**
  - JavaScript inicial: 99,89/100 kB. La ficha (`ProductDetail`) es una pieza diferida (`App.jsx:28`).
  - Mayor chunk diferido: 20,97/21 kB (Estudio).
  - Total de imágenes: 8743/8750 kB.
- **La crew.** El álbum (`src/data/crew.js`) tiene 25 miembros con su `nombre` y su dibujo; de noche, 17 cambian de nombre (`src/features/night/nightCrew.js`). Hay cuatro recortes de cabeza (`src/data/crewAvatarImages.js`). El resto son dibujos de cuerpo entero con la cabeza al 35-40 % del alto (canon de `prompts-munecos/README.md`), y 23 tienen variante de 320 px.
- **El momento del añadido.** La ficha ya marca el añadido con `.detail-grid:has(.btn--added)`, que dura 1,2 s y estampa la pegatina del impacto (`product-media.css`, punto de mira).

## Goals / Non-Goals

**Goals:**
- Que firmar un producto sea solo escribirlo en El Taller, sin campos ni configuración nueva en Shopify.
- No tocar el JavaScript ni el CSS iniciales; todo en la ficha y en El Taller, que se cargan aparte.
- No añadir imágenes.

**Non-Goals:**
- Escribir el copy definitivo de cada producto (es una tarea de contenido, con el sí del usuario).
- Onomatopeyas fuera de la ficha.

## Decisions

### D1 · La firma va en el texto y se reconoce contra la lista cerrada de la crew
Una función pura `leerFirma(description, nombres)` busca al final del texto (los últimos 200
caracteres) una o varias rayas seguidas del nombre exacto de un miembro de la crew. Devuelve
`{ texto, firma }`, con el texto ya sin la firma, o el texto tal cual llega y `firma: null`.
- **Rayas.** Valen —, –, ― y −, con o sin espacios y pegadas a una letra. El guion corto (-)
  solo firma detrás de un final de frase (. ! ? … » " ), porque es el que aparece en nombres de
  producto («ROCKY 035 - Rocky», «anti-Rocky»), y Rocky es también la marca.
- **Tolerancias.** Un punto tras el nombre, tildes descompuestas (NFC), espacios duros o dobles
  y caracteres invisibles: cosas que se cuelan al escribir o pegar en El Taller.
- **Coste.** La expresión se compila una vez por lista y solo mira la cola del texto; con
  20 000 rayas tardaba ~460 ms al cuadrado y ahora menos de 2 ms (revisión de Fable).
- **Alternativas descartadas:**
  - **Un metacampo `rocky.voz` por producto.** Pide cambiar la consulta del catálogo, el modelo y la validación de El Taller y, en la tienda real, una definición de metacampo, que es configuración externa. Es lo correcto si algún día la firma necesita más datos que el nombre.
  - **Una tabla «producto → muñeco» en el cliente.** Rompe la regla del teaser y obliga a desplegar para firmar.
  - **Detectar la firma por el salto de línea.** Shopify lo quita.

### D2 · Las voces viven en un módulo propio, comprobado contra el álbum
`src/data/voces.js` tiene, por cada miembro de la crew, su nombre (el de `crew.js`), su dibujo
(el mismo import que el álbum) y su grito.
- **Por qué no se importa `crew.js`.** Trae los 25 cromos con estadísticas y expedientes, y engordaría el chunk de la ficha sin necesidad.
- **Que no se desincronice.** Una prueba exige que cada nombre de `crew.js` tenga su voz y que cada voz sea de un miembro del álbum.
- **Los gritos**, uno por muñeco y de una o dos palabras, son decisión de producto escrita aquí y revisable: El Paquetes «¡UPA!», Rocky «¡GUAU!», El Tele «¡ZZZT!», La Cruiser «¡FIUUU!», El Bombilla «¡CLIC!», El Ollie «¡POP!», El Freeze «¡ZAS!», El Spray «¡PSSST!», El Lata «¡CLAC CLAC!», El Recadero «¡QUE VUELA!», El Paparazzi «¡FLASH!», El Curioso «¿EIN?», El Dormilón «ZZZ», El Nube «¡PLIC!», El Estrella «¡TACHÁN!», El Diana «¡PUM!», El Productor «¡BOOM!», El Colgao «¡UF!», El Turista «¿Y ESTO?», El Vigía «¡ALTO!», El Portero «¡PASA!», El Dado «¡SEIS!», El Luna «¡UUUH!», El Tumbao «MEH» y Los Fundadores «¡EOOO!».

### D3 · La cabeza es un recorte ampliado por CSS del dibujo pequeño
La firma pinta el dibujo con `artSources(img, 100)`, que elige la variante de 320 px, dentro
de un círculo de 56 px con `overflow: hidden`. La imagen va con `object-fit: cover` y ampliada
×1,7 hacia `--foco` (`object-position` y `transform-origin`). Por defecto el foco es arriba en
el centro, porque la cabeza ocupa el 35-40 % de arriba.
- **El foco de cada uno.** Donde la cabeza no está ahí (tumbados, de lado, colgados), la voz
  trae su `foco`. Se ajustaron los 25 mirando los recortes juntos en una rejilla.
- **Fondo oscuro.** Los Fundadores usan el dibujo del pie, en línea blanca, y llevan
  `oscuro: true`: el círculo va sobre `--ink-block`.
- **El Tumbao y Los Fundadores** no tienen variante de 320 px y usan su dibujo de siempre, que
  solo se descarga en su ficha.
- **De noche**, el dibujo pasa por `useNightArtResolver` como en la Estampida. El nombre sigue
  siendo el de día, porque es el autor del texto.
- **Alternativas descartadas:**
  - Recortar 25 cabezas nuevas: choca con el total de imágenes y con la regla de que solo
    sube por variantes que ahorran descarga.
  - Un recorte fijo arriba en el centro, sin ampliar (el primer intento): en los dibujos casi
    cuadrados, como El Paquetes, enseñaba el muñeco entero en pequeño y no su cabeza.

### D4 · El grito vive en la ventana del «Añadido ✓»
La ficha firmada pinta siempre el grito en un `<span aria-hidden>` sobre la foto, junto a la
pegatina del impacto, oculto.
- **Cuándo se ve.** `.detail-grid:has(.btn--added) .detail-grito` lo enseña, así que aparece y se va con el botón sin estado nuevo en React. Un añadido fallido no pone `btn--added` y no hay grito.
- **Movimiento.** Con `prefers-reduced-motion: no-preference` salta con un pequeño giro; con movimiento reducido solo aparece.
- **Dónde.** Va en `product-detail.css`, que se carga con la ficha.
- **Alternativa descartada:** un estado en `AddToCartButton`. Toca un componente del catálogo, que es JavaScript inicial, y duplicaría la ventana de 1,2 s que ya existe.

### D5 · La ayuda de El Taller es una línea bajo el campo
`DisenosEditor` añade bajo la descripción un texto de ayuda enlazado con `aria-describedby`.
Dice: «Para que la firme un muñeco, termina con «— El Paquetes» (un nombre de la crew).»

### D6 · Reglas de la voz (para escribir el copy)
- **Son muñequitos, y lo saben.** El chiste sale de ser un dibujo estampado en el pecho de alguien («me he mudado a tu pecho», «no la suelto ni en la lavadora») y de la manía de cada uno en su cromo: El Tumbao no se levanta, El Curioso cotillea, El Dormilón se duerme a mitad de frase. Cada voz tiene que sonar a su muñeco y a ningún otro, y hacer gracia (indicación del usuario del 2026-11-11).
- **Habla el muñeco del estampado**, en primera persona, con opinión y sin vender.
- **Nada de datos del producto** (tejido, tallas, envío, cuidados, precio, stock): no se inventan, y si hacen falta van en las especificaciones.
- **Nunca se hace pasar por un cliente.**
- **Ochenta palabras como mucho**, para que la ficha no empuje la compra bajo el pliegue.

## Risks / Trade-offs

- **[Riesgo] Una descripción de la tienda real que acabe por casualidad en «- Rocky»** → se firmaría. La coincidencia tiene que ser exacta y al final del texto, así que el riesgo es bajo; se revisan las descripciones de la tienda real antes de publicar.
- **[Riesgo] Shopify cambia cómo aplana el texto** → la detección no depende de espacios ni de saltos, solo del final.
- **[Compromiso] La firma es una convención y no un dato** → si se escribe mal el nombre, no firma (falla hacia «como hoy»). La línea de ayuda de El Taller lo reduce.
- **[Riesgo] El chunk de la ficha crece** → `voces.js` son 25 entradas cortas con URLs; se mide con `npm run build` y `npm run budget:check`.

## Migration Plan

Sin datos ni API. Las descripciones existentes no cambian de comportamiento. Para firmar un
producto se edita su descripción en El Taller; para quitar la firma, se borra la última línea.
