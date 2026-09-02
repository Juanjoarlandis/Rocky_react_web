import { describe, expect, it, vi } from 'vitest';
import { HttpError, ShopifyGraphqlError } from '../errors.mjs';
import { errorHandler } from './error-handler.mjs';

function responseDouble() {
  return {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function run(error, { headersSent = false } = {}) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const res = responseDouble();
  res.headersSent = headersSent;
  const next = vi.fn();
  errorHandler({ logger })(error, { requestId: 'req-1' }, res, next);
  return { logger, res, next };
}

describe('errorHandler', () => {
  it('answers domain errors with their status, message and code', () => {
    const { res, logger } = run(
      new ShopifyGraphqlError('Shopify no ha aceptado la petición.', {
        status: 429,
        code: 'THROTTLED',
      })
    );

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Shopify no ha aceptado la petición.',
      code: 'THROTTLED',
    });
    expect(logger.warn).toHaveBeenCalledWith('Request rejected', {
      requestId: 'req-1',
      status: 429,
      reason: 'THROTTLED',
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('hides the message of a domain error that must not be exposed', () => {
    const { res } = run(new HttpError('detalle interno', { status: 502, expose: false }));

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ message: 'Algo se ha roto en el servidor.' });
  });

  it('translates body parser failures without leaking parser details', () => {
    const tooLarge = run(
      Object.assign(new Error('request entity too large'), {
        type: 'entity.too.large',
      })
    );
    const invalid = run(
      Object.assign(new Error('Unexpected token'), {
        type: 'entity.parse.failed',
      })
    );

    expect(tooLarge.res.status).toHaveBeenCalledWith(413);
    expect(tooLarge.res.json).toHaveBeenCalledWith({ message: 'Petición demasiado grande.' });
    expect(invalid.res.status).toHaveBeenCalledWith(400);
    expect(invalid.res.json).toHaveBeenCalledWith({ message: 'JSON no válido.' });
    expect(invalid.logger.warn).toHaveBeenCalledWith(
      'Request rejected',
      expect.objectContaining({ reason: 'invalid_json' })
    );
  });

  it('answers unknown errors as a generic 500 and logs name, message and stack', () => {
    const { res, logger } = run(new TypeError('disco lleno'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Algo se ha roto en el servidor.' });
    expect(logger.error).toHaveBeenCalledWith('Unhandled request error', {
      requestId: 'req-1',
      reason: 'internal_error',
      name: 'TypeError',
      message: 'disco lleno',
      stack: expect.stringContaining('disco lleno'),
    });
  });

  it('delegates to Express when the headers are already sent', () => {
    const error = new Error('tarde');
    const { res, next } = run(error, { headersSent: true });

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
