# Progreso

## Tarea 01 — catálogo

- Estado: completada.
- Archivos funcionales: `src/App.jsx`, `src/shopify/api.js`,
  `src/shopify/useStorefront.js`.
- Pruebas actualizadas: `src/App.storefront.test.jsx`,
  `src/shopify/api.test.js`, `src/shopify/useStorefront.test.jsx`.
- Evidencia TDD: las tres expectativas nuevas fallaron con el comportamiento
  anterior (`first=50`, prop `previewProducts` y mezcla local); después del
  cambio pasaron 13/13 pruebas dirigidas.
- `git diff --check`: aprobado.
- Dependencias: sin cambios.

## Tarea 02 — verificación y revisión

- Estado: completada con bypass explícito de Oracle.
- Node 24.19.0: 43 archivos y 312 pruebas, build Vite y escaneo de
  secretos aprobados.
- `npm audit` completo y `npm audit --omit=dev`: 0 vulnerabilidades.
- `git diff --check`: aprobado.
- Docker local: no ejecutado porque Docker Desktop no estaba activo; la
  comprobación y el build ARM64 se trasladan al host real.
- Oracle review: bypassed.
- Checkpoint: tested diff / release plan.
- Session: `rocky-react-shopify-catalog-production` (falló antes de producir
  revisión; no se reutiliza).
- Outcome: el usuario pidió detener Oracle y desplegar directamente.

## Tarea 03 — producción

- Estado: completada y verificada.
- Release activa:
  `/opt/rocky035/releases/20260831T101511Z-335534d-catalog8-beats-r2`.
- Imagen activa: `rocky035:20260831T101511Z-335534d-catalog8-beats-r2`.
- Digest: `sha256:9496a75f6c841d2d953764cbaaa868a9d575f82ee42f727b0ac7a7507d192986`.
- Arquitectura/runtime: ARM64, Node 24.19.0, usuario `node`, root filesystem
  de solo lectura y reinicio `unless-stopped`.
- Build ARM64: 44 archivos y 313 pruebas, build Vite y auditoría de
  dependencias de producción aprobados dentro de la imagen.
- Catálogo: ocho productos Shopify, ocho vendibles y cero previews locales.
- Navegador: portada desktop y 390 px, Estudio/BeatMachine, script de tema
  same-origin y consola sin errores ni warnings; sin overflow horizontal.
- Salud: origen privado, apex y `www` respondieron correctamente antes y
  después de un reinicio controlado.
- Seguridad: CSP/HSTS/cabeceras conservadas y origen no confiable rechazado
  con 403.
- Servicios ajenos: permanecieron activos.
- Rollback inmediato: release
  `/opt/rocky035/releases/20260831T100513Z-335534d-catalog8-beats`, imagen
  `rocky035:20260831T100513Z-335534d-catalog8-beats` y selector protegido
  `/opt/rocky035/compose.env.pre-20260831T101511Z-335534d-catalog8-beats-r2`.
- Rollback anterior conservado: release
  `/opt/rocky035/releases/20260821T113325Z-ee13492-drop-groove`.

## Incidencia cerrada durante el smoke

La primera candidata reveló que el script inline que aplicaba el tema era
bloqueado por `script-src 'self'`. Se movió la misma inicialización a
`public/theme-init.js`, se añadió una regresión que prohíbe scripts inline y se
construyó la release r2. La nueva sesión de navegador confirmó cero mensajes de
consola y carga efectiva del script.
