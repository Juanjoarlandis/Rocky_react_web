import { fetchJson } from '../../lib/fetch-json.mjs';

// Cliente mínimo de Resend: sólo el endpoint batch, que es lo que necesita el
// envío de avisos. Sin SDK: una llamada HTTPS con la clave en Authorization y
// la misma forma de fallo que el resto de clientes salientes.

export const RESEND_BATCH_MAX = 100;
const DEFAULT_BASE_URL = 'https://api.resend.com';

export class ResendError extends Error {
  constructor(message, { status = 502, code = 'RESEND_ERROR', cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ResendError';
    this.status = status;
    this.code = code;
  }
}

function isValidMessage(message) {
  return (
    message &&
    typeof message.from === 'string' &&
    Array.isArray(message.to) &&
    message.to.length > 0 &&
    typeof message.subject === 'string' &&
    (typeof message.html === 'string' || typeof message.text === 'string')
  );
}

export function createResendClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
  baseUrl = DEFAULT_BASE_URL,
}) {
  if (!apiKey) throw new Error('El cliente de Resend necesita RESEND_API_KEY.');

  return {
    // Manda hasta 100 correos de una vez. Devuelve los ids que asigna Resend.
    // La clave de idempotencia evita duplicar un lote si la respuesta se
    // pierde y se reintenta.
    async sendBatch(messages, { idempotencyKey = null } = {}) {
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new ResendError('No hay correos que enviar.', { status: 400, code: 'EMPTY_BATCH' });
      }
      if (messages.length > RESEND_BATCH_MAX) {
        throw new ResendError(`Resend admite como mucho ${RESEND_BATCH_MAX} correos por lote.`, {
          status: 400,
          code: 'BATCH_TOO_LARGE',
        });
      }
      if (!messages.every(isValidMessage)) {
        throw new ResendError('Hay correos sin remitente, destinatario, asunto o cuerpo.', {
          status: 400,
          code: 'INVALID_MESSAGE',
        });
      }

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

      let response;
      let payload;
      try {
        ({ response, payload } = await fetchJson({
          url: `${baseUrl}/emails/batch`,
          fetchImpl,
          timeoutMs,
          options: { method: 'POST', headers, body: JSON.stringify(messages) },
        }));
      } catch (error) {
        throw new ResendError(error.message, { code: error.code || 'NETWORK_ERROR', cause: error });
      }

      if (!response.ok) {
        throw new ResendError(
          typeof payload?.message === 'string' ? payload.message : 'Resend ha rechazado el lote.',
          {
            status: response.status === 401 || response.status === 403 ? 401 : 502,
            code: typeof payload?.name === 'string' ? payload.name : 'RESEND_ERROR',
          }
        );
      }

      const ids = Array.isArray(payload?.data)
        ? payload.data.map((item) => item?.id).filter((id) => typeof id === 'string')
        : [];
      return { ids };
    },
  };
}
