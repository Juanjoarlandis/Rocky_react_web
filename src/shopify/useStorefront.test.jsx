import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStorefront } from './useStorefront.js';

const api = vi.hoisted(() => ({
  addCartLine: vi.fn(),
  beginCheckout: vi.fn(),
  getCart: vi.fn(),
  getCustomerAccount: vi.fn(),
  getShopifyStatus: vi.fn(),
  listProducts: vi.fn(),
  logoutCustomerAccount: vi.fn(),
  removeCartLine: vi.fn(),
  updateCartLine: vi.fn(),
}));

vi.mock('./api.js', () => api);

const demoProducts = [{ id: 1, title: 'Demo', price: '??', image: '/demo.jpg' }];

beforeEach(() => {
  vi.clearAllMocks();
  api.getShopifyStatus.mockResolvedValue({
    mode: 'demo',
    capabilities: {
      catalog: false,
      cart: false,
      customerAccounts: false,
      admin: false,
      webhooks: false,
    },
  });
});

describe('useStorefront', () => {
  it('keeps the local preview catalog and blocks checkout in demo mode', async () => {
    const { result } = renderHook(() => useStorefront({ demoProducts }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('demo');
    expect(result.current.products).toEqual(demoProducts);
    expect(result.current.canCheckout).toBe(false);

    await act(() => result.current.addToCart(demoProducts[0]));
    expect(result.current.cartItems).toMatchObject([
      { id: 1, title: 'Demo', quantity: 1 },
    ]);
    expect(api.addCartLine).not.toHaveBeenCalled();
  });

  it('loads Shopify catalog/cart/account and sends only the chosen variant ID', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: true,
        customerAccounts: true,
        admin: false,
        webhooks: true,
      },
    });
    api.listProducts.mockResolvedValue({
      products: [
        {
          id: 'gid://shopify/Product/1',
          handle: 'rocky-tee',
          title: 'Rocky Tee',
          variants: [
            {
              id: 'gid://shopify/ProductVariant/2',
              title: 'M',
              availableForSale: true,
              price: { amount: '35.00', currencyCode: 'EUR' },
            },
          ],
        },
      ],
    });
    api.getCart.mockResolvedValue({ cart: null });
    api.getCustomerAccount.mockResolvedValue({ loggedIn: false, customer: null });
    api.addCartLine.mockResolvedValue({
      cart: {
        totalQuantity: 1,
        lines: [
          {
            id: 'gid://shopify/CartLine/1',
            quantity: 1,
            variant: {
              id: 'gid://shopify/ProductVariant/2',
              title: 'M',
              product: { handle: 'rocky-tee', title: 'Rocky Tee' },
              image: null,
              price: { amount: '35.00', currencyCode: 'EUR' },
            },
          },
        ],
        cost: { totalAmount: { amount: '35.00', currencyCode: 'EUR' } },
      },
    });

    const { result } = renderHook(() => useStorefront({ demoProducts }));
    await waitFor(() => expect(result.current.mode).toBe('shopify'));

    expect(result.current.products[0].id).toBe('rocky-tee');
    expect(result.current.canCheckout).toBe(true);

    await act(() =>
      result.current.addToCart(
        result.current.products[0],
        'gid://shopify/ProductVariant/2'
      )
    );

    expect(api.addCartLine).toHaveBeenCalledWith({
      variantId: 'gid://shopify/ProductVariant/2',
      quantity: 1,
    });
    expect(result.current.totalItems).toBe(1);
  });
});
