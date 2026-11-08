// fetch con tiempo de espera y lectura tolerante del JSON. Todos los clientes
// salientes (Shopify, OpenRouter) pasan por aquí para que un fallo de red o
// un timeout tengan siempre la misma forma: FetchJsonError con código
// TIMEOUT o NETWORK_ERROR. Quien llama traduce ese código a su error de dominio.

const DEFAULT_TIMEOUT_MS = 15_000;

const MESSAGES = Object.freeze({
  TIMEOUT: 'La petición ha superado el tiempo de espera.',
  NETWORK_ERROR: 'No se ha podido conectar con el servicio.',
});

export class FetchJsonError extends Error {
  constructor(code, { cause } = {}) {
    super(MESSAGES[code] || MESSAGES.NETWORK_ERROR, cause ? { cause } : undefined);
    this.name = 'FetchJsonError';
    this.code = code;
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

export async function fetchWithTimeout({
  url,
  options = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal = null,
  readResponse = (response) => response,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Si quien llama trae su propia señal (p. ej. el cliente ha colgado), la
  // petición se corta con la primera que dispare.
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  try {
    const response = await fetchImpl(url, { ...options, signal: combined });
    return await readResponse(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson({ url, options, fetchImpl, timeoutMs, signal } = {}) {
  try {
    return await fetchWithTimeout({
      url,
      options,
      fetchImpl,
      timeoutMs,
      signal,
      // La lectura del cuerpo forma parte del timeout. Sólo un JSON malformado
      // se convierte en null; las cancelaciones y fallos de red se propagan.
      readResponse: async (response) => {
        const payload = await response.json().catch((error) => {
          if (error instanceof SyntaxError) return null;
          throw error;
        });
        return { response, payload };
      },
    });
  } catch (error) {
    throw new FetchJsonError(isAbortError(error) ? 'TIMEOUT' : 'NETWORK_ERROR', { cause: error });
  }
}
