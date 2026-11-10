# Spec Delta

## Purpose

Entregar los ficheros de `dist/` con el menor número de bytes y sin gastar CPU del
servidor en comprimirlos, conservando el tipo, la caché y los errores que ya tiene cada
recurso.

## ADDED Requirements

### Requirement: El build deja variantes comprimidas de los ficheros de texto
`npm run build` SHALL dejar en `dist/`, junto a cada fichero JavaScript, CSS, HTML, SVG,
JSON y de texto, una variante Brotli y otra gzip. Una variante que no sea más pequeña que
su original SHALL omitirse. Imágenes, fuentes y audio no SHALL tener variantes.

#### Scenario: Fichero de texto grande
- **WHEN** termina el build
- **THEN** el JavaScript principal tiene su variante Brotli y su variante gzip, las dos más pequeñas que el original

#### Scenario: Fichero que no gana nada
- **WHEN** la variante comprimida de un fichero no es más pequeña que el original
- **THEN** esa variante no queda en `dist/`

#### Scenario: Recursos ya comprimidos
- **WHEN** termina el build
- **THEN** ningún WebP, PNG, WOFF2 ni M4A tiene variantes

### Requirement: El servidor sirve la variante que el cliente acepta
Para un recurso con variantes, el servidor SHALL responder con Brotli si la petición lo
acepta, con gzip si acepta gzip y no Brotli, y sin comprimir en cualquier otro caso. El
cuerpo, una vez descomprimido, SHALL ser idéntico al original.

#### Scenario: El cliente acepta Brotli
- **WHEN** se pide un asset JavaScript con `Accept-Encoding: br, gzip`
- **THEN** la respuesta lleva `Content-Encoding: br` y su cuerpo descomprimido es el fichero original

#### Scenario: El cliente solo acepta gzip
- **WHEN** se pide el mismo asset con `Accept-Encoding: gzip`
- **THEN** la respuesta lleva `Content-Encoding: gzip`

#### Scenario: El cliente no acepta compresión
- **WHEN** se pide sin `Accept-Encoding`, o con `br;q=0, gzip;q=0`
- **THEN** la respuesta no lleva `Content-Encoding` y el cuerpo es el fichero original

#### Scenario: Petición HEAD
- **WHEN** se hace `HEAD` de un asset con `Accept-Encoding: br`
- **THEN** las cabeceras son las de la variante Brotli y no hay cuerpo

### Requirement: La respuesta comprimida conserva tipo, caché y validación
Una respuesta comprimida SHALL llevar el `Content-Type` del recurso original, las mismas
cabeceras de caché que tendría sin comprimir y `Vary: Accept-Encoding`. Cada codificación
SHALL tener su propio validador, de modo que una revalidación devuelva 304 solo para la
variante que el cliente ya tiene.

#### Scenario: Asset con hash
- **WHEN** se pide un asset de `/assets/` con `Accept-Encoding: br`
- **THEN** responde con `application/javascript`, `Cache-Control: public, max-age=31536000, immutable` y `Vary: Accept-Encoding`

#### Scenario: Revalidación
- **WHEN** se repite la petición con el `ETag` recibido en `If-None-Match` y la misma codificación
- **THEN** responde 304

#### Scenario: Validador de otra codificación
- **WHEN** se envía el `ETag` de la variante gzip pidiendo Brotli
- **THEN** no responde 304

### Requirement: El documento de la aplicación también se negocia
El `index.html` SHALL servirse comprimido con la misma negociación, tanto en `/` como en
cualquier ruta de la aplicación que caiga en él, conservando su política de caché.

#### Scenario: Ruta de la aplicación
- **WHEN** se pide `/cart` con `Accept-Encoding: br`
- **THEN** responde 200 con `Content-Encoding: br`, `Cache-Control: public, max-age=0, must-revalidate` y el HTML de la aplicación al descomprimir

### Requirement: Lo que no se comprime sigue igual
Imágenes, fuentes y audio SHALL servirse sin `Content-Encoding`, acepte lo que acepte el
cliente, y SHALL seguir admitiendo peticiones por rangos.

#### Scenario: Pista de audio por rangos
- **WHEN** se pide un `.m4a` con `Accept-Encoding: br` y `Range: bytes=0-1023`
- **THEN** responde 206 con 1.024 bytes y sin `Content-Encoding`

### Requirement: Los errores y la puerta no cambian
Un asset que no existe SHALL seguir respondiendo 404 sin caché, acepte lo que acepte el
cliente. Con la puerta de acceso activa, las respuestas comprimidas SHALL conservar las
cabeceras privadas que ya llevan y añadir `Accept-Encoding` a `Vary`.

#### Scenario: Asset inexistente
- **WHEN** se pide `/assets/no-existe.js` con `Accept-Encoding: br`
- **THEN** responde 404 `text/plain` con `Cache-Control: no-store`, no el documento de la aplicación

#### Scenario: Puerta activa
- **WHEN** un visitante con acceso pide un asset con `Accept-Encoding: br`
- **THEN** la respuesta es Brotli, con `Cache-Control: private, no-store` y `Vary` con `Cookie` y `Accept-Encoding`

### Requirement: Sin variantes, el servidor sirve el original
Si `dist/` no tiene variantes comprimidas, el servidor SHALL arrancar y servir los
originales sin error.

#### Scenario: Build sin precomprimir
- **WHEN** el servidor arranca sobre un `dist/` sin variantes y se pide un asset con `Accept-Encoding: br`
- **THEN** responde 200 sin `Content-Encoding`
