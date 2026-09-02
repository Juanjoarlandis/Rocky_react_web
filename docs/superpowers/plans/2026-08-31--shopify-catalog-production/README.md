# Catálogo Shopify acotado y despliegue de producción

## Problema

La portada de producción combina 18 productos publicados por Shopify con seis
conceptos editoriales locales sin stock. El resultado son 24 fichas, muchas de
ellas de prueba, cuando el catálogo visible debe mantenerse entre cinco y diez
productos y Shopify debe seguir siendo la fuente de verdad comercial.

## Alcance

- Mostrar como máximo ocho productos del catálogo Shopify, conservando el orden
  actual de la Storefront API (más recientes primero).
- No mezclar conceptos locales en el catálogo cuando Shopify está activo.
- Mantener el catálogo demo local sin cambios cuando Shopify no está configurado.
- Publicar el cambio junto con el trabajo local existente y verificarlo en la
  Raspberry Pi y en `https://rocky035.com`.

## No objetivos

- No borrar, archivar ni modificar inventario físico en Shopify.
- No elegir manualmente productos sin metadatos fiables que distingan catálogo
  ROCKY de datos de prueba.
- No cambiar dependencias, credenciales, Cloudflare, el volumen persistente ni
  servicios ajenos.
- No reescribir ni descartar los cambios locales existentes.

## Cambio de comportamiento

El navegador solicitará ocho productos a `/api/shopify/products`. Cuando el
modo confirmado sea Shopify, `useStorefront` normalizará y mostrará únicamente
esa respuesta. Los conceptos editoriales seguirán disponibles en modo demo y
para los flujos locales que ya los usan, pero no se añadirán a la cuadrícula
comercial activa.

## Secuencia

1. Ajustar la consulta y las pruebas del catálogo.
2. Verificar todo el workspace y revisar el cambio con Oracle.
3. Construir una release ARM64, activar el contenedor y verificar producción.

## Verificación

| Superficie | Evidencia esperada |
| --- | --- |
| Regresión de catálogo | Prueba que exige `first=8` y ausencia de previews en modo Shopify |
| Modo demo | Pruebas existentes conservan el catálogo local |
| Workspace | Vitest, build, escaneo de secretos y `git diff --check` |
| Dependencias | Auditorías completa y de producción sin vulnerabilidades relevantes |
| Imagen | Build ARM64 con pruebas y Vite dentro del `Dockerfile` |
| Producción | Salud privada/pública, ocho productos API y ocho tarjetas visibles |

## Riesgos y rollback

- El límite conserva el orden actual de Shopify; cambiar ese orden en Shopify
  cambia qué ocho productos se ven.
- La release anterior y su imagen se conservarán. El rollback consiste en
  restaurar el selector de imagen y el enlace `/opt/rocky035/current`, sin tocar
  Shopify, Cloudflare ni el estado persistente.

## Tareas

1. `tasks/01-catalog-behavior.md`
2. `tasks/02-verification-review.md`
3. `tasks/03-production-rollout.md`
