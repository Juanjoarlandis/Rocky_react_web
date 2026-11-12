# Proposal

## Why

La CI de `main` sale roja desde el 11-nov por `server/app.pared.test.mjs`, y cada vez falla una
prueba distinta: «deshacer y borrar solo tocan lo propio» (404 en vez de 403 o de 204) y «tres
sesiones nuevas desde la misma red cuentan como un solo reporte» (400 en vez de 202). En local y
dentro de la imagen de producción pasan.

La causa no está en las pruebas. Al arrancar, el servidor lee el fichero de la pared
(`pared.enc`). Las cuatro rutas que escriben (pintar, deshacer, borrar lo propio y reportar) pasan
por la comprobación de pared activa (`activa` en `server/http/routes/pared.mjs`) antes de esperar
a esa carga. Lo que llega mientras tanto recibe «La pared compartida está apagada» (404
`WALL_DISABLED`), aunque no lo esté. En la CI, con el resto de la suite en paralelo, la primera
escritura de una prueba llega a veces antes de que acabe la carga. La prueba sigue sin el `id` o la
firma, y falla más adelante.

En producción pasa lo mismo en los primeros instantes tras cada arranque o cada release: un trazo
o un reporte enviado entonces se pierde con un mensaje falso.

El usuario pidió arreglarlo el 12-nov («Sí, arréglala»), tras llevar `main` hasta la release
publicada.

## What Changes

- **Lo que llega mientras la pared carga, espera.** Las rutas que escriben esperan a que se haya
  leído el fichero y solo entonces deciden si la pared está activa, igual que ya hacía la de leer.
- **Sigue sin aceptarse nada antes de leer el fichero**, como pide el diseño de
  `pared-compartida-neon` («lo que llegara antes se perdería al cargar»): solo cambia que se espera
  en vez de rechazarse.
- **Si tras cargar la pared resulta apagada o corrupta**, la respuesta sigue siendo 404
  `WALL_DISABLED`.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `pared-compartida`: lo que llega mientras se carga el fichero espera a la carga. Es un requisito
  añadido: la especificación de la pared aún no está archivada.

## Impact

- `server/http/routes/pared.mjs`: `activa` espera a `pared.listo`.
- `server/http/routes/pared.test.mjs` (nuevo): las rutas de escritura con una carga lenta.
- No cambia el cliente, ni el formato del fichero, ni la configuración. Las pruebas existentes no
  se tocan.
- No se publica en producción con este cambio: eso lo decide el usuario.

## Alternativas descartadas

- **Esperar a la carga antes de abrir el puerto** (`index.mjs`). Arreglaría producción, pero no la
  causa: `createApp` seguiría dejando entrar escrituras antes de tiempo, y todas las pruebas que
  la montan tendrían que esperar a mano.
- **Responder 503 «la pared se está cargando»**. Sería más honesto que 404, pero obligaría al
  cliente a reintentar algo que el servidor puede resolver esperando unos milisegundos.
- **Esperar en las pruebas antes de la primera escritura**. Taparía el fallo y lo dejaría en
  producción.

## Riesgos aceptados

- **La espera no tiene límite de tiempo.** Si la lectura del fichero no terminara nunca, las
  escrituras se quedarían esperando en vez de recibir un 404 rápido. Es una lectura local de un
  fichero pequeño, y la ruta de leer ya esperaba igual sin límite.
- **Una carga que falle de verdad da 500 en las escrituras, no 404.** La persistencia real recoge
  sus errores y marca el fichero como corrupto (y entonces se responde 404), así que solo pasaría
  con una persistencia que lance. Es lo mismo que ya hacía la ruta de leer.

