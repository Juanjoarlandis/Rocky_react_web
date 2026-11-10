# Spec Delta

## Purpose

Servir la puerta privada de la web sin revelar nada de lo que hay detrás y sin obligar
al visitante a descargar sus recursos visuales en cada visita.

## ADDED Requirements

### Requirement: Los recursos visuales de la puerta se guardan en el navegador
La hoja de estilos y las imágenes y fuentes de la puerta SHALL servirse con caché
privada del navegador: una hora la hoja de estilos y un día las imágenes y las fuentes. No
SHALL guardarse en la caché de borde y SHALL seguir llevando
`X-Robots-Tag: noindex, nofollow, noarchive`.

#### Scenario: Hoja de estilos
- **WHEN** se pide `/access-gate/style.css`
- **THEN** responde con `Cache-Control: private, max-age=3600` y `Cloudflare-CDN-Cache-Control: no-store`

#### Scenario: Ilustración de la puerta
- **WHEN** se pide un recurso permitido de `/access-gate/media/`
- **THEN** responde con `Cache-Control: private, max-age=86400` y sigue sin poder indexarse

#### Scenario: Segunda visita
- **WHEN** un visitante vuelve a la puerta antes de una hora
- **THEN** su navegador no vuelve a descargar la hoja de estilos ni las imágenes

### Requirement: El documento de la puerta no se guarda
El HTML de la puerta, sus respuestas de acceso y cualquier recurso que no esté en su
lista permitida SHALL seguir como hoy: sin caché de ningún tipo los dos primeros y
oculto el tercero.

#### Scenario: Página de la puerta
- **WHEN** se pide la raíz con la puerta activa y sin acceso
- **THEN** el HTML responde con `Cache-Control: no-store`

#### Scenario: Recurso fuera de la lista
- **WHEN** se pide `/access-gate/media/` con un nombre que no está permitido
- **THEN** responde 404, como hoy
