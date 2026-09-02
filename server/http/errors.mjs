// Errores HTTP del dominio. Todos comparten una sola firma:
//   new XError(message, { status, code, expose, details, cause })
// El middleware de errores los convierte en {message, code} con su status;
// cualquier otra excepción se responde como 500 genérico.

export class HttpError extends Error {
  constructor(
    message,
    { status = 500, code = null, expose = true, details = null, cause = undefined } = {}
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.expose = expose;
    this.details = details;
  }
}

export class ShopifyGraphqlError extends HttpError {
  constructor(message, { status = 502, code = 'SHOPIFY_ERROR', details = [], ...rest } = {}) {
    super(message, { status, code, details, ...rest });
  }
}

export class CrewRewardsError extends HttpError {
  constructor(message, { status = 400, code = 'CREW_REWARDS_ERROR', ...rest } = {}) {
    super(message, { status, code, ...rest });
  }
}

export class CustomerAccountError extends HttpError {
  constructor(message, { status = 502, code = 'CUSTOMER_ACCOUNT_ERROR', ...rest } = {}) {
    super(message, { status, code, ...rest });
  }
}

export class WebhookError extends HttpError {
  constructor(message, { status = 400, code = 'WEBHOOK_ERROR', ...rest } = {}) {
    super(message, { status, code, ...rest });
  }
}

export function isHttpError(error) {
  return error instanceof HttpError;
}

// Nombre, mensaje y stack bastan para diagnosticar: nunca el cuerpo, las
// cabeceras ni las cookies de la petición.
export function describeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack || null,
  };
}
