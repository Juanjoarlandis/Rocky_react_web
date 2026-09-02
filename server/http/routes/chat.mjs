import express from 'express';
import { createChatHandler } from '../../services/chat/orchestrator.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { createFixedWindowRateLimiter } from '../middleware/rate-limit.mjs';
import { rules, validateBody } from '../middleware/validate.mjs';

const CHAT_BODY = {
  message: rules.string({
    min: 1,
    max: 1_000,
    message: 'Mensaje no válido.',
    code: 'INVALID_MESSAGE',
  }),
};

// Rocky IA: origen exacto, dos límites (por IP y global diario) y sólo
// {message} como entrada. Los roles, el prompt y el historial son del servidor.
export function createChatRouter({
  config,
  sessions,
  storefront,
  demoProducts,
  customerAccounts,
  crewRewards,
  openRouter,
  requireOrigin,
  logger,
}) {
  const router = express.Router();

  router.post(
    '/',
    requireOrigin,
    createFixedWindowRateLimiter({
      max: config.chat.rateLimitMax,
      windowMs: config.chat.rateLimitWindowMs,
    }),
    createFixedWindowRateLimiter({
      max: config.chat.globalDailyMax,
      windowMs: config.chat.globalDailyWindowMs,
      maxClients: 1,
      keyForRequest: () => 'rocky-chat-global',
    }),
    validateBody(CHAT_BODY),
    asyncRoute(
      createChatHandler({
        config,
        sessions,
        storefront,
        demoProducts,
        customerAccounts,
        crewRewards,
        openRouter,
        logger,
      })
    )
  );

  return router;
}
