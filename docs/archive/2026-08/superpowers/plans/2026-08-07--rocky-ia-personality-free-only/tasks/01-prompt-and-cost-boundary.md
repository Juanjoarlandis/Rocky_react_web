# Task

Contrato de personalidad y coste

# Goal

Crear el prompt versionado y hacer imposible configurar modelos que no sean gratuitos.

# Inputs / prerequisite decisions

Especificación aprobada en `docs/superpowers/specs/2026-08-07--rocky-ia-personality-free-only.md`.

# Files likely to change

- `server/rocky-prompt.mjs`
- `server/rocky-prompt.test.mjs`
- `server/config.mjs`
- `server/config.test.mjs`

# Detailed changes to make

- Definir identidad, contexto, voz, reglas y recordatorio final.
- Detectar intentos comunes de manipulación y sanear salidas.
- Validar identificadores `:free` y `openrouter/free` al arrancar.
- Añadir límites gratuitos predeterminados a la configuración.

# Commands to run

`npm test -- server/rocky-prompt.test.mjs server/config.test.mjs`

# Acceptance criteria

Las invariantes están cubiertas y un modelo de pago detiene el arranque.

# Risks / edge cases

No bloquear conversaciones normales que contienen palabras como “sistema” sin intención de manipular.

# Done evidence to report back

Completado. `npm test -- --run server/rocky-prompt.test.mjs server/config.test.mjs`: 13 pruebas superadas.
