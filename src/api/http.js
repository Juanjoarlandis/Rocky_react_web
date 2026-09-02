/* Un solo cliente HTTP para el BFF: JSON de ida y vuelta, cookies del mismo
   origen, cancelación con AbortSignal y errores con status y código. */

export class ApiError extends Error {
  constructor(message, { status = 500, code = 'REQUEST_FAILED', body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export const NETWORK_ERROR_MESSAGE = 'No se ha podido conectar con la tienda.';
export const DEFAULT_ERROR_MESSAGE = 'La tienda no ha podido completar la operación.';

export async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (signal) options.signal = signal;
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(NETWORK_ERROR_MESSAGE, { status: 503, code: 'NETWORK_ERROR' });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || DEFAULT_ERROR_MESSAGE, {
      status: response.status ?? 500,
      code: data?.code || 'REQUEST_FAILED',
      body: data,
    });
  }
  return data;
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
