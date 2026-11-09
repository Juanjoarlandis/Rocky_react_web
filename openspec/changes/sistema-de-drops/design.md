# Design

## Context

Ver `proposal.md` (Why) y las especificaciones del cambio. Estado de partida comprobado:

- **Drop actual.** El drop es la primera colección del producto (`server/integrations/shopify/storefront.mjs`, `mapProduct`). El drop «en curso» y su fecha están en `shared/campaign.mjs`, y la usan la portada, la cinta del pie, `PlaceholderTee`, `AddToCalendar` y `/api/drop/calendario.ics`.
- **Catálogo y carrito.**
  - La web pide `first=8` (`src/api/shopify.js:4`) y no pagina.
  - El carrito añade cualquier variante que Shopify acepte (`server/services/cart-operations.mjs`).
  - El token de Storefront es privado del BFF: toda compra pasa por él.
- **Admin.** Existe un cliente Admin con client credentials (`server/integrations/shopify/admin.mjs`) que no usa nadie, y la capacidad `admin` ya se calcula en la configuración.
- **Pruebas en la tienda de desarrollo** (2026-11-09, `rocky035-pruebas`):
  - los alcances actuales bastan para escribir, leer y borrar metacampos de colección;
  - el canal Headless tiene `supportsFuturePublishing: true`;
  - una colección no acepta como imagen el `resourceUrl` de una subida segura, pero sí la URL del CDN que queda tras `fileCreate`, unos 4,5 s después;
  - `collections(query: "handle:rocky-drop-*")` filtra las colecciones de drop.
- **Sesiones y puerta.**
  - Las sesiones viven en el almacén cifrado, con cookie HttpOnly y SameSite=Lax.
  - Los registros de sesión admiten campos propios, como hace la puerta de acceso.
  - La puerta tiene un contador de intentos por IP, y `requireTrustedOrigin` exige el `Origin` exacto.
- **Avisos.** Se guardan por clave (handle) en el almacén y los manda `scripts/enviar-avisos.mjs`. El servidor web, por diseño, no manda correos.

## Goals / Non-Goals

**Goals:**
- Que una sola función pura decida el estado de un drop, la misma en el servidor y en el navegador.
- Defensa en profundidad para la venta: Shopify no sirve antes de la hora y el BFF no vende fuera de plazo.
- Que la web pública no pague la latencia de la Admin API en cada petición.
- Que el Taller no amplíe la superficie pública: rutas propias, apagado por defecto y sin dependencias nuevas.

**Non-Goals:**
- Varios usuarios con permisos distintos en el Taller.
- Edición en tiempo real entre dos personas a la vez: gana el último que guarda.
- Envío de avisos desde el servidor.
- Publicar en producción o configurar la tienda real.

## Decisions

### D1 · El drop vive en la colección de Shopify, con un metacampo JSON

- **Qué guarda.** Colección `rocky-drop-<slug>`, título del drop como título de la colección, y el metacampo `rocky.drop` de tipo `json`:
  `{ version: 1, number, tagline, story, launchAt, endsAt, status: 'borrador'|'programado' }`.
- **Cartel.** Es la imagen de la colección.
- **Diseños.** Son los productos de la colección.
- **Alternativas descartadas:**
  - Metaobjetos: necesitan alcances nuevos en las dos apps y una definición por tienda.
  - Almacén cifrado del BFF: partiría la verdad entre la Raspberry y Shopify, y el drop no se vería en el admin de Shopify.
  - Un metacampo por campo: varias escrituras no atómicas y más validación cruzada.
- **Por qué.** Con lo elegido, la fuente es única, se ve en el admin de Shopify, Shopify hace las copias, y basta con los alcances que ya tiene la app de pruebas.

### D2 · El modelo de drops se lee por la Admin API, en el servidor y con caché

- **Lectura.** El BFF lee las colecciones `handle:rocky-drop-*` (hasta 50) con su metacampo, su imagen y sus productos (id, handle, título, estado de publicación) por la Admin API.
- **Caché.** 30 segundos con una sola petición en vuelo. Si Shopify falla, sirve la última lectura buena durante 10 minutos como máximo. El Taller la invalida en cada escritura.
- **Alternativa descartada.** Leer el metacampo por Storefront: exige una definición con acceso público y expondría la configuración de los borradores.
- **Sin credenciales Admin** (tienda real sin configurar), el modelo está vacío y la web funciona sin drops: todo es «Tienda».

### D3 · El estado sale de una función pura compartida

