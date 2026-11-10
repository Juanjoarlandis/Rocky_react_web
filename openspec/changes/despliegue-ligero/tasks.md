# Tareas: despliegue ligero

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` con Node 24 (incluye `scripts/release/*.test.mjs`) y anotar aquí el número de tests; anotar tamaño de la imagen y de su `node_modules` con `docker image inspect` y `du` sobre la imagen del commit de partida.

## 2. Imagen construible sin emulación

- [ ] 2.1 Añadir una prueba en `scripts/release/` que lea el `Dockerfile` y falle si hay un `RUN` después del último `FROM` o si la etapa de build no fija `--platform=$BUILDPLATFORM`; verla fallar y cambiar el `Dockerfile` hasta que pase.
- [ ] 2.2 Añadir una prueba que recorra el árbol de producción de `package-lock.json` y falle si algún paquete declara binarios nativos (`os`, `cpu` o scripts de instalación); verificar que pasa con las dependencias de hoy y que falla con un lock de mentira que incluya uno.
- [ ] 2.3 Verificar con Docker real, en un equipo x86-64 sin QEMU, que `docker buildx build --platform linux/arm64 --load` sobre un `git archive HEAD` termina bien, que la imagen declara `arm64` y que su `dist/` coincide por `sha256` con un build limpio. Anotar tiempos y tamaños aquí.

## 3. Dependencias de runtime

- [ ] 3.1 Mover `react`, `react-dom` y `react-router` a `devDependencies`, regenerar `package-lock.json` con `npm install` y verificar que `npm ci && npm run check` sigue en verde y que `npm ci --omit=dev` no instala ninguno de los tres.
- [ ] 3.2 Verificar en la imagen que `node_modules` ocupa 5 MB o menos y no contiene esos paquetes, que el contenedor arranca y sirve `/` y `/api/health`, y que `npm audit` y `npm audit --omit=dev` dan 0 vulnerabilidades.
- [ ] 3.3 Añadir las tres librerías a un grupo de `.github/dependabot.yml` y actualizar en `docs/ops/publicar.md` la comparación de huellas (qué difiere ahora en `node_modules`).

## 4. Preparar: construir, enviar y verificar

- [ ] 4.1 Escribir en `scripts/release/preparar.test.mjs` las pruebas del camino nuevo con el `remote` y el `docker` de mentira y verlas fallar: con `--aplicar` el orden es construir en local, calcular huellas del contenido, exportar con su huella, subir, verificar la transferencia, cargar, borrar el fichero, verificar arquitectura y contenido, y escribir la marca; en simulacro no se construye ni se sube y se muestra la arquitectura de destino; si fallan las pruebas del build no se sube nada.
- [ ] 4.2 Implementar en `scripts/release/` la construcción local (arquitectura a partir de `uname -m` remoto), la extracción de `/app` con `docker create` y `docker cp`, las huellas, `docker save | gzip` y la subida, hasta que pasen.
- [ ] 4.3 Escribir y hacer pasar las pruebas de los fallos: huella de transferencia distinta (aborta, no carga y borra el fichero); un fichero de la imagen con otra huella en producción (error que lo nombra, sin marca); arquitectura distinta (error, sin marca).
- [ ] 4.4 Añadir la opción de construir en producción (D4) con sus pruebas: avisa en la salida, ejecuta `docker build` remoto y pasa la misma verificación de contenido; sin la opción no hay ningún `docker build` remoto.

## 5. Promover solo lo verificado

- [ ] 5.1 Escribir en `promover.test.mjs`, `promote-template.test.mjs` y `promote-template.exec.test.mjs` las pruebas de la precondición nueva y verlas fallar: sin marca de verificación, `promover` se niega y el script termina con código 2 sin tocar nada; `revertir` a una release anterior sin marca sigue funcionando.
- [ ] 5.2 Implementar la precondición en `promover.mjs` y en `promote-template.mjs` hasta que pasen esas pruebas y las que ya había.

## 6. Límite de memoria

- [ ] 6.1 Añadir `mem_limit` y `memswap_limit` con `${ROCKY_MEM_LIMIT:-192m}` a `compose.production.yaml`, y que el selector de la promoción conserve `ROCKY_MEM_LIMIT` si existe; prueba de texto en `promote-template.test.mjs`.
- [ ] 6.2 Verificar con Docker real y un fichero de entorno de prueba que `docker inspect` muestra 192 MB por defecto y el valor del entorno cuando se fija, y que la tanda de carga de la línea base pasa con ese Compose (requiere la imagen de `servidor-ligero`; si aún no existe, dejar la tarea abierta y anotarlo).

## 7. Documentación

- [ ] 7.1 Reescribir en `docs/ops/publicar.md` los requisitos, `release:preparar`, «Si algo falla» (Docker local sin `buildx`, ayudante de credenciales roto, huella que no coincide, release sin verificar) y la validación; actualizar `README.md` y `SECURITY.md` donde describen la publicación.
- [ ] 7.2 Escribir `docs/ops/cloudflare.md` (D8) con las cabeceras que manda hoy el servidor por tipo de recurso, las reglas propuestas y las órdenes de comprobación, y enlazarlo desde `docs/README.md`.

## 8. Cierre

- [ ] 8.1 Ejecutar `npm run check`; autorrevisión de `git diff`; revisión de seguridad con `security-review` (cadena de construcción, qué se ejecuta en producción, permisos de los ficheros subidos) y revisión independiente contra las dos especificaciones. Anotar los resultados aquí.

## Workflow follow-up

- Con autorización expresa: simulacro contra la Raspberry, primera release por el camino nuevo comparada con una construida allí, y promoción (pasos 2–4 de `design.md`).
- El límite de memoria se publica en una release posterior a `servidor-ligero`.
- Archivar `proceso-de-publicacion` antes que este cambio, para que sus requisitos estén en `openspec/specs/publicacion-de-releases/` cuando se archive este.
