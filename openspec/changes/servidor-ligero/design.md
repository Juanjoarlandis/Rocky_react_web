# Diseño: servidor ligero

## Context

Ver `proposal.md` para el motivo y `linea-base-fase-4.md` (apartado 4) para las cifras.
Lo que condiciona el diseño:

- `server/http/static.mjs` monta dos `express.static` (uno para `/assets`, otro para la
  raíz de `dist/`), un 404 propio para assets y mockups que no existen y un
  `sendFile(index.html)` para el resto. Las cabeceras de caché salen de `setHeaders` y
  las fijan las pruebas de `server/app.test.mjs` («static delivery boundary» y las de la
  puerta). No hay `static.test.mjs`.
- Dependencias de producción: solo `express` y `dotenv`. No hay ninguna de compresión.
- El `Dockerfile` construye con `npm run test:run && npm run build` y copia `dist/` a la
  etapa de runtime; su `HEALTHCHECK` es `node -e "fetch(…/api/health)"` cada 30 s.
  `scripts/release/promote-template.mjs` arranca con `docker compose up … --wait`, que
  depende de esa sonda.
- Medido el 2026-11-10 en la imagen `rocky035:lineabase-7effff4`:
  - `v8.getHeapStatistics().heap_size_limit` vale 4.288 MB con `--memory` de 128, 256 y
    512 MB: V8 dimensiona el heap con la RAM del equipo, no con la del contenedor.
  - La imagen trae `bash`, pero no `curl`, `wget` ni `nc`.
  - `bash -c 'exec 3<>/dev/tcp/127.0.0.1/3001 && printf "GET /api/health HTTP/1.0\r\n\r\n" >&3 && read -r line <&3'`
    lee `HTTP/1.1 200 OK` y termina con 0.
- En `server/services/pared/model.mjs`, `redesQueReportan` es un `Map` sin tope; los
  limitadores (`rate-limit.mjs`, `attempt-tracker.mjs`) ya usan «tope y se descarta el más
  antiguo por orden de inserción».

## Goals / Non-Goals

**Goals:**

- Que el servidor complete la carga de referencia en un contenedor de 128 MB.
- Que el origen sirva texto comprimido sin gastar CPU por petición.
- Que el reposo sea reposo: sin procesos nuevos cada 30 s.
- No añadir dependencias.

**Non-Goals:**

- Cambiar las políticas de caché, las rutas o los 404 de los estáticos.
- Caché o compresión de la API (medido y descartado en `proposal.md`).
- Un proxy inverso delante de Express.

## Decisions

### D1. Precomprimir en el build, con un script propio

`npm run build` pasa a ser `vite build && node scripts/precompress.mjs`. El script recorre
`dist/` y escribe `<fichero>.br` (Brotli, calidad 11) y `<fichero>.gz` (gzip, nivel 9) con
`node:zlib` para `.js`, `.mjs`, `.css`, `.html`, `.svg`, `.json` y `.txt`; descarta la
variante que no sea más pequeña que el original y retira las de un fichero que ya no está.

- *Por qué*: la compresión máxima se paga una vez, en el build, y el servidor solo
  elige fichero. En una máquina de una CPU, comprimir en cada petición es justo lo que
  no sobra.
- *Alternativa descartada*: el middleware `compression`. Comprime en caliente (CPU por
  petición, calidad baja para no tardar) y añade una dependencia de producción.
- *Alternativa descartada*: un plugin de Vite. Hace lo mismo que veinte líneas de
  `node:zlib` y añade una dependencia de desarrollo que mantener.
- *Alternativa descartada*: seguir delegando en Cloudflare. Deja sin comprimir el tramo
  entre Cloudflare y el origen, cualquier acceso que no pase por él y las medidas en
  local, y hace depender un presupuesto de peso de una configuración externa.
- El `Dockerfile` no cambia para esto: ya ejecuta `npm run build`.

### D2. Negociación propia delante de `express.static`

Al montar, `static.mjs` lee una vez `dist/` y guarda en un `Map` qué rutas tienen `.br` y
`.gz`. Un middleware previo a cada `express.static` mira si la ruta pedida está en ese
índice y qué acepta la petición; si procede, reescribe `req.url` a la variante y fija
`Content-Encoding`, el `Content-Type` del original y `Vary: Accept-Encoding`.
`express.static` sirve entonces la variante con su propio `ETag` y `Last-Modified`, y
los `setHeaders` actuales ponen la caché. El fallback del `index.html` usa la misma
función para elegir fichero.

