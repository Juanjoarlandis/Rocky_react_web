# Entorno E2 simulado — ROCKY 035 (auditoría 2026-11)

Ejecuta el **servidor real** del repo (`node server/index.mjs`, commit `7d2bf57`, sirviendo `dist/` y
`/api` en el mismo origen) contra un **doble local** de Shopify (Storefront, Customer Accounts, Admin)
y de OpenRouter, sin credenciales reales y sin salir a internet. No modifica nada del repo: todo vive en
esta carpeta (`e2sim/`), el estado cifrado incluido.

Todo resultado obtenido aquí es **«E2 simulado»**: valida el código de ROCKY 035 frente a un Shopify y un
OpenRouter que se comportan como se describe abajo, no frente a los servicios reales. La sección
[Qué no simula](#qué-no-simula-o-simplifica) marca el límite.

## Archivos

| Archivo | Qué es |
|---|---|
| `mock-preload.mjs` | Módulo de precarga (`NODE_OPTIONS=--import`). Sustituye `globalThis.fetch` en el proceso del servidor, responde a Shopify/OpenRouter con estado en memoria y bloquea cualquier otra salida (también `http/https.request`). |
| `fixtures.mjs` | Datos de prueba compartidos: tienda, catálogo, clientes, secretos ficticios, pedidos semilla. |
| `authz-code.mjs` | Firma/verificación del código de autorización simulado (Customer Accounts). |
| `start-e2sim.mjs` | `startE2Instance()`, proxy HTTPS, rutas de Playwright (`installE2Routes`, `openE2Page`, `launchE2Browser`) y CLI. |
| `send-webhook.mjs` | Firma y envía webhooks (`orders/paid`, …); construye pedidos desde líneas o desde el carrito. Módulo y CLI. |
| `verify-e2sim.mjs` | Verificación de punta a punta (escribe `verificacion.json` y `capturas/`). |
| `certs/` | Certificado autofirmado de `localhost` (EC P-256, 60 días) generado con `openssl` para el proxy HTTPS. |
| `state/` | Por instancia: `rocky-state-<puerto>.enc` (almacén cifrado), `control-<puerto>.json`, `calls-<puerto>.jsonl`. Se reinicia en cada arranque. |

## Arranque

Node: `/RUTA/A/node24`. Playwright 1.64.1 está en `../e1/node_modules`
(se importa con `createRequire`, ver ejemplo). Navegador: Chrome del sistema (`channel: 'chrome'`).

```js
import { createRequire } from 'node:module';
const E2 = '/RUTA/AL/SCRATCH/e2sim';
const { startE2Instance, launchE2Browser, openE2Page } = await import(`${E2}/start-e2sim.mjs`);
const { sendShopifyWebhook, orderPaidFromCart, buildOrderPaidPayload } = await import(`${E2}/send-webhook.mjs`);
const { chromium } = createRequire(`${E2}/../e1/package.json`)('playwright');

// HTTP (sin cuenta de cliente): web y API en http://localhost:3411
const inst = await startE2Instance(3411, { CHAT_RATE_LIMIT_MAX: '50' });
// HTTPS (todo activo): Express en 3413, web y API en https://localhost:3414
const sec = await startE2Instance(3413, { CHAT_RATE_LIMIT_MAX: '50' }, { https: true, httpsPort: 3414 });

const browser = await launchE2Browser(chromium);          // Chrome con barrera de red
const { context, page, routes, issues } = await openE2Page(browser, sec, { viewportName: 'movil' });
await page.goto(`${sec.origin}/mi-crew`);
// …
await browser.close();
await inst.stop();
await sec.stop();
```

`startE2Instance(port, envExtra = {}, { https = false, httpsPort = port + 1 } = {})` devuelve:

- `origin`: origen público (el que usa el navegador; `https://localhost:<httpsPort>` en modo HTTPS).
- `httpOrigin`: Express directo (`http://localhost:<port>`), para webhooks y llamadas de máquina sin `Origin`.
  En modo HTTPS las mutaciones del navegador deben ir por `origin` (`API_ALLOWED_ORIGINS` sólo lo admite a él).
- `setControl(obj)`, `patchControl(obj)`, `resetControl()`: inyección de fallos (ver abajo).
- `calls(filtro?)`, `unexpectedCalls()`: llamadas que el servidor hizo a los servicios simulados.
- `log`: stdout/stderr del servidor (sus logs JSON y los avisos `[e2sim]`). `stop()`: para proxy y proceso.

Entorno que fija (patrón de `../e1/harness.mjs`): todas las variables de `.env.example` con sus valores de
ejemplo **más** las que el servidor lee fuera de él (`BEATS_ADMIN_TOKEN`, `BEATS_*_RATE_LIMIT_*`,
`RESEND_API_KEY`, `AVISOS_FROM`, `AVISOS_REPLY_TO`, `AVISOS_BATCH_SIZE`), vacías, para que un `.env` en la
raíz del repo no se cuele (el harness de E1 no neutraliza estas últimas). Encima, los valores de E2:
`SHOPIFY_STORE_DOMAIN=rocky-dev.myshopify.com`, `SHOPIFY_API_VERSION=2026-07`, token Storefront privado,
`SHOPIFY_CLIENT_ID/SECRET`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`, `OPENROUTER_API_KEY` (todos ficticios,
en `fixtures.mjs` → `TEST_SECRETS`), `APP_ENCRYPTION_KEY` aleatoria por instancia,
`STATE_STORE_PATH=e2sim/state/rocky-state-<port>.enc`, `PUBLIC_ORIGIN = API_ALLOWED_ORIGINS = origin`,
`NODE_OPTIONS=--import <ruta absoluta a mock-preload.mjs>`. `NODE_ENV=development` y
`TRUST_PROXY_HOPS=0` salvo que `envExtra` diga otra cosa (`NODE_ENV=production` + `TRUST_PROXY_HOPS=1`
funciona en modo HTTPS: comprobación E1).

Límites: son los de `.env.example` (p. ej. `CHAT_RATE_LIMIT_MAX=5` por 10 min y
`SHOPIFY_RATE_LIMIT_MAX=120`/min **por IP**; todo Playwright sale de loopback). Súbelos con `envExtra` si un
recorrido no trata de límites. `CHAT_TIMEOUT_MS=2000` acorta las pruebas de timeout.

CLI para uso manual: `node start-e2sim.mjs --port 3411 [--https [--https-port 3412]]` (Ctrl+C para parar).

**Puertos.** La verificación usa 3401–3410 (C/D/E incluidos). Para los recorridos de E2, una instancia por
agente: HTTP en un puerto (p. ej. 3411) o pareja HTTPS (3413/3414, 3415/3416, 3417/3418). No lances
`verify-e2sim.mjs` a la vez que recorridos en 3401–3410.

## Qué simula

**Storefront API** (`POST https://rocky-dev.myshopify.com/api/<versión>/graphql.json`), por nombre de operación:
`RockyProducts` (paginación `first`/`after` con cursor opaco, `hasNextPage`, `quantityAvailable` sólo con
`includeQuantity`), `RockyCart`, `RockyCartCreate`, `RockyCartLinesAdd`, `RockyCartLinesUpdate`
(cantidad 0 elimina), `RockyCartLinesRemove`. IDs con la forma real:
`gid://shopify/Cart/<token>?key=<clave>`, `gid://shopify/CartLine/<uuid>?cart=<token>`,
`checkoutUrl = https://rocky-dev.myshopify.com/cart/c/<token>?key=<clave>`. Importes en EUR con el formato
Decimal de Shopify (`"35.0"`, `"29.9"`). Valida el token privado (`Shopify-Storefront-Private-Token`; uno
erróneo → 401) y registra si llega `Shopify-Storefront-Buyer-IP`. Stock: una variante sin unidades
no se añade (`MERCHANDISE_OUT_OF_STOCK`); pedir más de lo que hay deja la cantidad en el máximo
(`MERCHANDISE_NOT_ENOUGH_STOCK`); variante inexistente o carrito/línea ajenos → `userErrors`
(`INVALID`, `INVALID_MERCHANDISE_LINE`) sin aplicar nada. La misma variante se fusiona en una línea.

**Customer Account API**: descubrimiento OpenID (`/.well-known/openid-configuration`) y de API
(`/.well-known/customer-account-api`), JWKS (ES256, clave efímera por proceso), endpoint de token
(`authorization_code` con PKCE S256, `redirect_uri` y `client_id` comprobados, código de un solo uso;
`refresh_token` con rotación), GraphQL `customer { id displayName firstName lastName emailAddress }` con el
token en `Authorization`. El paso **authorize** lo resuelve Playwright (ver HTTPS). Logout: el
`end_session_endpoint` lo atiende la ruta de Playwright y vuelve a `post_logout_redirect_uri`.

**Admin API**: `POST /admin/oauth/access_token` (client credentials con el id/secreto ficticios) y GraphQL
con `orders(…)`, `shop` y `currentAppInstallation` (pedido semilla `#E2-0901`). **El servidor no llama a
Admin en ejecución** (sólo `scripts/seed-drop4.mjs` usa `createAdminClient`; Crew acredita por webhook): el
doble está para detectarlo si alguien lo hiciera.

**OpenRouter** (`POST https://openrouter.ai/api/v1/chat/completions`): respuesta con la forma de
`chat.completion` (`choices[0].message.content`, `finish_reason`, `usage.cost: 0`, `model` = modelo que
respondió). Comprueba `Authorization: Bearer <clave ficticia>` y registra por llamada si se cumplen los
invariantes del servidor (`freeOnly`, `maxPriceZero`, `usageInclude`, `reasoningOff`). Respuestas
deterministas y breves en castellano según palabras clave del último mensaje del usuario (saludo, drop,
descuento, Colmena/beats, Crew, y nivel/XP/tickets usando el bloque «PERFIL CREW VERIFICADO» si el
servidor lo envía). La barra de la mesa recibe siempre los mismos cuatro versos válidos. Un modelo que no
sea `:free` respondería con `usage.cost > 0` (salta el cortacircuitos).

**Bloqueo**: cualquier `fetch` a otro host lanza `TypeError("e2sim: salida a internet bloqueada (no
prevista): …")`; `http/https.request|get` a un host no loopback lanza un `Error` con el mismo texto. Una ruta
no simulada en un host conocido → 404 `E2SIM_NOT_SIMULATED`; una operación GraphQL desconocida → error
`E2SIM_UNSUPPORTED`. Todo ello se anota con `unexpected: true` en `calls-<puerto>.jsonl` y en el log.

## Datos de prueba

Catálogo (orden de creación descendente, que es el que pide el servidor). La web pide `first=8`: **LEVEL
ORANGE y Mugshot sólo los ven la API y Rocky IA** (que pide `first=50`). Variantes: `gid://shopify/ProductVariant/<id>`,
o alias `handle/talla` en las utilidades (`rocky-racing/M`, `35-red/Default Title`).

| # | handle | Título | Drop | Precio (EUR) | Stock por talla | Imagen | Variantes |
|---|---|---|---|---|---|---|---|
| 1 | `rocky-racing` | RockyRacing | ROCKY DROP 4 | 39.0 | S=25, M=30, L=30, XL=20 (**varias tallas**) | sí | `903500101`…`903500104` |
| 2 | `rockydz-boyz` | Rockydz boyz | ROCKY DROP 4 | 35.0 | S=12, M=3, L=2, XL=1 (**stock limitado**) | sí | `903500201`…`903500204` |
| 3 | `smoker-edition` | Smoker Edition | ROCKY DROP 4 | 45.0 | todo 0 (**agotado**) | sí | `903500301`…`903500304` |
| 4 | `35-red` | 35 RED | ROCKY DROP 4 | 29.9 | Default Title=8 (variante única) | no | `903500401` |
| 5 | `35-white` | 35 WHITE | ROCKY DROP 4 | 29.9 | S=0, M=5, L=6, XL=0 (tallas agotadas) | no | `903500501`…`903500504` |
| 6 | `dwag` | DWAG | ROCKY DROP 4 | 32.5 | 10 por talla | no | `903500601`…`903500604` |
| 7 | `danger` | Danger | ROCKY DROP 4 | 35.0 | M=4, L=4 | no | `903500701`…`903500702` |
| 8 | `flora-blue` | Flora Blue | ROCKY DROP 4 | 34.0 | S/M/L=7 | no | `903500801`…`903500803` |
| 9 | `level-orange` | LEVEL ORANGE | ROCKY DROP 3 | 38.0 | 5 por talla | no | `903500901`…`903500904` |
| 10 | `mugshot` | Mugshot | ROCKY DROP 3 | 35.0 | M=1, resto 0 | no | `903501001`…`903501004` |

Las imágenes apuntan a `https://cdn.shopify.com/s/files/1/0903/5003/5035/files/<archivo>` (lo único que admite
la CSP) y la ruta de Playwright las sirve desde `dist/products/`. `SHOPIFY_EXPOSE_QUANTITY=false` (valor de
`.env.example`): `quantityAvailable` llega `null`; pon `'true'` en `envExtra` para verlo.

Clientes (Customer Accounts; el `id` es la identidad de Crew):

| Clave | id | Nombre | Email | Para qué |
|---|---|---|---|---|
| `ana` (por defecto) | `gid://shopify/Customer/7035000001` | Ana Prueba | ana.prueba@example.test | recorrido normal |
| `leo` | `gid://shopify/Customer/7035000002` | sin nombre (displayName = email) | leo@example.test | la web debe caer a «Miembro 035» |
| `nuria` | `gid://shopify/Customer/7035000003` | Nuria | nuria.crew@example.test | segundo perfil Crew |

Elige el cliente con `openE2Page(browser, inst, { customer: 'leo' })` o `routes.setCustomer('leo')` antes del
login. Todos los perfiles Crew empiezan a 0 XP en cada arranque.

Secretos ficticios (`fixtures.mjs` → `TEST_SECRETS`): token Storefront, `SHOPIFY_CLIENT_ID/SECRET` (el
secreto firma los webhooks), `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`, `OPENROUTER_API_KEY` y una contraseña
para la puerta privada (`SITE_ACCESS_PASSWORD`, sólo si un recorrido activa `SITE_ACCESS_ENABLED=true`).

## Cuenta de cliente por HTTPS (Playwright)

El servidor sólo activa Customer Accounts con `PUBLIC_ORIGIN` HTTPS. Con `{ https: true }` se levanta en el
proceso de las pruebas un proxy `https://localhost:<httpsPort>` → Express, con el certificado de `certs/`;
**conserva `Host`** (el login exige el host canónico) y añade `X-Forwarded-Proto/Host` y un
`X-Forwarded-For` encadenado (con `TRUST_PROXY_HOPS=1` se puede auditar la suplantación de IP como detrás
de Cloudflare).

En Playwright usa siempre `launchE2Browser(chromium)` + `openE2Page(...)`, o replica lo que hacen:

1. `browser.newContext({ ignoreHTTPSErrors: true, proxy: OFFLINE_PROXY, ... })` — acepta el certificado
   autofirmado y pone una **barrera de red**: todo lo que no sea loopback va a un proxy inexistente
   (`127.0.0.1:9`) y falla con `ERR_PROXY_CONNECTION_FAILED`.
2. `installE2Routes(context, inst, { customer, decision })` **antes** de abrir páginas. Resuelve:
   - `GET <origin>/api/shopify/account/login`: pide la respuesta real del servidor sin seguir la redirección
     (`route.fetch({ maxRedirects: 0 })`), valida la URL de authorize que generó (`response_type=code`,
     `client_id`, `redirect_uri` registrada = `<origin>/api/shopify/account/callback`, PKCE S256, `state`,
     `scope` con `openid`) y sustituye el salto a Shopify por un 302 directo al callback con `code` y
     `state`, **conservando el `Set-Cookie`** de la sesión que liga el state. Con `decision: 'deny'` el
     callback recibe `error=access_denied&state=…`. Motivo: Playwright sólo enruta la primera URL de una
     cadena de redirecciones, así que una ruta sobre `shopify.com/…/authorize` nunca se ejecutaría.
   - `shopify.com/authentication/<id>/oauth/authorize` (si se navega directamente): la misma lógica.
   - `shopify.com/authentication/<id>/logout`: 302 a `post_logout_redirect_uri` si es el origen (anota si
     llegó `id_token_hint`).
   - `cdn.shopify.com/...`: imágenes desde `dist/products/`.
   - `rocky-dev.myshopify.com/...`: página «Checkout simulado (E2)» (`[data-e2sim="checkout"]`).
   - Resto de hosts: `route.abort('blockedbyclient')` y se anota en `routes.blocked`.
3. Recorrido: `page.goto(origin + '/mi-crew')` → enlace «Entrar en la Crew» → callback 302 → `/mi-crew`
   con el carnet de Ana. `context.request` comparte cookies: `context.request.get(origin + '/api/shopify/account')`.
   Las mutaciones con `context.request` necesitan `headers: { Origin: inst.origin }`.

`routes.authorizations`, `routes.logouts`, `routes.checkouts` y `routes.blocked` sirven de evidencia.

## Webhooks y compras de Crew

```js
// Pedido pagado a partir del carrito de la sesión (la compra «real» del recorrido)
const cart = (await (await context.request.get(`${sec.origin}/api/shopify/cart`)).json()).cart;
await sendShopifyWebhook({ baseUrl: sec.httpOrigin, payload: orderPaidFromCart(cart, { customer: 'ana' }) });
// O a mano
await sendShopifyWebhook({ baseUrl: sec.httpOrigin,
  payload: buildOrderPaidPayload({ customer: 'ana', lines: [{ variant: 'rocky-racing/M', quantity: 2 }] }) });
```

Cabeceras: `X-Shopify-Hmac-Sha256` (HMAC-SHA256 base64 del cuerpo crudo con el secreto ficticio), `Topic`,
`Shop-Domain`, `Api-Version` (2026-07), `Webhook-Id`, `Event-Id`, `Triggered-At`. Variantes negativas:
`tamper: 'hmac'` (firma rota), `tamper: 'body'` (cuerpo alterado tras firmar), `shopDomain`, `apiVersion`,
`topic`, `webhookId` repetido (deduplicación), `customer: null` (invitado), `currency: 'USD'`,
`totalOverride`. XP = euros completos del total; tickets = euros/10.

CLI: `node send-webhook.mjs --url http://localhost:3413 --customer ana --line rocky-racing/M:2 --line dwag/L
[--topic orders/paid] [--webhook-id X --times 2] [--bad-hmac] [--shop otra.myshopify.com]
[--api-version 2026-04] [--currency USD] [--no-customer]`. Envía a Express directo (`httpOrigin`); también
admite la URL HTTPS del proxy.

## Forzar errores

**Archivo de control** (`inst.setControl(obj)` / `patchControl` / `resetControl`; el doble lo relee en cada
petición, sin reiniciar):

```js
inst.setControl({
  latencyMs: 0,                                   // latencia para todo
  storefront: {
    mode: 'ok',                                   // modo para todas las operaciones
    latencyMs: 800,
    ops: { RockyCartLinesAdd: 'http500' },        // modo por operación
    failNext: [{ op: 'RockyCart', mode: 'timeout', times: 1 }], // se consume
    inventory: { 'rockydz-boyz/M': 0, 'gid://shopify/ProductVariant/903500101': 2 }, // stock en caliente
  },
  customerAccount: {
    mode: 'ok', ops: { token: 'reject' },         // ops: openid | customer-account-api | jwks | token | graphql
    idToken: 'badSignature',                      // ok | badSignature | unknownKid | wrongNonce | wrongAudience | wrongIssuer | expired | missing
    tokenExpiresIn: 31,                           // segundos; el servidor refresca con ≤ 30 s de vida, pero
  },                                              // su caché de perfil (60 s) puede retrasar la lectura
  admin: { mode: 'ok' },                          // ops: token | graphql
  openrouter: { mode: 'ok', latencyMs: 0, failNext: [{ op: 'chat', mode: 'down' }] }, // op: chat | barra
});
```

Modos de transporte (todos los servicios): `timeout` (no responde hasta que el cliente aborta: 15 s
Shopify, `CHAT_TIMEOUT_MS` OpenRouter), `network` (fallo de red), `malformed` (cuerpo no JSON), `http500`,
`http502`, `http503`, `throttled` (429), `unauthorized` (401), `forbidden` (403). Storefront además:
`graphqlError`, `graphqlThrottled` (200 con `THROTTLED`), `userError` (mutaciones). Token de Customer
Accounts: `reject` (`invalid_grant`).

**OpenRouter**, con esta precedencia:

1. Marcador en el mensaje del usuario: `#e2sim:<modo>` (útil desde el navegador; p. ej. `#e2sim:fail hola`).
2. Control `openrouter` (`failNext`, `ops`, `mode`).
3. Nombre de modelo en `OPENROUTER_MODELS` (vía `envExtra`, todos deben acabar en `:free`):
   `e2sim/down-<x>:free` está caído y se pasa al siguiente de la lista; si todos lo están → 503
   («todos los modelos caídos»); `e2sim/<modo>:free` aplica ese modo cuando es el que responde.
4. `E2SIM_OPENROUTER_MODE` en `envExtra`.

Modos: `ok`, `down` (503), `fail` (500), `ratelimit` (429), `unauthorized` (401), `timeout`, `network`,
`malformed`, `cost` (`usage.cost = 0.00042`: dispara el cortacircuitos y pausa Rocky IA hasta reiniciar la
instancia), `nocost` (sin `usage.cost`), `empty` (contenido vacío), `english` (texto de «razonamiento» en
inglés), `length` (`finish_reason: length`).

**Registro de llamadas**: `inst.calls()` devuelve, por llamada saliente del servidor, servicio, operación,
estado, fallo aplicado, `auth`/`buyerIp` (Storefront), `pkce`/`origin` (token), `models`/`usedModel`/
`invariants` (OpenRouter) y `unexpected`. Nunca guarda tokens, cuerpos ni datos de cliente salvo la clave
del cliente de prueba.

## Qué no simula o simplifica

Lo que sigue define el alcance de un resultado «E2 simulado».

Shopify Storefront
- No interpreta GraphQL: reconoce las seis operaciones por nombre y devuelve la forma de las consultas
  actuales del servidor. Un campo nuevo en la consulta no aparecerá; una operación nueva fallará con
  `E2SIM_UNSUPPORTED` (y quedará registrada).
- Catálogo fijo de 10 productos en un orden fijo (no aplica `sortKey`), sin colecciones consultables,
  `descriptionHtml`, metafields, mercados, traducciones ni conversión de moneda. Sólo EUR.
- Sin coste de consulta, cupos ni throttling reales (sólo si se fuerzan). Acceso sin token aceptado.
- Carritos en memoria del proceso: se pierden al reiniciar la instancia (la sesión seguiría apuntando a un
  carrito que ya no existe). Sin caducidad de carritos, buyer identity, descuentos, envío ni impuestos:
  `totalAmount = subtotalAmount`.
- El stock no se reserva ni se descuenta (ni por carritos, como en Shopify, ni por pedidos, que aquí no
  existen); sólo cambia con `inventory` en el control.
- Códigos de aviso/error del enum real, pero **mensajes en inglés aproximados** y `target` aproximado. El
  texto exacto que mostraría la web con Shopify real puede diferir.
- Checkout: sólo se valida la URL; la página es un marcador. No hay pago, ni pedido, ni webhook automático:
  la compra se simula enviando `orders/paid` a mano.

Customer Accounts
- No hay pantalla de Shopify (login, código por email, consentimiento): el navegador nunca visita
  shopify.com; el salto se resuelve en la ruta de Playwright del login. Lo que sí se ejerce es la URL de
  authorize que genera el servidor, el callback, PKCE, state ligado a sesión, nonce y la verificación del
  ID token.
- `Origin` del token modelado como «JavaScript origin registrado = `PUBLIC_ORIGIN`».
- ID token ES256 con claims aproximadas (`iss`, `aud`, `sub` = GID, `nonce`, `iat`, `exp`, `sid`, `dest`,
  `email`). La forma de los documentos de descubrimiento es aproximada.
- El logout no revoca tokens en el doble (el `end_session` es sólo una redirección del navegador).
- GraphQL de cliente: sólo `customer { id displayName firstName lastName emailAddress }`.

Admin y webhooks
- Admin: sólo client credentials y lecturas `orders`/`shop`/`currentAppInstallation` con un pedido semilla;
  sin mutaciones (`scripts/seed-drop4.mjs` no funcionaría).
- Webhooks: no hay entregas de Shopify ni reintentos/orden de entrega; carga útil REST recortada a lo que
  usa el servidor más campos habituales.

OpenRouter
- No hay modelo: respuestas por plantillas. **No evalúa calidad, tono, seguimiento del prompt ni
  resistencia del modelo a inyecciones**; sí ejerce las defensas del servidor (bloqueo de manipulación,
  normalización, catálogo verificado, contexto Crew, límites, cortacircuitos, timeouts).
- Fallback entre modelos simplificado (`e2sim/down*`), cuerpos de error aproximados, sin streaming, sin
  latencia salvo forzada, tokens de uso aproximados (caracteres/4), sin los límites reales de los modelos
  gratuitos.

Red y despliegue
- TLS autofirmado aceptado con `ignoreHTTPSErrors`; HTTP/1.1; sin Cloudflare (sin `CF-Connecting-IP`,
  caché, WAF ni HSTS de borde). El proxy es un proceso de Node, no el de producción.
- Terceros del navegador bloqueados (p. ej. el iframe de Spotify de `/estudio` no cargaría).
- Una sola instancia y estado nuevo en cada arranque.

## Verificación (8-11-2026)

`node verify-e2sim.mjs` (≈ 1 min; instancias en 3401–3410, Chrome con barrera de red). Resultado:
**32 comprobaciones, 0 fallos** (3 marcadas OBSERVADO, informativas). Detalle en `verificacion.json`;
capturas en `capturas/` (`a6-carrito.png`, `a9-rocky-ia.png`, `b2-mi-crew.png`).

| id | Comprobación | Resultado | Evidencia |
|---|---|---|---|
| D1 | El doble bloquea salidas no previstas (fetch y http.get) | OK | fetch → «e2sim: salida a internet bloqueada (no prevista): fetch GET https://example.com/»; http.get → mismo error (la petición no sale: se lanza antes) |
| D2 | Doble Admin (proceso aislado) | OK | secreto erróneo → 401; token con `read_orders`; `orders` → `#E2-0901` |
| D3 | Doble Customer Accounts (proceso aislado) | OK | PKCE erróneo → 400; código válido → 200 (nonce y `sub` de Nuria en el ID token); código reutilizado → 400; Origin ajeno → 400; refresh rota el token y el viejo → 400; GraphQL → «Nuria» |
| A1 | `GET /api/shopify/status` (HTTP) | OK | `mode: shopify`; catalog/cart/admin/webhooks `true`; customerAccounts `false` (esperado sin HTTPS) |
| A2 | Listado de productos | OK | first=8 → 8 (hasNextPage=true); first=50 → 10; agotado: smoker-edition; precio `{"amount":"39.0","currencyCode":"EUR"}` |
| A3 | Ficha → talla M → «Añadir al carrito» (navegador) | OK | POST /cart/lines → 200; línea RockyRacing M x1; total 39.0 EUR |
| A4 | Ficha agotada | OK | botón «Agotado» deshabilitado |
| A5 | Stock limitado (XL de Rockydz boyz, 1 ud.) dos veces | OK | aviso `MERCHANDISE_NOT_ENOUGH_STOCK`; la web muestra «Only 1 items were added to your cart due to availability.» |
| A6 | Carrito: +1, −1 y eliminar (navegador) | OK | cantidades 1→2→1; DELETE → 200; queda RockyRacing |
| A7 | `POST /api/shopify/checkout` | OK | 200, `https://rocky-dev.myshopify.com/cart/c/<token>?key=<…>` (host permitido) |
| A8 | «Ir al pago seguro» | OK | navega al checkout simulado en rocky-dev.myshopify.com |
| A9 | Rocky IA en el navegador | OK | «hola» → 200 («Qué pasa, colega…»); «¿Qué camisetas tenéis?» → 200 con tarjetas; `#e2sim:fail` → 502 y la web muestra su mensaje de error |
| A10 | El navegador no sale a internet | OK | ninguna petición externa fuera de las simuladas |
| A10b | Errores de consola en el recorrido | OBSERVADO | sólo los del 502 forzado de A9 |
| A11 | Rocky IA API: timeout, todos caídos, rate limit, barra | OK | timeout → 502 en 2004 ms (`CHAT_TIMEOUT_MS=2000`); down → 502; ratelimit → 502; barra → 200 con 4 versos |
| A12 | Webhook `orders/paid` firmado | OK | 200 `{"accepted":true,"duplicate":false}`; mismo id → `duplicate:true`; HMAC roto → 401; otra tienda → 403 |
| A13 | Cortacircuitos de coste | OK | con coste → 502 «…no se pudo verificar el coste cero.»; siguiente → 503 «…pausado por seguridad…» |
| A15 | Control en caliente | OK | `inventory` pone dwag S agotada; 500 simulado en cartLinesAdd → 502; mismo `operationId` → 409 (queda «ambiguo»); nuevo → 200; S agotada → `MERCHANDISE_OUT_OF_STOCK` |
| A14 | Sin llamadas no previstas (servidor) | OK | 38 llamadas, 0 no previstas; invariantes OpenRouter cumplidos en todas |
| C1 | Primer modelo caído | OK | 200; respondió `google/gemma-4-31b-it:free` |
| C2 | Todos los modelos caídos | OK | 502 «La IA no está disponible ahora mismo.» |
| B1 | `GET /api/shopify/status` por HTTPS | OK | las cinco capacidades a `true` |
| B2 | Login /mi-crew → authorize simulado → callback → /mi-crew | OK | callback 302 a /mi-crew; carnet «Ana Prueba» visible |
| B3 | `GET /api/shopify/account` | OK | `loggedIn: true`, `gid://shopify/Customer/7035000001` |
| B4 | Compra Crew: carrito → `orders/paid` → saldo | OK | carrito 110.5 EUR; webhook 200; XP 0→110, 11 tickets, nivel «Del Barrio» |
| B5 | Rocky IA con perfil Crew | OK | «Vas por el nivel Del Barrio con 110 XP y 11 Crew Tickets…» |
| B6 | Logout desde Mi Crew | OK | end_session con `id_token_hint`, vuelta al origen; `loggedIn: false` |
| B6b | Bloqueos/errores en el recorrido HTTPS | OBSERVADO | ninguno |
| B7 | ID token con firma ajena | OK | callback → 401 `INVALID_ID_TOKEN`; sin sesión |
| B8 | Cliente cancela en Shopify (`error=access_denied`) | OBSERVADO | callback → 400 JSON `{"message":"Callback OAuth incompleto.","code":"INVALID_CALLBACK"}` |
| B9 | Sin llamadas no previstas (HTTPS) | OK | 0 no previstas |
| E1 | HTTPS con `NODE_ENV=production` y `TRUST_PROXY_HOPS=1` | OK | login correcto; cookie `__Host-rocky_session` (Secure); HSTS presente |

Observaciones para E2 (son de la web, no del entorno; confírmalas en los recorridos y, las que dependen
de textos de Shopify, con la tienda real):

- B8: si el cliente cancela en Shopify, el callback responde un JSON 400 crudo en lugar de volver a la web.
- A5: la web enseña tal cual el `message` de los avisos de Shopify, que llegan en inglés (el texto exacto
  aquí es aproximado; el comportamiento de mostrar `warning.message` es del código).
- B7: una firma inválida se informa como «Las claims del ID token no son válidas.» (mensaje genérico).
- La tienda sólo pide 8 productos: con un catálogo mayor, el resto no aparece en la web.

## Incidente durante la construcción (corregido)

En la primera ejecución de la verificación, y en una depuración posterior, Chrome llegó **5 veces** a
`https://shopify.com/authentication/90350035/oauth/authorize?…` (B2, B7, B8, E1 y la depuración): el 302
del servidor no pasaba por la ruta de Playwright (sólo enruta la primera URL de una cadena de
redirecciones). Shopify respondió 404 «Store unavailable»; viajaron sólo valores ficticios (client_id de
prueba, `state`, `nonce` y `code_challenge` aleatorios, `redirect_uri` a localhost) y las fuentes y el
favicon de esa página fueron bloqueados. El proceso del servidor nunca salió a internet. Corregido con la
ruta del login (`route.fetch({ maxRedirects: 0 })`) y la barrera de red `OFFLINE_PROXY`; la segunda
verificación completa no registró ninguna petición externa.
