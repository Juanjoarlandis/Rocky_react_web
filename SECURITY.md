# Seguridad y preparación para Shopify

## Invariantes que no deben romperse

- Shopify es la única autoridad de identidad de variante, disponibilidad, precio, moneda, coste de carrito y checkout.
- React no contiene credenciales, no persiste tokens y no recibe el ID completo del carrito.
- No se aceptan documentos GraphQL arbitrarios desde HTTP; las operaciones públicas están fijadas en el servidor.
- Toda mutación de carrito exige un `Origin` exacto permitido, una sesión opaca y un identificador idempotente.
- Los callbacks y checkout solo usan HTTPS; los redirects de checkout se limitan por hostname.
- El cuerpo de webhook se verifica antes de parsear JSON.
- Las cuentas de cliente usan PKCE, state de un uso ligado a sesión, nonce, verificación de firma/claims y rotación de cookie.
- Los saldos Crew sólo cambian desde pedidos pagados con HMAC válido o mutaciones autenticadas; el navegador nunca decide XP, tickets ni propiedad de recompensas.
- Cada pedido y cada canje tienen claves idempotentes; los perfiles se almacenan cifrados bajo una clave derivada del Customer GID.
- Rocky IA acepta sólo el mensaje nuevo del navegador; el prompt, los roles y el historial son propiedad del servidor.
- Rocky IA sólo puede arrancar con modelos OpenRouter `:free` o `openrouter/free`; no existe fallback a pago.
- Una respuesta de IA con `usage.cost > 0` activa un cortacircuitos y detiene llamadas posteriores; si OpenRouter omite el campo en una ruta gratuita, el evento se registra.

## Secretos

No guardes `.env`, `.env.local`, el estado cifrado ni credenciales en Git. Usa el gestor de secretos del proveedor para:

- `APP_ENCRYPTION_KEY`
- `OPENROUTER_API_KEY`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` cuando sea privado
- `SHOPIFY_CLIENT_SECRET`

El repositorio tuvo archivos `.env`/`.env.enc` en commits anteriores. Borrarlos del árbol actual no invalida sus valores históricos. Antes de conectar una cuenta real:

1. Revoca y rota todas las credenciales que hayan aparecido en esos archivos.
2. Confirma en Shopify/OpenRouter que los valores anteriores ya no funcionan.
3. Purga los blobs históricos con un procedimiento coordinado de reescritura de historia y vuelve a clonar los despliegues; no lo hagas sobre una rama compartida sin acordarlo.
4. Activa el escaneo de secretos y protección de push del proveedor Git.

`npm run security:check` bloquea archivos de entorno, patrones de credenciales conocidos y nombres de secretos del servidor dentro de `dist/`. Es una barrera adicional, no sustituye la rotación ni el secret manager.

## Checklist de producción

- [ ] Node 24, `npm ci`, suite/build/auditorías en verde.
- [ ] `NODE_ENV=production` y `PUBLIC_ORIGIN` HTTPS exacto.
- [ ] `API_ALLOWED_ORIGINS` contiene solo orígenes HTTPS controlados.
- [ ] TLS moderno, redirección HTTP→HTTPS y HSTS validados en el proxy.
- [ ] `TRUST_PROXY_HOPS` coincide exactamente con la topología.
- [ ] Clave de cifrado nueva, copia de seguridad segura y disco persistente con una sola instancia.
- [ ] Credenciales históricas revocadas y registro de la rotación.
- [ ] Permisos Shopify mínimos; incluye `read_orders` para Crew y ningún `write_*` para un proceso solo lector.
- [ ] Callback, logout, checkout hosts y webhook `orders/paid` registrados con el dominio final.
- [ ] E2E sobre development store: catálogo, variante agotada, carrito, cambio de cantidad, checkout, login/logout, pedido pagado con Customer y webhook duplicado.
- [ ] Logs y alertas no incluyen cuerpos, Authorization, cookies, tokens ni IDs completos de carrito.
- [ ] Copias de seguridad y restauración del estado cifrado ensayadas con la misma clave.
- [ ] Límites de tráfico ajustados al proxy/CDN y alertas para 401/403/409/429/5xx.
- [ ] Clave OpenRouter exclusiva, sin BYOK ni auto-recarga, y allowlist limitada a los modelos gratuitos configurados.
- [ ] `CHAT_GLOBAL_DAILY_MAX` no supera la cuota gratuita real de la cuenta y se ha probado la respuesta `429`.
- [ ] Alertas para el evento `OpenRouter cost safety circuit tripped`; nunca registrar prompt, mensajes ni Authorization.

## Alcance actual

El catálogo y el carrito consultan Shopify en tiempo real; no existe una copia local de stock susceptible de quedarse desactualizada. El cliente Admin adquiere tokens mediante client credentials, pero no hay un endpoint Admin público ni un sincronizador de inventario activado. Cuando se añada un proceso de stock, debe usar consultas fijas, permisos de solo lectura, cursores, reintentos acotados y webhooks como señal de refresco, manteniendo Shopify como autoridad.

Las credenciales Customer Account y el ID del carrito se conservan como máximo durante la vida de la sesión y dentro del almacén cifrado. Los estados OAuth expiran en diez minutos; la idempotencia de carrito en 24 horas y la deduplicación de webhooks en 90 días. Los registros caducados se purgan durante las mutaciones posteriores.

Los perfiles Crew conservan XP, saldo, recompensas y un historial acotado. El
identificador de Customer no aparece en la proyección pública ni se usa como
clave legible: se deriva con SHA-256 antes de acceder al almacén cifrado. Rocky
IA resuelve el perfil desde la cookie opaca y Customer Accounts; ignora saldos
declarados por el cliente y no introduce email, token ni Customer GID en el
prompt.

La conciliación de reembolsos no está implementada. Un pedido pagado y después
devuelto conserva sus recompensas en esta versión. Antes de ofrecer premios
físicos, descuentos o valor monetario, añade eventos de reembolso/cancelación,
un libro mayor reversible y pruebas para reembolsos parciales, múltiples y
posteriores a un canje.

## Limitación de despliegue

`EncryptedStore` serializa operaciones dentro de un único proceso. No ofrece bloqueo entre procesos ni consistencia sobre almacenamiento de red. Una segunda réplica podría perder sesiones, deduplicaciones o actualizaciones de saldo Crew. Para varias instancias, sustituye este adaptador por un almacén transaccional compartido antes de enrutar tráfico.

Los límites de Rocky IA son contadores en memoria. Un reinicio restablece la ventana global diaria y varias réplicas tendrían contadores independientes. Mantén una sola instancia o aplica antes un límite global equivalente en el proxy/CDN. El cortacircuitos de coste también es local al proceso y detecta una anomalía después de recibir la primera respuesta; la prevención principal sigue siendo la allowlist gratuita en código y en la cuenta de OpenRouter.

## Respuesta a incidentes

Ante una posible exposición: desactiva temporalmente las capacidades afectadas retirando sus variables, rota el secreto en el proveedor, invalida sesiones cambiando `APP_ENCRYPTION_KEY` solo si se acepta perder carritos/logins activos, revisa webhooks y logs por request ID, despliega credenciales nuevas y documenta el intervalo de exposición. Para Rocky IA, retira `OPENROUTER_API_KEY`, desactiva la clave en OpenRouter y comprueba consumo y modelo por request ID. No registres el secreto ni los mensajes durante el diagnóstico.
