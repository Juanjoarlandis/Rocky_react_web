# Propuesta: proceso de publicación versionado (C01b)

## Why

La release activa en producción se construyó desde un commit que nunca llegó a GitHub, y
el procedimiento que crea y promueve las releases no está en el repositorio: cada
`promote.sh` lo escribía a mano un agente para esa release concreta (H-001 de
`docs/auditoria/2026-11/hallazgos.md`). El código ya está rescatado y subido
(`rescate/produccion-2026-09-29`); falta que publicar sea reproducible y que no se pueda
volver a publicar algo que no esté en el remoto. Es la parte de nivel 3 de C01 del plan de
fases aprobado.

## What Changes

- Scripts versionados en el repo para **preparar** una release desde un commit que existe
  en `origin` (copia de código sin `.git` ni secretos, `SHA256SUMS`, `release.json`),
  **construir** su imagen en la Raspberry y **promoverla** con copia del selector y del
  estado, espera de salud y vuelta atrás automática; los tres con modo simulacro.
- Un comando de **vuelta atrás** manual a la release anterior.
- Guía de operación en `docs/ops/publicar.md` y referencia desde el README.
- Pruebas unitarias de la lógica pura (validaciones, metadatos, plan de promoción).

## Capabilities

### New Capabilities
- `publicacion-de-releases`: cómo se prepara, construye, promueve y revierte una release
  de producción, y las garantías que debe dar (origen del código, ausencia de secretos,
  salud y vuelta atrás, registro).

### Modified Capabilities

Ninguna.

## Fuera de alcance

- Desplegar una release nueva en producción: este cambio entrega las herramientas y las
  prueba en simulacro; la primera promoción real es un paso aparte que necesita
  autorización explícita del usuario.
- Cloudflare, el túnel, `/etc/rocky035/rocky.env` y los secretos de producción.
- CI/CD automático hacia la Raspberry (alternativa descartada en `design.md`).

## Supuestos

- La Raspberry sigue accesible por SSH como hoy (`raspberry` por Tailscale o la IP local)
  y el usuario de despliegue puede usar `sudo` para los pasos que requieren root, como
  hacían los `promote.sh` manuales.
- Se conserva el layout actual: `/opt/rocky035/releases/<id>`, `current`, `compose.env` y
  `/var/lib/rocky035`.

## Impact

Ficheros nuevos en `scripts/release/` (con sus tests), `docs/ops/publicar.md`, una sección
del `README.md` y scripts en `package.json`. Ningún cambio en `src/`, `server/` ni en
producción. Cierra la parte pendiente de H-001.
