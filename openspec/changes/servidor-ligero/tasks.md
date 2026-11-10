# Tareas: servidor ligero

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; construir la imagen del commit de partida y repetir `medir-contenedor.mjs` a 256 MB y a 128 MB (`docs/auditoria/2026-11/herramientas/fase4/`), anotando reposo, pico, CPU en reposo con sonda y si muere.

## 2. Precompresión en el build

- [ ] 2.1 Escribir `scripts/precompress.test.mjs` sobre un `dist/` de mentira en un directorio temporal y verlo fallar: variantes `.br` y `.gz` para js, css, html, svg, json y txt; ninguna para webp, png, woff2 ni m4a; se omite la que no es más pequeña; ejecutarlo dos veces da el mismo resultado; cada variante se descomprime al original.
- [ ] 2.2 Implementar `scripts/precompress.mjs` con `node:zlib` hasta que pasen, y encadenarlo en el script `build` de `package.json`; verificar con `npm run build` que `dist/assets/index-*.js.br` existe y que los ficheros originales de `dist/` no cambian respecto al build anterior (`sha256sum`).
- [ ] 2.3 Hacer que `scripts/check-budget.mjs` ignore `.br` y `.gz`, con su prueba, y verificar que `npm run budget:check` da las mismas medidas que antes (solo si `presupuesto-de-rendimiento` ya está integrado; si no, anotarlo como pendiente de aquel cambio).

## 3. Negociación en el servidor

- [ ] 3.1 Crear `server/http/static.test.mjs` con los escenarios de `specs/servido-de-estaticos/spec.md` y verlos fallar: Brotli, gzip, sin compresión, `q=0`, HEAD, tipo y caché conservados, `Vary`, 304 con el validador propio y no con el de otra codificación, `index.html` en `/` y en una ruta de la aplicación, audio por rangos sin comprimir, 404 de asset inexistente, puerta activa y `dist/` sin variantes.
- [ ] 3.2 Implementar en `server/http/static.mjs` el índice de variantes y la negociación (D2) hasta que pasen esas pruebas y sigan pasando, sin tocarlas, las de `server/app.test.mjs`.
- [ ] 3.3 Comprobar contra el build real: arrancar el servidor sobre `dist/` y verificar con `curl -H 'Accept-Encoding: br'` que el JS principal llega con `Content-Encoding: br` y menos de 110 kB, y sin esa cabecera con sus bytes originales.

## 4. Sonda de salud

- [ ] 4.1 Escribir `scripts/healthcheck.test.mjs`, que ejecute `bash scripts/healthcheck.sh` contra un servidor HTTP de mentira, y verlo fallar: 200 termina con 0; 503 y puerto cerrado terminan con código distinto de 0.
- [ ] 4.2 Implementar `scripts/healthcheck.sh` (D4), copiarlo en la etapa de runtime del `Dockerfile` y cambiar el `HEALTHCHECK`; verificar que las pruebas pasan y que `docker inspect` de un contenedor recién arrancado llega a `healthy`.
- [ ] 4.3 Verificar con Docker real que `docker compose up --wait` termina bien con un arranque correcto y con error cuando `APP_ENCRYPTION_KEY` no descifra el estado, usando un fichero de Compose de prueba fuera del repo con las mismas restricciones que `compose.production.yaml`.

## 5. Memoria

- [ ] 5.1 Medir con `medir-contenedor.mjs` a 128 MB (`ROCKY_QUICK=1`, 20 conexiones) pasando `NODE_OPTIONS=--max-old-space-size=64` y `=48` por entorno, y anotar aquí pico, peticiones fallidas y si muere en cada caso.
- [ ] 5.2 Añadir al script de medida el caso del almacén grande (5.000 sesiones con carrito y 200 altas seguidas, con el doble de `herramientas/e2sim/` montado en el contenedor) y medirlo con los dos valores.
- [ ] 5.3 Fijar en el `Dockerfile` el mayor valor que cumpla los dos requisitos de `specs/consumo-del-servidor/spec.md`; si ninguno cumple, añadir `MALLOC_ARENA_MAX=2` y volver a medir. Anotar la cifra elegida y sus medidas en `design.md` (D3).
- [ ] 5.4 Verificar los requisitos completos sobre la imagen final: tanda de carga tres veces a 128 MB sin OOM, sin fallos y con pico de 100 MB o menos; reposo de 120 s con sonda en 60 ms de CPU y 30 MB o menos.

## 6. Tope del registro de reportes

- [ ] 6.1 Añadir a `server/services/pared/model.test.mjs` una prueba que supere el tope de `redesQueReportan` y verla fallar; implementar el tope (D5) hasta que pase junto con las pruebas existentes de la pared.

## 7. Documentación y cierre

- [ ] 7.1 Actualizar `README.md`, `SECURITY.md` y `docs/ops/publicar.md` donde describen la compresión, la sonda y la memoria del contenedor, y `linea-base-fase-4.md` (apartado 8) con las cifras nuevas; verificar que los comandos documentados se ejecutan tal cual.
- [ ] 7.2 Ejecutar `npm run check` y `npm run test:coverage` con Node 24; autorrevisión de `git diff` y revisión independiente contra las dos especificaciones. Anotar el resultado aquí.

## Workflow follow-up

- Publicar en producción solo con autorización expresa; después, comprobar con `curl` desde fuera el `Content-Encoding` y el `cf-cache-status` de un asset cuando la puerta esté abierta.
- Archivar con `openspec-archive-change` tras VERIFIED.
