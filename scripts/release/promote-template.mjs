// Script de promoción que se ejecuta en la Raspberry con sudo, desacoplado de la sesión
// SSH. Parte del procedimiento de los promote.sh escritos a mano hasta septiembre de 2026
// (precondiciones, copia del selector y del estado, selector atómico, espera de salud y
// vuelta atrás automática) y lo endurece tras la revisión independiente:
// - `set -E` para que un fallo dentro de una función también dispare la vuelta atrás;
// - `current.next` residual de una ejecución interrumpida se borra antes de enlazar;
// - copias por operación (marca de tiempo) y registros anteriores apartados, no pisados;
// - cerrojo contra promociones simultáneas;
// - la release sustituida se anota en `anterior.txt`, que es lo que usa `revertir`;
// - códigos de salida y una marca final legibles por quien sigue el log:
//   2 = precondición (no se ha tocado nada), 1 = vuelta atrás hecha, 3 = vuelta atrás fallida;
// - (despliegue-ligero) solo se promueve una imagen que `preparar` verificó en esta máquina:
//   la marca de la release tiene que existir y nombrar la imagen que hoy lleva esa etiqueta.
//   Volver a una release anterior no lo exige: las de antes de ese cambio no tienen marca;
// - el selector nuevo conserva el límite de memoria (ROCKY_MEM_LIMIT) que ya tuviera.
// Todo valor que se interpola pasa antes por una validación estricta.
import { VERIFIED_MARK, imageTag, safePath, validateReleaseId, validateStamp } from './lib.mjs';

const PROJECT = /^[a-z0-9][a-z0-9_-]*$/;
const OWNER = /^(?:root:root|\d+:\d+)$/;
export const END_MARK = 'PROMOCION-FIN resultado=';

