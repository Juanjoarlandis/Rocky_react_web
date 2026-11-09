# Tasks

Nivel 3. TDD en cada tarea de lógica: prueba en rojo, implementación mínima, refactor en verde.

## 1. Dominio compartido de drops

- [x] 1.1 `shared/drops.mjs` con:
  - `parseDropConfig` (versión, número, textos, fechas con zona, cierre ≥ lanzamiento + 1 h, programado con fecha);
  - `dropState(drop, now)` con los cinco estados y la ventana de 48 h;
  - `featuredDrop`, `sortForWall` y los helpers de handle y slug.

  Verifica: `shared/drops.test.mjs` cubre cada escenario de `calendario-de-drops` (incluidos los límites de hora exacta) y pasa.
- [x] 1.2 `shared/demo-drops.mjs`: drops de demostración con fechas relativas (anunciado, en la calle, archivo) sobre los productos de vista previa. Verifica: una prueba fija los tres estados para un `now` dado.

## 2. Piezas de seguridad del Taller

- [x] 2.1 `server/lib/totp.mjs` (RFC 6238 con SHA-1, 6 dígitos, 30 s, ±1 paso, base32, sin reutilizar paso). Verifica: pruebas con los vectores del RFC 6238 y casos de reutilización y deriva.
- [x] 2.2 `server/lib/password-hash.mjs`: hash y verificación scrypt (`scrypt$N$r$p$sal$hash`) en tiempo constante, más `scripts/taller-clave.mjs` (`npm run taller:clave`) que imprime el hash, el secreto TOTP y la URI `otpauth://`. Verifica: pruebas de ida y vuelta, de clave mala y de formato corrupto; el script corre en local.
- [x] 2.3 Extraer el contador de intentos de la puerta a `server/lib/attempt-tracker.mjs` sin cambiar su comportamiento. Verifica: las pruebas de la puerta siguen verdes y hay pruebas propias del contador.
- [x] 2.4 `server/config/taller.mjs`: lee `TALLER_PASSWORD_HASH`, `TALLER_TOTP_SECRET` y `SHOPIFY_HEADLESS_PUBLICATION_ID`, y decide si el Taller está activo (TOTP obligatorio en producción). Verifica: pruebas de cada combinación del requisito «El Taller está apagado si no está configurado».

## 3. Shopify Admin y modelos de lectura

- [ ] 3.1 `server/integrations/shopify/drops-admin.mjs` con:
  - leer colecciones `rocky-drop-*` con metacampo, imagen y productos;
  - crear y actualizar colección y metacampo;
  - añadir y quitar productos;
  - `productSet` de diseños;
  - existencias;
  - publicar con fecha y despublicar;
  - buscar productos;
  - subir imagen (subida segura, `fileCreate` y espera).

  Verifica: pruebas con un `fetch` falso que fijan las consultas y el manejo de `userErrors`.
- [ ] 3.2 `server/services/drops/model.mjs`: modelo de drops con caché de 30 s, una petición en vuelo, última lectura buena durante 10 min e invalidación. Ignora y registra los metacampos rotos. Verifica: pruebas de caché, fallo de Shopify, metacampo roto y diseño en dos drops.
- [ ] 3.3 `server/services/drops/catalog.mjs`:
  - catálogo completo paginado (hasta 250);
  - drop del modelo para cada producto;
  - `purchasable`;
  - filtro del teaser.

  Verifica: pruebas de los requisitos de `catalogo-vivo` (20 productos, `frontpage`, sin drop y teaser sin nombres).
- [ ] 3.4 `known-products` acepta los handles de drops públicos y deja de depender de los 50 más recientes. Verifica: pruebas de «Drop anunciado con la tienda grande» y «Clave inventada».

## 4. Venta blindada

- [ ] 4.1 Guardián en `cart-operations`: añadir, subir cantidad y pagar consultan el catálogo y responden 409 (`DROP_NOT_ON_SALE` y `DROP_CLOSED_IN_CART`); bajar y quitar siguen permitidos. Verifica: pruebas de cada escenario de `venta-de-drops` y las pruebas del carrito existentes en verde.

