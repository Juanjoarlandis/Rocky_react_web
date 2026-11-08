# Tareas: dependencias y CI en verde

## 1. Dependencias

- [x] 1.1 Ejecutar `npm audit fix` sin `--force` y verificar con `git diff --stat` que solo cambia `package-lock.json`.
- [x] 1.2 Fijar `vitest` y `@vitest/coverage-v8` a 4.1.12 en `package.json`, `npm install` y verificar que `npm audit --audit-level=moderate` y `npm audit --omit=dev --audit-level=moderate` dan 0 vulnerabilidades (CA1).
- [x] 1.3 Ejecutar `npm run check` con Node 24 y verificar que pasan los 670 tests, lint, lint:css, build y security:check (CA2); comparar los tamaños de chunk con `metricas.md` y anotar la diferencia. Resultado (2026-11-08): 99 ficheros / 670 tests en verde, lint, lint:css, build y security:check limpios; JS común 337,04 kB (110,98 kB gzip) frente a 336,79 kB (110,80 kB) de la línea base, CSS común sin cambios (66,40 kB).

## 2. Configuración documentada

- [x] 2.1 Añadir a `.env.example` las variables que leen `server/` y `scripts/` y faltan, con su valor por defecto del código o vacías si son secretos; verificar con `comm` entre `grep -rhoE "env\.[A-Z][A-Z0-9_]+" server scripts` y las claves de `.env.example` que no falta ninguna (CA4) y que `npm run security:check` sigue limpio.
- [x] 2.2 Poner a 644 los permisos locales de `public/music/modo-neon.m4a` y `public/theme-init.js`; verificar con `stat` y que `git status` no los marca como modificados.

## 3. Verificación

- [x] 3.1 Pasar la batería de humo de la auditoría (scripts de transversales y catálogo de E1) contra el build nuevo; verificar que no aparecen fallos que no estuvieran en `ejecucion.md`. Resultado (2026-11-08): `scratchpad/e1/humo-c01a.mjs` (origen ajeno 403, JSON malformado 400, cuerpo > 16 kB 413, límite de avisos 429, 404 JSON de la API, caché de estáticos e `index.html`, CSP, y render sin errores de las 11 rutas en escritorio y móvil): 29/29 OK. Se usó una prueba propia en lugar de reejecutar los scripts de la auditoría para no sobrescribir sus observaciones.
- [x] 3.2 Comprobar CA5 con `git diff --stat`. Resultado: `.env.example`, `docs/README.md` (de la auditoría), `package.json` y `package-lock.json`; los permisos no aparecen porque Git ya los guardaba como 644.

## Workflow follow-up

- Commit y push cuando el usuario lo autorice; verificar el CI en GitHub (CA3).
- Archivar con `openspec-archive-change` tras VERIFIED y conformidad del usuario.
