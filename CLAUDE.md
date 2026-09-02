# ROCKY 035 — guía para trabajar en este repo

Tienda web de ROCKY 035: SPA React 19 + Vite 8 (`src/`) y un BFF Express 4
(`server/`) que mantiene Shopify, sesiones y Rocky IA fuera del navegador.
Node 24 (`.nvmrc`), npm y `.mjs` para todo el código de Node.

## Comandos

```bash
npm ci                  # dependencias (package-lock.json manda; no hay yarn)
npm run dev             # Vite en :3000 + Express en :3001, con recarga
npm run test:run        # Vitest: proyecto server (Node) + proyecto client (jsdom)
npm run test:coverage   # cobertura de server/ y shared/ (umbral 80 %)
npm run lint            # ESLint (flat config en eslint.config.mjs)
npm run lint:css        # Stylelint sobre src/**/*.css
npm run format          # Prettier sobre todo el repo (100 columnas, comillas simples)
npm run build           # dist/ de producción
npm run security:check  # secretos en el árbol y nombres de secretos en el bundle
npm run check           # test:run + lint + lint:css + build + security:check
npm start               # node server/index.mjs (sirve /api y dist/)
```

`npm run check` tiene que estar en verde antes de cada commit.

## Puertos y orígenes

- Vite sirve la web en `http://localhost:3000` y reenvía `/api` a Express.
- Express escucha en `3001` (`PORT`). `PUBLIC_ORIGIN` y `API_ALLOWED_ORIGINS`
  apuntan por defecto a `http://localhost:3000`: el chat, los avisos y las
  mutaciones de carrito exigen ese `Origin` exacto. Si arrancas Vite en otro
  puerto, añádelo a `API_ALLOWED_ORIGINS` o verás «Origen no permitido».
- En producción `TRUST_PROXY_HOPS=1` (Cloudflare delante) es obligatorio.

## Dónde vive cada cosa

```
src/                 SPA: components/, styles/, data/, shopify/, features/, hooks/, utils/
  styles/00-tokens.css   todos los tokens (colores, tipografía, espaciado, sombras)
shared/              módulos sin Node compartidos por src/ y server/ (catálogo de vista previa)
server/
  index.mjs          arranque (sonda del almacén, listen, señales)
  app.mjs            composición: crea dependencias y monta rutas, nada más
  config/            env.mjs (helpers), app.mjs, storage.mjs, shopify.mjs
  http/              middleware/ (cabeceras, origen, rate limit, validate, errores),
                     routes/ (health, chat, avisos, crew, shopify/*), static.mjs, access-gate
  services/          sesiones, cart-operations, avisos, webhook-deliveries, crew/, chat/
  integrations/      shopify/ (graphql, storefront, admin, customer-account), openrouter/
  storage/           memory-store, encrypted-file-store
  lib/               keyed-lock, serial-queue, hash, fetch-json, logger
scripts/             utilidades de operación (check-secrets, exportar-avisos, seed-drop4…)
docs/                design/, ops/, marketing/, archive/ (ver docs/README.md)
```

## Convenciones

- **Commits en español, en imperativo** («Extrae…», «Corrige…», «Mueve…»),
  con cuerpo que explique el porqué. Un commit por bloque coherente.
- **Comentarios y copy en español; identificadores nuevos en inglés.** Los
  mensajes que ve el usuario (`message` de las respuestas de error) van en
  castellano; las claves JSON, en inglés.
- **Tokens en `src/styles/00-tokens.css`.** No se escriben colores literales
  en otros CSS (Stylelint lo bloquea); los puntos de corte son 480, 640, 900
  y 1200.
- **Estados con clases `is-*`** (`is-open`, `is-active`…) y variantes de
  componente con `--` (`btn--primary`). Sin `!important`.
- **Tests junto al módulo**: `foo.mjs` ↔ `foo.test.mjs`, `Foo.jsx` ↔
  `Foo.test.jsx`. Los del servidor corren en Node; los de `src/` en jsdom.
- **Errores del servidor**: lanza `HttpError` (o una subclase de
  `server/http/errors.mjs`) con `{ status, code }`; el middleware único de
  errores responde `{ message, code }`. Nunca respondas errores a mano.
- **Entrada HTTP**: cada ruta valida body/query con `http/middleware/validate.mjs`
  antes de abrir sesión o llamar a Shopify.
- **Logger**: `{ info, warn, error }` en JSON; nunca cuerpos, cabeceras,
  cookies, tokens ni emails en los logs.
- **Secretos**: sólo en el entorno del servidor; nada `VITE_*` con secretos y
  nada de `.env` en Git.
- Rocky IA sólo puede usar modelos OpenRouter `:free`; no se toca esa regla.

## Lo que no se hace sin acuerdo previo

Reescribir el historial, rotar credenciales, migrar a Express 5, borrar
`posters/` o `prompts-munecos/` y hacer `git push --force`. Los planes para
lo primero están en `docs/ops/` y `docs/marketing/`.