## 5. API pública

- [ ] 5.1 `GET /api/drops` (`{ now, featured, drops }`) y `GET /api/drops/:handle/calendario.ics`; `/api/drop/calendario.ics` sirve el destacado. `/api/shopify/products` devuelve el catálogo completo. Rocky IA usa el catálogo nuevo. Verifica: pruebas de rutas (contrato, teaser sin nombres, 404 del archivo, `.ics` con dos alarmas) y pruebas del chat en verde.
- [ ] 5.2 Composición en `server/app.mjs` sin romper el modo sin Shopify. Verifica: `server/app.test.mjs` en verde, más una prueba de arranque sin credenciales Admin (drops vacíos y Taller apagado).

## 6. API del Taller

- [ ] 6.1 Sesión del Taller: `POST`, `GET` y `DELETE /api/taller/session` con contraseña y TOTP, límite de intentos, rotación de sesión, permiso de 8 h, `no-store` y origen exacto. Verifica: pruebas de cada escenario de entrada, límite, caducidad y salida, más la ausencia de secretos en el log.
- [ ] 6.2 Drops en el Taller:
  - listar con avisos contados;
  - crear (slug fijo) y editar con validación;
  - programar (publicación con fecha, rechazo si está vacío) y despublicar;
  - registro de cada acción.

  Verifica: pruebas con Shopify falso de cada escenario de `taller-de-drops` sobre drops.
- [ ] 6.3 Diseños en el Taller: crear completo (título, descripción, precio, tallas y existencias, foto), editar, añadir uno existente (409 si ya está en otro drop), quitar y buscar productos. Verifica: pruebas con Shopify falso.
- [ ] 6.4 Imágenes: `PUT /api/taller/images`, binario de hasta 8 MB, bytes mágicos PNG, JPEG o WebP, y 413 o 415. Verifica: pruebas con un HTML disfrazado, una imagen grande y una buena.

## 7. Cliente: datos

- [ ] 7.1 Datos de drops en el cliente:
  - `src/api/drops.js` y `useDrops` (reloj corregido con `now`, nueva petición al llegar a cero y reintentos a 5 y 15 s);
  - `normalize`, que toma el drop del producto y `purchasable`;
  - `availability`, con un estado cerrado.

  Verifica: pruebas de `useDrops` con reloj falso, y de `normalize` y `availability`.
- [ ] 7.2 Retirar `CURRENT_DROP` (`shared/campaign.mjs`, `src/config/campaign.js`) y sus usos, y que «sin foto» deje de ser «bajo llave». Verifica: `rg CURRENT_DROP` sin resultados y pruebas de catálogo y ficha en verde.

## 8. Cliente: el muro

- [ ] 8.1 `Cartel` con sus estados (anunciado, en la calle, últimas horas, archivo y sin imagen) y `CuentaAtras` (texto accesible con la fecha de Madrid; la cuenta visual, oculta a lectores de pantalla). Verifica: pruebas de componente de cada estado, el teaser sin nombres y la cuenta con el reloj corregido.
- [ ] 8.2 `Pestanas` recortables que abren el `DropAviso` del drop, con el foco en el email, accesibles por teclado y sin animación con movimiento reducido. Verifica: pruebas de teclado y foco, y de la clave del aviso.
- [ ] 8.3 Página del muro en `/menudrop`: orden, solapes del archivo, El Pegador, noche, móvil y estilos en `src/styles/pages/muro.css` (solo tokens). Verifica: pruebas de orden y Stylelint en verde.

## 9. Cliente: portada, drop, ficha y pie

