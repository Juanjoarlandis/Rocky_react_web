import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import previewProducts from '../shared/preview-products.mjs';
import { createConfig } from './config/app.mjs';
import { createShopifyConfig } from './config/shopify.mjs';
import { createStorageConfig } from './config/storage.mjs';
import { createAccessGate } from './http/access-gate.mjs';
import { errorHandler } from './http/middleware/error-handler.mjs';
import { exactOriginPolicy, requireTrustedOrigin } from './http/middleware/origin-policy.mjs';
import { createFixedWindowRateLimiter } from './http/middleware/rate-limit.mjs';
import { requestIds } from './http/middleware/request-id.mjs';
import { securityHeaders } from './http/middleware/security-headers.mjs';
import { createAvisosRouter } from './http/routes/avisos.mjs';
import { createChatRouter } from './http/routes/chat.mjs';
import { createCrewRouter } from './http/routes/crew.mjs';
import { createHealthRouter } from './http/routes/health.mjs';
import { createAccountRouter } from './http/routes/shopify/account.mjs';
import { createCartRouter } from './http/routes/shopify/cart.mjs';
import { createCatalogRouter } from './http/routes/shopify/catalog.mjs';
import { createCheckoutRouter } from './http/routes/shopify/checkout.mjs';
import { createWebhookRouter } from './http/routes/shopify/webhooks.mjs';
import { mountStaticApp } from './http/static.mjs';
import { createOpenRouterClient } from './integrations/openrouter/client.mjs';
import { createCustomerAccountClient } from './integrations/shopify/customer-account.mjs';
import { createStorefrontClient } from './integrations/shopify/storefront.mjs';
import { createLogger, ensureLogger } from './lib/logger.mjs';
import { createAvisosService } from './services/avisos.mjs';
import { createCartOperations } from './services/cart-operations.mjs';
import { createCrewRewardsService } from './services/crew/rewards.mjs';
import { createSessionManager } from './services/sessions.mjs';
import { createStateStore } from './storage/create-store.mjs';

const distDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

// Composición de la aplicación: aquí sólo se crean dependencias y se montan
// rutas en orden. La lógica vive en services/, integrations/ y http/.
export function createApp({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger: providedLogger = null,
  store,
  staticDirectory = distDirectory,
} = {}) {
  const logger = ensureLogger(providedLogger ?? createLogger());
  const config = createConfig(env);
  const storageConfig = createStorageConfig(env);
  const shopifyConfig = createShopifyConfig(env, config, storageConfig);

  const stateStore = store || createStateStore(storageConfig);
  const sessions = createSessionManager({
    store: stateStore,
    isProduction: config.isProduction,
  });
  const storefront = shopifyConfig.capabilities.catalog
    ? createStorefrontClient({ config: shopifyConfig, fetchImpl })
    : null;
  const customerAccounts = shopifyConfig.capabilities.customerAccounts
    ? createCustomerAccountClient({ config: shopifyConfig, store: stateStore, fetchImpl, logger })
    : null;
  const crewRewards = createCrewRewardsService({ store: stateStore });
  const cartOperations = shopifyConfig.capabilities.cart
    ? createCartOperations({
        store: stateStore,
        storefront,
        sessions,
        checkoutHosts: shopifyConfig.checkoutHosts,
      })
    : null;
  const openRouter = createOpenRouterClient({
    apiKey: config.chat.apiKey,
    publicOrigin: config.publicOrigin,
    fetchImpl,
    timeoutMs: config.chat.timeoutMs,
  });
  const avisos = createAvisosService({ store: stateStore, logger });
  const requireOrigin = requireTrustedOrigin(config);

  const app = express();
  app.locals.config = config;
  app.locals.store = stateStore;
  app.locals.logger = logger;

  app.disable('x-powered-by');
  if (config.trustProxyHops > 0) {
    app.set('trust proxy', config.trustProxyHops);
  }
  app.use(requestIds());
  app.use(securityHeaders(config));
  app.use(exactOriginPolicy(config));

  app.use('/api/health', createHealthRouter({ config, store: stateStore }));

  // Los webhooks van antes de la puerta privada y del parser JSON: son la
  // única entrada de máquina y se verifican sobre el cuerpo crudo.
  if (shopifyConfig.capabilities.webhooks) {
    app.use(
      '/api/shopify/webhooks',
      createWebhookRouter({ config: shopifyConfig, store: stateStore, crewRewards, logger })
    );
  }

  if (config.siteAccess.enabled) {
    const accessGate = createAccessGate({ config, sessions, staticDirectory });
    app.use('/access-gate', accessGate.router);
    app.use(accessGate.requireAccess);
  }

  app.use(
    '/api/shopify',
    createFixedWindowRateLimiter({
      max: config.commerce.rateLimitMax,
      windowMs: config.commerce.rateLimitWindowMs,
    })
  );

  app.use(express.json({ limit: '16kb', strict: true }));

  app.use('/api/shopify', createCatalogRouter({ config: shopifyConfig, storefront }));
  app.use(
    '/api/shopify',
    createCartRouter({ config: shopifyConfig, sessions, cartOperations, requireOrigin })
  );
  app.use(
    '/api/shopify',
    createCheckoutRouter({ config: shopifyConfig, sessions, cartOperations, requireOrigin })
  );
  app.use(
    '/api/shopify',
    createAccountRouter({ config: shopifyConfig, sessions, customerAccounts, requireOrigin })
  );
  app.use(
    '/api/shopify',
    createCrewRouter({ sessions, customerAccounts, crewRewards, requireOrigin })
  );

  app.use(
    '/api/chat',
    createChatRouter({
      config,
      sessions,
      storefront,
      demoProducts: previewProducts,
      customerAccounts,
      crewRewards,
      openRouter,
      requireOrigin,
      logger,
    })
  );

  app.use('/api/avisos', createAvisosRouter({ config, avisos, requireOrigin }));

  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
  });

  mountStaticApp(app, { staticDirectory, isPrivate: config.siteAccess.enabled });

  app.use(errorHandler({ logger }));

  return app;
}
