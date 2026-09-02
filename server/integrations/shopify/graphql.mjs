import { ShopifyGraphqlError } from '../../http/errors.mjs';
import { fetchJson } from '../../lib/fetch-json.mjs';

export { ShopifyGraphqlError };

const TRANSPORT_MESSAGES = Object.freeze({
  TIMEOUT: 'Shopify ha superado el tiempo de espera.',
  NETWORK_ERROR: 'No se ha podido conectar con Shopify.',
});

// Traduce un fallo de transporte (timeout o red) al error de dominio de Shopify.
export function shopifyTransportError(error) {
  const code = error?.code === 'TIMEOUT' ? 'TIMEOUT' : 'NETWORK_ERROR';
  return new ShopifyGraphqlError(TRANSPORT_MESSAGES[code], { code, cause: error });
}

function httpErrorCode(status) {
  if (status === 429) return 'THROTTLED';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'ACCESS_DENIED';
  return 'HTTP_ERROR';
}

export async function requestShopifyGraphql({
  endpoint,
  query,
  variables = {},
  headers = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
}) {
  let response;
  let payload;
  try {
    ({ response, payload } = await fetchJson({
      url: endpoint,
      fetchImpl,
      timeoutMs,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query, variables }),
      },
    }));
  } catch (error) {
    throw shopifyTransportError(error);
  }
  if (!response.ok) {
    throw new ShopifyGraphqlError('Shopify no ha aceptado la petición.', {
      status: [401, 403, 429].includes(response.status) ? response.status : 502,
      code: httpErrorCode(response.status),
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
