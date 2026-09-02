import {
  ROCKY_BLOCKED_REPLY,
  buildRockyMessages,
  isPromptManipulationAttempt,
  normalizeRockyReply,
} from './rocky-prompt.mjs';
import {
  buildCommerceContext,
  buildVerifiedCommerceReply,
  hasCommerceIntent,
  selectCatalogChatProducts,
  selectDemoChatProducts,
} from './chat-commerce.mjs';

import { isFreeOpenRouterModel } from './config.mjs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Candado de coste. La web es pública: un modelo de pago aquí nos funde.
// El config ya valida al arrancar; esto lo vuelve a comprobar en cada petición
// por si alguien recarga configuración en caliente o toca el objeto.
export function assertFreeModels(models) {
  const dePago = (models || []).filter((model) => !isFreeOpenRouterModel(model));
  if (!models?.length || dePago.length > 0) {
    throw new Error(
      `Rocky IA sólo puede usar modelos gratuitos (:free). Bloqueados: ${dePago.join(', ') || 'ninguno configurado'}`
    );
  }
  return models;
}

// Techo de precio explícito en OpenRouter: aunque algo se colara, sólo se
// aceptan endpoints a coste cero.
const PRECIO_CERO = Object.freeze({ prompt: 0, completion: 0 });
const MAX_MESSAGE_CHARACTERS = 1_000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_ITEM_CHARACTERS = 2_000;

function readUserMessage(body) {
  if (!body || typeof body.message !== 'string') return null;
  const message = body.message.trim();
  if (!message || message.length > MAX_MESSAGE_CHARACTERS) return null;
  return message;
}

function readStoredHistory(session) {
  const stored = session?.record?.chatHistory;
  if (!Array.isArray(stored)) return [];

  return stored
    .filter(
      (message) =>
        message &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string'
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_HISTORY_ITEM_CHARACTERS),
    }))
    .filter((message) => message.content.length > 0);
}

function appendTurn(history, userMessage, assistantMessage) {
  return [
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
  ].slice(-MAX_HISTORY_MESSAGES);
}

function freeModelRoute(models) {
  // Se revalida en cada petición, no sólo al arrancar.
  assertFreeModels(models);
  return {
    model: models[0],
    ...(models.length > 1 ? { models: models.slice(1) } : {}),
    // Techo duro en el enrutado de OpenRouter: sólo endpoints a coste cero.
    provider: { max_price: PRECIO_CERO },
  };
}

function reportedCost(data) {
  const rawCost = data?.usage?.cost;
  if (rawCost === undefined || rawCost === null || rawCost === '') return null;
  const cost = Number(rawCost);
  return Number.isFinite(cost) ? cost : null;
}

async function saveHistory({ sessions, session, history, logger, requestId }) {
  try {
    await sessions.save(session, { chatHistory: history });
  } catch {
    logger.error('Rocky IA history could not be saved', {
      requestId,
      reason: 'session_store_error',
    });
  }
}

async function loadChatProducts({
  storefront,
  demoProducts,
  userMessage,
  history,
  buyerIp,
  logger,
  requestId,
}) {
  if (
    !hasCommerceIntent(userMessage, {
      history,
      knownProducts: demoProducts,
    })
  ) {
    return { products: [], searchAttempted: false, catalogUnavailable: false };
  }
  if (!storefront) {
    return {
      products: selectDemoChatProducts(userMessage, demoProducts),
      searchAttempted: true,
      catalogUnavailable: false,
    };
  }
  try {
    const catalog = await storefront.listProducts({ first: 50, buyerIp });
    return {
      products: selectCatalogChatProducts(userMessage, catalog.products, demoProducts),
      searchAttempted: true,
      catalogUnavailable: false,
    };
  } catch {
    logger.error('Rocky IA catalog could not be loaded', {
      requestId,
      reason: 'shopify_catalog_error',
    });
    return { products: [], searchAttempted: true, catalogUnavailable: true };
  }
}

export async function loadCrewChatContext({
  session,
  customerAccounts,
  crewRewards,
  logger,
  requestId,
}) {
  const tokenId = session?.record?.customerTokenId;
  if (!tokenId || !customerAccounts || !crewRewards) return '';

  try {
    const customer = await customerAccounts.getCustomerProfile(tokenId);
    const crew = await crewRewards.getContext(customer.id);
    const progress =
      crew.nextLevel && crew.nextXp !== null
        ? `Siguiente nivel: ${crew.nextLevel} al llegar a ${crew.nextXp} XP.`
        : 'Siguiente nivel: ya está en el escalón máximo.';

    return [
      'PERFIL CREW VERIFICADO (datos privados del servidor; no mostrar identificadores ni inventar otros datos)',
      `Nivel: ${crew.level}.`,
      `Progreso: ${crew.xp} XP. ${progress}`,
      `Saldo: ${crew.ticketBalance} Crew Tickets.`,
      `Colección: ${crew.collectionCount} piezas.`,
      `Avatar equipado: ${crew.equippedAvatar}.`,
    ].join('\n');
  } catch {
    logger.error('Rocky IA Crew context could not be loaded', {
      requestId,
      reason: 'crew_context_error',
    });
    return '';
  }
}

