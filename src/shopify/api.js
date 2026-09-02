const SHOPIFY_API_ROOT = '/api/shopify';
const STOREFRONT_PRODUCT_LIMIT = 8;

export class StorefrontApiError extends Error {
  constructor(message, { status = 500, code = 'STOREFRONT_REQUEST_FAILED' } = {}) {
    super(message);
    this.name = 'StorefrontApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${SHOPIFY_API_ROOT}${path}`, options);
  } catch {
    throw new StorefrontApiError('No se ha podido conectar con la tienda.', {
      status: 503,
      code: 'STOREFRONT_UNAVAILABLE',
    });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new StorefrontApiError(
      data?.message || 'La tienda no ha podido completar la operación.',
      { status: response.status, code: data?.code }
    );
  }
  return data;
}

export function createOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `operation-${Date.now().toString(36)}-${random}`;
}

export function getShopifyStatus() {
  return requestJson('/status');
}

export function listProducts() {
  return requestJson(`/products?first=${STOREFRONT_PRODUCT_LIMIT}`);
}

export function getCart() {
  return requestJson('/cart');
}

export function addCartLine({ variantId, quantity = 1, operationId = createOperationId() }) {
  return requestJson('/cart/lines', {
    method: 'POST',
    body: { variantId, quantity, operationId },
  });
}

export function updateCartLine({ lineId, quantity, operationId = createOperationId() }) {
  return requestJson('/cart/lines', {
    method: 'PATCH',
    body: { lineId, quantity, operationId },
  });
}

export function removeCartLine({ lineId, operationId = createOperationId() }) {
  return requestJson('/cart/lines', {
    method: 'DELETE',
    body: { lineId, operationId },
  });
}

export function beginCheckout() {
  return requestJson('/checkout', { method: 'POST', body: {} });
}

export function getCustomerAccount() {
  return requestJson('/account');
}

export function logoutCustomerAccount() {
  return requestJson('/account/logout', { method: 'POST', body: {} });
}

export function getCrewProfile() {
  return requestJson('/account/crew');
}

export function equipCrewReward(rewardId) {
  return requestJson('/account/crew/avatar', {
    method: 'PATCH',
    body: { rewardId },
  });
}

export function redeemCrewReward({ rewardId, operationId = createOperationId() }) {
  return requestJson('/account/crew/redeem', {
    method: 'POST',
    body: { rewardId, operationId },
  });
}
