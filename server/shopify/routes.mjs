import express from 'express';
import { CrewRewardsError } from '../crew/rewards.mjs';
import { createAdminClient } from './admin.mjs';
import { createCustomerAccountClient, CustomerAccountError } from './customer-account.mjs';
import { ShopifyGraphqlError } from './graphql.mjs';
import { createStorefrontClient } from './storefront.mjs';

const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1_000;

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validateOperationId(value) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(value || '')) {
    throw new ShopifyGraphqlError('operationId no válido.', {
      status: 400,
      code: 'INVALID_OPERATION_ID',
    });
  }
  return value;
}

function createKeyedLock() {
  const tails = new Map();
  return async (key, action) => {
    const previous = tails.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    tails.set(key, tail);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

function validateCheckoutUrl(value, allowedHosts) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ShopifyGraphqlError('Shopify ha devuelto un checkout no válido.');
  }
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new ShopifyGraphqlError('El dominio de checkout no está permitido.');
  }
  return url.toString();
}

export function createShopifyRouter({
  config,
  store,
  sessions,
  requireOrigin,
  crewRewards = null,
  customerAccounts: providedCustomerAccounts,
  storefront: providedStorefront,
  fetchImpl = globalThis.fetch,
  logger = console,
}) {
  const router = express.Router();
  const withCartLock = createKeyedLock();
  const storefront = providedStorefront || (
    config.capabilities.catalog ? createStorefrontClient({ config, fetchImpl }) : null
  );
  const customerAccounts = providedCustomerAccounts || (
    config.capabilities.customerAccounts
      ? createCustomerAccountClient({ config, store, fetchImpl, logger })
      : null
  );
  const admin = config.capabilities.admin
    ? createAdminClient({ config, fetchImpl })
    : null;

  router.get('/status', (req, res) => {
    res.json({
      mode: config.capabilities.catalog ? 'shopify' : 'demo',
      apiVersion: config.apiVersion,
      capabilities: config.capabilities,
    });
  });

  router.get(
    '/products',
    asyncRoute(async (req, res) => {
      if (!storefront) {
        return res.status(503).json({ message: 'El catálogo Shopify no está configurado.' });
      }
      const catalog = await storefront.listProducts({
        first: req.query.first,
        after: req.query.after,
        buyerIp: req.ip,
      });
      return res.json(catalog);
    })
  );

  async function runIdempotentCartOperation(session, operationId, action) {
    const idempotencyKey = `${session.key}:${validateOperationId(operationId)}`;
    return withCartLock(session.key, async () => {
      const existing = await store.get('cartOperations', idempotencyKey);
      if (existing?.status === 'completed') return existing.response;
      if (existing) {
        throw new ShopifyGraphqlError('La operación anterior sigue pendiente.', {
          status: 409,
          code: 'OPERATION_PENDING',
        });
      }
      const now = Date.now();
      await store.setIfAbsent(
        'cartOperations',
        idempotencyKey,
        { status: 'pending', createdAt: now },
        { expiresAt: now + IDEMPOTENCY_RETENTION_MS }
      );
      try {
        const response = await action();
        await store.set(
          'cartOperations',
          idempotencyKey,
          { status: 'completed', response, completedAt: Date.now() },
          { expiresAt: Date.now() + IDEMPOTENCY_RETENTION_MS }
        );
        return response;
      } catch (error) {
        await store.set(
          'cartOperations',
          idempotencyKey,
          { status: 'ambiguous', failedAt: Date.now() },
          { expiresAt: Date.now() + 10 * 60 * 1_000 }
        );
        throw error;
      }
    });
  }

  router.get(
    '/cart',
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El carrito Shopify no está configurado.' });
      }
      const session = await sessions.open(req, res);
      if (!session.record.cartId) return res.json({ cart: null, warnings: [] });
      const result = await storefront.getCart(session.record.cartId, { buyerIp: req.ip });
      return res.json({ cart: result.cart, warnings: [] });
    })
  );

  router.post(
    '/cart/lines',
    requireOrigin,
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El carrito Shopify no está configurado.' });
      }
      const session = await sessions.open(req, res);
      const response = await runIdempotentCartOperation(
        session,
        req.body?.operationId,
        async () => {
          if (!session.record.cartId) {
            const created = await storefront.createCartForSession(req.body, {
              buyerIp: req.ip,
            });
            await sessions.save(session, { cartId: created.fullCartId });
            return { cart: created.cart, warnings: created.warnings };
          }
          return storefront.addLines(session.record.cartId, req.body, {
            buyerIp: req.ip,
          });
        }
      );
      return res.json(response);
    })
  );

  router.patch(
    '/cart/lines',
    requireOrigin,
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El carrito Shopify no está configurado.' });
      }
      const session = await sessions.open(req, res);
      if (!session.record.cartId) {
        throw new ShopifyGraphqlError('No existe un carrito activo.', { status: 404 });
      }
      const response = await runIdempotentCartOperation(
        session,
        req.body?.operationId,
        async () => {
          const current = await storefront.getCart(session.record.cartId, {
            buyerIp: req.ip,
          });
          if (!current.cart?.lines.some((line) => line.id === req.body?.lineId)) {
            throw new ShopifyGraphqlError('La línea no pertenece al carrito.', { status: 400 });
          }
          return storefront.updateLines(session.record.cartId, req.body, {
            buyerIp: req.ip,
          });
        }
      );
      return res.json(response);
    })
  );

  router.delete(
    '/cart/lines',
    requireOrigin,
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El carrito Shopify no está configurado.' });
      }
      const session = await sessions.open(req, res);
      if (!session.record.cartId) {
        throw new ShopifyGraphqlError('No existe un carrito activo.', { status: 404 });
      }
      const response = await runIdempotentCartOperation(
        session,
        req.body?.operationId,
        async () => {
          const current = await storefront.getCart(session.record.cartId, {
            buyerIp: req.ip,
          });
          if (!current.cart?.lines.some((line) => line.id === req.body?.lineId)) {
            throw new ShopifyGraphqlError('La línea no pertenece al carrito.', { status: 400 });
          }
          return storefront.removeLines(session.record.cartId, req.body, {
            buyerIp: req.ip,
          });
        }
      );
      return res.json(response);
    })
  );

  router.post(
    '/checkout',
    requireOrigin,
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El checkout Shopify no está configurado.' });
      }
      const session = await sessions.read(req);
      if (!session?.record.cartId) {
        throw new ShopifyGraphqlError('No existe un carrito activo.', { status: 404 });
      }
      const current = await storefront.getCart(session.record.cartId, {
        buyerIp: req.ip,
      });
      if (!current.cart?.lines.length) {
        throw new ShopifyGraphqlError('El carrito está vacío.', { status: 409 });
      }
      const checkoutUrl = validateCheckoutUrl(current.checkoutUrl, config.checkoutHosts);
      return res.json({ checkoutUrl });
    })
  );

  router.get(
    '/account/login',
    asyncRoute(async (req, res) => {
      if (!customerAccounts) {
        return res.status(503).json({ message: 'Las cuentas de cliente no están configuradas.' });
      }
      const session = await sessions.open(req, res);
      const url = await customerAccounts.beginAuthentication({
        returnPath: req.query.returnPath || '/',
        sessionBinding: session.key,
      });
      return res.redirect(302, url);
    })
  );

  router.get(
    '/account/callback',
    asyncRoute(async (req, res) => {
      if (!customerAccounts) {
        return res.status(503).json({ message: 'Las cuentas de cliente no están configuradas.' });
      }
      const previousSession = await sessions.read(req);
      if (!previousSession) {
        throw new CustomerAccountError('La sesión OAuth ha caducado.', 400, 'INVALID_STATE');
      }
      const completed = await customerAccounts.completeAuthentication({
        state: req.query.state,
        code: req.query.code,
        sessionBinding: previousSession.key,
      });
      await sessions.rotate(req, res, {
        ...(previousSession.record.cartId
          ? { cartId: previousSession.record.cartId }
          : {}),
        customerTokenId: completed.tokenId,
      });
      return res.redirect(302, completed.returnPath);
    })
  );

  router.get(
    '/account',
    asyncRoute(async (req, res) => {
      if (!customerAccounts) return res.json({ loggedIn: false, customer: null });
      const session = await sessions.read(req);
      if (!session?.record.customerTokenId) {
        return res.json({ loggedIn: false, customer: null });
      }
      const customer = await customerAccounts.getCustomerProfile(
        session.record.customerTokenId
      );
      return res.json({ loggedIn: true, customer });
    })
  );

  async function requireCrewCustomer(req) {
    if (!customerAccounts || !crewRewards) {
      throw new CrewRewardsError('El perfil Crew todavía no está disponible.', {
        status: 503,
        code: 'CREW_UNAVAILABLE',
      });
    }
    const session = await sessions.read(req);
    if (!session?.record.customerTokenId) {
      throw new CrewRewardsError('Inicia sesión para entrar en tu perfil Crew.', {
        status: 401,
        code: 'CREW_AUTH_REQUIRED',
      });
    }
    const customer = await customerAccounts.getCustomerProfile(
      session.record.customerTokenId
    );
    return {
      id: customer.id,
      displayName: customer.displayName || customer.firstName || 'Miembro 035',
    };
  }

  router.get(
    '/account/crew',
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.getProfile(customer.id, {
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  router.patch(
    '/account/crew/avatar',
    requireOrigin,
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.equipReward(customer.id, {
        rewardId: req.body?.rewardId,
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  router.post(
    '/account/crew/redeem',
    requireOrigin,
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.redeemReward(customer.id, {
        rewardId: req.body?.rewardId,
        operationId: req.body?.operationId,
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  router.post(
    '/account/logout',
    requireOrigin,
    asyncRoute(async (req, res) => {
      const session = await sessions.read(req);
      const tokenId = session?.record.customerTokenId;
      const logoutUrl = customerAccounts && tokenId
        ? await customerAccounts.createLogoutUrl(tokenId)
        : null;
      if (customerAccounts && tokenId) await customerAccounts.deleteToken(tokenId);
      await sessions.destroy(req, res);
      return res.json({ loggedIn: false, logoutUrl });
    })
  );

  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (
      error instanceof ShopifyGraphqlError ||
      error instanceof CustomerAccountError ||
      error instanceof CrewRewardsError
    ) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    return next(error);
  });

  return { router, admin, customerAccounts };
}
