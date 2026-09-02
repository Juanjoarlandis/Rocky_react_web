# Rocky IA: personalidad y ruta exclusivamente gratuita

## Problema

El cliente controla actualmente el historial conversacional y la configuración admite identificadores arbitrarios de OpenRouter. La personalidad vive en un único prompt corto y no existe un cortacircuitos de coste.

## Alcance y no objetivos

Se refuerzan exclusivamente el chat, su configuración, sus pruebas y su documentación. No se cambia la interfaz visual, Shopify, el despliegue ni las dependencias.

## Cambio de arquitectura

El cliente enviará sólo el mensaje nuevo. El servidor abrirá la sesión, recuperará un historial acotado, construirá el prompt ROCKY, seleccionará únicamente modelos gratuitos y cortará el servicio si OpenRouter informa de un coste positivo.

## Secuencia

1. [Contrato de personalidad y coste](tasks/01-prompt-and-cost-boundary.md)
2. [Integración HTTP y cliente](tasks/02-chat-session-integration.md)
3. [Límites, documentación y cierre](tasks/03-operations-and-verification.md)

## Verificación

| Riesgo | Evidencia |
| --- | --- |
| Modelo pagado por configuración | Pruebas de `createConfig` |
| Manipulación de personalidad | Pruebas de prompt y ausencia de llamada upstream |
| Historial falsificado | Rechazo del contrato HTTP antiguo |
| Coste positivo inesperado | Prueba del cortacircuitos |
| Regresión general | `npm run check` |

## Riesgos y rollback

El cambio de contrato requiere desplegar cliente y servidor juntos. El rollback consiste en revertir únicamente los archivos enumerados en la especificación; no hay migración de datos ni dependencia nueva.
