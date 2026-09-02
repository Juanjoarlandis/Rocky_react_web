import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../encrypted-store.mjs';
import { createWebhookHandler, processWebhookDelivery, verifyWebhookHmac } from './webhooks.mjs';

const secret = 'shopify-client-secret';
const rawBody = Buffer.from('{"shop":"rocky-dev"}', 'utf8');

function sign(body) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

describe('Shopify webhooks', () => {
  it('verifies the exact raw bytes with a timing-safe digest', () => {
    expect(verifyWebhookHmac(rawBody, sign(rawBody), secret)).toBe(true);
    expect(verifyWebhookHmac(Buffer.from(`${rawBody} `), sign(rawBody), secret)).toBe(false);
    expect(verifyWebhookHmac(rawBody, 'bad', secret)).toBe(false);
  });

  it('accepts one delivery and identifies an exact duplicate durably', async () => {
    const store = new MemoryStore();
    const input = {
      rawBody,
      hmac: sign(rawBody),
      webhookId: 'delivery-123',
      eventId: 'event-123',
      topic: 'app/scopes_update',
      shopDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
    };
    const config = {
      storeDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
      clientSecret: secret,
      webhookTopics: new Set(['app/scopes_update']),
    };

    await expect(processWebhookDelivery({ input, config, store })).resolves.toEqual({
      accepted: true,
      duplicate: false,
    });
    await expect(processWebhookDelivery({ input, config, store })).resolves.toEqual({
      accepted: true,
      duplicate: true,
    });
  });

  it('rejects an invalid signature, shop, topic, or API version', async () => {
    const store = new MemoryStore();
    const config = {
      storeDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
      clientSecret: secret,
      webhookTopics: new Set(['app/uninstalled']),
    };
    const baseInput = {
      rawBody,
      hmac: sign(rawBody),
      webhookId: 'delivery-1',
      eventId: 'event-1',
      topic: 'app/uninstalled',
      shopDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
    };

    await expect(
      processWebhookDelivery({ input: { ...baseInput, hmac: 'bad' }, config, store })
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      processWebhookDelivery({
        input: { ...baseInput, shopDomain: 'other.myshopify.com' },
        config,
        store,
      })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      processWebhookDelivery({ input: { ...baseInput, topic: 'orders/create' }, config, store })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      processWebhookDelivery({ input: { ...baseInput, apiVersion: '2025-01' }, config, store })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('parses a paid order only after verification and retries business delivery safely', async () => {
    const store = new MemoryStore();
    const paidBody = Buffer.from(
      JSON.stringify({
        admin_graphql_api_id: 'gid://shopify/Order/77',
        current_total_price_set: {
          shop_money: { amount: '34.99', currency_code: 'EUR' },
        },
        customer: { admin_graphql_api_id: 'gid://shopify/Customer/1' },
      })
    );
    const input = {
      rawBody: paidBody,
      hmac: sign(paidBody),
      webhookId: 'delivery-paid-123',
      eventId: 'event-paid-123',
      topic: 'orders/paid',
      shopDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
    };
    const config = {
      storeDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
      clientSecret: secret,
      webhookTopics: new Set(['orders/paid']),
    };
    const onDelivery = vi.fn().mockResolvedValue(undefined);

    await processWebhookDelivery({ input, config, store, onDelivery });
    await processWebhookDelivery({ input, config, store, onDelivery });

    expect(onDelivery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        topic: 'orders/paid',
        duplicate: false,
        payload: expect.objectContaining({
          admin_graphql_api_id: 'gid://shopify/Order/77',
        }),
      })
    );
    expect(onDelivery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        topic: 'orders/paid',
        duplicate: true,
      })
    );
  });

  it('never parses or dispatches an order with an invalid HMAC', async () => {
    const onDelivery = vi.fn();
    const config = {
      storeDomain: 'rocky-dev.myshopify.com',
      apiVersion: '2026-07',
      clientSecret: secret,
      webhookTopics: new Set(['orders/paid']),
    };

    await expect(
      processWebhookDelivery({
        input: {
          rawBody: Buffer.from('{not-json', 'utf8'),
          hmac: 'bad',
          webhookId: 'delivery-paid-bad',
          topic: 'orders/paid',
          shopDomain: 'rocky-dev.myshopify.com',
          apiVersion: '2026-07',
        },
        config,
        store: new MemoryStore(),
        onDelivery,
      })
    ).rejects.toMatchObject({ status: 401 });
    expect(onDelivery).not.toHaveBeenCalled();
  });
  it('answers 500 with a generic message and logs the real error with its stack', async () => {
    class BrokenStore extends MemoryStore {
      async set() {
        throw new TypeError('disco lleno');
      }
    }
    const logger = { error: vi.fn(), info: vi.fn() };
    const handler = createWebhookHandler({
      config: {
        clientSecret: secret,
        storeDomain: 'rocky-dev.myshopify.com',
        apiVersion: '2026-07',
        webhookTopics: new Set(['app/uninstalled']),
      },
      store: new BrokenStore(),
      logger,
    });
    const headers = {
      'x-shopify-hmac-sha256': sign(rawBody),
      'x-shopify-webhook-id': 'delivery-500',
      'x-shopify-topic': 'app/uninstalled',
      'x-shopify-shop-domain': 'rocky-dev.myshopify.com',
      'x-shopify-api-version': '2026-07',
    };
    const req = { body: rawBody, requestId: 'req-500', get: (name) => headers[name.toLowerCase()] };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'No se pudo procesar el webhook.' });
    expect(logger.error).toHaveBeenCalledWith(
      'Shopify webhook rejected',
      expect.objectContaining({
        requestId: 'req-500',
        reason: 'internal_error',
        name: 'TypeError',
        message: 'disco lleno',
        stack: expect.stringContaining('disco lleno'),
      })
    );
  });
});
