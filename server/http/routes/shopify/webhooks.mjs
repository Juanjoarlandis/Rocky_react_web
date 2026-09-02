import express from 'express';
import { WebhookError, processWebhookDelivery } from '../../../services/webhook-deliveries.mjs';
import { ensureLogger } from '../../../lib/logger.mjs';

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

// Se monta antes de la puerta privada y del parser JSON global: el cuerpo se
// lee crudo para verificar la firma sobre los bytes exactos.
export function createWebhookRouter({ config, store, crewRewards, logger }) {
  const log = ensureLogger(logger);
  const router = express.Router();

  router.post(
    '/',
    express.raw({ type: 'application/json', limit: '256kb' }),
    createWebhookHandler({
      config,
      store,
      logger: log,
      onDelivery: async ({ topic, payload }) => {
        if (topic !== 'orders/paid') return;
        const result = await crewRewards.creditPaidOrder(payload);
        if (!result.credited) {
          log.info('Shopify order skipped for Crew rewards', { reason: result.reason });
        }
      },
    })
  );

  return router;
}
