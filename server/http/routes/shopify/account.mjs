import express from 'express';
import { CustomerAccountError } from '../../../integrations/shopify/customer-account.mjs';
import { asyncRoute } from '../../middleware/async-route.mjs';
import { rules, validateQuery } from '../../middleware/validate.mjs';

const LOGIN_QUERY = {
  returnPath: rules.optional(
    rules.string({
      max: 500,
      trim: false,
      message: 'Ruta de retorno no permitida.',
      code: 'INVALID_RETURN_PATH',
    })
  ),
};

const CALLBACK_QUERY = {
  state: rules.string({
    max: 2_000,
    message: 'Callback OAuth incompleto.',
    code: 'INVALID_CALLBACK',
  }),
  code: rules.string({
    max: 2_000,
    message: 'Callback OAuth incompleto.',
    code: 'INVALID_CALLBACK',
  }),
};

// El login sólo arranca en el host canónico: el estado OAuth va ligado a la
// cookie, y la cookie sólo vale en PUBLIC_ORIGIN.
function getCanonicalAccountLoginUrl(req, config) {
  const canonicalOrigin = new URL(config.publicOrigin);
  const requestHost = req.get('host')?.toLowerCase();
  if (requestHost === canonicalOrigin.host.toLowerCase()) return null;

  const loginUrl = new URL('/api/shopify/account/login', canonicalOrigin);
  if (typeof req.query.returnPath === 'string') {
    loginUrl.searchParams.set('returnPath', req.query.returnPath);
  }
  return loginUrl.toString();
}

export function createAccountRouter({ config, sessions, customerAccounts, requireOrigin }) {
  const router = express.Router();
  const requireCustomerAccounts = (req, res, next) => {
    if (!customerAccounts) {
      return res.status(503).json({ message: 'Las cuentas de cliente no están configuradas.' });
    }
    return next();
  };

  router.get(
    '/account/login',
    requireCustomerAccounts,
    validateQuery(LOGIN_QUERY),
    asyncRoute(async (req, res) => {
      const canonicalLoginUrl = getCanonicalAccountLoginUrl(req, config);
      if (canonicalLoginUrl) return res.redirect(302, canonicalLoginUrl);

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
    requireCustomerAccounts,
    validateQuery(CALLBACK_QUERY),
    asyncRoute(async (req, res) => {
      const previousSession = await sessions.read(req);
      if (!previousSession) {
        throw new CustomerAccountError('La sesión OAuth ha caducado.', {
          status: 401,
          code: 'OAUTH_SESSION_EXPIRED',
        });
      }
      const completed = await customerAccounts.completeAuthentication({
        state: req.query.state,
        code: req.query.code,
        sessionBinding: previousSession.key,
      });
      await sessions.rotate(req, res, {
        ...(previousSession.record.cartId ? { cartId: previousSession.record.cartId } : {}),
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
      const customer = await customerAccounts.getCustomerProfile(session.record.customerTokenId);
      return res.json({ loggedIn: true, customer });
    })
  );

  router.post(
    '/account/logout',
    requireOrigin,
    asyncRoute(async (req, res) => {
      const session = await sessions.read(req);
      const tokenId = session?.record.customerTokenId;
      const logoutUrl =
        customerAccounts && tokenId ? await customerAccounts.createLogoutUrl(tokenId) : null;
      if (customerAccounts && tokenId) await customerAccounts.deleteToken(tokenId);
      await sessions.destroy(req, res);
      return res.json({ loggedIn: false, logoutUrl });
    })
  );

  return router;
}
