import crypto from 'node:crypto';
import { WebhookError } from '../http/errors.mjs';
import { sha256Hex } from '../lib/hash.mjs';
import { ensureLogger } from '../lib/logger.mjs';

export { WebhookError };

const WEBHOOK_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export function verifyWebhookHmac(rawBody, providedHmac, secret) {
  if (!Buffer.isBuffer(rawBody) || !providedHmac || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let provided;
  try {
    provided = Buffer.from(providedHmac, 'base64');
  } catch {
    return false;
  }
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export async function processWebhookDelivery({
  input,
  config,
  store,
  onDelivery,
  clock = () => Date.now(),
}) {
  if (!verifyWebhookHmac(input.rawBody, input.hmac, config.clientSecret)) {
    throw new WebhookError('Firma de webhook no válida.', { status: 401, code: 'INVALID_HMAC' });
  }
  if (input.shopDomain?.toLowerCase() !== config.storeDomain) {
    throw new WebhookError('Tienda de webhook no permitida.', {
      status: 403,
      code: 'SHOP_MISMATCH',
    });
  }
  if (!config.webhookTopics.has(input.topic)) {
    throw new WebhookError('Topic de webhook no permitido.', {
      status: 403,
      code: 'TOPIC_NOT_ALLOWED',
    });
  }
  if (input.apiVersion !== config.apiVersion) {
    throw new WebhookError('Versión de webhook no esperada.', {
      status: 409,
      code: 'API_VERSION_MISMATCH',
    });
  }
  if (!/^[A-Za-z0-9-]{8,100}$/.test(input.webhookId || '')) {
    throw new WebhookError('Identificador de webhook no válido.', {
      status: 400,
      code: 'INVALID_WEBHOOK_ID',
    });
  }

  const now = clock();
  const result = await store.setIfAbsent(
    'webhooks',
    input.webhookId,
    {
      eventId: input.eventId || null,
      shopDomain: input.shopDomain,
      topic: input.topic,
      apiVersion: input.apiVersion,
      payloadHash: sha256Hex(input.rawBody),
      receivedAt: now,
      status: 'accepted',
    },
    { expiresAt: now + WEBHOOK_RETENTION_MS }
  );

  if (result.inserted && ['app/uninstalled', 'app/scopes_update'].includes(input.topic)) {
    await store.set('shopifyLifecycle', config.storeDomain, {
      topic: input.topic,
      eventId: input.eventId || null,
      receivedAt: now,
    });
  }

  if (onDelivery) {
    let payload;
    try {
      payload = JSON.parse(input.rawBody.toString('utf8'));
    } catch {
      throw new WebhookError('Payload de webhook no válido.', {
        status: 400,
        code: 'INVALID_PAYLOAD',
      });
    }
    await onDelivery({
      topic: input.topic,
      payload,
      duplicate: !result.inserted,
      eventId: input.eventId || null,
    });
  }

  return { accepted: true, duplicate: !result.inserted };
}

// Handler HTTP: verifica y registra la entrega; los rechazos se anotan aquí
// (son una señal de seguridad) y la respuesta la da el middleware de errores.
export function createWebhookHandler({ config, store, onDelivery, logger }) {
  const log = ensureLogger(logger);

  return async (req, res, next) => {
    try {
      const result = await processWebhookDelivery({
        input: {
          rawBody: req.body,
          hmac: req.get('x-shopify-hmac-sha256'),
          webhookId: req.get('x-shopify-webhook-id'),
          eventId: req.get('x-shopify-event-id'),
          topic: req.get('x-shopify-topic'),
          shopDomain: req.get('x-shopify-shop-domain'),
          apiVersion: req.get('x-shopify-api-version'),
        },
        config,
        store,
        onDelivery,
      });
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof WebhookError) {
        log.warn('Shopify webhook rejected', {
          requestId: req.requestId,
          status: error.status,
          reason: error.code,
        });
      }
      return next(error);
    }
  };
}
