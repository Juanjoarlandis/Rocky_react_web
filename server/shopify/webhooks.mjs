import crypto from 'node:crypto';

const WEBHOOK_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export class WebhookError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'WebhookError';
    this.status = status;
  }
}

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
    throw new WebhookError('Firma de webhook no válida.', 401);
  }
  if (input.shopDomain?.toLowerCase() !== config.storeDomain) {
    throw new WebhookError('Tienda de webhook no permitida.', 403);
  }
  if (!config.webhookTopics.has(input.topic)) {
    throw new WebhookError('Topic de webhook no permitido.', 403);
  }
  if (input.apiVersion !== config.apiVersion) {
    throw new WebhookError('Versión de webhook no esperada.', 409);
  }
  if (!/^[A-Za-z0-9-]{8,100}$/.test(input.webhookId || '')) {
    throw new WebhookError('Identificador de webhook no válido.', 400);
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
      payloadHash: crypto.createHash('sha256').update(input.rawBody).digest('hex'),
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
      throw new WebhookError('Payload de webhook no válido.', 400);
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

export function createWebhookHandler({ config, store, onDelivery, logger = console }) {
  return async (req, res) => {
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
      const expected = error instanceof WebhookError;
      logger.error('Shopify webhook rejected', {
        requestId: req.requestId,
        reason: expected ? error.message : 'internal_error',
        ...(expected
          ? {}
          : {
              name: error?.name || 'Error',
              message: error?.message || String(error),
              stack: error?.stack || null,
            }),
      });
      return res.status(error instanceof WebhookError ? error.status : 500).json({
        message: error instanceof WebhookError ? error.message : 'No se pudo procesar el webhook.',
      });
    }
  };
}
