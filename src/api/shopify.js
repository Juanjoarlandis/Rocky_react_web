import { ApiError, requestJson } from './http.js';

const SHOPIFY_API_ROOT = '/api/shopify';
const STOREFRONT_PRODUCT_LIMIT = 8;

// Nombre histórico del error de la tienda; hereda del error genérico del BFF.
export class StorefrontApiError extends ApiError {
  constructor(message, options) {
    super(message, options);
    this.name = 'StorefrontApiError';
  }
}

async function shopifyJson(path, options) {
  try {
    return await requestJson(`${SHOPIFY_API_ROOT}${path}`, options);
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.code === 'NETWORK_ERROR' ? 503 : error.status;
      const code = error.code === 'NETWORK_ERROR' ? 'STOREFRONT_UNAVAILABLE' : error.code;
      throw new StorefrontApiError(error.message, { status, code, body: error.body });
    }
    throw error;
  }
}

export function createOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `operation-${Date.now().toString(36)}-${random}`;
}

export function getShopifyStatus() {
  return shopifyJson('/status');
}

export function listProducts() {
  return shopifyJson(`/products?first=${STOREFRONT_PRODUCT_LIMIT}`);
}

export function getCart() {
  return shopifyJson('/cart');
}

export function addCartLine({ variantId, quantity = 1, operationId = createOperationId() }) {
  return shopifyJson('/cart/lines', {
    method: 'POST',
    body: { variantId, quantity, operationId },
  });
}

export function updateCartLine({ lineId, quantity, operationId = createOperationId() }) {
  return shopifyJson('/cart/lines', {
    method: 'PATCH',
    body: { lineId, quantity, operationId },
  });
}

export function removeCartLine({ lineId, operationId = createOperationId() }) {
  return shopifyJson('/cart/lines', {
    method: 'DELETE',
    body: { lineId, operationId },
  });
}

export function beginCheckout() {
  return shopifyJson('/checkout', { method: 'POST', body: {} });
}

export function getCustomerAccount() {
  return shopifyJson('/account');
}

export function logoutCustomerAccount() {
  return shopifyJson('/account/logout', { method: 'POST', body: {} });
}

export function getCrewProfile() {
  return shopifyJson('/account/crew');
}

export function equipCrewReward(rewardId) {
  return shopifyJson('/account/crew/avatar', {
    method: 'PATCH',
    body: { rewardId },
  });
}

export function redeemCrewReward({ rewardId, operationId = createOperationId() }) {
  return shopifyJson('/account/crew/redeem', {
    method: 'POST',
    body: { rewardId, operationId },
  });
}