- [ ] 9.1 Portada con el drop destacado (cuenta atrás o enlace) y el catálogo en el orden del muro, con el teaser como cartel. Verifica: pruebas de `ProductPage` y de la portada con anunciado, sin destacado y en demo.
- [ ] 9.2 Página `/products/:handle` con el cartel de cabecera y su contenido según el estado. Verifica: pruebas de cada estado.
- [ ] 9.3 Ficha con enlace a su drop, «este drop ya voló» sin compra en el archivo, agotado como siempre y avisos por drop. `PlaceholderTee` con el drop correcto. Verifica: pruebas de `ProductDetail`.
- [ ] 9.4 Cinta del pie con el destacado y su fecha o estado. Verifica: pruebas del pie.

## 10. Cliente: el Taller

- [ ] 10.1 SPA `/taller` con carga diferida: entrada (contraseña y código), salida y aviso de «no disponible». Verifica: pruebas de componente con API falsa.
- [ ] 10.2 Lista y edición de drops: textos, fechas en hora de Madrid, cartel con subida, programar y despublicar, vista previa de los estados con el `Cartel` público y recuento de avisos. Verifica: pruebas de formulario (validación, errores del servidor y vista previa).
- [ ] 10.3 Diseños del drop: crear con foto, precio y tallas, editar, añadir uno existente y quitar. Verifica: pruebas de formulario.

## 11. Avisos por drop

- [ ] 11.1 Envío por drop: `createAvisosSender` con varias listas deduplicadas y `scripts/enviar-avisos.mjs --drop <handle>`, con título y enlace del drop y simulacro por defecto. Verifica: pruebas del envío (email en dos listas y simulacro) y del análisis de argumentos.

## 12. Recursos visuales

- [ ] 12.1 El Pegador:
  - prompt en `prompts-munecos/25-pegador-carteles.md`;
  - generación con OpenAI y las referencias de la casa;
  - maestro en `assets-master`, optimizado a `src/images/optimized/characters/`;
  - integrado en el muro.

  Verifica: revisión de arte (estilo, paleta, recorte transparente, día y noche).
- [ ] 12.2 Carteles de los 4 drops de prueba, generados en el estilo de la casa y guardados en `assets-master/carteles-prueba/`. Verifica: revisión de arte de la paleta y de que ningún cartel del anunciado revele diseños.

## 13. Tienda de pruebas

- [ ] 13.1 `scripts/drops-semilla.mjs`, que se niega con cualquier tienda que no sea `rocky035-pruebas`:
  - escribe `rocky.drop` en los drops 3 a 6;
  - sube los carteles;
  - publica cada diseño solo en Headless, según su estado (el Drop 6, anunciado para dentro de unos días).

  Verifica: simulacro y luego aplicación, comprobando la publicación y los metacampos leyéndolos de vuelta.

## 14. Documentación

- [ ] 14.1 Documentar:
  - `docs/ops/drops.md`: guía del Taller, alta de la clave, publicación en producción, vuelta atrás y avisos;
  - `.env.example` con las variables nuevas;
  - la sección del README.

  Verifica: los comandos documentados corren en local y `npm run security:check` sigue limpio.

## 15. Verificación y cierre

- [ ] 15.1 `npm run check` en verde.
- [ ] 15.2 Recorrido en Chrome contra la tienda de pruebas, de escritorio y móvil:
  - muro en los cuatro estados;
  - teaser sin nombres en las respuestas;
  - cambio de cartel al llegar a cero;
  - guardián del carrito por API;
  - Taller completo (entrada con TOTP, crear drop y diseño con foto, programar, vista previa y despublicar);
  - noche y movimiento reducido.

  Verifica: script de Playwright con resultado OK y capturas.
- [ ] 15.3 Revisión de dirección artística con capturas de día y noche a 375 y 1280 px, corrigiendo lo que no encaje.
- [ ] 15.4 Revisión independiente (`engineering-review`) y de seguridad (`security-review`); corrección de los bloqueantes, como mucho en dos rondas.

## Workflow follow-up

- Publicar en producción siguiendo `docs/ops/drops.md`, cuando el usuario configure la tienda real y lo pida.
- Archivar el cambio con estado VERIFIED y la conformidad del usuario.