export function createChatHandler({
  config,
  sessions,
  storefront = null,
  demoProducts = [],
  customerAccounts = null,
  crewRewards = null,
  fetchImpl = globalThis.fetch,
  logger = console,
}) {
  let activeRequests = 0;
  let isCostSafetyTripped = false;

  return async function chatHandler(req, res) {
    if (!config.chat.apiKey) {
      return res.status(503).json({ message: 'Rocky IA no está configurado.' });
    }
    if (isCostSafetyTripped) {
      return res.status(503).json({
        message: 'Rocky IA está pausado por seguridad. Inténtalo más tarde.',
      });
    }

    const userMessage = readUserMessage(req.body);
    if (!userMessage) {
      return res.status(400).json({ message: 'Mensaje no válido.' });
    }

    let session;
    try {
      session = await sessions.open(req, res);
    } catch {
      logger.error('Rocky IA session could not be opened', {
        requestId: req.requestId,
        reason: 'session_store_error',
      });
      return res.status(503).json({ message: 'Rocky IA no está disponible ahora mismo.' });
    }
    const history = readStoredHistory(session);

    if (isPromptManipulationAttempt(userMessage)) {
      return res.json({ message: ROCKY_BLOCKED_REPLY });
    }

    if (activeRequests >= config.chat.maxConcurrent) {
      return res.status(503).json({ message: 'Rocky IA está ocupado. Inténtalo en un momento.' });
    }

    activeRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.chat.timeoutMs);
    const cancelOnDisconnect = () => {
      if (!res.writableEnded) controller.abort();
    };
    req.once('aborted', cancelOnDisconnect);
    res.once('close', cancelOnDisconnect);

    try {
      const [commerce, crewContext] = await Promise.all([
        loadChatProducts({
          storefront,
          demoProducts,
          userMessage,
          history,
          buyerIp: req.ip,
          logger,
          requestId: req.requestId,
        }),
        loadCrewChatContext({
          session,
          customerAccounts,
          crewRewards,
          logger,
          requestId: req.requestId,
        }),
      ]);
      const { products } = commerce;
      const trustedContext = [buildCommerceContext(products), crewContext]
        .filter(Boolean)
        .join('\n\n');
      const upstream = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.chat.apiKey}`,
          'HTTP-Referer': config.publicOrigin,
          'X-Title': 'Rocky IA',
        },
        body: JSON.stringify({
          ...freeModelRoute(config.chat.models),
          messages: buildRockyMessages(history, userMessage, trustedContext),
          max_tokens: 300,
          temperature: 0.75,
          usage: { include: true },
        }),
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        logger.error('OpenRouter request failed', {
          requestId: req.requestId,
          status: upstream.status,
        });
        return res.status(502).json({ message: 'La IA no está disponible ahora mismo.' });
      }

      const cost = reportedCost(data);
      if (cost !== null && cost !== 0) {
        isCostSafetyTripped = true;
        logger.error('OpenRouter cost safety circuit tripped', {
          requestId: req.requestId,
          reason: 'non_zero_cost',
          reportedCost: cost,
        });
        return res.status(502).json({
          message: 'Rocky IA se ha pausado porque no se pudo verificar el coste cero.',
        });
      }
      if (cost === null) {
        logger.info('OpenRouter omitted cost metadata for a free-only request', {
          requestId: req.requestId,
          reason: 'cost_missing',
        });
      }

      const providerMessage = normalizeRockyReply(data?.choices?.[0]?.message?.content);
      const message = buildVerifiedCommerceReply(products, commerce) || providerMessage;
      if (!message) {
        logger.error('OpenRouter request failed', {
          requestId: req.requestId,
          status: upstream.status,
          reason: 'invalid_response',
        });
        return res.status(502).json({ message: 'La IA no está disponible ahora mismo.' });
      }

      await saveHistory({
        sessions,
        session,
        history: appendTurn(history, userMessage, message),
        logger,
        requestId: req.requestId,
      });
      return res.json({ message, ...(products.length > 0 ? { products } : {}) });
    } catch (error) {
      logger.error('OpenRouter request failed', {
        requestId: req.requestId,
        reason: error?.name === 'AbortError' ? 'timeout_or_disconnect' : 'network_error',
      });
      if (!res.headersSent) {
        return res.status(502).json({ message: 'La IA no está disponible ahora mismo.' });
      }
      return undefined;
    } finally {
      activeRequests -= 1;
      clearTimeout(timeout);
      req.off('aborted', cancelOnDisconnect);
      res.off('close', cancelOnDisconnect);
    }
  };
}