`shared/drops.mjs` contiene `parseDropConfig`, `dropState(drop, now)`, `featuredDrop`, `sortForWall` y las constantes (`LAST_HOURS_MS = 48 h`). El servidor la usa con su reloj y el navegador con el reloj corregido por el `now` que manda el servidor (ver `calendario-de-drops`). Así la cuenta atrás y el cambio de cartel coinciden con lo que hará el servidor.

### D4 · Venta: publicación programada en Shopify y guardián en el BFF

- **Programar.** El drop se publica en el canal Headless con `publishDate = launchAt` (`publishablePublish`), y nunca en otros canales. Antes de la hora, la Storefront API no devuelve esos productos ni deja comprarlos.
- **Volver a borrador o mover la fecha.** Primero se despublica y luego se publica con la fecha nueva.
- **Guardián en el BFF.** Para el cierre, que Shopify no sabe programar, `cartOperations` consulta antes de añadir, subir cantidad o pagar. Busca el producto de la variante o de la línea en el modelo del catálogo:
  - si el drop no está a la venta, responde 409 (`DROP_NOT_ON_SALE` o `DROP_CLOSED_IN_CART`);
  - si el producto no está en el modelo, refresca una vez;
  - si sigue sin estar, decide Shopify: o no está publicado, y lo rechaza, o no es de ningún drop.
- **Alternativas descartadas:**
  - Solo el BFF: cualquier otro canal o token saltaría la fecha.
  - Solo Shopify: el archivo seguiría a la venta.
  - Despublicar al cerrar con una tarea programada: el archivo dejaría de tener ficha y haría falta un temporizador en el servidor.

### D5 · Catálogo completo en el BFF

- **Lista.** `catalogModel.listProducts()` pagina la Storefront de 50 en 50, hasta 5 páginas (250), con una sola petición en vuelo y 30 s de caché.
- **Ruta pública.** `/api/shopify/products` devuelve la lista entera con `pageInfo.hasNextPage: false`, para mantener el contrato.
- **Qué añade a cada producto.** Su `drop` sale del modelo de drops (D1), con `{ handle, title, number, state }`, y `purchasable` sale de D3.
- **Filtro del teaser.** Quita cualquier producto de un drop anunciado. Aunque D4 ya lo impide en Shopify, el filtro cubre el caso de un producto publicado a mano antes de tiempo.
- **Rocky IA** pasa a leer este mismo modelo en vez de su caché de 50.

### D6 · Contrato público `/api/drops`

`GET /api/drops` devuelve `{ now, featured, drops }`. Cada drop trae:

```
{ handle, number, title, tagline, story, poster: { url, alt } | null,
  launchAt, endsAt, state, designCount, designs: [handle] | null, soldOut }
```

- En `anunciado`, `designs` es `null`.
- `story` solo viaja en la calle y en el archivo; en el teaser sí viaja el `tagline`.
- `GET /api/drops/:handle/calendario.ics` sirve el calendario del drop.
- `/api/drop/calendario.ics` (legado) sirve el del destacado.
- El navegador une los drops con el catálogo de `/api/shopify/products` por handle.

### D7 · El Taller: contraseña scrypt, TOTP propio y permiso en la sesión

- **Configuración (env):**
  - `TALLER_PASSWORD_HASH` con el formato `scrypt$N$r$p$sal$hash`, generado por `npm run taller:clave`;
  - `TALLER_TOTP_SECRET` en base32 (RFC 6238: SHA-1, 6 dígitos, 30 s, ±1 paso, sin reutilizar el último paso aceptado).
- **Implementación.** `node:crypto` sin dependencias. Las pruebas usan los vectores del RFC.
- **Al entrar:**
  - `sessions.rotate` conservando `cartId` y `customerTokenId`;
  - el registro guarda `tallerGrant`, un secreto del proceso como el de la puerta, y `tallerExpiresAt` a 8 h;
  - reiniciar el servidor cierra las sesiones del Taller, que es lo esperable.
- **Intentos.** El contador sale de la puerta a `server/lib/attempt-tracker.mjs`: 5 por IP cada 15 min.
- **Origen.** Todas las rutas del Taller llevan `requireOrigin`, también las de lectura, y van con `no-store`.
- **Alternativas descartadas:**
  - Login de personal de Shopify (OAuth de app incrustada): mucho más complejo y no encaja con una SPA propia.
  - Passkeys: dependencia nueva.
  - Un token en cabecera, como `BEATS_ADMIN_TOKEN`: sin segundo factor y con el token guardado en el navegador.

