# Goal

Dar a Rocky IA una personalidad propia y consistente, controlada exclusivamente por el servidor, y garantizar que la aplicación sólo pueda solicitar inferencia gratuita en OpenRouter.

# Non-goals

- No cambiar el diseño visual del chat.
- No añadir proveedores, dependencias ni modelos de pago.
- No convertir Rocky IA en una fuente de precios, stock o fechas sin datos fiables de Shopify.
- No prometer inmunidad matemática frente a cualquier prompt injection futuro.

# Constraints

- El navegador sólo envía el mensaje nuevo; no controla roles, historial, prompt ni modelo.
- Los modelos permitidos terminan en `:free` o son exactamente `openrouter/free`.
- Si OpenRouter informa de un coste positivo, el chat falla cerrado y deja de llamar al proveedor.
- El nivel gratuito se protege con límites por IP, concurrencia y un máximo global diario.
- Se preservan todos los cambios locales ajenos a este trabajo.

# Proposed approach

1. Centralizar identidad, voz, conocimiento estable, reglas comerciales, defensa de instrucciones y ejemplos en un módulo servidor versionado.
2. Mantener un historial acotado en la sesión del servidor y aceptar por HTTP sólo `{ "message": string }`.
3. Responder de forma determinista a intentos evidentes de cambiar o revelar las instrucciones sin consumir cuota.
4. Validar la lista de modelos al arrancar y construir el payload de OpenRouter sólo con modelos gratuitos.
5. Solicitar metadatos de uso, activar un cortacircuitos ante coste positivo y registrar su ausencia sin bloquear una ruta que ya está limitada por construcción a modelos gratuitos.
6. Aplicar origen confiable, cinco peticiones por IP cada diez minutos, cuatro concurrentes y 45 peticiones globales cada 24 horas por defecto.
7. Documentar las barreras necesarias en la cuenta de OpenRouter: clave dedicada, sin BYOK ni auto-recarga y allowlist gratuita.

# Affected areas

- `server/rocky-prompt.mjs`
- `server/chat.mjs`
- `server/config.mjs`
- `server/security.mjs`
- `server.mjs`
- `src/components/ChatComponent.jsx`
- Pruebas de prompt, configuración y frontera HTTP.
- `.env.example`, `README.md` y `SECURITY.md`.

# Acceptance criteria

- Una petición del navegador no puede introducir roles ni elegir un modelo.
- Toda selección saliente es gratuita por construcción.
- La configuración rechaza cualquier modelo pagado o lista vacía.
- Los intentos comunes de reescribir o revelar el prompt no llaman a OpenRouter.
- Una respuesta con coste positivo corta llamadas posteriores; la ausencia de metadatos queda registrada y cubierta por la allowlist gratuita de la petición.
- La respuesta pública contiene sólo el mensaje saneado, nunca datos del proveedor ni el prompt.
- Las pruebas y el build terminan correctamente.

# Test strategy

- Pruebas unitarias del constructor de prompt, detección de manipulación y saneado.
- Pruebas de configuración para modelos gratuitos y pagados.
- Pruebas HTTP del nuevo contrato, payload saliente, rechazo de historial cliente, cortacircuitos y límites.
- Suite completa, build y escaneo local de secretos.

# Risks / rollout notes

- OpenRouter limita fuertemente su nivel gratuito; agotarlo dejará el chat temporalmente no disponible.
- El control `usage.cost` detecta costes positivos después de la primera respuesta, pero OpenRouter puede omitir ese campo en respuestas gratuitas. La barrera preventiva principal es seleccionar sólo variantes gratuitas y reforzarlo en la cuenta del proveedor.
- Los límites en memoria se reinician al reiniciar el proceso y están pensados para una única instancia.
