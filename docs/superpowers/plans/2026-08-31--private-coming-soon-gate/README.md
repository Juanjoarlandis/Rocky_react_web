# Puerta privada “We are cooking”

## Problema

La SPA y sus APIs están públicas mientras se prepara el lanzamiento. Una
pantalla React con contraseña no cerraría el acceso a bundles, rutas ni APIs, y
Cloudflare podría compartir recursos protegidos si conservan la caché pública
actual.

## Alcance

- Añadir una puerta temporal en Express, antes de la aplicación y de sus
  recursos.
- Servir una portada responsive con identidad ROCKY 035, contraseña y estado de
  error, sin arrancar React.
- Conceder acceso temporal mediante la sesión segura existente.
- Activar y verificar la puerta en la release de producción.

## No objetivos

- Cuentas individuales, recuperación de contraseña o panel administrativo.
- Cambios en React, Shopify, catálogo, carrito, música o Crew.
- Dependencias nuevas.

## Cambio de arquitectura y comportamiento

`createConfig` incorporará una sección `siteAccess`. `server/access-gate.mjs`
encapsulará la comparación, el rate limit, la concesión de sesión, la portada y
el allowlist de recursos visuales. `server.mjs` registrará primero cabeceras,
healthcheck loopback y webhook firmado; después aplicará la puerta a todo el
tráfico humano. Cuando la puerta esté activa, el contenido autenticado no podrá
cachearse en un edge compartido.

## Secuencia

1. Implementar configuración, puerta y regresiones HTTP.
2. Verificar presentación, seguridad y workspace; cerrar hallazgos de revisión.
3. Crear una release, configurar el secreto fuera de Git, purgar caché y
   verificar producción desde sesiones autenticada y anónima.

## Verificación

| Superficie | Evidencia |
| --- | --- |
| Configuración | activación explícita y fallo cerrado sin contraseña |
| Acceso anónimo | portada en documentos; 404/no-store en APIs y recursos |
| Acceso válido | cookie segura, redirección y SPA/API disponibles |
| Abuso | comparación uniforme y rate limit por IP |
| Integraciones | health loopback y webhook firmado conservados |
| Interfaz | desktop y móvil, errores visibles, teclado y movimiento reducido |
| Workspace | Vitest, build, secret scan y `git diff --check` |
| Producción | caché purgada, anónimo cerrado, login correcto y reinicio sano |

## Riesgos y rollback

- La caché pública previa exige una purga al activar la puerta.
- La concesión se invalida al reiniciar, deliberadamente.
- El rollback técnico devuelve la release previa, pero también reabre la web;
  solo se ejecutará si se acepta ese efecto o se mantiene otra barrera externa.

## Tareas

1. `tasks/01-access-boundary.md`
2. `tasks/02-verification-review.md`
3. `tasks/03-production-rollout.md`

