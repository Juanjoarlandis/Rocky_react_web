# Proposal

## Why

Los drops son el corazón de ROCKY 035 y hoy no se pueden gestionar. El drop «en curso» está
fijado en el código (`CURRENT_DROP`, sin fecha), el drop de un producto es su primera
colección y «bajo llave» significa «sin foto». Con la tienda de pruebas llena (20 camisetas,
4 drops) se ve que el sistema no aguanta un calendario real:

- solo carga 8 diseños (H-008);
- un diseño sin revelar se puede comprar desde su ficha (H-019);
- las etiquetas dicen siempre «Drop 4» (H-059);
- no hay fecha, cierre ni «últimas horas»;
- los avisos se reparten en listas sueltas (H-020).

La crew necesita programar, configurar, editar y publicar drops completos sin tocar código ni
desplegar, y que la web los cuente con una pieza visual propia.

## What Changes

- **El drop vive en Shopify.** Un drop es una colección `rocky-drop-<slug>` con un metacampo
  `rocky.drop` (JSON versionado: número, lema, historia, fechas de lanzamiento y cierre,
  estado borrador/programado) y su imagen de cartel. Sustituye a `CURRENT_DROP` y a la regla de
  «primera colección».
- **Estados derivados por fechas.** Los estados son borrador, anunciado, en la calle, últimas
  horas y archivo.
  - El revelado y el cierre son automáticos.
  - Antes del lanzamiento solo hay teaser: número de diseños y siluetas, sin nombres, fotos
    ni precios.
- **Compra blindada en el servidor.** El BFF no deja añadir ni pagar diseños de un drop que no
  está a la venta. Además, al programar un drop sus diseños se publican en el canal Headless
  con la fecha de lanzamiento, así que Shopify tampoco los sirve antes.
- **Catálogo completo.** El BFF pagina todo el catálogo; el drop de cada diseño sale del modelo
  de drops y cualquier diseño publicado tiene ficha.
- **El Taller: panel privado en la web.** Entrada con contraseña y código TOTP, sesión corta y
  registro de acciones. Desde él se puede:
  - crear y editar drops (textos, fechas, cartel);
  - crear diseños con foto, precio, tallas y existencias, y añadir o quitar diseños existentes;
  - programar y despublicar un drop;
  - ver una vista previa y cuántos avisos hay apuntados.
- **El muro de carteles.** La página de drops pasa a ser un muro callejero:
  - el drop anunciado, tapado con cinta, lleva la fecha marcada con el punto de mira, una
    cuenta atrás a rotulador y pestañas de «arranca y avísame»;
  - el drop en la calle se ve como cartel limpio;
  - en últimas horas, el cartel tiene la esquina despegada;
  - el archivo son carteles rotos que tapan los nuevos.
  - La portada, la página de cada drop, la ficha y la cinta del pie leen el mismo modelo.
  - Un muñeco nuevo, El Pegador, empapela el muro.
- **Avisos por drop.** El formulario del teaser apunta a la lista del drop. El script de envío
  aprende a enviar por drop, juntando su lista con las de sus diseños y con el título y el
  enlace del drop.
- **BREAKING (interno):**
  - `shared/campaign.mjs` (`CURRENT_DROP`) deja de ser la fuente del drop.
  - `/api/drop/calendario.ics` pasa a servir el drop destacado y nace `/api/drops/:handle/calendario.ics`.
  - `/api/shopify/products` devuelve el catálogo completo con el drop del modelo y sin los diseños de drops anunciados.

## Capabilities

### New Capabilities
- `calendario-de-drops`: qué es un drop, dónde se guarda, cómo se valida su configuración y cómo se deriva su estado público a partir de las fechas.
- `venta-de-drops`: qué se puede comprar según el estado del drop y cómo lo impone el servidor (carrito, cantidades, checkout y publicación programada en Shopify).
- `catalogo-vivo`: catálogo completo y paginado, pertenencia de cada diseño a su drop, fichas para todo lo publicado y nada del teaser filtrado al navegador.
- `taller-de-drops`: el panel privado. Autenticación, sesión, permisos, operaciones sobre drops y diseños, subida de imágenes y registro de acciones.
- `muro-de-drops`: la presentación pública de los drops. Muro de carteles, estados visuales, cuenta atrás, pestañas de aviso, portada, cinta del pie, noche y movimiento reducido.
- `avisos-de-drop`: una lista de avisos por drop y su envío por drop.

### Modified Capabilities
- Ninguna: `openspec/specs/` está vacío. Los cambios activos `punto-de-mira-tippex-y-pegatinas` (`producto-agotado`) y `curioso-se-asoma-por-componentes` se respetan sin cambiar sus requisitos.

## Impact

- **Servidor:**
  - nuevos `shared/drops.mjs` (dominio puro), `server/integrations/shopify/drops-admin.mjs`, `server/services/drops/`, `server/services/taller-auth.mjs`, `server/lib/totp.mjs`, `server/lib/password-hash.mjs`, `server/lib/attempt-tracker.mjs` (extraído de la puerta) y las rutas `drops` y `taller`;
  - cambian `catalog.mjs`, `cart-operations.mjs`, `drop.mjs`, `app.mjs` y la configuración.
- **Cliente:**
  - nuevos `src/features/drops/` (muro, cartel, cuenta atrás, pestañas) y `src/features/taller/` (panel, carga diferida);
  - cambian `ProductPage`, `ProductDetail`, `MenuDrop` (pasa a ser el muro), `Footer`, `PlaceholderTee`, `normalize`, `availability` y `App`.
- **Shopify:** la app necesita los alcances que ya tiene la de pruebas (productos, publicaciones, ficheros, inventario) y el id de la publicación Headless (`SHOPIFY_HEADLESS_PUBLICATION_ID`). En la tienda real hay que revisarlos antes de publicar.
- **Entorno:** `TALLER_PASSWORD_HASH`, `TALLER_TOTP_SECRET` y `SHOPIFY_HEADLESS_PUBLICATION_ID`. Hay un script para generar la clave y el secreto. Sin ellos, el Taller está apagado y la web sigue funcionando.
- **Dependencias:** ninguna nueva. scrypt, HMAC y subida de imágenes salen con `node:crypto` y `express.raw`.
- **Recursos:** El Pegador (muñeco nuevo) y los carteles de los drops de prueba, generados con OpenAI en el estilo de la casa.
- **Auditoría:** cubre H-008, H-019, H-020, H-059, H-060, H-061 y H-063 de `docs/auditoria/2026-11/`. Quedan fuera H-174, H-054 y H-064 (resto del candidato C04) y el resto de C03.
- **Fuera de alcance:** desplegar a producción, configurar la tienda real, varios usuarios en el Taller, el envío automático de avisos desde el servidor y borrar drops o productos desde el panel.
