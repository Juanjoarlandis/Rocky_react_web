# Despliegue de avisos y ritmo visual

## Resultado

- Estado: desplegado y verificado el 2026-08-21.
- URL principal: `https://rocky035.com`.
- Alias público: `https://www.rocky035.com`.
- Commit de aplicación: `ee13492e6173076e1f89e90e6cf3f580d2253b11`.
- Release: `/opt/rocky035/releases/20260821T113325Z-ee13492-drop-groove`.
- Imagen: `rocky035:<tag-imagen>`.
- ID de imagen: `sha256:<digest>`.
- Arquitectura: `linux/arm64`.
- Runtime: Node `v24.19.0`, usuario `node`.
- Proyecto Compose conservado: `20260807t094206z-d4a7bb2`.
- Copia del selector anterior: `/opt/rocky035/compose.env.pre-20260821T113325Z-ee13492`.

## Contenido publicado

- Avisos para productos próximos, con consentimiento, honeypot, rate limit,
  deduplicación y almacenamiento cifrado.
- Exportación y borrado operativo de listas mediante
  `npm run avisos:exportar`, con neutralización de fórmulas en CSV.
- Movimiento global sincronizado con el tema de La Colmena y respeto de
  `prefers-reduced-motion`.
- Nuevo radiocasete, fogonazo del Paparazzi y ajustes de movimiento en la
  tienda, fichas, Crew, carrito y footer.
- Sustitución de la animación pesada del Lata por un WebP animado de 663 kB y
  un póster reducido de 9,7 kB; se retiraron los renders intermedios y los
  assets antiguos de 7,3 MB y 15,7 MB.

## Verificación

- Local con Node 24.19.0: 41 archivos y 290 tests, build Vite, escaneo de
  secretos y `git diff --check` aprobados.
- `npm audit` completo y `npm audit --omit=dev`: 0 vulnerabilidades.
- `docker build --check`: sin avisos.
- Build ARM64: 290 tests y build Vite aprobados dentro de la imagen.
- Imagen candidata: revisión OCI `ee13492`, Node `v24.19.0`, usuario `node`,
  exportador presente y `node --check` aprobado.
- Contenedor `rocky035`: `running` y `healthy` tras activación y tras un
  reinicio controlado.
- Origen privado, apex y `www`: salud 200.
- Rutas verificadas con 200: portada, Drops, Estudio, Crew, Rocky IA, detalle
  de producto y fallback editorial 404.
- Shopify: modo `shopify`, API `2026-07`, con catálogo, carrito, cuentas,
  Admin y webhooks habilitados.
- Origen confiable en `/api/avisos`: 200; origen no confiable: 403.
- Una alta sintética en el producto aislado `qa-ee13492` sobrevivió al
  reinicio y se eliminó después con el exportador. No se tocó ninguna lista
  real.
- HTML/API conservaron CSP, HSTS, `nosniff`, `DENY` y políticas de caché.
- Los bundles JS y el WebP versionado devolvieron caché inmutable y `HIT` en
  la segunda petición; un asset inexistente devolvió 404, `no-store` y
  `BYPASS`.
- Playwright verificó portada, detalle de producto en 1440 px y 390 px, y
  Estudio sin errores de consola. En móvil no hubo overflow horizontal.
- No se solicitó `/music/barro.m4a` antes de pulsar Play.
- Tras el rollout quedaron 5,1 GiB de memoria disponible, 25 GiB de disco y
  la CPU a 58,4 °C.
- `cloudflared` y los contenedores ajenos permanecieron activos. `prometheus`
  ya estaba en `Restarting (2)` antes del despliegue y no se tocó.
- Oracle: omitido por indicación explícita del usuario.

## Incidencia de build cerrada

El runtime anterior, Node 24.14.0, produjo `SIGSEGV` reproducibles en Vitest y
Vite dentro de BuildKit ARM64, incluso con un único worker, sin OOM, presión de
memoria, temperatura anómala ni eventos del kernel. La misma fuente, lockfile y
comandos completaron los 290 tests y el build con la imagen oficial Node
24.19.0. Tras autorización explícita, se actualizaron los dos pins del
`Dockerfile` al digest verificado de Node 24.19.0.

## Rollback retenido

- Release anterior: `/opt/rocky035/releases/20260813T180942Z-df62f96-footer-alpha`.
- Imagen anterior: `rocky035:<tag-imagen>`.

Para restaurarla sin tocar Cloudflare, Shopify, el volumen cifrado ni otros
servicios:

```bash
ssh <host-interno>
printf '%s\n' \
  'ROCKY_IMAGE=rocky035:<tag-imagen>' \
  'COMPOSE_PROJECT_NAME=20260807t094206z-d4a7bb2' \
  | sudo tee /opt/rocky035/compose.env >/dev/null
sudo chmod 600 /opt/rocky035/compose.env
sudo ln -sfn \
  /opt/rocky035/releases/20260813T180942Z-df62f96-footer-alpha \
  /opt/rocky035/current
cd /opt/rocky035/current
sudo docker compose \
  --env-file /opt/rocky035/compose.env \
  -f compose.production.yaml \
  up -d --no-build --wait --wait-timeout 90 rocky035
```
