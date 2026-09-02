#!/usr/bin/env bash
# Saca el material de marketing del repositorio de la web: posters/ entero y
# los binarios de prompts-munecos/ (PNG, WebP, JPG, ICO) a un repositorio
# aparte. Los briefs en Markdown y el script Python de prompts-munecos/ se
# quedan aquí. Ver docs/marketing/README.md.
#
#   scripts/marketing/extraer-posters.sh <ruta-del-repo-de-marketing>          # simulacro
#   scripts/marketing/extraer-posters.sh <ruta-del-repo-de-marketing> --apply  # mueve de verdad
#
# NO se ejecuta desde la CI ni desde otros scripts: es un paso manual y
# coordinado. Con --apply copia los ficheros al destino, los quita del índice
# de Git de este repo (git rm) y deja los cambios sin commitear en ambos
# repositorios para revisarlos. Reducir el tamaño del historial exige además
# la reescritura descrita en docs/ops/reescritura-historial.md.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DEST=${1:?Uso: extraer-posters.sh <ruta-del-repo-de-marketing> [--apply]}
MODE=${2:-}

cd "$ROOT"

if [[ ! -d "$DEST/.git" ]]; then
  echo "El destino $DEST no es un repositorio git. Créalo primero (git init) o clona el de marketing." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "El árbol de trabajo tiene cambios sin commitear. Deja el repo limpio antes de mover nada." >&2
  exit 1
fi

# Lista de ficheros a mover: todo posters/ y sólo los binarios de prompts-munecos/.
FILES=()
while IFS= read -r file; do FILES+=("$file"); done < <(git ls-files posters)
while IFS= read -r file; do FILES+=("$file"); done < <(
  git ls-files prompts-munecos | grep -Ei '\.(png|webp|jpe?g|gif|ico|mp4|webm)$' || true
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No hay nada que mover."
  exit 0
fi

TOTAL=$(printf '%s\0' "${FILES[@]}" | xargs -0 du -ch 2>/dev/null | tail -1 | cut -f1)
echo "Ficheros a mover: ${#FILES[@]} (${TOTAL}) → $DEST"

if [[ "$MODE" != "--apply" ]]; then
  printf '  %s\n' "${FILES[@]}" | head -40
  [[ ${#FILES[@]} -gt 40 ]] && echo "  … y $(( ${#FILES[@]} - 40 )) más"
  echo
  echo "Simulacro. Repite con --apply para mover de verdad."
  exit 0
fi

for file in "${FILES[@]}"; do
  mkdir -p "$DEST/$(dirname "$file")"
  cp -p "$file" "$DEST/$file"
done
git rm -q -r --cached posters
git rm -q --cached "${FILES[@]}" 2>/dev/null || true
rm -rf posters
for file in "${FILES[@]}"; do
  rm -f "$file"
done
find prompts-munecos -type d -empty -delete

cat <<EOF

Movidos ${#FILES[@]} ficheros a $DEST.

Siguientes pasos (a mano):
  1. En $DEST: git add -A && git commit -m "Importa los pósters y los muñecos de ROCKY 035"
  2. Aquí: revisa 'git status', actualiza prompts-munecos/README.md (las
     salidas ya no están en este repo) y añade a .gitignore:
       /posters
       /prompts-munecos/salidas
       /prompts-munecos/referencias
       /prompts-munecos/favicons
  3. Commit aquí: "Saca el material de marketing a su propio repositorio".
  4. Para que el historial deje de pesar, sigue docs/ops/reescritura-historial.md.
EOF
