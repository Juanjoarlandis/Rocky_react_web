# Spec Delta

## Purpose

Que cada foto, ilustración, animación, pista de audio y vídeo de la web se descargue al
tamaño al que se pinta y solo cuando hace falta, para que el peso de cada página y la
memoria del navegador no dependan de cómo se guardó el original.

## ADDED Requirements

### Requirement: Las fotos de producto se descargan al tamaño al que se pintan
Toda foto de producto SHALL ofrecer variantes de 320, 640 y 1.280 px de ancho (sin
superar el ancho del original), y el navegador SHALL descargar una cuyos píxeles no
superen cuatro veces los que ocupa en pantalla, contada la densidad del dispositivo.

#### Scenario: Tarjeta del catálogo en un móvil
- **WHEN** se abre la portada en una pantalla de 375 px de ancho y densidad 2
- **THEN** cada tarjeta descarga la variante de 320 px, no el original

#### Scenario: Ficha en escritorio
- **WHEN** se abre una ficha en una pantalla de 1440 px de ancho y densidad 1
- **THEN** la foto principal descarga la variante de 640 px

#### Scenario: Lightbox
- **WHEN** se amplía una foto en esa misma pantalla
- **THEN** descarga como mucho la variante de 1.280 px

#### Scenario: Miniaturas
- **WHEN** se pinta una foto a menos de 100 px (carrito, miniaturas del cartel, Taller)
- **THEN** descarga la variante de 320 px

#### Scenario: Foto sin variantes
- **WHEN** una foto solo tiene su URL original
- **THEN** se pinta con ella, sin error

### Requirement: Ninguna foto de producto del repo supera 1.280 px de lado
Las fotos de `public/products/` SHALL medir 1.280 px de lado como máximo, y cada una
SHALL tener sus variantes generadas con la herramienta de imágenes del proyecto.

#### Scenario: Las dos fotos grandes
- **WHEN** se construye la web
- **THEN** `rocky35-camel` y `rockydz-boyz` miden 1.280 px o menos y el guardián de presupuesto ya no las lleva como excepción

#### Scenario: Memoria al recorrer la portada
- **WHEN** se recorre la portada entera en un móvil
- **THEN** las imágenes decodificadas suman 40 MB como máximo

### Requirement: En modo Shopify la API informa del tamaño y de las variantes
La imagen de cada producto, variante y línea de carrito, y el póster de cada drop,
SHALL llevar, además de `url` y `alt`, su `width` y `height` reales y una lista
`sources` con una URL por ancho. Los campos que ya existían no SHALL cambiar.

#### Scenario: Producto con foto
- **WHEN** se pide `GET /api/shopify/products`
- **THEN** cada `image` trae `url`, `alt`, `width`, `height` y `sources` con las variantes de 320, 640 y 1.280 px

#### Scenario: La foto no es cuadrada
- **WHEN** la foto original mide 1200 × 1600
- **THEN** el `<img>` declara esa proporción, no 1254 × 1254

#### Scenario: Cliente antiguo
- **WHEN** un cliente que solo lee `image.url` recibe la respuesta nueva
- **THEN** sigue funcionando igual

#### Scenario: Producto sin foto
- **WHEN** un producto no tiene imagen
- **THEN** `image` sigue siendo `null`

### Requirement: Las ilustraciones se descargan al tamaño al que se pintan
Cada ilustración de la crew, de día y de noche, SHALL existir en variantes de 320 y
640 px de alto además de su original, y cada sitio SHALL usar la menor cuyos píxeles no
superen cuatro veces los que ocupa en pantalla.

#### Scenario: Estampida de día
- **WHEN** se lanza la Estampida de día
- **THEN** las 24 ilustraciones que descarga suman 350 kB como máximo

#### Scenario: Estampida de noche
- **WHEN** se lanza con el modo neón encendido
- **THEN** suman 500 kB como máximo

#### Scenario: Público de la mesa y muñecos del estudio
- **WHEN** se abre `/estudio` en escritorio
- **THEN** las imágenes decodificadas suman 15 MB como máximo