export function renderPromoteScript({
  release,
  previous,
  project,
  stamp,
  root = '/opt/rocky035',
  stateFile = '/var/lib/rocky035/rocky-state.enc',
  backupsRoot = '/var/backups/rocky035',
  waitTimeout = 90,
  owner = 'root:root',
  requireVerified = true,
}) {
  validateReleaseId(release);
  validateReleaseId(previous);
  validateStamp(stamp);
  if (release === previous)
    throw new Error('La release a activar y la anterior no pueden ser la misma.');
  if (!PROJECT.test(String(project)))
    throw new Error(`Nombre de proyecto de Compose no válido: ${project}`);
  if (!OWNER.test(String(owner)))
    throw new Error(`Propietario no válido para el selector: ${owner}`);
  const base = safePath(root, 'la raíz de releases');
  const state = safePath(stateFile, 'el estado cifrado');
  const backups = safePath(backupsRoot, 'las copias');
  if (!Number.isInteger(waitTimeout) || waitTimeout < 10 || waitTimeout > 600) {
    throw new Error('El tiempo de espera de salud debe estar entre 10 y 600 segundos.');
  }
  const up = (dir) =>
    `docker compose --env-file "$selector" -f "${dir}/compose.production.yaml" up -d --no-build --no-deps --pull never --wait --wait-timeout ${waitTimeout} rocky035`;

  return `#!/usr/bin/env bash
# Activa ${release} sobre ${previous} (${stamp}). Generado por scripts/release/promover.mjs:
# copia del selector y del estado, cambio de imagen y vuelta atrás automática
# si el contenedor no queda sano.
set -Eeuo pipefail
release=${base}/releases/${release}
previous=${base}/releases/${previous}
image=${imageTag(release)}
previous_image=${imageTag(previous)}
selector=${base}/compose.env
backup=${base}/compose.env.pre-${release}-${stamp}
backups=${backups}/deploy-${release}-${stamp}
project=${project}
stamp=${stamp}

fail_pre() {
  echo "Precondición no cumplida: $1. No se ha cambiado nada." >&2
  echo '${END_MARK}precondicion'
  exit 2
}
# Hasta instalar la vuelta atrás solo se crean copias: cualquier fallo es «no se ha tocado nada».
trap 'fail_pre "fallo antes de empezar los cambios (código $?)"' ERR
exec 9>"${base}/.promover.lock"
flock -n 9 || fail_pre 'hay otra promoción en curso'
[ "$(readlink -f ${base}/current)" = "$previous" ] || fail_pre "la release activa no es $previous"
[ "$(docker inspect rocky035 --format '{{.Config.Image}}')" = "$previous_image" ] || fail_pre "el contenedor no ejecuta $previous_image"
docker image inspect "$image" >/dev/null || fail_pre "no existe la imagen $image"
${
  requireVerified
    ? `mark="$release/${VERIFIED_MARK}"
[ -f "$mark" ] && [ ! -L "$mark" ] || fail_pre "la imagen de \${release##*/} no está verificada (falta ${VERIFIED_MARK}): prepárala con release:preparar"
[ "$(cut -d' ' -f1 "$mark")" = "$(docker image inspect "$image" --format '{{.Id}}')" ] || fail_pre "la imagen $image no es la que se verificó al preparar la release"
`
    : ''
}[ -f ${state} ] && [ ! -L ${state} ] || fail_pre 'el estado cifrado no es un fichero normal'

mkdir -p "$backups"
chmod 700 "$backups"
cp -p "$selector" "$backup"
[ -r "$backup" ]

set_current() {
  rm -f ${base}/current.next
  ln -s "$1" ${base}/current.next
  mv -Tf ${base}/current.next ${base}/current
}

rollback() {
  local code=$?
  trap - ERR INT TERM HUP
  echo "La activación ha fallado (código $code); se restaura la release anterior." >&2
  if cp -p "$backup" "$selector" && set_current "$previous" && ${up('$previous')}; then
    echo '${END_MARK}vuelta-atras'
    exit 1
  fi
  echo 'LA VUELTA ATRÁS HA FALLADO: revisa a mano compose.env, current y el contenedor rocky035.' >&2
  echo '${END_MARK}vuelta-atras-fallida'
  exit 3
}
trap rollback ERR INT TERM HUP

for f in services-before.txt services-after.txt anterior.txt; do
  if [ -e "$release/$f" ]; then mv -f "$release/$f" "$release/\${f%.txt}-hasta-$stamp.txt"; fi
done
docker ps --format '{{.Names}} {{.ID}} {{.State}}' | awk '$1 != "rocky035"' | sort > "$release/services-before.txt"
docker stop --time 20 rocky035 >/dev/null
cp --preserve=mode ${state} "$backups/pre-activation-state.enc"
# El límite de memoria del contenedor, si el selector lo fijaba, se conserva.
mem_limit=$(grep -E '^ROCKY_MEM_LIMIT=[0-9]+[bkmgBKMG]?$' "$selector" | tail -n 1 || true)
if [ -z "$mem_limit" ] && grep -q '^ROCKY_MEM_LIMIT=' "$selector"; then
  echo 'Aviso: el ROCKY_MEM_LIMIT del selector no tiene la forma <número>[b|k|m|g] y no se conserva: el contenedor arranca con el límite por defecto.' >&2
fi
(umask 077 && { printf 'ROCKY_IMAGE=%s\\nCOMPOSE_PROJECT_NAME=%s\\n' "$image" "$project"; [ -z "$mem_limit" ] || printf '%s\\n' "$mem_limit"; } > "$selector.next")
chown ${owner} "$selector.next"
chmod 600 "$selector.next"
mv -f "$selector.next" "$selector"
set_current "$release"
${up('$release')}
${
  requireVerified
    ? `# Compose arranca por etiqueta: lo que corre tiene que ser la imagen que se verificó.
if [ "$(docker inspect rocky035 --format '{{.Image}}')" != "$(cut -d' ' -f1 "$mark")" ]; then
  echo 'Lo que ha arrancado no es la imagen verificada de la release.' >&2
  false
fi
`
    : ''
}trap - ERR INT TERM HUP
printf '%s\\n' "\${previous##*/}" > "$release/anterior.txt"
# Los lee el usuario de despliegue (revertir), que no es root.
chmod 644 "$release/anterior.txt" "$release/services-before.txt"
docker ps --format '{{.Names}} {{.ID}} {{.State}}' | awk '$1 != "rocky035"' | sort > "$release/services-after.txt"
chmod 644 "$release/services-after.txt"
docker inspect rocky035 --format 'Active={{.Config.Image}} Health={{.State.Health.Status}}'
echo '${END_MARK}ok'
`;
}