### D8 · Operaciones del Taller sobre Shopify

`server/integrations/shopify/drops-admin.mjs` agrupa las operaciones GraphQL. `server/services/drops/taller.mjs` aplica las reglas (validación del calendario, número único, slug fijo, «un diseño, un drop»), sincroniza la publicación (D4) e invalida las cachés.

| Operación | Cómo se hace en Shopify |
| --- | --- |
| Diseños | `productSet` por handle (`rocky-<slug-del-título>`, con sufijo si existe), con la foto como `files: [{ id }]`. Existencias como en el script de las camisetas: sin seguimiento = sin límite; con número = `inventoryQuantities` al crear, y `inventorySetQuantities` con `changeFromQuantity` al editar |
| Añadir o quitar diseños | `collectionAddProducts` / `collectionRemoveProducts` |
| Drop | `collectionCreate` / `collectionUpdate` (título, imagen) + `metafieldsSet` |

Las respuestas del Taller nunca devuelven los errores crudos de Shopify. Se registran en el log y el usuario recibe un `HttpError` con código.

### D9 · Imágenes: cuerpo binario validado y `fileCreate`

- **Ruta.** `PUT /api/taller/images` con `express.raw` limitado a 8 MB y tipos `image/png`, `image/jpeg` y `image/webp`.
- **Validación.** Se valida por los bytes mágicos.
- **Subida.** `stagedUploadsCreate` → POST al destino → `fileCreate` → espera de hasta 20 s a `READY`. Devuelve `{ fileId, url }`: el diseño usa el `fileId` y el cartel, la URL del CDN.
- **Alternativa descartada.** Multipart: necesita una dependencia (multer o busboy). La subida directa desde el navegador al almacenamiento de Shopify obligaría a abrir el CSP.

### D10 · Rutas públicas

- `/menudrop` sigue siendo la ruta del muro, para no romper enlaces; su título pasa a «El muro».
- `/products/:handle` es la página del drop, con el cartel de cabecera.
- `/taller` es la SPA del panel, con carga diferida, sin enlace en la barra y con `noindex`.
- `ROUTES.taller` y `ROUTES.drop(handle)` entran en `src/config/routes.js`.

### D11 · Dirección visual: el muro de carteles

- **Muro.** Se dibuja con CSS y SVG en línea, sin texturas pesadas:
  - llagas de ladrillo a rotulador con un patrón SVG sobre `--paper`;
  - de noche, el patrón pasa a líneas de neón.
- **Carteles.** Papel con borde roto (SVG `clipPath` como `TornSticker`), un leve giro determinista por handle (`tornVariant`) y cinta en las esquinas (`.tape`).
- **Estados del cartel:**

  | Estado | Cómo se ve |
  | --- | --- |
  | Anunciado | Tiras de cinta «PRÓXIMAMENTE · DROP N» cruzadas. Fecha dentro del aro del punto de mira (`ProductReticle`, reutilizado). Cuenta atrás en dígitos a mano con subrayado de rotulador. Siluetas con `PlaceholderTee` en compacto |
  | Pestañas | Recortables verticales con línea de puntos y «AVÍSAME · 13·11» en vertical. Al arrancar una cae con giro, salvo con movimiento reducido, y abre el `DropAviso` del drop |
  | En la calle | Cartel limpio con sello «YA EN LA CALLE», en tinta roja girada, y un mosaico de hasta 4 fotos |
  | Últimas horas | Esquina inferior despegada (pliegue con `linear-gradient` y sombra dura, sin `!important`) y pegatina «ÚLTIMAS HORAS · quedan 30 h» |
  | Archivo | Bordes más rotos, `filter: grayscale` parcial, sello «VOLÓ» y solapado bajo el cartel siguiente con margen negativo |

- **Cartel sin imagen.** Si un drop no tiene cartel, se compone uno tipográfico: número gigante en Luckiest Guy y lema a mano. El muro nunca queda roto por falta de arte.
- **El Pegador.** Muñeco nuevo con cubo de engrudo y brocha, generado con OpenAI con las referencias de `prompts-munecos/`:
  - su prompt va en `prompts-munecos/25-pegador-carteles.md` y su maestro en `assets-master/characters/`;
  - se optimiza a `src/images/optimized/characters/pegador-carteles-hd.webp`;
  - de noche usa `.neon-art`.
- **Carteles de prueba.** Los de los 4 drops de la tienda de pruebas se generan igual. Son contenido de la tienda: viven en `assets-master/carteles-prueba/` y no en el repo.

