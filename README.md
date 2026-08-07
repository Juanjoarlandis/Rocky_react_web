# ROCKY 035 storefront

Tienda React/Vite con un BFF Express de mismo origen. Puede funcionar como catálogo visual de prueba o usar Shopify como autoridad de productos, variantes, disponibilidad, precios, carrito y checkout.

## Requisitos

- Node.js 24 (la versión esperada está en `.nvmrc`).
- npm y un entorno Unix/macOS o Linux para los comandos de ejemplo.
- Para el modo Shopify: una tienda `*.myshopify.com` y, según las funciones activadas, credenciales del Headless channel, Dev Dashboard y Customer Account API.

## Arranque local

```bash
cp .env.example .env
npm install
npm run dev
```

La web queda en `http://localhost:3000` y Express en `http://localhost:3001`. Vite reenvía `/api` al BFF durante desarrollo. Si Shopify no está configurado, la interfaz muestra expresamente “Modo demo”; permite probar la presentación y un carrito local, pero no reserva stock ni habilita el pago.

Para crear la clave que cifra sesiones, IDs completos de carrito, OAuth, tokens de cliente, idempotencia y deduplicación de webhooks:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Copia el resultado a `APP_ENCRYPTION_KEY` en el gestor de secretos del entorno. No reutilices la clave entre desarrollo y producción y no la guardes en Git.

## Comandos

```bash
npm run dev             # Vite + Express con recarga
npm run test:run        # suite Vitest una vez
npm run build           # frontend de producción en dist/
npm run security:check  # secretos locales y bundle
npm run check           # pruebas + build + secret scan
npm start               # sirve API y dist/ con Express
```

Para un smoke de producción:

```bash
NODE_ENV=production PUBLIC_ORIGIN=https://tienda.example.com PORT=3001 npm start
```

En producción, `PUBLIC_ORIGIN` y todos los `API_ALLOWED_ORIGINS` deben usar HTTPS. El proxy inverso debe terminar TLS, conservar `Host` y establecer `TRUST_PROXY_HOPS` al número exacto de proxies confiables; no uses un valor abierto.

## Activación de Shopify

La configuración es progresiva y falla cerrada:

| Capacidad | Configuración mínima |
| --- | --- |
| Catálogo | `SHOPIFY_STORE_DOMAIN` |
| Carrito y checkout | dominio + `APP_ENCRYPTION_KEY` |
| Storefront privado | `SHOPIFY_STOREFRONT_ACCESS_TOKEN` + `SHOPIFY_STOREFRONT_TOKEN_TYPE=private` |
| Cuenta de cliente | dominio + clave + `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` + `PUBLIC_ORIGIN` HTTPS |
| Admin API | dominio + `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` |
| Webhooks | dominio + clave + `SHOPIFY_CLIENT_SECRET` |

Usa `SHOPIFY_API_VERSION=2026-07`. Para cantidades exactas, activa `SHOPIFY_EXPOSE_QUANTITY=true` y concede el permiso Storefront `unauthenticated_read_product_inventory`; si no, la web sigue usando `availableForSale`. Para una futura lectura Admin de stock, solicita únicamente `read_products`, `read_inventory` y, si se consultan ubicaciones, `read_locations`. No concedas permisos de escritura si el servicio solo va a leer.

Si el token Storefront es privado, el BFF lo envía con `Shopify-Storefront-Private-Token` y adjunta la IP del comprador validada. Si se configura deliberadamente un token público, cambia `SHOPIFY_STOREFRONT_TOKEN_TYPE=public`. Ninguno de los dos se compila dentro de React.

Registra estas URLs en Shopify usando el dominio HTTPS final:

- Callback Customer Account: `https://tu-dominio/api/shopify/account/callback`
- Webhook: `https://tu-dominio/api/shopify/webhooks`
- Post-logout/origen: el valor exacto de `PUBLIC_ORIGIN`

`SHOPIFY_CHECKOUT_HOSTS` solo es necesario cuando el checkout usa dominios adicionales al `*.myshopify.com` canónico. Introduce hostnames separados por comas, sin esquema, ruta ni puerto.

## Frontera de seguridad

El navegador solo recibe DTOs saneados y envía `variantId`, `lineId`, cantidad e identificador de operación. El ID Shopify completo del carrito —que incluye `?key=...`— permanece cifrado en el servidor. El checkout se obtiene de Shopify en el último momento y se acepta únicamente por HTTPS y contra la lista de hosts permitidos.

Las cuentas usan discovery HTTPS, Authorization Code + PKCE, `state` de un solo uso ligado a la cookie que inició el login, `nonce`, verificación criptográfica del ID token, rotación de sesión y tokens cifrados con retención limitada. Los webhooks se verifican sobre el cuerpo crudo mediante HMAC constante, tienda/topic/versión exactos y deduplicación persistente.

Consulta [SECURITY.md](./SECURITY.md) para los controles de despliegue, rotación y limitaciones conocidas. La arquitectura detallada y la evidencia por tarea están en [docs/superpowers/plans/2026-08-07--shopify-security-readiness](./docs/superpowers/plans/2026-08-07--shopify-security-readiness/README.md).

## Almacenamiento y escalado

El estado se guarda como un único sobre AES-256-GCM con escrituras atómicas y permisos restrictivos. Está diseñado para una sola instancia Node con disco persistente. Antes de escalar horizontalmente o desplegar sobre disco efímero, migra las interfaces de sesión/idempotencia/webhooks a una base compartida con transacciones; no compartas el fichero entre procesos.

## Verificación antes de publicar

```bash
npm ci
npm run check
npm audit --audit-level=moderate
npm audit --omit=dev --audit-level=moderate
```

La CI repite estos controles en cada push y pull request. Las pruebas locales usan respuestas Shopify simuladas; antes de abrir ventas debes completar el E2E con una development store, callback HTTPS, variante real, carrito, checkout, login/logout y webhook firmado.