- *Por qué*: se conserva todo lo que ya hace `serve-static` (rangos, 304, HEAD, tipos) y
  las pruebas de cabeceras existentes siguen valiendo. Cada variante es un fichero
  distinto, así que cada codificación tiene su validador sin hacer nada.
- *Seguridad*: la variante solo se elige si la ruta normalizada está en el índice
  construido desde disco al arrancar. No se concatena nada de la petición a una ruta.
- `Accept-Encoding` se interpreta con sus valores `q`: `br;q=0` no acepta Brotli.
- *Alternativa descartada*: `express-static-gzip`. Hace esto mismo; es una dependencia
  de producción más para unas cuarenta líneas que además tienen que encajar con la
  puerta y con los 404 propios.
- Las variantes quedan junto al original, así que `GET /assets/x.js.br` devuelve el
  fichero comprimido como binario. Es inocuo (mismo contenido público) y no se bloquea.

### D3. Tope de heap en la imagen, con la cifra que salga de medir

La etapa de runtime del `Dockerfile` fija `NODE_OPTIONS` con `--max-old-space-size`.

- *Por qué*: es la causa medida. Sin tope, V8 cree que tiene 4,3 GB y deja crecer la
  basura hasta que el kernel mata el contenedor.
- *Dónde*: en la imagen y no en Compose, para que valga igual en producción, en las
  medidas y en cualquier `docker run`. Como variable de entorno, una máquina mayor puede
  subirlo desde su fichero de entorno sin reconstruir.
- *Cuánto*: se decide midiendo, no aquí. Se prueba 64 MB y, si no cumple, 48 MB, con
  `medir-contenedor.mjs` a 128 MB (tanda completa, tres veces) y con el caso del almacén
  de 5.000 sesiones. Se elige el mayor valor que cumpla los dos requisitos de
  `consumo-del-servidor`. La cifra y sus medidas se anotan en `tasks.md`.
- *Si el heap no basta*: la segunda palanca es `MALLOC_ARENA_MAX=2` (la memoria fuera
  del heap que glibc no devuelve). Se añade solo si la medida lo pide.
- **Medido el 2026-11-10** (contenedor de 128 MB, 1 CPU, `fase4/medir-memoria.mjs.txt`):

  | Configuración | Tanda de carga ×3 (pico) | Almacén de 5.000 sesiones, 200 mutaciones |
  | --- | --- | --- |
  | Sin tope | muere en la primera tanda | muere a la segunda mutación |
  | Heap 64 MB | 93–95 MB, sin fallos | muere tras 104 |
  | Heap 48 MB | 80–85 MB, sin fallos | aguanta, pico de 115 MB |
  | Heap 64 MB + 2 arenas | — | aguanta, pico de 117 MB |
  | Heap 64 MB + joven 4 MB + 2 arenas | **77–79 MB, sin fallos** | **aguanta las 200 (3 de 3), pico de 110–125 MB** |
  | Heap 48 MB + joven 4 MB + 2 arenas | 68 MB, sin fallos | aguanta, pico de 107 MB |

  **Elegido:** `NODE_OPTIONS="--max-old-space-size=64 --max-semi-space-size=4"` y
  `MALLOC_ARENA_MAX=2`. El tope de heap solo no basta: con el almacén grande lo que
  crece es la memoria de fuera del heap (cada mutación serializa y cifra 5,5 MB), y el
  espacio joven por defecto reserva hasta 192 MB. El caso del almacén grande se mide con
  200 altas de aviso, que reescriben el almacén igual que un alta de carrito y no
  necesitan Shopify. Su pico (hasta 125 MB) queda pegado al límite: lo baja de verdad
  `almacen-escritura-agrupada`, que deja de reescribir en cada mutación.
- *Alternativa descartada*: solo `mem_limit` en Compose. Es el límite que hoy mata el
  proceso; no hace que V8 recoja antes.

### D4. Sonda con `bash` y `/dev/tcp`

