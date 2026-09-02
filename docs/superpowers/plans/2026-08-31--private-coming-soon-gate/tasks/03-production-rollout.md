# Tarea

Activar y verificar la puerta en `rocky035.com`.

# Objetivo

Dejar la web pública en modo “We are cooking”, con acceso privado funcional y
rollback controlado.

# Prerrequisitos

- Tareas 01 y 02 aprobadas.
- Contraseña fuerte disponible fuera de Git.
- Estado de contenedor, release, caché y servicios ajenos registrado.

# Áreas afectadas

- Nueva release e imagen `rocky035` en la Raspberry Pi.
- `/etc/rocky035/rocky.env` para las dos variables de la puerta.
- Contenedor `rocky035` y caché del hostname de ROCKY únicamente.

# Cambios detallados

1. Crear y transferir un snapshot sin secretos.
2. Construir la imagen ARM64 y conservar la release activa como rollback.
3. Añadir `SITE_ACCESS_ENABLED=true` y la contraseña al entorno root-only.
4. Activar solo el contenedor `rocky035` y esperar healthcheck.
5. Purgar/inutilizar caché pública previa del hostname.
6. Verificar origen privado, apex y `www`: portada anónima, cierre de rutas y
   assets, login con cookie, SPA/API autenticadas y reinicio.
7. Confirmar que servicios ajenos no cambian y registrar rollback.

# Comandos

Usar el procedimiento de despliegue existente bajo
`docs/superpowers/plans/2026-08-31--shopify-catalog-production/`, ajustando solo
el tag de release y las comprobaciones de esta puerta. Nunca imprimir el archivo
de entorno ni la contraseña.

# Aceptación

- Visitante anónimo solo ve la portada y no obtiene recursos/API.
- La contraseña concedida abre la SPA y las APIs esperadas.
- El contenedor permanece sano tras reinicio y la caché no salta el gate.
- La release anterior y los servicios ajenos permanecen intactos.

# Riesgos y rollback

La release previa reabre la web. Si el gate falla antes de tener una barrera
alternativa, corregir hacia delante o pausar el hostname en vez de hacer rollback
automático.

# Evidencia

Release/digest, matriz HTTP anónima/autenticada, health, caché, logs y servicios.
