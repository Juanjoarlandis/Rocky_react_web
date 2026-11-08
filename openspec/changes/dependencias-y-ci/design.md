# Diseño: dependencias y CI en verde

## Context

Ver `proposal.md`. `npm audit` (2026-11-08): 3 críticas, 6 altas y 6 moderadas. `npm audit
fix --dry-run` resuelve todo salvo `vitest`, `@vitest/coverage-v8` y `@vitest/mocker`, porque
`package.json` fija `vitest` y `@vitest/coverage-v8` exactamente en 4.1.10 y `@vitest/mocker`
es vulnerable hasta la 4.1.11.

## Goals / Non-Goals

**Goals:** `npm audit --audit-level=moderate` y `npm audit --omit=dev --audit-level=moderate`
en cero; CI en verde en la rama; `.env.example` completo.

**Non-Goals:** actualizar por actualizar; saltos de versión mayor.

## Decisions

- **D1. `npm audit fix` sin `--force`.** Solo toca el lockfile dentro de los rangos
  declarados. **Alternativa descartada**: `--force`, que haría saltos mayores no revisados.
- **D2. `vitest` y `@vitest/coverage-v8` a 4.1.12, cada uno con su estilo** (`^4.1.12` y
  `4.1.12` exacta, como estaban); 4.1.12 es la primera que corrige `@vitest/mocker` y
  tiene más de dos semanas. **Alternativa descartada**: unificar el estilo de ambos, que es
  un cambio de convención no pedido.
- **D4. `overrides.qs` a 6.16.1, y después retirado.** El `overrides` llegó con la rama de
  septiembre. Primero se subió a 6.16.1 (GHSA-6pq8-jhm2-2vcw). La revisión independiente
  comprobó que `express` 4.22.3 y `body-parser` 1.20.9 ya piden `~6.16.0`, así que npm
  resuelve 6.16.1 sin él, y que un pin exacto impediría a `npm audit fix` aplicar futuros
  parches: se retira. `qs` sigue en 6.16.1 y `npm audit` en 0.
- **D3. `.env.example` con valores por defecto del código.** Para cada variable nueva se
  lee su valor por defecto en `server/config/*.mjs` o el script que la usa, y los secretos
  van vacíos. Así el fichero sigue sirviendo de plantilla y el escáner de secretos no salta.

## Risks / Trade-offs

- **`vite` 8.2.1 → 8.3.6 cambia el build** → se compara el tamaño de los chunks con la
  línea base de `metricas.md` y se pasa la batería de humo de la auditoría.
- **`express`/`body-parser`/`proxy-addr` cambian la cadena de peticiones** → los tests del
  servidor (proyecto Node de Vitest) y una pasada E1 de transversales con los scripts de la
  auditoría cubren origen, límites y errores.

## Migration Plan

Sin despliegue en este cambio. Volver atrás es revertir el commit.

## Criterios de aceptación

- **CA1**: `npm audit --audit-level=moderate` y `npm audit --omit=dev --audit-level=moderate`
  terminan con 0 vulnerabilidades.
- **CA2**: `npm run check` en verde con Node 24.
- **CA3**: el CI de la rama en GitHub termina en verde tras el push.
- **CA4**: todas las variables que leen `server/` y `scripts/` aparecen en `.env.example`
  (comando de la tarea 2.1).
- **CA5**: `git diff` solo toca `package.json` (dos dependencias de desarrollo y `overrides.qs`), `package-lock.json`,
  `.env.example` y este cambio de OpenSpec.

## Revisión independiente (2026-11-08)

Sin bloqueantes ni importantes. Menores resueltos: el comentario de `.env.example` sobre el
envío real (exige `--apply`, `RESEND_API_KEY` y `AVISOS_FROM`) y el `overrides` de `qs`
(D4). Probado además el servidor de desarrollo con Vite 8.3.6: una mutación por el proxy
`/api` con el `Origin` exacto llega a Express (400 de validación, no 403) y otro origen
recibe 403. Deuda anotada, sin acción: el lockfile añade 17 `"peer": true` por la versión
de npm local (11.6.1), sin efecto con `npm ci`; y seis subidas transitivas de desarrollo
dentro de rango (`chai`, `es-module-lexer`, `obug`, `std-env`, `tinyexec`, `tinyrainbow`).