### D12 · Avisos por drop

- **Clave.** `DropAviso` recibe el handle del drop.
- **Claves conocidas.** `knownProducts` acepta también los handles de los drops públicos del modelo, además de los productos publicados.
- **Envío.** `scripts/enviar-avisos.mjs --drop <handle>`:
  1. lee el drop por la Admin API;
  2. junta su lista con las de sus diseños y deduplica;
  3. manda con `renderAvisoDrop({ titulo: drop.title, url: <origen>/products/<handle> })`;
  4. marca cada lista por separado.

  `createAvisosSender` gana un modo de varias listas.
- **Taller.** Lee solo los recuentos.

### D13 · Modo demo

`shared/demo-drops.mjs` genera, con fechas relativas a `now`, un drop anunciado (+3 días), uno en la calle y uno en archivo con los productos de vista previa. La web los usa cuando no hay tienda, y nunca permiten pagar.

### D14 · Lo que se retira

- `shared/campaign.mjs` y `src/config/campaign.js` (`CURRENT_DROP`) se borran.
- Sus usos pasan al destacado (D3/D6).
- `normalize.dropOf` deja de inventar «Drop 4» para los productos sin foto. «Sin foto» deja de significar «bajo llave» (H-019): un producto a la venta sin foto sale con el placeholder y se puede comprar.

## Risks / Trade-offs

- **La Admin API se cae o va lenta** → caché con última lectura buena durante 10 min. Pasado ese tiempo, la web no tiene drops pero sigue vendiendo lo publicado. Se registra en el log.
- **El reloj del servidor se desvía** → la Raspberry usa NTP. La cuenta atrás usa el `now` del servidor, y el guardián decide con el mismo reloj que el estado.
- **Desfase de hasta 30 s en la hora del drop** (caché) → Shopify publica a la hora exacta. El navegador pide el estado al llegar a cero y repite a los 5 y a los 15 s si aún no ha cambiado.
- **Mover la fecha de un drop ya programado** → se despublica y se vuelve a publicar con la fecha nueva. Si falla a medias, el drop queda marcado para resincronizar: el Taller lo enseña y deja reintentar.
- **Una sola cuenta para la crew** → sin trazabilidad por persona. Queda como deuda, con el registro de acciones por sesión.
- **El secreto TOTP en el entorno de la Raspberry** → el mismo nivel de confianza que el resto de secretos del servidor. Se rota con `npm run taller:clave`.
- **Las imágenes subidas antes del lanzamiento están en el CDN de Shopify** → sus URL no son adivinables y el BFF no las manda antes del lanzamiento.
- **Las camisetas de prueba se publicaron en todos los canales** → la siembra del modelo en la tienda de pruebas las deja solo en Headless.
- **Archivo por «sin cierre y todo agotado»** depende de `availableForSale` de todas las variantes → si una talla vuelve a tener existencias, el drop vuelve a la calle, que es lo correcto.

## Migration Plan

1. **Tienda de pruebas.**
   - `scripts/drops-semilla.mjs` (solo `rocky035-pruebas`) escribe `rocky.drop` en los 4 drops de prueba, sube sus carteles y deja la publicación de cada diseño según su estado. El Drop 6 se anuncia para dentro de unos días.
   - Después, todo se gestiona desde el Taller.
2. **Producción** (no forma parte de este cambio: lo hace el usuario, con `docs/ops/drops.md`):
   1. revisar los alcances de la app «Rocky» de la tienda real (`read_products`, `write_products`, `read_publications`, `write_publications`, `write_files`, `read_inventory`, `write_inventory`) y anotar el id de su publicación Headless;
   2. generar la clave y el secreto con `npm run taller:clave` y ponerlos en el entorno de la Raspberry junto a `SHOPIFY_HEADLESS_PUBLICATION_ID`;
   3. publicar la release;
   4. crear en el Taller el drop en curso con sus productos.

   Mientras tanto la web está tras la puerta de acceso, así que no hay impacto público.
3. **Vuelta atrás.**
   - `npm run release:revertir` vuelve a la release anterior.
   - Los metacampos y la imagen de colección no molestan al código viejo, que usa la primera colección.
   - Las publicaciones programadas siguen en Shopify. Con el código viejo, un drop anunciado no aparece hasta su hora, que es un comportamiento aceptable.

## Open Questions

- El texto exacto de los sellos y pegatinas («YA EN LA CALLE», «VOLÓ», «ÚLTIMAS HORAS») se puede afinar en la revisión de arte sin cambiar las especificaciones.
