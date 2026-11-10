# Diseño: almacén con escritura agrupada

## Context

Ver `proposal.md` para el motivo y las cifras. Lo que condiciona el diseño (leído en el
código el 2026-11-10):

- **Interfaz.** `EncryptedFileStore` y `MemoryStore` ofrecen `probe`, `get`, `set`,
  `delete`, `consume` y `setIfAbsent`. No hay forma de enumerar claves. Los valores
  entran y salen clonados. Los crea `server/storage/create-store.mjs`; también los
  instancian `server/services/pared/persistencia.mjs` (otro fichero, `pared.enc`),
  `scripts/exportar-avisos.mjs` y `scripts/enviar-avisos.mjs`.
- **Escritura de hoy.** Cada mutación entra en una cola serie, poda todos los registros
  caducados, hace `JSON.stringify` del estado entero, lo cifra (AES-256-GCM, IV nuevo),
  lo pasa a base64 y lo escribe en un temporal que renombra sobre el fichero. No hay
  `fsync` ni limpieza de temporales. Si el volcado falla, se descarta el estado en
  memoria y la siguiente operación relee el disco.
- **Formato.** Sobre `{ version: 1, iv, tag, ciphertext }`; dentro,
  `{ version: 1, namespaces: { ns: { clave: { value, expiresAt } } } }`.
- **Qué fijan las pruebas** (`server/storage/encrypted-file-store.test.mjs`): ida y
  vuelta sin texto claro, 20 `set` concurrentes sin pérdidas, `consume` y `setIfAbsent`
  de un solo uso, clave inválida, un solo descifrado y «cada mutación llega al disco:
  otra instancia con la misma clave lo ve».
- **Quién escribe.** `sessions` (alta, refresco de `lastSeenAt` cada 5 min, `save`,
  `rotate`, `destroy`), `cartOperations` (pendiente, completada con la respuesta entera
  del carrito, ambigua; 24 h), `webhooks` (90 días), `crewProfiles`, `customerTokens`,
  `oauthTransactions` (10 min), `avisos` (lista e índice), `beats` (registro e índice) y
  `shopifyLifecycle`.
- **De dónde salen los 4 volcados** de un alta de carrito con sesión nueva: alta de la
  sesión, operación pendiente, `cartId` en la sesión y operación completada.
- **Qué pasa si se pierde la última escritura:**
  - Crédito Crew de un `orders/paid`: se pierde para siempre, porque el servidor ya
    respondió 200 y Shopify no reintenta. El abono se deduplica por pedido dentro del
    propio perfil, no por el registro `webhooks`.
  - Aviso: el email no queda apuntado aunque se respondió `ok`.
  - Token de cliente tras un refresco: queda en disco uno ya gastado y hay que volver a
    iniciar sesión.
  - Sesión nueva: la cookie no encuentra registro y se crea otra.
  - `cartId`: el carrito de Shopify queda huérfano y el siguiente «añadir» crea otro.
  - Idempotencia del carrito: el cliente genera un `operationId` nuevo en cada llamada,
    así que perderla no repite nada.
  - Puerta de acceso y Taller: su permiso lleva un secreto por proceso; cualquier
    reinicio ya los invalida.
- **Precedente.** La pared compartida guarda con 60 s de retraso desde el primer cambio
  pendiente, reintenta si falla y vuelca al apagar (`persistencia.mjs`,
  `server/index.mjs`). `stop_grace_period` es de 20 s y el cierre forzado, a los 10 s.
- **Operación.** `scripts/backup-estado.sh` y la promoción copian un único fichero
  normal; la documentación dice que copiar en caliente es seguro porque la escritura es
  atómica.

## Goals / Non-Goals

**Goals:**

- Que el disco escrito dependa del tiempo, no del número de mutaciones.
- Que ninguna petición de carrito, chat o «me mola» espere a un volcado.
- No debilitar nada de lo que hoy es duradero, y dejar por escrito qué no lo es.
- No tocar el formato ni la operación (copias, promoción, scripts).

