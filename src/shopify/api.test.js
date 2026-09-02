import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addCartLine,
  beginCheckout,
  listProducts,
  StorefrontApiError,
  updateCartLine,
} from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Shopify browser API', () => {
  it('requests only the eight Shopify products shown in the storefront', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ products: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listProducts();

    expect(fetchMock).toHaveBeenCalledWith('/api/shopify/products?first=8', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  });

  it('sends only variant, quantity and an idempotency key when adding a line', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ cart: { totalQuantity: 1, lines: [] }, warnings: [] })
    );
    vi.stubGlobal('fetch', fetchMock);

    await addCartLine({
      variantId: 'gid://shopify/ProductVariant/42',
      quantity: 2,
      operationId: 'operation-12345',
      price: '0.01',
      title: 'Precio manipulado',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/shopify/cart/lines', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantId: 'gid://shopify/ProductVariant/42',
        quantity: 2,
        operationId: 'operation-12345',
      }),
    });
  });

  it('uses line IDs for updates and does not accept commerce fields from the UI', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ cart: null }));
    vi.stubGlobal('fetch', fetchMock);

    await updateCartLine({
      lineId: 'gid://shopify/CartLine/7',
      quantity: 3,
      operationId: 'operation-67890',
      subtotal: '0.01',
    });

    const options = fetchMock.mock.calls[0][1];
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({
      lineId: 'gid://shopify/CartLine/7',
      quantity: 3,
      operationId: 'operation-67890',
    });
  });

  it('surfaces a safe server error and validates checkout URLs defensively', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'El carrito está vacío.', code: 'EMPTY_CART' }, 409)
      )
    );

    await expect(beginCheckout()).rejects.toMatchObject({
      name: 'StorefrontApiError',
      message: 'El carrito está vacío.',
      status: 409,
      code: 'EMPTY_CART',
    });
    expect(StorefrontApiError.prototype).toBeInstanceOf(Error);
  });
});
