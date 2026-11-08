#!/usr/bin/env bash
# Lighthouse de partida (auditoría 2026-11, tarea 6.2).
# Uso: lighthouse.sh <base-url> <carpeta-salida>
set -u
BASE=${1:-http://localhost:3001}
OUT=${2:-lh}
mkdir -p "$OUT"
PAGES=(/ /products /product/rockydz-boyz /menudrop /estudio /crew /rockyIA /cart /legal/privacidad /no-existe)
for page in "${PAGES[@]}"; do
  slug=$(echo "$page" | sed -E 's#^/$#portada#; s#^/##; s#/#_#g')
  for mode in movil escritorio; do
    preset=()
    [ "$mode" = escritorio ] && preset=(--preset=desktop)
    for run in 1 2 3; do
      npx -y lighthouse@13.5.0 "$BASE$page" "${preset[@]}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --chrome-path=/usr/bin/google-chrome \
        --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
        --output=json --output-path="$OUT/${slug}__${mode}__${run}.json" --quiet \
        || echo "FALLO $page $mode $run"
    done
  done
done
echo "terminado: $(ls "$OUT"/*.json | wc -l) informes"
