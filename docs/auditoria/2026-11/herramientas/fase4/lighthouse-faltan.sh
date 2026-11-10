#!/usr/bin/env bash
# Como lighthouse.sh de la auditoría, pero solo ejecuta las pasadas cuyo JSON falta
# (o quedó vacío), para reanudar una tanda interrumpida sin repetirla entera.
# Uso: lighthouse-faltan.sh <base-url> <carpeta-salida>
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
      target="$OUT/${slug}__${mode}__${run}.json"
      [ -s "$target" ] && python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$target" 2>/dev/null && continue
      npx -y lighthouse@13.5.0 "$BASE$page" "${preset[@]}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --chrome-path=/usr/bin/google-chrome \
        --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
        --output=json --output-path="$target" --quiet \
        || echo "FALLO $page $mode $run"
    done
  done
done
echo "terminado: $(ls "$OUT"/*.json | wc -l) informes"
