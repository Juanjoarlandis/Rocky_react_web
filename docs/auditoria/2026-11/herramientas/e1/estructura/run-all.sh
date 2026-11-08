#!/bin/bash
# Pasada completa: cada script contra su propia instancia E1 (config. por defecto de .env.example),
# porque en una sola instancia el límite SHOPIFY_RATE_LIMIT_MAX=120/min por IP salta con todo en paralelo.
cd "$(dirname "$0")"
NODE=/RUTA/A/node24
SCRIPTS=(${ONLY:-intro nav carga piemuro legal404 curioso estampida paparazzi})
SERVE=()
RUN=()
for i in "${!SCRIPTS[@]}"; do
  port=$((3301 + i))
  $NODE serve.mjs $port > out/serve-$port.log 2>&1 &
  SERVE+=($!)
done
trap 'kill -TERM "${SERVE[@]}" 2>/dev/null; wait "${SERVE[@]}" 2>/dev/null' EXIT
for i in "${!SCRIPTS[@]}"; do
  port=$((3301 + i))
  for t in $(seq 1 60); do curl -sf localhost:$port/api/health >/dev/null && break; sleep 0.5; done
done
for i in "${!SCRIPTS[@]}"; do
  port=$((3301 + i)); s=${SCRIPTS[$i]}
  ORIGIN=http://localhost:$port timeout 900 $NODE $s.mjs > out/$s.log 2>&1 &
  RUN+=($!)
done
wait "${RUN[@]}"
echo "fin de la pasada"
grep -h "^\[" out/*.log | cut -c1-150
