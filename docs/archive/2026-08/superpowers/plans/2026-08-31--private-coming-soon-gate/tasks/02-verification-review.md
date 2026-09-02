# Tarea

Verificar la puerta implementada y cerrar la revisión independiente.

# Objetivo

Demostrar que la barrera es efectiva y que la portada funciona en navegador sin
regresiones del workspace.

# Prerrequisitos

- Tarea 01 terminada.
- No usar valores reales de contraseña en capturas, comandos persistidos ni
  bundles de revisión.

# Archivos probables

- Archivos de la tarea 01.
- Este plan y su progreso, si hace falta registrar hallazgos.

# Cambios detallados

1. Ejecutar pruebas dirigidas y suite completa.
2. Construir `dist`, ejecutar el servidor con una contraseña sintética y probar
   rutas con `curl` sin y con cookie.
3. Revisar en navegador a 1440 px y 390 px, incluidos error y reduced motion.
4. Ejecutar escaneo de secretos y comprobar que el término/configuración no
   aparece en el bundle de cliente.
5. Pedir a Oracle una revisión del plan antes de implementar y cerrar solo
   hallazgos materiales con evidencia local.

# Comandos

```bash
npm run check
git diff --check
rg -n "SITE_ACCESS_PASSWORD" dist
```

# Aceptación

Toda afirmación de cierre tiene evidencia fresca y no quedan hallazgos altos sin
resolver.

# Riesgos

- Una prueba HTTP que siga cookies automáticamente y produzca un falso positivo.
- Validar solo el origen y no el comportamiento detrás de Cloudflare.

# Evidencia

Resumen de checks, capturas/smokes y recibo de Oracle.

