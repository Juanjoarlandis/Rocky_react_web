import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createChatHandler } from './server/chat.mjs';
import { createConfig } from './server/config.mjs';
import { createCrewRewardsService } from './server/crew/rewards.mjs';
import { EncryptedStore, MemoryStore } from './server/encrypted-store.mjs';
import { createSessionManager } from './server/session.mjs';
import {
  createFixedWindowRateLimiter,
  exactOriginPolicy,
  requestIds,
  requireTrustedOrigin,
  securityHeaders,
} from './server/security.mjs';
import { createShopifyConfig } from './server/shopify/config.mjs';
import { createShopifyRouter } from './server/shopify/routes.mjs';
import { createStorefrontClient } from './server/shopify/storefront.mjs';
import { createWebhookHandler } from './server/shopify/webhooks.mjs';
import previewProducts from './server/preview-products.mjs';

dotenv.config({ quiet: true });

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(currentDirectory, 'dist');
const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable';
const IMMUTABLE_EDGE_CACHE = 'public, max-age=31536000';
const REVALIDATED_PUBLIC_CACHE = 'public, max-age=14400, must-revalidate';
const REVALIDATED_EDGE_CACHE = 'public, max-age=14400';
const REVALIDATED_DOCUMENT_CACHE = 'public, max-age=0, must-revalidate';

function setSpaDocumentHeaders(res) {
  res.setHeader('Cache-Control', REVALIDATED_DOCUMENT_CACHE);
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
}

function setStablePublicHeaders(res) {
  res.setHeader('Cache-Control', REVALIDATED_PUBLIC_CACHE);
  res.setHeader('Cloudflare-CDN-Cache-Control', REVALIDATED_EDGE_CACHE);
}

export function createApp({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
  store,
  staticDirectory = distDirectory,
} = {}) {
  const config = createConfig(env);
  const shopifyConfig = createShopifyConfig(env, config);
  const stateStore = store || (shopifyConfig.encryptionKey
    ? new EncryptedStore({
        filePath: shopifyConfig.stateStorePath,
        key: shopifyConfig.encryptionKey,
      })
    : new MemoryStore());
  const sessions = createSessionManager({
    store: stateStore,
    isProduction: config.isProduction,
  });
  const storefront = shopifyConfig.capabilities.catalog
    ? createStorefrontClient({ config: shopifyConfig, fetchImpl })
    : null;
  const crewRewards = createCrewRewardsService({ store: stateStore });
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxyHops > 0) {
    app.set('trust proxy', config.trustProxyHops);
  }
  app.use(requestIds());
  app.use(securityHeaders(config));
  app.use(exactOriginPolicy(config));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const shopify = createShopifyRouter({
    config: shopifyConfig,
    store: stateStore,
    sessions,
    requireOrigin: requireTrustedOrigin(config),
    crewRewards,
    storefront,
    fetchImpl,
  });

  if (shopifyConfig.capabilities.webhooks) {
    app.post(
      '/api/shopify/webhooks',
      express.raw({ type: 'application/json', limit: '256kb' }),
      createWebhookHandler({
        config: shopifyConfig,
        store: stateStore,
        logger,
        onDelivery: async ({ topic, payload }) => {
          if (topic !== 'orders/paid') return;
          const result = await crewRewards.creditPaidOrder(payload);
          if (!result.credited) {
            logger.info?.('Shopify order skipped for Crew rewards', {
              reason: result.reason,
            });
          }
        },
      })
    );
  }

  app.use(
    '/api/shopify',
    createFixedWindowRateLimiter({
      max: config.commerce.rateLimitMax,
      windowMs: config.commerce.rateLimitWindowMs,
    })
  );

  app.use(express.json({ limit: '16kb', strict: true }));

  app.use('/api/shopify', shopify.router);

  app.post(
    '/api/chat',
    requireTrustedOrigin(config),
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
    createChatHandler({
      config,
      sessions,
      storefront,
      demoProducts: previewProducts,
      customerAccounts: shopify.customerAccounts,
      crewRewards,
      fetchImpl,
      logger,
    })
  );

  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
  });

  const indexPath = path.join(staticDirectory, 'index.html');
  if (fs.existsSync(indexPath)) {
    app.use(
      '/assets',
      express.static(path.join(staticDirectory, 'assets'), {
        index: false,
        fallthrough: true,
        setHeaders(res) {
          res.setHeader('Cache-Control', IMMUTABLE_ASSET_CACHE);
          res.setHeader('Cloudflare-CDN-Cache-Control', IMMUTABLE_EDGE_CACHE);
        },
      })
    );
    app.use('/assets', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
      return res.status(404).type('text/plain').send('Asset not found.');
    });
    app.use(
      express.static(staticDirectory, {
        index: false,
        fallthrough: true,
        setHeaders(res, filePath) {
          if (filePath === indexPath) {
            setSpaDocumentHeaders(res);
            return;
          }
          setStablePublicHeaders(res);
        },
      })
    );
    app.use('/products', (req, res, next) => {
      if (!/\.(?:avif|jpe?g|png|webp)$/i.test(req.path)) return next();
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
      return res.status(404).type('text/plain').send('Product asset not found.');
    });
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET') return next();
      setSpaDocumentHeaders(res);
      return res.sendFile(indexPath);
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error?.type === 'entity.too.large'
      ? 413
      : error?.type === 'entity.parse.failed'
        ? 400
        : 500;
    logger.error('Unhandled request error', {
      requestId: req.requestId,
      reason: status === 413
        ? 'body_too_large'
        : status === 400
          ? 'invalid_json'
          : 'internal_error',
    });
    return res.status(status).json({
      message: status === 413
        ? 'Petición demasiado grande.'
        : status === 400
          ? 'JSON no válido.'
          : 'Algo se ha roto en el servidor.',
    });
  });

  return app;
}

function startServer() {
  const config = createConfig(process.env);
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.info(`ROCKY 035 server listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    console.info(`${signal} received; closing HTTP server.`);
    server.close((error) => {
      process.exitCode = error ? 1 : 0;
    });
    setTimeout(() => {
      process.exitCode = 1;
      server.closeAllConnections?.();
    }, 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
