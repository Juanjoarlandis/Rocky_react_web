export class ShopifyGraphqlError extends Error {
  constructor(message, { status = 502, code = 'SHOPIFY_ERROR', details = [] } = {}) {
    super(message);
    this.name = 'ShopifyGraphqlError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function fetchWithTimeout({
  url,
  options = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestShopifyGraphql({
  endpoint,
  query,
  variables = {},
  headers = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
}) {
  try {
    const response = await fetchWithTimeout({
      url: endpoint,
      fetchImpl,
      timeoutMs,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query, variables }),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ShopifyGraphqlError('Shopify no ha aceptado la petición.', {
        status: [401, 403, 429].includes(response.status) ? response.status : 502,
        code:
          response.status === 429
            ? 'THROTTLED'
            : response.status === 401
              ? 'UNAUTHENTICATED'
              : response.status === 403
                ? 'ACCESS_DENIED'
                : 'HTTP_ERROR',
      });
    }
    if (!payload || !payload.data || payload.errors?.length) {
      const code = payload?.errors?.[0]?.extensions?.code || 'GRAPHQL_ERROR';
      throw new ShopifyGraphqlError('Shopify ha devuelto un error GraphQL.', {
        status: code === 'THROTTLED' ? 429 : 502,
        code,
        details: payload?.errors || [],
      });
    }
    return { data: payload.data, extensions: payload.extensions || null };
  } catch (error) {
    if (error instanceof ShopifyGraphqlError) throw error;
    throw new ShopifyGraphqlError(
      error?.name === 'AbortError'
        ? 'Shopify ha superado el tiempo de espera.'
        : 'No se ha podido conectar con Shopify.',
      { code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR' }
    );
  }
}

export function assertMutationSucceeded(payload) {
  if (!payload) {
    throw new ShopifyGraphqlError('Shopify no ha devuelto el resultado de la mutación.');
  }
  if (payload.userErrors?.length) {
    throw new ShopifyGraphqlError('Shopify ha rechazado la operación.', {
      status: 422,
      code: 'USER_ERROR',
      details: payload.userErrors,
    });
  }
  if (!payload.cart) {
    throw new ShopifyGraphqlError('Shopify no ha devuelto un carrito.', {
      code: 'MISSING_CART',
    });
  }
  return payload;
}
