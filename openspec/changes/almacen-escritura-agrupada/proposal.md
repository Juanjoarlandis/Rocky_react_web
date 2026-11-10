# Propuesta: almacén con escritura agrupada

## Why

El almacén cifrado (`server/storage/encrypted-file-store.mjs`) reescribe el fichero
entero en cada mutación, y una sola petición hace varias. La línea base de la fase 4
(`docs/auditoria/2026-11/linea-base-fase-4.md`, apartado 5) lo midió:

- Añadir al carrito con sesión nueva son **4 volcados**; con sesión existente, 2; un «me
  mola», 1; un mensaje a Rocky IA, 1.
- El fichero crece con las sesiones vivas, que duran 30 días. Con 1.000 sesiones pesa
  1,4 MB y cada alta de carrito escribe 5,35 MB y tarda 22,7 ms en vez de 2. **Mil altas
  escribieron 2,75 GB.**
- Leer el perfil Crew también escribe (H-096): `getProfile` guarda el perfil en cada
  lectura, y la aplicación lo pide en cada carga con cliente identificado.

En un disco lento o en una tarjeta SD, eso es latencia y desgaste que crecen con el
éxito de la web, y todas las mutaciones esperan en una sola cola mientras dura cada
volcado. Es de **nivel 3**: toca cómo se guardan sesiones, tokens de cliente, emails de
avisos y créditos Crew.

## What Changes

- **Dos clases de escritura.** Las *confirmadas* se comportan como hoy: la operación no
  termina hasta que el dato está en disco. Las *diferidas* terminan al actualizar la
  memoria y llegan al disco, agrupadas, en 5 s como mucho o al apagar.
- **Por defecto, confirmada.** Solo pasan a diferidas las escrituras cuya pérdida en una
  caída brusca es inocua: crear o refrescar una sesión, la idempotencia y el `cartId`
  del carrito, el historial del chat, las transacciones de login y los «me mola».
  Créditos y canjes Crew, avisos, tokens de cliente, publicar o retirar un beat, cerrar
  sesión y rotarla siguen siendo confirmadas.
- **Un volcado sirve a todas las escrituras pendientes**, confirmadas o diferidas.
- **Apagado ordenado:** al recibir `SIGTERM` o `SIGINT` se vuelca lo pendiente, como ya
  hace la pared compartida.
- **Leer deja de escribir:** el perfil Crew solo se guarda cuando es nuevo o cambia el
  nombre (H-096).
- **Menos estado:** las operaciones de carrito ya completadas se recuerdan 15 minutos en
  vez de 24 horas, y los registros caducados se podan al volcar, no en cada mutación.
- **Más robusto que hoy:** cada volcado se sincroniza con el disco antes de sustituir al
  fichero, y los temporales que deja una caída se limpian al arrancar.

El formato del fichero no cambia.

## Capabilities

### New Capabilities

- `almacen-de-estado`: qué garantiza el almacén cifrado al escribir, qué puede perderse
  en una caída, cuánto disco gasta y cómo se apaga.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- Cambiar el formato del fichero, partirlo o pasar a una base de datos (alternativas en
  `design.md`).
- La pared compartida, que ya escribe con retraso en su propio fichero.
- **Dos escritores sobre el mismo fichero.** `scripts/enviar-avisos.mjs --apply` abre su
  propia copia del almacén y escribe mientras el servidor sigue en marcha; el servidor
  no relee el disco, así que su siguiente volcado deshace las marcas del script. Es un
  fallo anterior a este cambio y no lo empeora; queda anotado para un cambio propio.
- La sonda de salud que no detecta un fichero dañado después del arranque (H-159).

## Supuestos

- Perder, en una caída brusca, hasta 5 s de escrituras diferidas es aceptable. Las
  consecuencias están enumeradas en `design.md`: una sesión recién creada que hay que
  volver a crear, un carrito recién creado que queda huérfano en Shopify, un «me mola» o
  un mensaje de chat que no consta.
- El cliente seguirá generando un `operationId` nuevo en cada llamada al carrito
  (`src/api/shopify.js`), así que una ventana de idempotencia de 15 minutos cubre de
  sobra los reintentos de red.

## Impact

`server/storage/` (almacén cifrado, almacén en memoria y sus pruebas),
`server/services/sessions.mjs`, `cart-operations.mjs`, `beats.mjs`, `crew/rewards.mjs`,
`chat/orchestrator.mjs`, `server/integrations/shopify/customer-account.mjs`,
`server/index.mjs` (apagado), y `README.md`, `SECURITY.md` y `docs/ops/` donde describen
el estado cifrado. Sin cambios en la API ni en el cliente. Sin dependencias nuevas. Sin
migración de datos: el fichero de hoy sirve tal cual y la versión anterior del servidor
puede leer el que deje la nueva.
