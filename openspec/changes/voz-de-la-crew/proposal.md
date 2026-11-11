# Proposal

## Why

Cada camiseta lleva estampado un muñeco de la crew (El Paquetes en «Ya llegó», Rocky en
«Buen chico», El Tele en «Nada en la tele»…), pero la ficha lo cuenta con una frase de
catálogo y nadie habla. La referencia es Palace: sus descripciones de producto no venden el
producto, tienen opinión y acabaron siendo un libro. Es la forma más barata de identidad
que queda: casi todo es texto, y la crew ya tiene nombre, oficio y frase en el álbum.

El usuario eligió esta idea («Sí, prepáralo») de la lista del 2026-11-11, junto con las
onomatopeyas de cómic.

## What Changes

- **La ficha la firma un muñeco.** Si la descripción de un producto acaba en
  «— <nombre de la crew>» (por ejemplo «— El Paquetes»), la ficha enseña el texto sin esa
  línea y, debajo, la firma: la cabeza del muñeco y «El Paquetes, de la crew».
- **Su onomatopeya al añadir.** En esa ficha, al añadir al carrito salta el grito de ese
  muñeco («¡UPA!» en El Paquetes, «¡GUAU!» en Rocky), en letra de la casa y junto a la
  pegatina del impacto, durante el «Añadido ✓».
- **Sin firma, todo como hoy.** Un producto sin firma, o firmado con un nombre que no es de la
  crew, se ve exactamente igual que ahora. La tienda real no tiene que cambiar nada para
  seguir funcionando.
- **El Taller lo explica.** Bajo el campo de descripción de un diseño, una línea de ayuda dice
  cómo firmar.

## Muestras para el tono

Son las tres primeras, para que el usuario decida si la voz le encaja antes de escribir el
resto. No dan datos del producto (tejido, tallas, envío, cuidados): eso no se inventa y, si
algún día hace falta, va en las especificaciones de la ficha.

- **Ya llegó**: «Me estamparon abrazando una caja y no la suelto ni en la lavadora. Dentro
  no hay nada: el paquete eres tú. — El Paquetes»
- **Buen chico**: «Soy el jefe y me han puesto en una camiseta que se llama "Buen chico". Lo
  estoy hablando con mi abogado. Mientras tanto, guau. — Rocky»
- **Nada en la tele**: «Mil canales y en ninguno echan nada. Por eso me he mudado a tu
  pecho: aquí por lo menos me mira alguien. Si me ves con rayas, dame un golpe en el
  lateral. — El Tele»

El usuario aprobó el tono el 2026-11-11 y añadió: «son muñequitos, deben ser voces originales
y graciosas». Las muestras de arriba ya están reescritas con esa indicación: el chiste sale de
ser un muñeco estampado en una camiseta y de la manía de cada uno en su cromo.

## Capabilities

### New Capabilities

- `voz-de-la-crew`: cómo firma un muñeco la ficha de un producto, su onomatopeya al añadir y
  cómo se escribe la firma desde El Taller.

### Modified Capabilities

Ninguna. `openspec/specs/` sigue vacío.

## Fuera de alcance

- **Escribir las descripciones en Shopify.** Las muestras viven aquí. Cuando el usuario
  apruebe el tono, se escriben en El Taller, primero en la tienda de pruebas. Escribir en
  una tienda es una acción externa que pide su sí.
- **Onomatopeyas en las tarjetas del catálogo.** La tarjeta no sabe qué muñeco firma sin
  meter la lista de la crew en el JavaScript inicial, que tiene 0,11 kB de margen.
- **Cabezas nuevas.** Solo hay cuatro recortes de cabeza y el total de imágenes está a 7 kB de
  su límite. La cabeza de la firma es un recorte por CSS del dibujo que ya existe (ver
  `design.md`).
- **Cambiar el nombre de noche.** De noche firma el mismo muñeco, con su dibujo de noche como
  en todo el sitio, pero con el nombre de día, porque es quien escribió el texto.
- **Un campo propio en Shopify (metacampo) para el autor.** Se descarta en `design.md`.

## Supuestos

- **La firma es una convención del texto**, no un dato aparte: quien escribe en El Taller
  termina la descripción con «— Nombre». Se detecta contra la lista cerrada de nombres de la
  crew, así que un «— Juan» de un cliente o una errata no firman nada.
- **No es una reseña.** La firma dice «de la crew» y va con el dibujo del muñeco. Nada en la
  ficha la presenta como opinión de un cliente.
- **Rocky IA no cambia.** La descripción solo le sirve para puntuar la búsqueda
  (`server/services/chat/commerce.mjs:291`) y el modelo no la recibe.

## Impact

- **Código:**
  - `src/features/catalog/ProductDetail.jsx` y `src/styles/pages/product-detail.css` (pieza diferida).
  - Un módulo nuevo `src/data/voces.js`, con el nombre, el dibujo pequeño y el grito de cada muñeco.
  - Una función para leer la firma.
  - La línea de ayuda en `src/features/taller/DisenosEditor.jsx`.
- **Presupuesto:** nada en el JavaScript ni en el CSS iniciales. La ficha se carga aparte;
  hay que vigilar su chunk frente al límite de 21 kB del mayor diferido.
- **Sin cambios en el servidor, en la API ni en Shopify, sin dependencias y sin imágenes
  nuevas.**
