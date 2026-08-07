import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../encrypted-store.mjs';
import { processWebhookDelivery, verifyWebhookHmac } from './webhooks.mjs';

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
});