**Non-Goals:**

- Que el coste de un volcado deje de depender del tamaño del estado.
- Resolver el segundo escritor de `enviar-avisos.mjs --apply`.
- Compartir el fichero entre procesos.

## Decisions

### D1. Escritura agrupada sobre el mismo fichero

El almacén sigue siendo un único fichero reescrito entero, pero las mutaciones dejan de
provocar un volcado cada una.

- *Por qué*: elimina casi todas las escrituras (de 4.000 volcados a unos pocos por cada
  1.000 altas) sin cambiar formato, copias, promoción ni scripts.
- *Alternativa descartada: registro de solo añadir con compactación.* Coste por
  mutación constante, pero son dos ficheros con un formato nuevo: rompe
  `backup-estado.sh`, la precondición de la promoción («el estado es un fichero
  normal»), los scripts de avisos y la vuelta atrás a la versión anterior.
- *Alternativa descartada: un fichero por namespace o por clave.* El de sesiones
  seguiría creciendo igual; por clave serían miles de ficheros sin enumeración ni copia
  atómica.
- *Alternativa descartada: SQLite (`node:sqlite`).* Resolvería también el segundo
  escritor, pero cambia el modelo de datos entero, obliga a cifrar valor a valor y
  depende de una API aún joven de Node. Es la opción a estudiar si el estado llega a
  decenas de MB; se anota en «Open Questions».

### D2. Dos clases, y confirmada por defecto

`set`, `delete`, `consume` y `setIfAbsent` aceptan una opción de durabilidad. Sin ella,
la escritura es confirmada: termina cuando su volcado ha terminado. Con la opción
diferida, termina al actualizar la memoria.

- *Por qué por defecto confirmada*: quien no elige obtiene lo de hoy. Los scripts, la
  pared y cualquier llamada futura siguen siendo duraderos sin tocarlos, y la prueba
  «cada mutación llega al disco» sigue valiendo sin cambios.
- `MemoryStore` acepta la opción y la ignora.

### D3. Qué es diferido

| Escritura | Clase | Si se pierde en una caída |
| --- | --- | --- |
| `sessions`: alta, `lastSeenAt`, `save` (`cartId`, `chatHistory`) | diferida | Sesión o carrito que se vuelven a crear; historial de chat que no consta |
| `sessions`: `rotate` y `destroy` | confirmada | — (un cierre de sesión no puede «deshacerse» en una caída) |
| `cartOperations`: todas | diferida | Nada: el cliente no reutiliza identificadores |
| `oauthTransactions` | diferida | El inicio de sesión en curso falla y se repite |
| `beats`: «me mola» y reporte | diferida | Un voto que no consta |
| `beats`: publicar y retirar | confirmada | — |
| `crewProfiles`, `avisos`, `customerTokens`, `webhooks`, `shopifyLifecycle` | confirmada | — |

- La puerta de acceso y el Taller usan `rotate`: confirmada.
- Un `orders/paid` hace dos escrituras confirmadas seguidas (`webhooks` y
  `crewProfiles`): dos volcados por pedido, como hoy.

### D4. Ventana de 5 s desde la primera escritura pendiente

Una escritura diferida programa un volcado a 5 s si no hay ninguno programado; no se
rearma con cada cambio. Una escritura confirmada vuelca de inmediato todo lo pendiente
y cancela el temporizador. Mientras un volcado está en curso, las escrituras que llegan
esperan al siguiente, que las lleva todas.

- *Por qué 5 s*: con 1.000 sesiones (1,4 MB) son como mucho 0,3 MB por segundo de
  escritura sostenida, y la ventana de pérdida sigue siendo corta. La pared usa 60 s,
  pero un trazo perdido importa menos que un carrito.
- *Alternativa descartada: 1 s.* Cinco veces más disco para ganar 4 s de una ventana
  que solo cuenta si el proceso muere.
- El temporizador lleva `unref()`: no mantiene vivo un script.
- La poda de caducados pasa de cada mutación al momento de volcar. Las lecturas ya
  ignoran lo caducado.

