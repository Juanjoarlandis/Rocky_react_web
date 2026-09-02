import path from 'node:path';

const SHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;
const API_VERSION = /^\d{4}-(01|04|07|10)$/;

function readBoolean(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
}

function readStorefrontTokenType(value) {
  const type = (value || 'private').trim().toLowerCase();
  if (!['private', 'public'].includes(type)) {
    throw new Error('SHOPIFY_STOREFRONT_TOKEN_TYPE debe ser private o public.');
  }
  return type;
}

function readStoreDomain(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  if (!SHOPIFY_DOMAIN.test(normalized)) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN debe ser un dominio canónico *.myshopify.com sin esquema.'
    );
  }
  return normalized;
}

function readApiVersion(value) {
  const version = value || '2026-07';
  if (!API_VERSION.test(version)) {
    throw new Error('SHOPIFY_API_VERSION debe tener formato YYYY-01, YYYY-04, YYYY-07 o YYYY-10.');
  }
  return version;
}

function readList(value, fallback = []) {
  return (value || fallback.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readCheckoutHosts(value) {
  return readList(value).map((candidate) => {
    const host = candidate.toLowerCase();
    let url;
    try {
      url = new URL(`https://${host}`);
    } catch {
      throw new Error('SHOPIFY_CHECKOUT_HOSTS contiene un hostname no válido.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.hostname !== host
    ) {
      throw new Error('SHOPIFY_CHECKOUT_HOSTS sólo puede contener hostnames sin ruta ni puerto.');
    }
    return host;
  });
}

export function createShopifyConfig(env, appConfig) {
  const storeDomain = readStoreDomain(env.SHOPIFY_STORE_DOMAIN);
  const apiVersion = readApiVersion(env.SHOPIFY_API_VERSION);
  const encryptionKey = env.APP_ENCRYPTION_KEY || '';
  const clientId = env.SHOPIFY_CLIENT_ID || '';
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || '';
  const customerClientId = env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID || '';
  const hasStateStore = Boolean(encryptionKey);
  const hasHttpsCallback = appConfig.publicOrigin.startsWith('https://');

  return {
    publicOrigin: appConfig.publicOrigin,
    storeDomain,
    apiVersion,
    storefrontToken: env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
    storefrontTokenType: readStorefrontTokenType(env.SHOPIFY_STOREFRONT_TOKEN_TYPE),
    exposeQuantity: readBoolean(env.SHOPIFY_EXPOSE_QUANTITY),
    clientId,
    clientSecret,
    customerClientId,
    customerScopes: env.SHOPIFY_CUSTOMER_ACCOUNT_SCOPES || 'openid email customer-account-api:full',
    encryptionKey,
    stateStorePath: path.resolve(env.STATE_STORE_PATH || '.data/rocky-state.enc'),
    webhookTopics: new Set(
      readList(env.SHOPIFY_WEBHOOK_TOPICS, ['app/uninstalled', 'app/scopes_update', 'orders/paid'])
    ),
    checkoutHosts: new Set([
      ...(storeDomain ? [storeDomain] : []),
      ...readCheckoutHosts(env.SHOPIFY_CHECKOUT_HOSTS),
    ]),
    capabilities: {
      catalog: Boolean(storeDomain),
      cart: Boolean(storeDomain && hasStateStore),
      customerAccounts: Boolean(
        storeDomain && customerClientId && hasStateStore && hasHttpsCallback
      ),
      admin: Boolean(storeDomain && clientId && clientSecret),
      webhooks: Boolean(storeDomain && clientSecret && hasStateStore),
    },
  };
}
