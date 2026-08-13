# Rocky 035 — subbloque de spinners y movimiento reducido

Fecha: 2026-08-10
Estado: implementación y verificación local completas; producción sin cambios

## Problema

Oracle detectó que dos indicadores conservaban rotación infinita aunque el sistema solicitara movimiento reducido:

1. `.page-loading-spinner`, usado como fallback global de rutas;
2. `.setlist-spinner`, usado para señalar la pista activa de Estudio.

El feedback visual debía permanecer; sólo debía detenerse el giro continuo.

## Corrección

- `src/index.css`: `.page-loading-spinner { animation: none; }` bajo `prefers-reduced-motion: reduce`.
- `src/styles/Studio.css`: `.setlist-spinner { animation: none; }` bajo el mismo media query.
- `src/reducedMotion.test.js`: contrato estático para impedir que ambas excepciones reaparezcan.

No se ocultan iconos, no se cambia el estado activo, no se modifican tiempos normales y no se toca el reproductor de Estudio.

## Verificación

- TDD: dos pruebas fallaron antes del CSS y pasaron después;
- prueba enfocada: 1 archivo, 2 pruebas correctas;
- `npm run check`: 36 archivos, 234 pruebas, build Vite y secret scan correctos;
- `git diff --check`: correcto.

## Límite

Una captura estática no puede demostrar la ausencia de rotación. Este subbloque se cierra mediante el contrato CSS y su prueba; la validación temporal integral queda pendiente junto al scroll automático de Crew y una sesión real con movimiento reducido antes de producción.
