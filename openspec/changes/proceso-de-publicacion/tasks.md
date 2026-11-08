# Tareas: proceso de publicación versionado

Nivel 3: no se empieza hasta que el usuario apruebe este diseño. TDD en cada tarea de
lógica: prueba en rojo, implementación mínima, refactor en verde.

## 1. Lógica pura con pruebas

- [ ] 1.1 Escribir en `scripts/release/lib.test.mjs` las pruebas de: identificador de release (D5), validación de etiqueta, filtro de ficheros (`.dockerignore`, `.env*` salvo `.env.example`), `release.json` con sus siete campos y `SHA256SUMS`; verificar que fallan (rojo) y después implementarlas en `scripts/release/lib.mjs` hasta verde.
- [ ] 1.2 Escribir las pruebas del render de la plantilla de promoción (precondiciones, copias, selector atómico, `up --wait`, `trap` de vuelta atrás, registro de servicios) y de su rechazo de valores con caracteres no permitidos; verificar rojo y luego verde.

## 2. Órdenes

- [ ] 2.1 Implementar `preparar` con la comprobación de remoto y de árbol limpio (escenarios «Commit subido», «Commit solo local», «Árbol con cambios», «Secreto en el árbol») y verificarla con pruebas sobre un repo git temporal.
- [ ] 2.2 Implementar `promover` y `revertir` sobre la plantilla, con simulacro por defecto; verificar con pruebas que sin `--aplicar` no se ejecuta ningún comando remoto.
- [ ] 2.3 Añadir `release:preparar`, `release:promover` y `release:revertir` a `package.json` y verificar `npm run check`.

## 3. Validación sin tocar producción

- [ ] 3.1 Probar la vuelta atrás en local con Docker: una imagen sana y otra que no pasa el healthcheck, sobre un layout de prueba en una carpeta temporal; verificar los escenarios «Release sana», «Release que no arranca», «Estado inesperado» y «Revertir a la anterior».
- [ ] 3.2 Comparar la plantilla renderizada para el caso `20260928T101659Z-crew-noche-16-fe7c1d2a` → `20260929T100641Z-el-toxico-5617951b` con el `promote.sh` real y justificar cada diferencia en `docs/ops/publicar.md`.
- [ ] 3.3 Ejecutar `preparar`, `promover` y `revertir` en simulacro contra la Raspberry y verificar que no cambia nada (`ls /opt/rocky035`, contenedor e imagen activos iguales antes y después).

## 4. Documentación y revisión

- [ ] 4.1 Escribir `docs/ops/publicar.md` (requisitos, órdenes, simulacro, vuelta atrás, qué hacer si falla) y la sección del README; verificar que los comandos documentados funcionan en simulacro.
- [ ] 4.2 Revisión independiente (`engineering-review`) y revisión de seguridad (`security-review`); sin bloqueantes pendientes.

## Workflow follow-up

- La primera promoción real con estas órdenes es un paso aparte, con autorización explícita del usuario.
- Archivar con `openspec-archive-change` tras VERIFIED y conformidad del usuario.
