import { WebhookError } from '../http/errors.mjs';
import { verifyWebhookHmac } from '../integrations/shopify/webhook-verify.mjs';
import { sha256Hex } from '../lib/hash.mjs';

export { WebhookError, verifyWebhookHmac };

const WEBHOOK_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

// Acepta una entrega de Shopify: firma, tienda, topic y versión exactos,
// deduplicación persistente por id de entrega y, sólo entonces, parseo del
// JSON y despacho a la lógica de negocio.
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
