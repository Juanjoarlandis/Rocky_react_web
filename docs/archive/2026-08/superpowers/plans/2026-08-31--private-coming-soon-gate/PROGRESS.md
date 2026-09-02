# Progreso

## Revisión previa

- Oracle review: bypassed por autorización explícita del usuario.
- Checkpoint: plan de frontera de acceso.
- Session: `rocky-react-private-coming-soon` (falló con
  `chrome-disconnected`, sin transcript recuperable).
- Outcome: continuar sin Oracle, implementar y desplegar en producción.

## Tarea 01 — frontera de acceso

- Estado: completada.
- Archivos funcionales: `server/access-gate.mjs`, `server/access-gate.css`,
  `server/config.mjs`, `server.mjs`, `scripts/check-secrets.mjs`.
- Pruebas: `server/config.test.mjs` y `server/server.test.mjs`.
- Evidencia TDD: 9 expectativas fallaron antes de implementar la configuración,
  portada, cierre de recursos y concesión; después pasaron 75/75 pruebas
  dirigidas.
- Casos cubiertos: rutas de documento, APIs, bundles, recursos públicos,
  allowlist visual, contraseña incorrecta, rate limit, cookie rotada, `Secure`
  en producción, origen cruzado, invalidación tras reinicio, loopback y webhook
  Shopify firmado.
- Build Vite: aprobado; los tres personajes y las tres fuentes requeridas están
  presentes en `dist/assets`.
- Secret scan y `git diff --check`: aprobados.
- Dependencias: sin cambios.

## Tarea 02 — verificación

- Estado: completada.
- Workspace: 85 archivos y 616 pruebas, build Vite, escaneo de secretos,
  `npm audit`, auditoría de producción y `git diff --check` aprobados.
- HTTP local anónimo: documentos `200` con gate; API, JS, productos,
  manifiesto y audio `404`; todo con `no-store` en origen y edge.
- HTTP local autenticado: documento, API y JS `200`, con
  `Cache-Control: private, no-store` y edge `no-store`.
- Navegador: desktop 1440×1000 y móvil 390×844 revisados; formulario, error
  y login aprobados, cero overflow horizontal y cero errores/warnings en la
  carga inicial. El 401 deliberado de contraseña errónea aparece como petición
  fallida en DevTools, sin fallo de aplicación.
- Capturas: `output/playwright/private-gate/.playwright-cli/`.

## Tarea 03 — producción

- Estado: completada y verificada.
- Release activa:
  `/opt/rocky035/releases/20260831T141831Z-335534d-private-gate`.
- Imagen activa: `rocky035:<tag-imagen>`.
- Digest: `sha256:<digest>`.
- Build ARM64: 44 archivos y 326 pruebas reales, build Vite y auditoría de
  dependencias runtime aprobados dentro de la imagen.
- Runtime: ARM64, Node 24.19.0, usuario `node`, root filesystem de solo lectura,
  reinicio `unless-stopped` y health interno sano.
- Secreto: contraseña aleatoria de 48 caracteres instalada fuera de Git en
  `/etc/rocky035/rocky.env` y `/etc/rocky035/site-access.password`, ambos
  `0600 root:root`. Copia local ignorada en
  `.data/rocky035-site-access-password.txt`, modo `0600`.
- Backup de entorno:
  `/etc/rocky035/rocky.env.pre-20260831T141831Z-335534d-private-gate`.
- Backup de selector:
  `/opt/rocky035/compose.env.pre-20260831T141831Z-335534d-private-gate`.
- Anónimo en apex y `www`: portada y rutas de documentos muestran solo el gate;
  health, API Shopify, JS conocido, productos, manifiesto y audio responden
  `404` con `no-store`.
- Cloudflare: una comprobación fresca posterior al despliegue encontró el bundle
  anterior `index-LyFSZ1ER.js` como `200 HIT` para un visitante anónimo. Con
  autorización explícita se ejecutó `Purge Everything` en la zona
  `rocky035.com`. Tres rondas consecutivas en apex y `www` comprobaron JS, CSS,
  producto, manifiesto y audio: 30/30 respuestas `404`, assets `BYPASS`, resto
  `DYNAMIC`, sin `Age` y con `no-store`; no reapareció ningún `HIT`.
- Autenticado en apex y `www`: login `303`, cookie `Secure`, `HttpOnly` y
  `SameSite=Lax`; SPA, API Shopify y JS responden `200` con
  `private, no-store` y sin caché compartida.
- Navegador de producción: 1440×1000 y 390×844 aprobados, sin overflow
  horizontal, errores ni warnings en la carga anónima.
- Reinicio controlado: el contenedor volvió a `healthy`, la concesión anterior
  quedó invalidada y un login nuevo recuperó la SPA/API.
- Seguridad: CSP, HSTS, `DENY`, `nosniff`, `noindex`; Express oculto; origen
  cruzado rechazado con `403` sin cookie; webhook sin firma rechazado con `401`.
- Servicios ajenos: todos conservaron el estado previo. Tras el rollout había
  5,3 GiB disponibles, 23 GiB de disco y la CPU estaba a 55,4 °C.

## Incidencia de empaquetado cerrada

El primer snapshot creado con `tar` de macOS generó 286 sidecars AppleDouble
`._*`. Vitest encontró 44 de ellos con sufijo de test y el build falló al
interpretar sus bytes de metadatos como JavaScript. No se activó esa candidata.
Se eliminaron únicamente esos sidecars del snapshot y se añadieron `._*` y
`**/._*` a `.dockerignore`; la repetición pasó 44/44 archivos y 326/326 pruebas.

## Rollback retenido

- Release anterior:
  `/opt/rocky035/releases/20260831T101511Z-335534d-catalog8-beats-r2`.
- Imagen anterior:
  `rocky035:<tag-imagen>`.
- Selector anterior:
  `/opt/rocky035/compose.env.pre-20260831T141831Z-335534d-private-gate`.

La imagen anterior no implementa la puerta y volvería a dejar la web pública.
Si esta release falla, se debe corregir hacia delante o detener temporalmente
el hostname/contenedor; no ejecutar rollback automático mientras la privacidad
sea el requisito principal.
