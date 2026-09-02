import crypto from 'node:crypto';
import { fetchWithTimeout, requestShopifyGraphql } from './graphql.mjs';

const OAUTH_TRANSACTION_MS = 10 * 60 * 1_000;
const CUSTOMER_TOKEN_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const MAX_TOKEN_LIFETIME_SECONDS = 365 * 24 * 60 * 60;

export class CustomerAccountError extends Error {
  constructor(message, status = 502, code = 'CUSTOMER_ACCOUNT_ERROR') {
    super(message);
    this.name = 'CustomerAccountError';
    this.status = status;
    this.code = code;
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('base64url');
}

// La ruta de retorno se resuelve contra el origen público y sólo vale si
// sigue en él: así caen `//evil`, `/\\evil` (el navegador lee la barra
// invertida como barra normal) y cualquier URL absoluta. Se devuelve la ruta
// ya normalizada por el parser de URL, nunca el texto que llegó.
export function normalizeReturnPath(value, publicOrigin) {
  if (typeof value !== 'string' || value.length > 500 || !value.startsWith('/')) {
    return null;
  }
  let url;
  try {
    url = new URL(value, publicOrigin);
  } catch {
    return null;
  }
  if (url.origin !== publicOrigin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

function requireSessionBinding(value) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 100) {
    throw new CustomerAccountError(
      'La sesión de autenticación no es válida.',
      400,
      'INVALID_STATE'
    );
  }
  return hash(value);
}

function requireHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new CustomerAccountError(
      'Shopify ha devuelto un endpoint no válido.',
      502,
      'INSECURE_DISCOVERY_URL'
    );
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new CustomerAccountError(
      'Shopify ha devuelto un endpoint no seguro.',
      502,
      'INSECURE_DISCOVERY_URL'
    );
  }
  return value;
}

function validateOpenIdDiscovery(discovery) {
  for (const field of ['authorization_endpoint', 'token_endpoint', 'jwks_uri', 'issuer']) {
    requireHttpsUrl(discovery?.[field]);
  }
  if (discovery.end_session_endpoint) requireHttpsUrl(discovery.end_session_endpoint);
  return discovery;
}

function isOpaqueToken(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 64_000;
}

function isValidTokenLifetime(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_TOKEN_LIFETIME_SECONDS;
}

function normalizeCustomerSubject(value) {
  if (typeof value === 'string' && value.length > 0 && value.length <= 1_000) {
    return value;
  }
  if (Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return null;
}

function cleanCustomerText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCustomerDisplayName(customer) {
  const firstName = cleanCustomerText(customer?.firstName);
  const lastName = cleanCustomerText(customer?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (fullName) return fullName;

  const displayName = cleanCustomerText(customer?.displayName);
  const email = cleanCustomerText(customer?.emailAddress?.emailAddress);
  return displayName && displayName.toLocaleLowerCase() !== email.toLocaleLowerCase()
    ? displayName
    : '';
}

async function fetchJson(url, fetchImpl) {
  requireHttpsUrl(url);
  let response;
  try {
    response = await fetchWithTimeout({
      url,
      fetchImpl,
      options: {
        headers: { Accept: 'application/json', 'User-Agent': 'ROCKY035-Shopify/1.0' },
      },
    });
  } catch (error) {
    throw new CustomerAccountError(
      error?.name === 'AbortError'
        ? 'Shopify ha superado el tiempo de espera.'
        : 'No se ha podido conectar con Shopify.',
      502,
      error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new CustomerAccountError('No se ha podido descubrir la configuración de cuenta.');
  }
  return payload;
}

function parseJwt(token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 64_000) {
    throw new CustomerAccountError('ID token no válido.', 401, 'INVALID_ID_TOKEN');
  }
  const parts = token.split('.');
  if (parts?.length !== 3) {
    throw new CustomerAccountError('ID token no válido.', 401, 'INVALID_ID_TOKEN');
  }
  try {
    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
      payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2], 'base64url'),
    };
  } catch {
    throw new CustomerAccountError('ID token no válido.', 401, 'INVALID_ID_TOKEN');
  }
}

