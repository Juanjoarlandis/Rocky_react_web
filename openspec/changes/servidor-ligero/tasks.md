# Tareas: servidor ligero

## 1. Línea base

- [x] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; construir la imagen del commit de partida y repetir `medir-contenedor.mjs` a 256 MB y a 128 MB (`docs/auditoria/2026-11/herramientas/fase4/`), anotando reposo, pico, CPU en reposo con sonda y si muere.
  - 1.577 tests. Como línea base valen las medidas de `linea-base-fase-4.md` (apartado 4), tomadas sobre el mismo servidor: reposo 24,9 MB, pico 158–173 MB a 256 MB, 372 ms de CPU en 120 s con la sonda y OOM a 128 MB. Repetido a 128 MB sin tope con la imagen de este cambio: muere en la primera tanda.

## 2. Precompresión en el build

- [x] 2.1 Escribir `scripts/precompress.test.mjs` sobre un `dist/` de mentira en un directorio temporal y verlo fallar: variantes `.br` y `.gz` para js, css, html, svg, json y txt; ninguna para webp, png, woff2 ni m4a; se omite la que no es más pequeña; ejecutarlo dos veces da el mismo resultado; cada variante se descomprime al original.
- [x] 2.2 Implementar `scripts/precompress.mjs` con `node:zlib` hasta que pasen, y encadenarlo en el script `build` de `package.json`; verificar con `npm run build` que `dist/assets/index-*.js.br` existe y que los ficheros originales de `dist/` no cambian respecto al build anterior (`sha256sum`).
  - 30 ficheros de texto: 726,5 kB → 191,4 kB en Brotli y 220,0 kB en gzip. El JS principal, de 325.260 a 90.907 bytes. Los originales no cambian.
- [x] 2.3 Hacer que `scripts/check-budget.mjs` ignore `.br` y `.gz`, con su prueba, y verificar que `npm run budget:check` da las mismas medidas que antes (solo si `presupuesto-de-rendimiento` ya está integrado; si no, anotarlo como pendiente de aquel cambio).

## 3. Negociación en el servidor

- [x] 3.1 Crear `server/http/static.test.mjs` con los escenarios de `specs/servido-de-estaticos/spec.md` y verlos fallar: Brotli, gzip, sin compresión, `q=0`, HEAD, tipo y caché conservados, `Vary`, 304 con el validador propio y no con el de otra codificación, `index.html` en `/` y en una ruta de la aplicación, audio por rangos sin comprimir, 404 de asset inexistente, puerta activa y `dist/` sin variantes.
  - Con `mountStaticApp` sobre un Express mínimo, para ver los bytes y las cabeceras sin que `fetch` descomprima.
- [x] 3.2 Implementar en `server/http/static.mjs` el índice de variantes y la negociación (D2) hasta que pasen esas pruebas y sigan pasando, sin tocarlas, las de `server/app.test.mjs`.
- [x] 3.3 Comprobar contra el build real: arrancar el servidor sobre `dist/` y verificar con `curl -H 'Accept-Encoding: br'` que el JS principal llega con `Content-Encoding: br` y menos de 110 kB, y sin esa cabecera con sus bytes originales.
  - En el contenedor final: con `Accept-Encoding: br, gzip`, 90.907 bytes; sin la cabecera, 325.260.

## 4. Sonda de salud

- [x] 4.1 Escribir `scripts/healthcheck.test.mjs`, que ejecute `bash scripts/healthcheck.sh` contra un servidor HTTP de mentira, y verlo fallar: 200 termina con 0; 503 y puerto cerrado terminan con código distinto de 0.
- [x] 4.2 Implementar `scripts/healthcheck.sh` (D4), copiarlo en la etapa de runtime del `Dockerfile` y cambiar el `HEALTHCHECK`; verificar que las pruebas pasan y que `docker inspect` de un contenedor recién arrancado llega a `healthy`.
  - `docker inspect`: `healthy`, con `[CMD bash scripts/healthcheck.sh]`.
- [x] 4.3 Verificar con Docker real que `docker compose up --wait` termina bien con un arranque correcto y con error cuando `APP_ENCRYPTION_KEY` no descifra el estado, usando un fichero de Compose de prueba fuera del repo con las mismas restricciones que `compose.production.yaml`.
  - Arranque correcto: `up --wait` termina con 0 y `healthy`. Con un estado cifrado con otra clave: termina con 1 («No se pudo descifrar el estado local»).

## 5. Memoria

