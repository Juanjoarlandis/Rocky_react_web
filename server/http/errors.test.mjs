import { describe, expect, it } from 'vitest';
import {
  CrewRewardsError,
  CustomerAccountError,
  HttpError,
  ShopifyGraphqlError,
  WebhookError,
  describeError,
  isHttpError,
} from './errors.mjs';

describe('HttpError hierarchy', () => {
  it('shares one signature and sensible defaults across the domain errors', () => {
    expect(new HttpError('base')).toMatchObject({
      name: 'HttpError',
      status: 500,
      code: null,
      expose: true,
    });
    expect(new ShopifyGraphqlError('shopify')).toMatchObject({
      name: 'ShopifyGraphqlError',
      status: 502,
      code: 'SHOPIFY_ERROR',
      details: [],
    });
    expect(new CrewRewardsError('crew')).toMatchObject({ status: 400, code: 'CREW_REWARDS_ERROR' });
    expect(new CustomerAccountError('cuenta')).toMatchObject({
      status: 502,
      code: 'CUSTOMER_ACCOUNT_ERROR',
    });
    expect(new WebhookError('webhook')).toMatchObject({ status: 400, code: 'WEBHOOK_ERROR' });
  });

  it('accepts status, code, expose, details and cause through the options bag', () => {
    const cause = new Error('raíz');
    const error = new CustomerAccountError('token', {
      status: 401,
      code: 'INVALID_ID_TOKEN',
      expose: false,
      details: [{ field: 'exp' }],
      cause,
    });

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(401);
    expect(error.code).toBe('INVALID_ID_TOKEN');
    expect(error.expose).toBe(false);
    expect(error.details).toEqual([{ field: 'exp' }]);
    expect(error.cause).toBe(cause);
    expect(isHttpError(error)).toBe(true);
    expect(isHttpError(new Error('plain'))).toBe(false);
  });

  it('describes any thrown value with name, message and stack only', () => {
    expect(describeError(new TypeError('disco lleno'))).toEqual({
      name: 'TypeError',
      message: 'disco lleno',
      stack: expect.stringContaining('disco lleno'),
    });
    expect(describeError('texto suelto')).toEqual({
      name: 'Error',
      message: 'texto suelto',
      stack: null,
    });
  });
});
