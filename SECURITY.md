# Seguridad y preparación para Shopify

## Invariantes que no deben romperse

- Shopify es la única autoridad de identidad de variante, disponibilidad, precio, moneda, coste de carrito y checkout.
- React no contiene credenciales, no persiste tokens y no recibe el ID completo del carrito.
- No se aceptan documentos GraphQL arbitrarios desde HTTP; las operaciones públicas están fijadas en el servidor.
- Toda mutación de carrito exige un `Origin` exacto permitido, una sesión opaca y un identificador idempotente.
- Los callbacks y checkout solo usan HTTPS; los redirects de checkout se limitan por hostname.
- El cuerpo de webhook se verifica antes de parsear JSON.
- Las cuentas de cliente usan PKCE, state de un uso ligado a sesión, nonce, verificación de firma/claims y rotación de cookie.

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
- [ ] Permisos Shopify mínimos; sin `write_*` para un proceso solo lector.
- [ ] Callback, logout, checkout hosts y webhooks registrados con el dominio final.
- [ ] E2E sobre development store: catálogo, variante agotada, carrito, cambio de cantidad, checkout, login/logout y webhook duplicado.
- [ ] Logs y alertas no incluyen cuerpos, Authorization, cookies, tokens ni IDs completos de carrito.
- [ ] Copias de seguridad y restauración del estado cifrado ensayadas con la misma clave.
- [ ] Límites de tráfico ajustados al proxy/CDN y alertas para 401/403/409/429/5xx.

## Alcance actual

El catálogo y el carrito consultan Shopify en tiempo real; no existe una copia local de stock susceptible de quedarse desactualizada. El cliente Admin adquiere tokens mediante client credentials, pero no hay un endpoint Admin público ni un sincronizador de inventario activado. Cuando se añada un proceso de stock, debe usar consultas fijas, permisos de solo lectura, cursores, reintentos acotados y webhooks como señal de refresco, manteniendo Shopify como autoridad.

Las credenciales Customer Account y el ID del carrito se conservan como máximo durante la vida de la sesión y dentro del almacén cifrado. Los estados OAuth expiran en diez minutos; la idempotencia de carrito en 24 horas y la deduplicación de webhooks en 90 días. Los registros caducados se purgan durante las mutaciones posteriores.

## Limitación de despliegue

`EncryptedStore` serializa operaciones dentro de un único proceso. No ofrece bloqueo entre procesos ni consistencia sobre almacenamiento de red. Una segunda réplica podría perder sesiones o deduplicaciones. Para varias instancias, sustituye este adaptador por un almacén transaccional compartido antes de enrutar tráfico.

## Respuesta a incidentes

Ante una posible exposición: desactiva temporalmente las capacidades afectadas retirando sus variables, rota el secreto en el proveedor, invalida sesiones cambiando `APP_ENCRYPTION_KEY` solo si se acepta perder carritos/logins activos, revisa webhooks y logs por request ID, despliega credenciales nuevas y documenta el intervalo de exposición. No registres el secreto durante el diagnóstico.
