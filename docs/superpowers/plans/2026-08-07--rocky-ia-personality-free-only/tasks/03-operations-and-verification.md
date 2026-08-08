# Task

Límites, documentación y cierre

# Goal

Proteger la cuota pública y documentar las barreras operativas necesarias.

# Inputs / prerequisite decisions

Tasks 01 y 02 terminadas.

# Files likely to change

- `server/security.mjs`
- `server.mjs`
- `.env.example`
- `README.md`
- `SECURITY.md`

# Detailed changes to make

- Permitir una clave global en el limitador existente.
- Añadir límite de 45 peticiones cada 24 horas y origen confiable.
- Documentar clave dedicada, modelos gratuitos, ausencia de BYOK/auto-recarga y degradación al agotar cuota.
- Ejecutar todas las verificaciones.

# Commands to run

- `npm run test:run`
- `npm run build`
- `npm run security:check`
- `npm run check`

# Acceptance criteria

La cuota está acotada y toda la verificación termina correctamente.

# Risks / edge cases

El límite global en memoria se reinicia con el proceso y no coordina varias réplicas.

# Done evidence to report back

Completado. Se añadieron los límites y la documentación operativa. `npm run check`: 19 archivos de prueba y 78 pruebas superadas, build correcto y escaneo de secretos limpio.
