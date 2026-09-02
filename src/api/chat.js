import { ApiError, requestJson } from './http.js';

/* Rocky IA habla con su propia voz también cuando algo falla: el 403 del
   origen y los 5xx del servidor no llegan tal cual a la burbuja. El 429 (has
   hablado mucho) y los 4xx de validación sí traen el mensaje del BFF. */
const ROCKY_ERRORS = Object.freeze({
  forbidden:
    'Rocky IA sólo atiende desde la tienda oficial. Abre rocky035.com y vuelve a preguntar.',
  serverDown:
    'Rocky IA se ha quedado sin señal un momento (el servidor no responde). Inténtalo en un rato.',
  network: 'No hay conexión con la Colmena. Revisa tu red y vuelve a intentarlo.',
  malformed: 'Rocky IA ha contestado algo que no he entendido. Pregúntale otra vez.',
});

export class ChatError extends Error {
  constructor(userMessage, { status = 0, cause } = {}) {
    super(userMessage);
    this.name = 'ChatError';
    this.userMessage = userMessage;
    this.status = status;
    this.cause = cause;
  }
}

export function chatErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return ROCKY_ERRORS.network;
    if (error.status === 403) return ROCKY_ERRORS.forbidden;
    if (error.status >= 500) return ROCKY_ERRORS.serverDown;
    return error.message;
  }
  return ROCKY_ERRORS.serverDown;
}

export async function sendChatMessage(message, { signal } = {}) {
  let data;
  try {
    data = await requestJson('/api/chat', { method: 'POST', body: { message }, signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ChatError(chatErrorMessage(error), { status: error?.status, cause: error });
  }
  if (!data?.message) {
    throw new ChatError(ROCKY_ERRORS.malformed, { status: 200 });
  }
  return {
    message: data.message,
    products: Array.isArray(data.products) ? data.products : [],
  };
}