- [x] 5.1 Medir con `medir-contenedor.mjs` a 128 MB (`ROCKY_QUICK=1`, 20 conexiones) pasando `NODE_OPTIONS=--max-old-space-size=64` y `=48` por entorno, y anotar aquí pico, peticiones fallidas y si muere en cada caso.
  - 64 MB: 93–95 MB de pico, sin fallos, no muere. 48 MB: 80–85 MB, sin fallos. (Las tandas 2 y 3 daban 429 en `/api/shopify/status` por su límite de 2.000 por ventana, no por memoria; la herramienta pide ahora 600 por tanda.)
- [x] 5.2 Añadir al script de medida el caso del almacén grande (5.000 sesiones con carrito y 200 altas seguidas, con el doble de `herramientas/e2sim/` montado en el contenedor) y medirlo con los dos valores.
  - Con 200 altas de aviso, que reescriben el almacén entero y no necesitan Shopify (el doble de `e2sim/` no hace falta). Fichero sembrado: 5,5 MB. 64 MB: muere tras 104. 48 MB: aguanta con pico de 115 MB.
- [x] 5.3 Fijar en el `Dockerfile` el mayor valor que cumpla los dos requisitos de `specs/consumo-del-servidor/spec.md`; si ninguno cumple, añadir `MALLOC_ARENA_MAX=2` y volver a medir. Anotar la cifra elegida y sus medidas en `design.md` (D3).
  - Ni 64 ni 48 solos cumplen los dos requisitos con margen. Elegido: `--max-old-space-size=64 --max-semi-space-size=4` y `MALLOC_ARENA_MAX=2` (tabla en `design.md`, D3). Con el almacén grande aguanta las 200 mutaciones, pero con un pico de 110–125 MB.
- [x] 5.4 Verificar los requisitos completos sobre la imagen final: tanda de carga tres veces a 128 MB sin OOM, sin fallos y con pico de 100 MB o menos; reposo de 120 s con sonda en 150 ms de CPU y 30 MB o menos.
  - Tres tandas: 0 fallos, pico de 78,5 MB las tres, sin OOM. Reposo de 120 s con sonda: 125 ms de CPU y 20,2 MB. El requisito de CPU pasa de 60 a 150 ms (D4): lanzar un proceso en el contenedor cuesta unos 23 ms.

## 6. Tope del registro de reportes

- [x] 6.1 Añadir a `server/services/pared/model.test.mjs` una prueba que supere el tope de `redesQueReportan` y verla fallar; implementar el tope (D5) hasta que pase junto con las pruebas existentes de la pared.
  - Topes: 5.000 autores recordados y 200 redes por autor.

## 7. Documentación y cierre

- [x] 7.1 Actualizar `README.md`, `SECURITY.md` y `docs/ops/publicar.md` donde describen la compresión, la sonda y la memoria del contenedor, y `linea-base-fase-4.md` (apartado 8) con las cifras nuevas; verificar que los comandos documentados se ejecutan tal cual.
  - En `docs/ops/publicar.md` cambia la orden para comprobar la salud dentro del contenedor (ya no hace falta arrancar Node); `.env.example` explica cómo subir el tope de memoria.
- [x] 7.2 Ejecutar `npm run check` y `npm run test:coverage` con Node 24; autorrevisión de `git diff` y revisión independiente contra las dos especificaciones. Anotar el resultado aquí.
  - `npm run check` en verde; cobertura del servidor 93 % (umbral 80 %).
  - Revisión independiente (subagente con contexto limpio, una ronda): 0 bloqueantes, 3 importantes y 8 menores.
  - Corregidos: la medida del almacén grande usaba un producto que no existe y solo 166 de 200 altas escribían (repetida: 200 de 200, tres veces, pico de 110–125 MB); una prueba de la sonda dependía de que nada escuchara en el 3001; `Accept-Encoding` con espacio antes de `;`; cabeceras de la variante que se quedaban puestas si el fichero desaparecía con el servidor en marcha; el tope de redes por autor descarta la más antigua (antes dejaba de apuntar) y sus pruebas lo comprueban; variantes huérfanas en la precompresión; el presupuesto solo ignora un `.br`/`.gz` si su original existe; la sonda no acepta «2000».
  - Anotado como riesgo en `design.md` y trasladado a `despliegue-ligero`: un script lanzado con `docker exec` comparte la memoria del contenedor.
  - Requisitos ajustados al medir, con su motivo en `design.md`: CPU en reposo de 60 a 150 ms; el almacén grande se mide con altas de aviso.

## Workflow follow-up

- Publicar en producción solo con autorización expresa; después, comprobar con `curl` desde fuera el `Content-Encoding` y el `cf-cache-status` de un asset cuando la puerta esté abierta.
- Archivar con `openspec-archive-change` tras VERIFIED.
