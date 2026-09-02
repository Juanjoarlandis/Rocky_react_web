import { ApiError, requestJson } from './http.js';

export const AVISO_ERROR_MESSAGE = 'No hemos podido apuntarte. Prueba otra vez.';

/* Alta en la lista de aviso de un drop. El BFF contesta { duplicate } (o
   « repetido » en versiones anteriores): aquí se unifica. */
export async function subscribeDropNotice(
  { producto, email, consentimiento, apodo },
  { signal } = {}
) {
  try {
    const body = await requestJson('/api/avisos', {
      method: 'POST',
      body: { producto, email, consentimiento, apodo },
      signal,
    });
    return { duplicate: Boolean(body?.duplicate ?? body?.repetido) };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    const message =
      error instanceof ApiError && error.code !== 'NETWORK_ERROR'
        ? error.message
        : AVISO_ERROR_MESSAGE;
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }
}