#### Scenario: Ilustración que se pinta grande
- **WHEN** una ilustración se pinta a más de 320 px de alto, como el muñeco del 404
- **THEN** usa la variante de 640 px o el original, la menor que cumpla la regla

### Requirement: La animación del pie se descarga a su tamaño y solo si se ve
La animación de la cinta del pie, de día y de noche, SHALL existir en alturas de 112,
168 y 224 px, y el navegador SHALL descargar la que corresponde a su tamaño pintado y a
la densidad del dispositivo. No SHALL descargarse hasta que la cinta esté dentro de la
pantalla, ni nunca con movimiento reducido o con ahorro de datos activado: en esos casos
se queda el póster.

#### Scenario: Página larga sin llegar al pie
- **WHEN** se carga la portada y no se hace scroll
- **THEN** no se descarga la animación, solo su póster cuando corresponda

#### Scenario: Se llega al pie en un móvil
- **WHEN** la cinta entra en pantalla en un móvil de densidad 2
- **THEN** se descarga la variante de 168 px, de 450 kB como máximo

#### Scenario: Pantalla de densidad 1
- **WHEN** la cinta entra en pantalla en un escritorio de densidad 1
- **THEN** se descarga la variante de 112 px, de 310 kB como máximo

#### Scenario: Movimiento reducido o ahorro de datos
- **WHEN** el visitante prefiere movimiento reducido o tiene activado el ahorro de datos
- **THEN** se ve el póster y la animación no se descarga

#### Scenario: Modo neón
- **WHEN** se enciende el neón con la cinta fuera de pantalla
- **THEN** tampoco se descarga la animación de noche

### Requirement: Una imagen oculta no se descarga
Una ilustración que el diseño oculta en un ancho de pantalla no SHALL descargarse en
ese ancho.

#### Scenario: Estudio en móvil
- **WHEN** se abre `/estudio` en una pantalla de 375 px
- **THEN** no se piden el muñeco colgado ni las ilustraciones del público de la mesa

#### Scenario: Chat, Mi Crew y Taller en pantallas estrechas
- **WHEN** se abren `/rockyIA`, `/mi-crew` y `/taller` en un ancho en el que su muñeco está oculto
- **THEN** ese muñeco no se pide

### Requirement: El repartidor del carrito sale dibujado la primera vez
La ilustración del repartidor SHALL estar descargada antes de que empiece su carrera:
se precarga cuando la página está en reposo y, si aún no ha llegado al añadir al
carrito, la carrera espera a tenerla, con un límite.

#### Scenario: Primera compra con red lenta
- **WHEN** se añade un producto al carrito por primera vez con la red limitada
- **THEN** el repartidor cruza con su dibujo visible

#### Scenario: La imagen no llega
- **WHEN** la ilustración no se ha podido descargar en un segundo
- **THEN** la carrera no se lanza y el añadido al carrito no se ve afectado

### Requirement: El audio no se descarga hasta que se pide
Ninguna pista de audio SHALL descargarse al cargar una página. Solo se pide al pulsar
reproducir, al elegir un banco de la mesa que la use o al encender el modo neón, que
trae su cinta.

#### Scenario: Carga de cualquier página
- **WHEN** se carga la web y no se toca nada
- **THEN** no hay ninguna petición a `/music/`

#### Scenario: Encender el neón
- **WHEN** se enciende el modo neón
- **THEN** se pide `modo-neon.m4a` y solo esa pista

### Requirement: Un vídeo solo entra con presupuesto y carga diferida
Un fichero de vídeo en `dist/` que no tenga un límite declarado en el presupuesto de
rendimiento SHALL hacer fallar la comprobación del proyecto. Un vídeo SHALL cargarse
solo al entrar en pantalla, sin reproducción automática con sonido, y SHALL pausarse
fuera de pantalla y con la pestaña oculta.

#### Scenario: Entra un vídeo sin presupuesto
- **WHEN** se añade un `.mp4` o `.webm` a la web sin declararlo en el presupuesto
- **THEN** `npm run check` falla y nombra el fichero