### D5. Si un volcado falla, se vuelve al disco

Se conserva la regla de hoy: un volcado fallido descarta el estado en memoria, de modo
que la siguiente operación relee el fichero. La escritura confirmada que esperaba
recibe el error; si no esperaba nadie, se registra con el logger, sin datos del estado.

- *Por qué*: mantiene el invariante «la memoria nunca va por delante del disco tras un
  fallo». Las escrituras diferidas pendientes se pierden, que es justo lo que su clase
  admite.
- *Alternativa descartada: conservar la memoria y reintentar.* Quien recibió el error
  no sabría si su dato acabará escrito; hoy todos los llamantes asumen que un error
  significa «no guardado».

### D6. `flush()` y apagado

El almacén gana `flush()`: vuelca lo pendiente y termina cuando está en disco.
`server/index.mjs` lo llama tras `server.close`, junto a `pared.volcar()`, dentro del
margen de 10 s que ya existe. `MemoryStore.flush()` no hace nada.

### D7. `fsync` y temporales

Cada volcado sincroniza el temporal antes de renombrarlo y el directorio después. Al
cargar, el almacén borra los temporales huérfanos de su propio fichero
(`<fichero>.<pid>.<uuid>.tmp`).

- *Por qué*: hoy un corte de luz puede dejar un fichero vacío o viejo aunque la
  operación se diera por buena, y una caída en mitad de un volcado deja un temporal del
  tamaño del estado para siempre. Con volcados contados, el `fsync` deja de ser caro.

### D8. Leer el perfil Crew no escribe

`getProfile` guarda solo si el perfil no existía o si cambia el `displayName`. La
prueba que exige que el nombre nuevo se guarde sigue valiendo.

### D9. Idempotencia del carrito: 15 minutos

El registro de una operación completada pasa de 24 h a 15 min; el ambiguo sigue en
10 min.

- *Por qué*: cada registro lleva la respuesta entera del carrito y es lo que más engorda
  el fichero por sesión. El cliente genera un identificador nuevo por llamada, así que
  solo protege de una entrega duplicada en segundos.
- Si alguna prueba fija las 24 h, se actualiza a 15 min: el requisito cambia aquí, a
  propósito.

## Risks / Trade-offs

- [Una caída brusca pierde hasta 5 s de sesiones, carritos, votos y chat] → Asumido y
  enumerado (D3). El apagado ordenado no pierde nada, y `servidor-ligero` quita la causa
  de caída que se ha medido (OOM).
- [Un cierre de sesión que no llega al disco] → `rotate` y `destroy` son confirmadas.
- [Dos volcados por pedido pagado] → Igual que hoy; son raros.
- [El volcado sigue costando lo que pesa el fichero] → Acotado a uno por ventana, y D9
  reduce el fichero. Si el estado crece a decenas de MB, toca reabrir D1.
- [Copia en caliente] → Sigue siendo un fichero entero y coherente. Puede no llevar los
  últimos 5 s de escrituras diferidas; se documenta en `docs/ops/`.
- [El script de avisos lee un fichero «atrasado»] → Los avisos son confirmados: los ve.
- [Segundo escritor] → No cambia: sigue pudiendo pisar y ser pisado. Queda documentado
  que `--apply` exige parar el servidor hasta que tenga su propio cambio.

## Migration Plan

- Sin migración: mismo formato y misma ruta.
- Despliegue: una release normal. El servidor nuevo lee el fichero existente.
- Vuelta atrás: `release:revertir`. La parada ordenada de la versión nueva vuelca lo
  pendiente antes de salir, y la versión anterior lee ese fichero sin cambios.
- Al ser nivel 3, antes de publicar: revisión de seguridad (`security-review`) y prueba
  de integración que mata el proceso con `SIGKILL` y con `SIGTERM`.

## Open Questions

- ¿A partir de qué tamaño de estado compensa pasar a `node:sqlite`? No cambia este
  diseño; se decide con el tamaño real del fichero de producción cuando se pueda medir.
