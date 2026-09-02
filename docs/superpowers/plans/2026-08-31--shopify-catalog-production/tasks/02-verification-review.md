# Tarea

Verificar el workspace completo y obtener revisión independiente.

# Objetivo

Demostrar que el cambio del catálogo y los cambios locales acumulados forman una
release construible, segura y revisable.

# Prerrequisitos

- Tarea 01 terminada.
- Ningún secreto nuevo ni cambio de dependencias.

# Archivos previstos

- Solo correcciones directamente justificadas por fallos de verificación.

# Acciones

1. Ejecutar pruebas, build, escaneo de secretos y validación de whitespace.
2. Ejecutar auditorías npm completa y de producción.
3. Previsualizar un bundle Oracle estrecho y solicitar revisión en navegador.
4. Corregir únicamente hallazgos que bloqueen la publicación y repetir checks.

# Comandos

```bash
npm run check
git diff --check
npm audit --audit-level=moderate
npm audit --omit=dev --audit-level=moderate
docker build --check .
```

# Criterios de aceptación

- Todos los checks terminan con código cero.
- Oracle no identifica un riesgo de corrección o rollout pendiente.
- El estado Git sigue preservando todos los cambios del usuario.

# Riesgos

- La suite y el build ARM64 pueden ser largos; no interpretar progreso lento como
  fallo ni relanzar builds simultáneos.

# Evidencia

Resultados frescos de comandos y resumen de Oracle.
