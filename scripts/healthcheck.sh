#!/usr/bin/env bash
# Sonda de salud del contenedor: pide GET /api/health al propio servidor y
# termina con 0 solo si responde 200. Se hace con bash y /dev/tcp para no
# arrancar un proceso de Node en cada sonda (85 ms de CPU y 24 MB cada 30 s);
# la imagen no trae curl ni wget.
set -u

port="${PORT:-3001}"
case "$port" in
  '' | *[!0-9]*) exit 1 ;;
esac

# El descriptor 3 es el socket; si nadie escucha, exec falla y la sonda también.
exec 3<>"/dev/tcp/127.0.0.1/${port}" 2>/dev/null || exit 1
printf 'GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n' >&3 || exit 1
IFS= read -r -t 4 status <&3 || exit 1
exec 3<&- 3>&-

# La línea de estado es «HTTP/1.1 200 OK»; un «2000» no vale.
status="${status%$'\r'}"
case "$status" in
  'HTTP/1.'[01]' 200' | 'HTTP/1.'[01]' 200 '*) exit 0 ;;
  *) exit 1 ;;
esac
