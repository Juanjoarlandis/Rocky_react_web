#!/usr/bin/env bash
# Copia diaria del almacén cifrado de ROCKY 035. Pensado para el cron de la
# Raspberry: guarda una copia con fecha y conserva las últimas 30. La copia
# sólo se puede leer con la misma APP_ENCRYPTION_KEY, así que guarda esa clave
# en otro sitio (gestor de contraseñas), nunca junto a las copias.
#
#   sudo scripts/backup-estado.sh                      # valores por defecto
#   ORIGEN=/otra/ruta.enc DESTINO=/mnt/usb/rocky scripts/backup-estado.sh
set -euo pipefail

ORIGEN="${ORIGEN:-/var/lib/rocky035/rocky-state.enc}"
DESTINO="${DESTINO:-/var/backups/rocky035}"
CONSERVAR="${CONSERVAR:-30}"

if [[ ! -r "$ORIGEN" ]]; then
  echo "No se puede leer $ORIGEN" >&2
  exit 1
fi

umask 077
mkdir -p "$DESTINO"
sello="$(date -u +%Y%m%dT%H%M%SZ)"
copia="$DESTINO/rocky-state-$sello.enc"

# cp a un temporal y mv: la copia aparece entera o no aparece.
cp "$ORIGEN" "$copia.tmp"
mv "$copia.tmp" "$copia"

# Rotación: sólo quedan las CONSERVAR más recientes.
ls -1t "$DESTINO"/rocky-state-*.enc 2>/dev/null | tail -n +"$((CONSERVAR + 1))" | while read -r vieja; do
  rm -f "$vieja"
done

echo "Copia guardada en $copia ($(stat -c %s "$copia" 2>/dev/null || stat -f %z "$copia") bytes)"
