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

- `npm run release:preparar -- --etiqueta <nombre> [--aplicar]` (publica el commit de `HEAD`)
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

## Revisión independiente (ronda 1, 2026-11-08) y cambios de diseño

La revisión encontró 1 bloqueante, 6 importantes y 8 menores; la revisión de seguridad no
encontró vulnerabilidades por encima del umbral. Cambios resultantes:

- **D1 (ejecución)**: el script ya no se ejecuta atado a la sesión SSH. Se guarda en la
  carpeta de la release (`promover-<marca>.sh`), se lanza con `sudo -n setsid -f` con su
  salida en `promover-<marca>.log` y el equipo local solo sigue el log hasta una marca
  final. Así un corte de conexión no deja la promoción a medias sin vuelta atrás.
- **D2 (paquete)**: `ls-tree -z` y `git --literal-pathspecs archive`, para que nombres no
  ASCII o con `[ ]` ni se escapen del filtro ni arrastren otros ficheros. `scripts/release`
  entra en `.dockerignore`: sus tests necesitan `git`, que la imagen de build no trae
  (bloqueante de la revisión).
- **D3 (remoto)**: `git fetch --prune origin` y solo `refs/remotes/origin/`; se prefiere
  `main` y se registra sin el prefijo `origin/`, como en las releases anteriores.
- **D4 (plantilla)**: `set -Eeuo pipefail`, borrado de `current.next` residual, copias con
  la marca de la operación, registros anteriores apartados, cerrojo `flock`, comprobación
  de que el estado cifrado es un fichero normal, códigos de salida 2/1/3 con marca final
  y `anterior.txt` con la release sustituida.
- **D5 (identificadores)**: la validación acepta también el formato antiguo
  (`<marca>-<texto kebab>`), para poder revertir a las 44 releases existentes; la
  generación sigue siendo `<marca>-<etiqueta>-<8 hex>`.
- **Revertir**: usa `anterior.txt` (la release realmente sustituida al promover); la
  release de partida de `release.json` queda como respaldo avisado para releases
  promovidas a mano.
- **Contratos**: `preparar` publica siempre el commit de `HEAD` (no hay `--commit`); los
  argumentos desconocidos o sin valor se rechazan; `RELEASE_ROOT` y `RELEASE_HOST` se
  validan.
- **Pregunta abierta resuelta**: el simulacro comprueba `sudo -n true` y avisa si `sudo`
  pide contraseña; `--aplicar` exige `NOPASSWD` o ejecución manual del script.

## Revisión independiente (ronda 2, 2026-11-08)

Confirmó corregido el bloqueante de la ronda 1 y encontró uno nuevo: el `umask 077` global
del script dejaba `anterior.txt` (y los registros) en 600 de root, ilegibles para el
usuario de despliegue, y `revertir` caía en silencio a `release.json`. Corrección: el
`umask` restrictivo solo envuelve la escritura del selector, los registros quedan en 644,
la lectura remota distingue «no existe» (respaldo avisado) de «no se puede leer» (aborta),
el destino y los avisos se anuncian antes de ejecutar y un fallo previo a los cambios
también deja marca final. Por el límite de dos rondas no hubo una tercera; queda cubierto
por pruebas.
