import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createChatHandler } from './server/chat.mjs';
import { createConfig } from './server/config.mjs';
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
import { createWebhookHandler } from './server/shopify/webhooks.mjs';

dotenv.config({ quiet: true });

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(currentDirectory, 'dist');

export function createApp({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
  store,
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

  if (shopifyConfig.capabilities.webhooks) {
    app.post(
      '/api/shopify/webhooks',
      express.raw({ type: 'application/json', limit: '256kb' }),
      createWebhookHandler({ config: shopifyConfig, store: stateStore, logger })
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

  const shopify = createShopifyRouter({
    config: shopifyConfig,
    store: stateStore,
    sessions,
    requireOrigin: requireTrustedOrigin(config),
    fetchImpl,
  });
  app.use('/api/shopify', shopify.router);

  app.post(
    '/api/chat',
    createFixedWindowRateLimiter({
      max: config.chat.rateLimitMax,
      windowMs: config.chat.rateLimitWindowMs,
    }),
    createChatHandler({ config, fetchImpl, logger })
  );

  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
  });

  if (fs.existsSync(path.join(distDirectory, 'index.html'))) {
    app.use(express.static(distDirectory, { index: false, fallthrough: true }));
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET') return next();
      return res.sendFile(path.join(distDirectory, 'index.html'));
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
