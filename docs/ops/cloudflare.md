# Caché de borde (Cloudflare)

Qué guarda Cloudflare de la web con las cabeceras que ya manda el servidor, qué reglas
convendría añadir cuando se abra la puerta de acceso y cómo comprobarlo. **Este documento
no aplica nada**: tocar Cloudflare cambia producción y necesita autorización expresa.
Especificación: `openspec/changes/despliegue-ligero/` (D8).

## Cómo decide Cloudflare

Tres reglas de su documentación (`developers.cloudflare.com/cache/`), comprobadas el
2026-11-10:

- **Solo guarda por extensión**, no por tipo de contenido, y solo una lista cerrada. De lo
  que sirve esta web entran `css`, `js`, `webp`, `png`, `svg`, `ico`, `woff2` y
  `robots.txt`. **No entran** el HTML, el JSON (`manifest.json`, la API) **ni `m4a`**.
- Si la respuesta lleva `Cloudflare-CDN-Cache-Control`, manda sobre `Cache-Control` para
  lo que hace el borde (y no se reenvía al navegador). Con `no-store` ahí, Cloudflare no
  guarda aunque `Cache-Control` diga `public`.
- La cabecera `cf-cache-status` de cada respuesta dice qué pasó: `HIT` (servido del
  borde), `MISS` (se podía guardar y no estaba), `DYNAMIC` (ni se intentó: extensión
  fuera de la lista y ninguna regla), `BYPASS` (se intentó, pero el origen dijo que no),
  `EXPIRED` o `REVALIDATED`.

## Qué manda hoy el servidor

Sale de `server/http/static.mjs`, `server/http/access-gate.mjs` y
`server/http/middleware/security-headers.mjs`.

| Recurso | `Cache-Control` (navegador) | `Cloudflare-CDN-Cache-Control` (borde) | Con las reglas por defecto |
| --- | --- | --- | --- |
| `/assets/*` (JS, CSS, imágenes y fuentes con hash en el nombre) | `public, max-age=31536000, immutable` | `public, max-age=31536000` | Se guarda un año. Cada build cambia los nombres |
| `/products/*.webp`, `/street/*`, `logo*.png`, `og.png`, `favicon.*`, `theme-init.js` | `public, max-age=14400, must-revalidate` | `public, max-age=14400` | Se guarda 4 h |
| `/music/*.m4a` | igual que la fila anterior | igual | **No se guarda** (`DYNAMIC`): `m4a` no está en la lista |
| `/manifest.json` | igual | igual | No se guarda: JSON |
| El documento (`/`, `/crew`, cualquier ruta de la aplicación) | `public, max-age=0, must-revalidate` | `no-store` | No se guarda. Es lo que se quiere: cambia en cada release y lleva la cabecera `Link` de su ruta |
| 404 de la aplicación o de un fichero | el del documento, o `no-store` | `no-store` | No se guarda |
| `/api/*` | `no-store` | — | No se guarda (`DYNAMIC`) |
| Con la puerta activa: su HTML y sus respuestas | `no-store` | `no-store` | No se guarda |
| Con la puerta activa: su hoja de estilos y sus siete recursos | `private, max-age=3600` u `86400` | `no-store` | No se guarda en el borde; sí en el navegador |
| Con la puerta activa: todo lo que hay detrás | `private, no-store` | `no-store` | No se guarda |

Todos los estáticos llevan `Vary: Accept-Encoding` cuando tienen variante precomprimida
(`servidor-ligero`): el origen ya entrega Brotli o gzip, y Cloudflare guarda una copia
por codificación.

## Lo que convendría añadir al abrir la puerta

Mientras la puerta esté activa no hay nada que cachear en el borde, a propósito. Al
abrirla:

1. **La música.** Son 3,7 MB en dos pistas que hoy saldrían siempre de la Raspberry.
   Una Cache Rule: si la ruta empieza por `/music/` → _Eligible for cache_, respetando las
   cabeceras del origen (las 4 h de `Cloudflare-CDN-Cache-Control`). El audio se pide por
   rangos; Cloudflare los sirve desde la copia completa una vez guardada.
2. **Nada para el HTML ni para la API.** No crear reglas de «cachear todo»: el documento
   declara su URL canónica por ruta en una cabecera y la API depende de la sesión.
3. **`/manifest.json`**, opcional: la misma regla que la música si se quiere quitar esa
   petición del origen. Pesa menos de 1 kB; no merece una regla propia.
4. **Compresión**: dejar que Cloudflare pase la del origen. No hace falta activar nada.
5. **Al publicar una release** no hay que purgar: los ficheros de `/assets/` cambian de
   nombre y el documento no se guarda. Solo si se cambia un fichero de `public/` sin
   cambiarle el nombre (una foto de `/products/`, una pista) tarda hasta 4 h en verse, o
   se purga esa URL.

## Cómo comprobarlo

Desde fuera, con la web abierta (con la puerta activa, todo responde la puerta):

```bash
curl -sI https://rocky035.com/ | grep -iE 'cf-cache-status|cache-control|link|x-robots-tag'
```

```bash
curl -sI https://rocky035.com/logo512.png | grep -iE 'cf-cache-status|cache-control|age'
```

```bash
curl -sI -H 'Range: bytes=0-1023' https://rocky035.com/music/barro.m4a | grep -iE 'cf-cache-status|content-range|cache-control'
```

```bash
curl -sI -H 'Accept-Encoding: br' https://rocky035.com/assets/<fichero>.js | grep -iE 'cf-cache-status|content-encoding|vary'
```

Qué esperar:

- El documento: `cf-cache-status: DYNAMIC` (o `BYPASS`), con su `link: <…>; rel="canonical"`.
- Un fichero de `/assets/` o el logo: `MISS` la primera vez y `HIT` la segunda, con `age`.
- La música: `DYNAMIC` sin la regla; `MISS` y luego `HIT` con ella.
- Una ruta que no existe: 404 con `x-robots-tag: noindex`, sin `HIT`.

Y contra el origen, saltándose Cloudflare, para ver lo que manda el servidor (en la
Raspberry, que publica en `127.0.0.1:3100`):

```bash
curl -sI -H 'Host: rocky035.com' http://127.0.0.1:3100/logo512.png
```