`scripts/healthcheck.sh` abre un socket a `127.0.0.1:$PORT`, pide `GET /api/health` por
HTTP/1.0, lee la línea de estado y termina con 0 solo si es un 200. El `Dockerfile` lo
copia y lo usa en `HEALTHCHECK` con los mismos intervalos de hoy.

- *Por qué*: mantiene la comprobación real (HTTP y sonda del almacén) y sustituye un
  proceso de Node, con sus 85 ms y 24 MB, por uno de `bash`.
- **Medido:** 120 s en reposo con la sonda cuestan 125 ms de CPU (antes 372 ms) y el
  contenedor se queda en 20 MB (antes 49 MB tras cada sonda). El presupuesto inicial de
  60 ms no se alcanza: unos 23 ms por sonda son lo que cuesta a Docker lanzar cualquier
  proceso dentro del contenedor. El requisito pasa a 150 ms.
- *Alternativa descartada*: alargar el intervalo. Sigue lanzando Node y la publicación
  tardaría más en ver un arranque fallido.
- *Alternativa descartada*: un fichero de latido en `tmpfs` y `test`. No ejercita HTTP
  ni el almacén, y también lanza procesos.
- *Alternativa descartada*: instalar `curl` en la imagen. Añade un paso de `apt` y
  paquetes a una imagen que se quiere reducir.
- Como fichero aparte, se prueba con `bash` contra un servidor de mentira, igual que
  `promote-template.exec.test.mjs` prueba el script de promoción.

### D5. Tope para `redesQueReportan`

El `Map` pasa a tener un máximo de entradas y descarta la más antigua por orden de
inserción, la misma política que `rate-limit.mjs`. El valor se elige al implementar
mirando los demás límites del modelo de la pared.

### D6. El guardián de presupuesto ignora las variantes

`scripts/check-budget.mjs` (cambio `presupuesto-de-rendimiento`) no cuenta `.br` ni `.gz`
como recursos. Si este cambio se implementa antes que aquel, la tarea no aplica.

## Risks / Trade-offs

- [Un segundo Node dentro del contenedor comparte su memoria] → `docker exec … node
  scripts/exportar-avisos.mjs` (o `enviar-avisos.mjs`) hereda `NODE_OPTIONS` y corre en
  el mismo cgroup: con un almacén de 5.000 sesiones y un límite de 128 MB, la revisión
  lo vio matar el contenedor. Hoy `compose.production.yaml` no pone límite de memoria,
  así que no ocurre; `despliegue-ligero`, que lo fija, tiene que dimensionarlo contando
  con ese segundo proceso o ejecutar esos scripts en un contenedor aparte.
- [150 ms de CPU en reposo es una cifra de este equipo] → En una máquina más lenta será
  mayor; lo que se mantiene es la proporción (un tercio de lo de antes). No se evaluó
  un intervalo largo con `--start-interval`, que exige Docker 25.
- [La tanda de carga no es idéntica a la de la línea base] → `/api/shopify/status` pide
  600 peticiones por tanda en vez de 1.500, para no chocar con su límite de 2.000 por
  ventana al repetirla tres veces.

- [Un tope de heap demasiado bajo termina el proceso con «heap out of memory» en un pico
  legítimo] → Requisito y prueba con 5.000 sesiones; valor sobreescribible por entorno;
  `restart: unless-stopped` ya reinicia el contenedor.
- [El almacén actual crea copias grandes del estado en cada volcado] → Es lo que acota
  el tope hoy. `almacen-escritura-agrupada` reduce esos volcados; si se implementa
  después, se vuelve a medir y, si cabe, se baja el tope.
- [Cloudflare o un proxy intermedio sirve una variante a quien no la acepta] → `Vary:
  Accept-Encoding` en toda respuesta de un recurso con variantes, comprimida o no.
- [La sonda da un falso negativo y la publicación se revierte sola] → Prueba con Docker
  real de `up --wait` antes de cerrar el cambio; el tiempo de espera de la promoción
  (90 s) no cambia.
- [`dist/` crece] → Unos cientos de kB en disco y en la imagen, a cambio de no comprimir
  nunca en caliente.

## Migration Plan

Sin datos que migrar. Todo llega con la siguiente release; volver atrás es
`release:revertir`. El tope de heap se puede cambiar o quitar desde el fichero de entorno
de producción sin reconstruir la imagen.
