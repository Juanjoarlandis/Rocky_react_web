# Tareas: proceso de publicación versionado

Nivel 3: no se empieza hasta que el usuario apruebe este diseño. TDD en cada tarea de
lógica: prueba en rojo, implementación mínima, refactor en verde.

## 1. Lógica pura con pruebas

- [x] 1.1 Escribir en `scripts/release/lib.test.mjs` las pruebas de: identificador de release (D5), validación de etiqueta, filtro de ficheros (`.dockerignore`, `.env*` salvo `.env.example`), `release.json` con sus siete campos y `SHA256SUMS`; verificar que fallan (rojo) y después implementarlas en `scripts/release/lib.mjs` hasta verde.
- [x] 1.2 Escribir las pruebas del render de la plantilla de promoción (precondiciones, copias, selector atómico, `up --wait`, `trap` de vuelta atrás, registro de servicios) y de su rechazo de valores con caracteres no permitidos; verificar rojo y luego verde.

## 2. Órdenes

- [x] 2.1 Implementar `preparar` con la comprobación de remoto y de árbol limpio (escenarios «Commit subido», «Commit solo local», «Árbol con cambios», «Secreto en el árbol») y verificarla con pruebas sobre un repo git temporal.
- [x] 2.2 Implementar `promover` y `revertir` sobre la plantilla, con simulacro por defecto; verificar con pruebas que sin `--aplicar` solo se ejecutan lecturas remotas (estado actual) y ningún comando que cambie ficheros o contenedores.
- [x] 2.3 Añadir `release:preparar`, `release:promover` y `release:revertir` a `package.json` y verificar `npm run check`.

## 3. Validación sin tocar producción

- [x] 3.1 Probar la vuelta atrás en local con Docker: una imagen sana y otra que no pasa el healthcheck, sobre un layout de prueba en una carpeta temporal; verificar los escenarios «Release sana», «Release que no arranca», «Estado inesperado» y «Revertir a la anterior».
- [x] 3.2 Comparar la plantilla renderizada para el caso `20260928T101659Z-crew-noche-16-fe7c1d2a` → `20260929T100641Z-el-toxico-5617951b` con el `promote.sh` real y justificar cada diferencia en `docs/ops/publicar.md`.
- [ ] 3.3 (BLOQUEADA el 2026-11-08: la Raspberry responde al ping pero SSH no llega a abrir sesión) Ejecutar `preparar`, `promover` y `revertir` en simulacro contra la Raspberry y verificar que no cambia nada (`ls /opt/rocky035`, contenedor e imagen activos iguales antes y después).

## 4. Documentación y revisión

- [ ] 4.1 (documentación escrita y actualizada tras la revisión; falta comprobar los comandos en simulacro contra la Raspberry, ligado a 3.3) Escribir `docs/ops/publicar.md` (requisitos, órdenes, simulacro, vuelta atrás, qué hacer si falla) y la sección del README; verificar que los comandos documentados funcionan en simulacro.
- [x] 4.2 Revisión independiente (`engineering-review`) y revisión de seguridad (`security-review`); sin bloqueantes pendientes. Seguridad: sin vulnerabilidades por encima del umbral. Independiente: dos rondas (límite); el bloqueante de la segunda se corrigió con pruebas (5.3) sin una tercera ronda.

## 5. Revisión independiente, ronda 1

- [x] 5.1 B1: excluir `scripts/release` de la imagen (`.dockerignore`) y verificarlo construyendo la imagen de producción en local con el `Dockerfile` del proyecto.
- [x] 5.2 I1–I6 y menores: ejecución desacoplada con log y marca final, `set -E`, `current.next` residual, copias por operación, cerrojo, códigos 2/1/3, `anterior.txt` para revertir, remoto solo `origin` con `--prune`, nombres literales, raíz y host validados, argumentos estrictos, espacio libre y número de releases, `sha256sum -c` tras subir, temporales siempre borrados y formato con Prettier; verificado con 110 pruebas en `scripts/release/` (incluida la ejecución real del script con `bash` y un `docker` falso) y `npm run check` en verde.

- [x] 5.3 Ronda 2: bloqueante nuevo (`umask 077` global dejaba `anterior.txt` en 600 y `revertir` caía en silencio a `release.json`). Corregido: `umask` solo para el selector, `chmod 644` de los registros, lectura que distingue «no existe» de «no se puede leer», anuncio del destino y avisos antes de ejecutar, y marca final también para fallos previos a los cambios; pruebas en rojo primero y luego 112 en verde, `npm run check` (782 tests) y prueba real con Docker 15/15.

## Workflow follow-up

- La primera promoción real con estas órdenes es un paso aparte, con autorización explícita del usuario.
- Archivar con `openspec-archive-change` tras VERIFIED y conformidad del usuario.
