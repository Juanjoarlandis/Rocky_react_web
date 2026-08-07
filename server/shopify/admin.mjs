import {
  fetchWithTimeout,
  requestShopifyGraphql,
  ShopifyGraphqlError,
} from './graphql.mjs';

const MAX_TOKEN_LIFETIME_SECONDS = 365 * 24 * 60 * 60;

function isValidTokenResponse(payload) {
  return (
    typeof payload?.access_token === 'string' &&
    payload.access_token.length > 0 &&
    payload.access_token.length <= 64_000 &&
    Number.isSafeInteger(payload.expires_in) &&
    payload.expires_in > 0 &&
    payload.expires_in <= MAX_TOKEN_LIFETIME_SECONDS
  );
}

export function createAdminClient({ config, fetchImpl = globalThis.fetch, clock = () => Date.now() }) {
  let tokenRecord = null;
  let tokenRequest = null;

  async function requestToken() {
    let response;
    try {
      response = await fetchWithTimeout({
        url: `https://${config.storeDomain}/admin/oauth/access_token`,
        fetchImpl,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId,
            client_secret: config.clientSecret,
          }),
        },
      });
    } catch (error) {
      throw new ShopifyGraphqlError(
        error?.name === 'AbortError'
          ? 'Shopify ha superado el tiempo de espera.'
          : 'No se ha podido conectar con Shopify.',
        { code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR' }
      );
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || !isValidTokenResponse(payload)) {
      throw new ShopifyGraphqlError('No se ha podido obtener el token Admin.', {
        status: response.status === 401 ? 401 : 502,
        code: 'ADMIN_TOKEN_ERROR',
      });
    }
    return {
      accessToken: payload.access_token,
      scopes: payload.scope || '',
      expiresAt: clock() + payload.expires_in * 1_000,
    };
  }

  async function getToken() {
    if (tokenRecord && tokenRecord.expiresAt - 60_000 > clock()) {
      return tokenRecord.accessToken;
    }
    if (!tokenRequest) {
      tokenRequest = requestToken()
        .then((record) => {
          tokenRecord = record;
          return record;
        })
        .finally(() => {
          tokenRequest = null;
        });
    }
    return (await tokenRequest).accessToken;
  }

  async function query(document, variables = {}, canRefresh = true) {
    const accessToken = await getToken();
    try {
      const { data } = await requestShopifyGraphql({
        endpoint: `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`,
        query: document,
        variables,
        headers: { 'X-Shopify-Access-Token': accessToken },
        fetchImpl,
      });
      return data;
    } catch (error) {
      if (canRefresh && error instanceof ShopifyGraphqlError && error.status === 401) {
        tokenRecord = null;
        return query(document, variables, false);
      }
      throw error;
    }
  }

  return { getToken, query };
}
