# Task

Integración HTTP y cliente

# Goal

Hacer que el navegador envíe sólo el mensaje nuevo y que el servidor controle historial, prompt y respuesta.

# Inputs / prerequisite decisions

Task 01 terminada.

# Files likely to change

- `server/chat.mjs`
- `server.mjs`
- `server/server.test.mjs`
- `src/components/ChatComponent.jsx`

# Detailed changes to make

- Reemplazar `messages` por `message` en el contrato público.
- Recuperar y guardar ocho mensajes como máximo en la sesión servidor.
- Construir el payload exclusivamente con el prompt servidor y modelos gratuitos.
- Bloquear manipulación sin llamada upstream.
- Solicitar metadatos de uso y activar el cortacircuitos sólo ante un coste positivo; registrar la ausencia porque OpenRouter puede omitirla en rutas gratuitas.

# Commands to run

`npm test -- server/server.test.mjs`

# Acceptance criteria

El cliente no controla roles ni modelos y las respuestas públicas no filtran metadatos upstream.

# Risks / edge cases

Cliente y servidor deben desplegarse juntos por el cambio de contrato.

# Done evidence to report back

Completado. `npm test -- --run server/server.test.mjs`: 15 pruebas HTTP superadas, incluida la compatibilidad con respuestas gratuitas sin `usage.cost`.
