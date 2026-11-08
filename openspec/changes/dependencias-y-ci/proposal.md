# Propuesta: dependencias y CI en verde (C01a)

## Why

La auditoría de noviembre (`docs/auditoria/2026-11/`) encontró que `npm audit` da 15
vulnerabilidades, 4 en dependencias de producción, y que el CI («Security and build»)
falla en el paso `npm audit --audit-level=moderate` (H-002). Además `.env.example` no
documenta nueve variables que el servidor lee, entre ellas la que activa el envío real de
correos (H-006), y dos ficheros del árbol de trabajo quedaron con permisos 600 al
rescatarlos de la Raspberry (H-144). Es el primer cambio del plan de fases aprobado: sin
CI en verde no hay base fiable para el resto.

Este cambio es la parte de nivel 2 de C01 (`plan-fases.md`). La parte de nivel 3 (proceso
de publicación versionado, resto de H-001) va en un cambio aparte, `proceso-de-publicacion`,
que necesita aprobación de su diseño antes de implementarse.

## What Changes

- Actualizar `package-lock.json` con `npm audit fix` (sin `--force`): parches y menores
  dentro de los rangos de `package.json` (`express` 4.22.3, `body-parser` 1.20.9,
  `proxy-addr` 2.0.8, `vite` 8.3.6, `concurrently` 10.0.7, y transitivas).
- Subir `@vitest/coverage-v8` (pin exacto) y `vitest` (rango `^`) de 4.1.10 a **4.1.12**
  (2026-10-15), que corrige `@vitest/mocker`; se conserva el estilo de cada uno.
- Resolver `qs` en **6.16.1** (2026-10-14), que corrige GHSA-6pq8-jhm2-2vcw. El `overrides`
  que lo fijaba en 6.16.0 (añadido en la rama de septiembre) primero se subió y, tras la
  revisión independiente, se retiró: ya no hace falta (ver `design.md`, D4).
- Documentar en `.env.example` las nueve variables que faltan, con valores vacíos o los
  valores por defecto del código y un comentario de para qué sirven.
- Corregir a 644 los permisos de `public/music/modo-neon.m4a` y `public/theme-init.js` en
  el árbol de trabajo (Git ya los guarda como 100644).

## Capabilities

### New Capabilities

Ninguna: no cambia el comportamiento de la web. `skip_specs: true`.

### Modified Capabilities

Ninguna.

## Fuera de alcance

- Saltos mayores (`express` 5, `eslint` 10, `stylelint` 17, `dotenv` 18…): migrar a
  Express 5 requiere acuerdo previo (`CLAUDE.md`).
- El proceso de publicación y el despliegue en la Raspberry (cambio
  `proceso-de-publicacion`).

## Supuestos

- Las versiones nuevas no cambian el comportamiento observable: lo comprueban
  `npm run check` (670 tests, lint, build y escáner de secretos) y una pasada de humo con
  los scripts de la auditoría.

## Impact

`package.json` (dos dependencias de desarrollo y el `overrides` de `qs`), `package-lock.json`, `.env.example` y permisos
locales de dos ficheros. Sin cambios en `src/`, `server/` ni `shared/`. Hallazgos que
cierra: H-002, H-006 y H-144.
