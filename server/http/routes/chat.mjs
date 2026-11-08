import express from 'express';
import { createBarraHandler } from '../../services/chat/barra.mjs';
import { createAiBudget } from '../../services/chat/budget.mjs';
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

// La barra de la mesa: el beat tal cual lo guarda la mesa, nada de texto libre.
const BARRA_BODY = {
  code: rules.string({
    min: 16,
    max: 65,
    pattern: /^[0-9a-f]+$/i,
    message: 'Ese beat no viene de la mesa.',
  }),
  bpm: rules.integer({ min: 60, max: 180, message: 'Ese tempo no cabe en la mesa.' }),
  swing: (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined),
  tono: rules.string({ max: 3, pattern: /^[a-z]+$/, message: 'Esa tonalidad no está en la mesa.' }),
};

// Rocky IA: origen exacto, dos límites (por IP y global diario) y sólo
// {message} como entrada. Los roles, el prompt y el historial son del servidor.
// El cupo global y el cortacircuitos de coste se comparten con la barra.
export function createChatRouter({
  config,
  sessions,
  catalog,
  demoProducts,
  customerAccounts,
  crewRewards,
  openRouter,
  requireOrigin,
  logger,
  budget = createAiBudget({ config }),
}) {
  const router = express.Router();

  router.post(
    '/',
    requireOrigin,
    createFixedWindowRateLimiter({
      max: config.chat.rateLimitMax,
      windowMs: config.chat.rateLimitWindowMs,
    }),
    validateBody(CHAT_BODY),
    asyncRoute(
      createChatHandler({
        config,
        sessions,
        catalog,
        demoProducts,
        customerAccounts,
        crewRewards,
        openRouter,
        logger,
        budget,
      })
    )
  );

  // Rocky IA te escribe una barra sobre el beat de la mesa.
  router.post(
    '/barra',
    requireOrigin,
    createFixedWindowRateLimiter({
      max: config.chat.rateLimitMax,
      windowMs: config.chat.rateLimitWindowMs,
    }),
    validateBody(BARRA_BODY),
    asyncRoute(createBarraHandler({ config, openRouter, logger, budget }))
  );

  return router;
}
