# Progreso

## Implementación y QA visual

- Estado: completado localmente.
- Dirección seleccionada: opción 1.
- Resultado: portada editorial con `ROCKY 035`, `HECHO DESDE LA COLMENA`,
  contador, CTA al catálogo y los dos personajes originales.
- Evidencia: `design-qa.md` y capturas de escritorio, tableta y móvil en
  `output/visual-audit/round-06-home-impact/`.
- Verificación local previa a producción: 36 archivos de prueba y 237 pruebas,
  build Vite, escaneo de secretos, auditorías npm completas y de producción con
  cero vulnerabilidades, y `git diff --check`.

## Despliegue de producción — 2026-08-11

- Estado: desplegado y verificado.
- Release: `/opt/rocky035/releases/20260811T105823Z-766e6ee-home-impact-r2`.
- Imagen: `rocky035:<tag-imagen>`.
- Digest: `sha256:<digest>`.
- Arquitectura: `linux/arm64`.
- Proyecto Compose conservado: `20260807t094206z-d4a7bb2`.
- El build de la imagen repitió las 237 pruebas y el build Vite antes de
  activarse.
- El contenedor quedó `running` y `healthy` después de la activación y de un
  reinicio controlado.
- Origen privado, apex y `www` devolvieron salud `200`.
- Shopify informó modo `shopify`, API `2026-07` y catálogo, carrito, cuentas,
  Admin y webhooks habilitados.
- Portada, Drops, Estudio, Crew, Rocky IA, categoría y 404 editorial devolvieron
  `200` por Cloudflare.
- El HTML público sirve `index-fCJHCZop.js` e `index-CyGbhJBp.css`; el bundle
  contiene `product-page-head--home` y `HECHO DESDE LA COLMENA`.
- El JS versionado devolvió `HIT` con caché inmutable; un asset inexistente
  devolvió `404`, `no-store` y `BYPASS`.
- Un origen no confiable siguió siendo rechazado con `403`.
- `cloudflared` y los contenedores ajenos permanecieron sin cambios. El
  `prometheus` ya estaba reiniciándose antes del despliegue y no se tocó.
- Tras el despliegue quedaron aproximadamente 4,9 GiB de memoria disponible,
  25 GiB de disco libre y la CPU a 59,3 °C.

## Atlas y límite de evidencia

- La pestaña existente de `https://rocky035.com/` se enfocó y recargó mediante
  Atlas después de publicar.
- macOS mantuvo otra aplicación como ventana frontal y las capturas de ventana
  de Atlas salieron sin contenido; se descartaron y no se afirma una nueva
  captura visual de producción.
- La composición sí quedó comparada en Atlas local antes de publicar, y la
  producción sirve exactamente los hashes y marcadores del bundle verificado.

## Cambios concurrentes excluidos

Después del corte del snapshot, a las 13:03 hora local, aparecieron cambios en
cuatro imágenes que no formaron parte del build verificado ni de esta release:

- `src/images/characters/cotilla-esquina.png`
- `src/images/characters/larguirucho-esquina.png`
- `src/images/optimized/characters/cotilla-esquina-460.webp`
- `src/images/optimized/characters/larguirucho-esquina-600.webp`

Se conservaron intactos en el workspace y no se publicaron automáticamente.

## Rollback retenido

- Release anterior: `/opt/rocky035/releases/20260810T204719Z-766e6ee-visual-r1`.
- Imagen anterior: `rocky035:<tag-imagen>`.
- Digest anterior:
  `sha256:<digest>`.

Para restaurarla sin tocar Cloudflare, Shopify ni otros servicios:

```bash
ssh <host-interno>
printf '%s\n' \
  'ROCKY_IMAGE=rocky035:<tag-imagen>' \
  'COMPOSE_PROJECT_NAME=20260807t094206z-d4a7bb2' \
  | sudo tee /opt/rocky035/compose.env >/dev/null
sudo chmod 600 /opt/rocky035/compose.env
sudo ln -sfn \
  /opt/rocky035/releases/20260810T204719Z-766e6ee-visual-r1 \
  /opt/rocky035/current
cd /opt/rocky035/current
sudo docker compose \
  --env-file /opt/rocky035/compose.env \
  -f compose.production.yaml \
  up -d --no-build --wait --wait-timeout 90 rocky035
```
