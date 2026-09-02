# Tarea

Desplegar y verificar la release en producción.

# Objetivo

Activar una nueva imagen ARM64 con los cambios locales y el catálogo acotado,
manteniendo un rollback inmediato a la release anterior.

# Prerrequisitos

- Tareas 01 y 02 aprobadas.
- Estado actual del contenedor, release e imagen registrado.

# Áreas afectadas

- Release nueva bajo `/opt/rocky035/releases`.
- Imagen Docker `rocky035:<release>`.
- `/opt/rocky035/current` y `/opt/rocky035/compose.env`.
- Contenedor `rocky035` únicamente.

# Acciones

1. Crear un snapshot fuente sin secretos ni `.git` y transferirlo a una release
   nueva.
2. Construir la imagen ARM64 en la Raspberry Pi; el `Dockerfile` repetirá pruebas
   y build.
3. Guardar el selector anterior, actualizar imagen/current y ejecutar Compose con
   espera de salud.
4. Verificar origen privado, apex, `www`, API Shopify, rutas, cabeceras, logs,
   usuario, arquitectura, reinicio y servicios ajenos.
5. Verificar en navegador que la cuadrícula visible contiene ocho tarjetas y no
   muestra conceptos locales.

# Criterios de aceptación

- `rocky035` está `running` y `healthy` tras activación y reinicio controlado.
- `/api/shopify/products?first=50` sigue respondiendo desde Shopify, mientras la
  interfaz solicita y muestra ocho productos.
- Portada y rutas principales responden 200 sin errores de consola.
- La release anterior permanece disponible y no se alteran otros contenedores.

# Riesgos y rollback

Si cualquier comprobación pública falla, restaurar el selector y symlink
anteriores y recrear únicamente `rocky035`. No tocar Cloudflare ni Shopify.

# Evidencia

Identificadores de release/imagen, resultados de salud y conteo visual final.
