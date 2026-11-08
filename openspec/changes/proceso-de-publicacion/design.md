# Diseño: proceso de publicación versionado

## Context

Ver `proposal.md`. Hoy (documentado en `docs/archive/2026-08/superpowers/plans/2026-08-31--shopify-catalog-production/tasks/03-production-rollout.md`
y en el `promote.sh` de la release `20260929T100641Z-el-toxico-5617951b`):

1. Se crea una copia del código sin secretos ni `.git` en
   `/opt/rocky035/releases/<fecha>-<nombre>-<hash>/`, con `SHA256SUMS` y `release.json`.
2. En la Raspberry se construye la imagen ARM64 `rocky035:<release>`; el `Dockerfile`
   multi-etapa repite tests y build.
3. Un `promote.sh` escrito para esa release comprueba que `current` y la imagen activa
   son las anteriores, copia `compose.env` y el estado cifrado, escribe el nuevo selector
   (`ROCKY_IMAGE`, `COMPOSE_PROJECT_NAME`), mueve `current` de forma atómica y hace
   `docker compose up --wait`; si falla, restaura y recrea la anterior.

## Goals / Non-Goals

**Goals:** que esos tres pasos sean órdenes del repo, con simulacro, verificación del
origen del código y vuelta atrás; que sean probables por partes.

**Non-Goals:** cambiar la topología de producción (Docker en la Raspberry, Cloudflare
delante); automatizar el despliegue desde GitHub.

## Decisions

### D1. Órdenes en Node desde el equipo de desarrollo, por SSH a la Raspberry
`scripts/release/` en `.mjs` (convención del proyecto) con tres órdenes —`preparar`,
`promover`, `revertir`— que ejecutan en la Raspberry, por SSH, scripts de shell
generados desde una plantilla versionada.
**Alternativas descartadas**: (a) CI/CD de GitHub Actions hacia la Raspberry por
Tailscale: obliga a guardar en GitHub una clave con acceso a producción y a exponer la
Raspberry a la red de Actions; (b) construir en CI y publicar en un registro: añade un
registro, la compilación cruzada a ARM64 y otro sitio con credenciales; (c) solo
documentar el proceso: es lo que hay ahora y es la causa de H-001.

### D2. El paquete sale de `git archive` del commit, no del árbol de trabajo
Garantiza que solo viaja lo versionado y que el contenido coincide con el commit. Se
aplican después las exclusiones de `.dockerignore` y se rechazan los `.env*` salvo
`.env.example`. **Alternativa descartada**: copiar el árbol de trabajo, que puede llevar
ficheros sin commit.

### D3. Comprobación de remoto con `git fetch` + `git branch -r --contains`
La rama remota que contiene el commit se registra en `release.json`.

### D4. Plantilla única de promoción
Un `promote.sh` parametrizado (release, anterior, imagen, imagen anterior, proyecto de
Compose) que reproduce exactamente el procedimiento manual: precondiciones, copias,
selector atómico, `up --wait --wait-timeout 90`, `trap` de vuelta atrás y registro de
servicios. Se genera con los valores ya validados y se ejecuta con `sudo bash`.

### D5. Identificador de release
`<UTC AAAAMMDDTHHMMSSZ>-<etiqueta>-<8 primeros del sha256 del contenido>`, igual que hoy,
para que convivan con las 44 releases existentes.

### D6. Simulacro por defecto
Sin `--aplicar`, cada orden solo imprime el plan y las comprobaciones. Así la primera
ejecución contra la Raspberry es inofensiva.

## Contratos

- `npm run release:preparar -- --commit <sha|rama> --etiqueta <nombre> [--aplicar]`
- `npm run release:promover -- --release <id> [--aplicar]`
- `npm run release:revertir -- [--aplicar]`
- Configuración por entorno: `RELEASE_HOST` (por defecto `raspberry`) y `RELEASE_ROOT`
  (por defecto `/opt/rocky035`). Ningún secreto en el repo ni en los scripts.

## Risks / Trade-offs

- **[Romper producción al promover]** → simulacro por defecto, precondiciones estrictas,
  vuelta atrás automática probada en local con un Docker de prueba, y primera promoción
  real solo con autorización explícita.
- **[Diferencias entre la plantilla y los `promote.sh` manuales]** → se compara el script
  generado para un caso real (release anterior → actual) con el `promote.sh` de
  `20260929T100641Z-el-toxico-5617951b` y se justifica cada diferencia.
- **[SSH o sudo no disponibles]** → la orden falla antes de cambiar nada y lo dice.
- **[Disco de la Raspberry]** → `preparar` informa del espacio libre y del número de
  releases; la limpieza de releases antiguas queda fuera de este cambio.

## Migration Plan

No hay migración: las releases existentes no se tocan y el layout es el mismo. Volver
atrás de este cambio es borrar `scripts/release/` y la documentación; producción no se ve
afectada porque este cambio no despliega.

## Open Questions

- Si la Raspberry exige contraseña para `sudo` en modo no interactivo: se comprueba en
  el simulacro y, si hace falta, se documenta cómo ejecutarlo.
