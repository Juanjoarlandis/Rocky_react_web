# El Curioso itinerante — plan

## Problem statement

La web ya usa El Curioso como personaje asomado en el carrito. Se quiere
convertir esa aparición en un detalle global y ocasional que parezca acompañar
al visitante sin perjudicar las tareas principales.

## Scope and non-goals

El cambio añade un componente global, sus estilos, pruebas e integración en
`App`. No añade dependencias, seguimiento literal del cursor, estado persistente
ni cambios de contenido o rutas.

## Architecture / behavior delta

`App` monta `CuriousPeeker` fuera del contenido enrutado. El componente decide
si puede aparecer según splash y ruta, rota por tres posiciones y controla dos
temporizadores: espera y tiempo visible. CSS resuelve todas las transiciones,
capas, responsive y movimiento reducido.

## Sequencing

1. Fijar el contrato con pruebas y crear el componente mínimo.
2. Integrar estilos y validar visualmente escritorio/móvil.
3. Ejecutar la puerta completa y desplegar la release aislada.

## Verification matrix

| Claim | Evidence |
| --- | --- |
| Timing and rotation work | Targeted Vitest tests |
| Sensitive routes stay clear | Route/splash tests |
| No interaction or accessibility regression | DOM assertions |
| Responsive placement is safe | Browser screenshots and overflow check |
| Production serves the change | ARM64 image build, health probes and public asset check |

## Risks and rollback

The animation can distract or overlap fixed controls. Long pauses, exclusions,
dedicated z-index values and 390 px QA mitigate that risk. Rollback reactivates
the immediately previous `rocky035` image and release without touching the
Cloudflare tunnel.

## Tasks

- `tasks/01-component-and-tests.md`
- `tasks/02-integration-and-visual-qa.md`
- `tasks/03-deploy-and-verify.md`
