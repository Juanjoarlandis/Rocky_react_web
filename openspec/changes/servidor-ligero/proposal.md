# Propuesta: servidor ligero

## Why

La línea base de la fase 4 (`docs/auditoria/2026-11/linea-base-fase-4.md`, apartado 4)
midió el servidor en un contenedor con una CPU y poca memoria, que es donde tiene que
poder vivir:

- **Con 128 MB muere por falta de memoria** (`OOMKilled`) al servir estáticos con 20
  conexiones, y también con 4. Con 256 MB sube de 25 MB a 155 MB y no los devuelve. V8 no
  ve el límite del contenedor: dentro de uno de 128 MB su `heap_size_limit` es de
  4.288 MB, así que no recoge basura hasta que el kernel lo mata.
- **El origen no comprime nada**: el JS principal viaja con sus 322.953 bytes aunque el
  cliente acepte Brotli. Hoy toda la compresión depende de Cloudflare.
- **La sonda de salud lanza un proceso de Node cada 30 s**: unos 85 ms de CPU y 24 MB por
  sonda en un equipo rápido, diez veces el consumo del servidor en reposo.
- La pared compartida guarda en memoria, sin tope, qué redes han reportado cada firma.

Es el tercer cambio de la fase 4 y es de nivel 2: no toca sesiones, datos ni el proceso
de publicación. El almacén cifrado va aparte, en `almacen-escritura-agrupada`.

## What Changes

- **Estáticos precomprimidos.** `npm run build` deja junto a cada fichero de texto de
  `dist/` sus variantes Brotli y gzip, y el servidor sirve la que el cliente acepte, sin
  gastar CPU en comprimir. Imágenes, fuentes y audio siguen saliendo tal cual.
- **Tope de memoria para Node en la imagen**, dimensionado para un contenedor de 128 MB,
  de modo que el recolector actúe antes de que lo haga el kernel.
- **Sonda de salud sin proceso de Node**: la misma comprobación de `/api/health`, hecha
  con `bash`. La imagen conserva su `HEALTHCHECK`, así que la publicación sigue esperando
  a `healthy`.
- **Tope para el registro de reportes de la pared**, como ya tienen los limitadores.

## Capabilities

### New Capabilities

- `servido-de-estaticos`: cómo entrega el servidor los ficheros de `dist/`: negociación
  de la codificación, cabeceras que conserva y qué no se comprime.
- `consumo-del-servidor`: cuánta memoria y CPU puede gastar el servidor en reposo y bajo
  carga, y cómo se comprueba su salud sin gastar más.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- **Caché HTTP de la API pública.** Medido y descartado: cada página pide una vez
  `/api/shopify/status`, `/products` y `/api/drops`, el catálogo en caché responde en
  0,7 ms y una sola CPU atiende más de 17.000 de esas peticiones por segundo. No hay
  sondeo periódico salvo la pared, que ya usa `ETag` y 304.
- Comprimir en caliente las respuestas JSON de la API.
- Límites de memoria y CPU en `compose.production.yaml`, la imagen base y dónde se
  construye la imagen: `despliegue-ligero`.
- Las escrituras del almacén cifrado: `almacen-escritura-agrupada`.
- Las cabeceras de caché de los estáticos de la puerta (H-152) y el 301 de `/products`
  (H-153): `seo-y-cache`.

## Supuestos

- Cloudflare respeta el `Content-Encoding` del origen y `Vary: Accept-Encoding`. Se
  comprobará con `curl` cuando la web esté abierta; con la puerta cerrada no se puede
  medir desde fuera.
- La imagen base seguirá trayendo `bash` (comprobado en `node:24.19.0-bookworm-slim`).
- Los cambios de imagen solo llegan a producción con una release, que sigue necesitando
  autorización expresa.

## Impact

`server/http/static.mjs` y sus pruebas, un script nuevo de precompresión y otro de sonda
en `scripts/`, `package.json` (script `build`), `Dockerfile` (`HEALTHCHECK`, tope de
memoria y copia de la sonda), `server/services/pared/model.mjs`, el guardián de
presupuesto (que ignore las variantes comprimidas) y la documentación de operación. Sin
dependencias nuevas. Sin cambios en `src/` ni en las respuestas de la API.
