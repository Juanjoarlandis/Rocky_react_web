import { HttpError, describeError, isHttpError } from '../errors.mjs';

const GENERIC_MESSAGE = 'Algo se ha roto en el servidor.';

// Errores del parser de cuerpos (body-parser) traducidos a respuestas
// cerradas: el detalle del parser nunca llega al cliente.
const BODY_PARSER_ERRORS = Object.freeze({
  'entity.too.large': {
    status: 413,
    message: 'Petición demasiado grande.',
    reason: 'body_too_large',
  },
  'entity.parse.failed': { status: 400, message: 'JSON no válido.', reason: 'invalid_json' },
  'parameters.too.many': {
    status: 413,
    message: 'Petición demasiado grande.',
    reason: 'too_many_parameters',
  },
  'encoding.unsupported': {
    status: 415,
    message: 'Codificación no soportada.',
    reason: 'unsupported_encoding',
  },
  'charset.unsupported': {
    status: 415,
    message: 'Codificación no soportada.',
    reason: 'unsupported_charset',
  },
});

function normalizeError(error) {
  if (isHttpError(error)) {
    return { httpError: error, reason: error.code || 'http_error', internal: false };
  }
  const parserError = BODY_PARSER_ERRORS[error?.type];
  if (parserError) {
    return {
      httpError: new HttpError(parserError.message, { status: parserError.status }),
      reason: parserError.reason,
      internal: false,
    };
  }
  return {
    httpError: new HttpError(GENERIC_MESSAGE, { status: 500, expose: false, cause: error }),
    reason: 'internal_error',
    internal: true,
  };
}

// Único middleware de errores de la aplicación. Los errores de dominio
// (HttpError) salen con su status y código; el resto, como 500 genérico con
// nombre, mensaje y stack en el log.
export function errorHandler({ logger }) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);
    const { httpError, reason, internal } = normalizeError(error);

    if (internal) {
      logger.error('Unhandled request error', {
        requestId: req.requestId,
        reason,
        ...describeError(error),
      });
    } else {
      logger.warn('Request rejected', {
        requestId: req.requestId,
        status: httpError.status,
        reason,
      });
    }

    const body = { message: httpError.expose ? httpError.message : GENERIC_MESSAGE };
    if (httpError.expose && httpError.code) body.code = httpError.code;
    return res.status(httpError.status).json(body);
  };
}