async function verifyIdToken({ token, nonce, clientId, discovery, fetchImpl, clock, logger }) {
  const parsed = parseJwt(token);
  if (!['ES256', 'RS256'].includes(parsed.header.alg) || !parsed.header.kid) {
    throw new CustomerAccountError('Algoritmo de ID token no permitido.', 401, 'INVALID_ID_TOKEN');
  }
  const jwks = await fetchJson(discovery.jwks_uri, fetchImpl);
  const jwk = jwks.keys?.find(
    (candidate) =>
      candidate.kid === parsed.header.kid &&
      (!candidate.alg || candidate.alg === parsed.header.alg) &&
      (!candidate.use || candidate.use === 'sig') &&
      (!candidate.key_ops || candidate.key_ops.includes('verify'))
  );
  if (!jwk) {
    throw new CustomerAccountError(
      'No se encuentra la clave del ID token.',
      401,
      'INVALID_ID_TOKEN'
    );
  }
  let verified = false;
  try {
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    verified = crypto.verify(
      'sha256',
      Buffer.from(parsed.signingInput, 'utf8'),
      parsed.header.alg === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key,
      parsed.signature
    );
  } catch {
    throw new CustomerAccountError('Firma de ID token no válida.', 401, 'INVALID_ID_TOKEN');
  }
  const audiences = Array.isArray(parsed.payload.aud) ? parsed.payload.aud : [parsed.payload.aud];
  const nowSeconds = Math.floor(clock() / 1_000);
  const audienceIsValid =
    audiences.length > 0 &&
    audiences.every((audience) => typeof audience === 'string') &&
    audiences.includes(clientId) &&
    (audiences.length === 1 || parsed.payload.azp === clientId);
  const expirationIsValid =
    Number.isSafeInteger(parsed.payload.exp) && parsed.payload.exp > nowSeconds - 60;
  const issuedAtIsValid =
    Number.isSafeInteger(parsed.payload.iat) && parsed.payload.iat <= nowSeconds + 60;
  const notBeforeIsValid =
    parsed.payload.nbf === undefined ||
    (Number.isSafeInteger(parsed.payload.nbf) && parsed.payload.nbf <= nowSeconds + 60);
  const customerSubject = normalizeCustomerSubject(parsed.payload.sub);
  const validationChecks = {
    signature: verified,
    issuer: parsed.payload.iss === discovery.issuer,
    audience: audienceIsValid,
    expiration: expirationIsValid,
    issuedAt: issuedAtIsValid,
    notBefore: notBeforeIsValid,
    nonce: parsed.payload.nonce === nonce,
    subject: customerSubject !== null,
  };
  const failedChecks = Object.entries(validationChecks)
    .filter(([, isValid]) => !isValid)
    .map(([name]) => name);
  if (failedChecks.length > 0) {
    logger?.error?.('Shopify ID token claim validation failed', {
      failedChecks,
      audienceCount: audiences.length,
      audienceType: Array.isArray(parsed.payload.aud) ? 'array' : typeof parsed.payload.aud,
      hasAuthorizedParty: parsed.payload.azp !== undefined,
      expirationType: typeof parsed.payload.exp,
      issuedAtType: typeof parsed.payload.iat,
      hasNotBefore: parsed.payload.nbf !== undefined,
      notBeforeType: typeof parsed.payload.nbf,
      subjectType: typeof parsed.payload.sub,
    });
    throw new CustomerAccountError(
      'Las claims del ID token no son válidas.',
      401,
      'INVALID_ID_TOKEN'
    );
  }
  return { ...parsed.payload, sub: customerSubject };
}

