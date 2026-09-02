# Tarea

Implementar la puerta de acceso y sus regresiones.

# Objetivo

Cerrar documentos, recursos y APIs antes de servir la SPA, manteniendo solo las
excepciones de máquina acordadas.

# Inputs / decisiones

- Especificación: `docs/superpowers/specs/2026-08-31--private-coming-soon-gate.md`.
- Sin dependencias nuevas ni cambios en React.
- Usar la sesión existente y rotarla tras un acierto.

# Archivos probables

- `server/access-gate.mjs` (nuevo)
- `server/access-gate.css` (nuevo)
- `server/access-gate.test.mjs` o `server/server.test.mjs`
- `server/config.mjs`
- `server/config.test.mjs`
- `server.mjs`
- `.env.example`
- `README.md`

# Cambios detallados

1. Parsear `SITE_ACCESS_ENABLED`, contraseña y duración con defaults seguros.
2. Fallar al arrancar si la puerta activa no tiene contraseña.
3. Crear el middleware con concesión temporal ligada a una marca aleatoria del
   proceso, comparación SHA-256 + `timingSafeEqual` y límite por IP.
4. Servir HTML/CSS y un allowlist de imágenes/fuentes ya compiladas.
5. Responder `no-store`, `noindex` y 404 uniforme para recursos/APIs anónimos.
6. Mantener health solo desde loopback y el POST de webhook firmado antes de la
   puerta.
7. Evitar caché compartida para contenido autenticado mientras esté activa.
8. Documentar configuración sin incluir un valor secreto.

# Comandos

```bash
npm run test:run -- server/config.test.mjs server/server.test.mjs server/access-gate.test.mjs
npm run build
git diff --check
```

# Aceptación

Los criterios HTTP de la especificación quedan cubiertos por pruebas y no cambia
el comportamiento cuando la puerta está desactivada.

# Riesgos

- Orden incorrecto de middleware que deje una API o un archivo antes del gate.
- Cachear por error una respuesta autenticada en Cloudflare.
- Exponer la contraseña en errores, logs o bundle.

# Evidencia

Archivos tocados, tests dirigidos y tabla de rutas anónimas/autenticadas.