export function createCustomerAccountClient({
  config,
  store,
  fetchImpl = globalThis.fetch,
  clock = () => Date.now(),
  logger = null,
}) {
  let openIdDiscovery = null;
  let apiDiscovery = null;

  async function getOpenIdDiscovery() {
    if (!openIdDiscovery) {
      openIdDiscovery = validateOpenIdDiscovery(
        await fetchJson(`https://${config.storeDomain}/.well-known/openid-configuration`, fetchImpl)
      );
    }
    return openIdDiscovery;
  }

  async function getApiDiscovery() {
    if (!apiDiscovery) {
      apiDiscovery = await fetchJson(
        `https://${config.storeDomain}/.well-known/customer-account-api`,
        fetchImpl
      );
    }
    if (!apiDiscovery.graphql_api) {
      throw new CustomerAccountError('Shopify no ha devuelto el endpoint Customer Account.');
    }
    requireHttpsUrl(apiDiscovery.graphql_api);
    return apiDiscovery;
  }

  async function exchangeToken(discovery, body) {
    let response;
    try {
      response = await fetchWithTimeout({
        url: discovery.token_endpoint,
        fetchImpl,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: config.publicOrigin,
            'User-Agent': 'ROCKY035-Shopify/1.0',
          },
          body: new URLSearchParams(body),
        },
      });
    } catch (error) {
      throw new CustomerAccountError(
        error?.name === 'AbortError'
          ? 'Shopify ha superado el tiempo de espera.'
          : 'No se ha podido conectar con Shopify.',
        502,
        error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
      );
    }
    const token = await response.json().catch(() => null);
    if (
      !response.ok ||
      !isOpaqueToken(token?.access_token) ||
      !isOpaqueToken(token?.refresh_token) ||
      !isValidTokenLifetime(token?.expires_in)
    ) {
      throw new CustomerAccountError(
        'Shopify ha rechazado el intercambio OAuth.',
        401,
        'TOKEN_ERROR'
      );
    }
    return token;
  }

  async function refreshToken(tokenId, record) {
    const discovery = await getOpenIdDiscovery();
    const refreshed = await exchangeToken(discovery, {
      grant_type: 'refresh_token',
      client_id: config.customerClientId,
      refresh_token: record.refreshToken,
    });
    const next = {
      ...record,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      idToken: refreshed.id_token || record.idToken,
      expiresAt: clock() + refreshed.expires_in * 1_000,
      updatedAt: clock(),
    };
    await store.set('customerTokens', tokenId, next, {
      expiresAt: clock() + CUSTOMER_TOKEN_RETENTION_MS,
    });
    return next;
  }

  async function getUsableToken(tokenId) {
    const record = await store.get('customerTokens', tokenId);
    if (!record) throw new CustomerAccountError('Sesión de cliente no válida.', 401, 'NO_SESSION');
    return record.expiresAt - 30_000 > clock() ? record : refreshToken(tokenId, record);
  }

  return {
    async beginAuthentication({ returnPath = '/', sessionBinding } = {}) {
      const safeReturnPath = normalizeReturnPath(returnPath, config.publicOrigin);
      if (!safeReturnPath) {
        throw new CustomerAccountError('Ruta de retorno no permitida.', 400, 'INVALID_RETURN_PATH');
      }
      const sessionBindingHash = requireSessionBinding(sessionBinding);
      const discovery = await getOpenIdDiscovery();
      const state = crypto.randomBytes(24).toString('base64url');
      const nonce = crypto.randomBytes(24).toString('base64url');
      const verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      await store.set(
        'oauthTransactions',
        hash(state),
        { nonce, verifier, returnPath: safeReturnPath, sessionBindingHash },
        { expiresAt: clock() + OAUTH_TRANSACTION_MS }
      );

      const url = new URL(discovery.authorization_endpoint);
      url.searchParams.set('scope', config.customerScopes);
      url.searchParams.set('client_id', config.customerClientId);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', `${config.publicOrigin}/api/shopify/account/callback`);
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      return url.toString();
    },

    async completeAuthentication({ state, code, sessionBinding }) {
      if (!state || !code) {
        throw new CustomerAccountError('Callback OAuth incompleto.', 400, 'INVALID_CALLBACK');
      }
      const transaction = await store.consume('oauthTransactions', hash(state));
      if (!transaction) {
        throw new CustomerAccountError(
          'Estado OAuth inválido o reutilizado.',
          400,
          'INVALID_STATE'
        );
      }
      const sessionBindingHash = requireSessionBinding(sessionBinding);
      const expectedBinding = Buffer.from(transaction.sessionBindingHash || '', 'utf8');
      const actualBinding = Buffer.from(sessionBindingHash, 'utf8');
      if (
        expectedBinding.length !== actualBinding.length ||
        !crypto.timingSafeEqual(expectedBinding, actualBinding)
      ) {
        throw new CustomerAccountError(
          'Estado OAuth inválido o reutilizado.',
          400,
          'INVALID_STATE'
        );
      }
      const discovery = await getOpenIdDiscovery();
      const token = await exchangeToken(discovery, {
        grant_type: 'authorization_code',
        client_id: config.customerClientId,
        redirect_uri: `${config.publicOrigin}/api/shopify/account/callback`,
        code,
        code_verifier: transaction.verifier,
      });
      if (!token.id_token) {
        throw new CustomerAccountError(
          'Shopify no ha devuelto un ID token.',
          401,
          'MISSING_ID_TOKEN'
        );
      }
      const claims = await verifyIdToken({
        token: token.id_token,
        nonce: transaction.nonce,
        clientId: config.customerClientId,
        discovery,
        fetchImpl,
        clock,
        logger,
      });
      const tokenId = crypto.randomBytes(24).toString('base64url');
      const record = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        idToken: token.id_token,
        expiresAt: clock() + token.expires_in * 1_000,
        customerSubject: claims.sub,
        createdAt: clock(),
        updatedAt: clock(),
      };
      await store.set('customerTokens', tokenId, record, {
        expiresAt: clock() + CUSTOMER_TOKEN_RETENTION_MS,
      });
      return {
        tokenId,
        customerSubject: claims.sub,
        returnPath: transaction.returnPath,
      };
    },

    async getCustomerProfile(tokenId) {
      const token = await getUsableToken(tokenId);
      const discovery = await getApiDiscovery();
      const { data } = await requestShopifyGraphql({
        endpoint: discovery.graphql_api,
        query: `query RockyCustomer { customer { id displayName firstName lastName emailAddress { emailAddress } } }`,
        headers: { Authorization: token.accessToken },
        fetchImpl,
      });
      const customer = data.customer;
      return {
        id: customer.id,
        displayName: getCustomerDisplayName(customer),
        firstName: cleanCustomerText(customer.firstName),
        lastName: cleanCustomerText(customer.lastName),
        email: cleanCustomerText(customer.emailAddress?.emailAddress),
      };
    },

    async createLogoutUrl(tokenId) {
      const token = await store.get('customerTokens', tokenId);
      if (!token) return null;
      const discovery = await getOpenIdDiscovery();
      if (!discovery.end_session_endpoint) return null;
      const url = new URL(discovery.end_session_endpoint);
      url.searchParams.set('id_token_hint', token.idToken);
      url.searchParams.set('post_logout_redirect_uri', config.publicOrigin);
      return url.toString();
    },

    async deleteToken(tokenId) {
      if (tokenId) await store.delete('customerTokens', tokenId);
    },
  };
}
