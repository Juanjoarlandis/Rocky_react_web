import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStorefront } from './useStorefront.js';

const api = vi.hoisted(() => ({
  addCartLine: vi.fn(),
  beginCheckout: vi.fn(),
  getCart: vi.fn(),
  getCrewProfile: vi.fn(),
  getCustomerAccount: vi.fn(),
  getShopifyStatus: vi.fn(),
  listProducts: vi.fn(),
  logoutCustomerAccount: vi.fn(),
  removeCartLine: vi.fn(),
  updateCartLine: vi.fn(),
}));

vi.mock('./api.js', () => api);

const demoProducts = [{ id: 1, title: 'Demo', price: '??', image: '/demo.jpg' }];
const previewProducts = [
  {
    id: 'rocky-airwave',
    handle: 'rocky-airwave',
    title: 'Airwave',
    isPreview: true,
  },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

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
  it('keeps products empty until the storefront mode is known', async () => {
    const status = deferred();
    api.getShopifyStatus.mockReturnValue(status.promise);

    const { result } = renderHook(() => useStorefront({ demoProducts }));

    expect(result.current.mode).toBe('checking');
    expect(result.current.products).toEqual([]);

    await act(async () => {
      status.resolve({
        mode: 'demo',
        capabilities: {
          catalog: false,
          cart: false,
          customerAccounts: false,
          admin: false,
          webhooks: false,
        },
      });
      await status.promise;
    });
    await waitFor(() => expect(result.current.mode).toBe('demo'));
    expect(result.current.products).toEqual(demoProducts);
  });

  it('keeps the local preview catalog and blocks checkout in demo mode', async () => {
    const { result } = renderHook(() => useStorefront({ demoProducts }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('demo');
    expect(result.current.products).toEqual(demoProducts);
    expect(result.current.canCheckout).toBe(false);

    await act(() => result.current.addToCart(demoProducts[0]));
    expect(result.current.cartItems).toMatchObject([{ id: 1, title: 'Demo', quantity: 1 }]);
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
      result.current.addToCart(result.current.products[0], 'gid://shopify/ProductVariant/2')
    );

    expect(api.addCartLine).toHaveBeenCalledWith({
      variantId: 'gid://shopify/ProductVariant/2',
      quantity: 1,
    });
    expect(result.current.totalItems).toBe(1);
  });

  it('loads the equipped Crew avatar for a signed-in customer and keeps it in sync', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: false,
        customerAccounts: true,
        admin: false,
        webhooks: false,
      },
    });
    api.listProducts.mockResolvedValue({ products: [] });
    api.getCustomerAccount.mockResolvedValue({
      loggedIn: true,
      customer: { displayName: 'Juanjo' },
    });
    api.getCrewProfile.mockResolvedValue({
      profile: { equippedAvatarId: 'dormido-head' },
    });

    const { result } = renderHook(() => useStorefront({ demoProducts }));

    await waitFor(() => expect(result.current.crewAvatarId).toBe('dormido-head'));
    expect(api.getCrewProfile).toHaveBeenCalledOnce();

    act(() => result.current.updateCrewAvatar('colgado-head'));
    expect(result.current.crewAvatarId).toBe('colgado-head');
  });

  it('uses only the verified Shopify catalog when Shopify mode is active', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: true,
        customerAccounts: false,
        admin: false,
        webhooks: false,
      },
    });
    api.listProducts.mockResolvedValue({
      products: [
        {
          id: 'gid://shopify/Product/1',
          handle: 'rocky-tee',
          title: 'Rocky Tee',
          variants: [],
        },
        {
          id: 'gid://shopify/Product/2',
          handle: 'rocky-airwave',
          title: 'Airwave publicada',
          variants: [],
        },
      ],
    });
    api.getCart.mockResolvedValue({ cart: null });

    const { result } = renderHook(() =>
      useStorefront({
        demoProducts,
        previewProducts,
      })
    );

    await waitFor(() => expect(result.current.mode).toBe('shopify'));
    expect(result.current.products.map((product) => product.handle)).toEqual([
      'rocky-tee',
      'rocky-airwave',
    ]);
    expect(result.current.products[1].title).toBe('Airwave publicada');
    expect(result.current.products[1]).not.toHaveProperty('isPreview');
  });

  it('keeps cart and account fail-closed and enables each only after its own initial read', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: true,
        customerAccounts: true,
        admin: false,
        webhooks: false,
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
    const cart = deferred();
    const account = deferred();
    api.getCart.mockReturnValue(cart.promise);
    api.getCustomerAccount.mockReturnValue(account.promise);
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

    await waitFor(() => expect(result.current.products[0]?.handle).toBe('rocky-tee'));
    expect(result.current.capabilities.cart).toBe(false);
    expect(result.current.capabilities.customerAccounts).toBe(false);
    expect(result.current.canCheckout).toBe(false);

    await expect(
      result.current.addToCart(result.current.products[0], 'gid://shopify/ProductVariant/2')
    ).rejects.toThrow('variante disponible');
    expect(api.addCartLine).not.toHaveBeenCalled();

    await act(async () => {
      cart.resolve({ cart: null });
      await cart.promise;
    });
    await waitFor(() => expect(result.current.capabilities.cart).toBe(true));
    expect(result.current.capabilities.customerAccounts).toBe(false);

    await act(() =>
      result.current.addToCart(result.current.products[0], 'gid://shopify/ProductVariant/2')
    );
    expect(result.current.totalItems).toBe(1);

    await act(async () => {
      account.reject(new Error('Cuenta no disponible'));
      await account.promise.catch(() => {});
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.capabilities.cart).toBe(true);
    expect(result.current.capabilities.customerAccounts).toBe(false);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.error).toContain('la cuenta');
  });

  it('fails closed instead of installing demo products when the Shopify catalog fails', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: true,
        customerAccounts: false,
        admin: false,
        webhooks: false,
      },
    });
    api.listProducts.mockRejectedValue(new Error('Catálogo no disponible'));
    api.getCart.mockResolvedValue({ cart: null });

    const { result } = renderHook(() => useStorefront({ demoProducts }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('shopify');
    expect(result.current.products).toEqual([]);
    expect(result.current.capabilities.cart).toBe(false);
    expect(result.current.error).toContain('catálogo vivo');
  });

  it('retains a verified Shopify catalog when cart and account loading fail', async () => {
    api.getShopifyStatus.mockResolvedValue({
      mode: 'shopify',
      capabilities: {
        catalog: true,
        cart: true,
        customerAccounts: true,
        admin: false,
        webhooks: false,
      },
    });
    api.listProducts.mockResolvedValue({
      products: [
        {
          id: 'gid://shopify/Product/1',
          handle: 'rocky-tee',
          title: 'Rocky Tee',
          variants: [],
        },
      ],
    });
    api.getCart.mockRejectedValue(new Error('Carrito no disponible'));
    api.getCustomerAccount.mockRejectedValue(new Error('Cuenta no disponible'));

    const { result } = renderHook(() => useStorefront({ demoProducts }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('shopify');
    expect(result.current.products.map((product) => product.handle)).toEqual(['rocky-tee']);
    expect(result.current.capabilities.cart).toBe(false);
    expect(result.current.capabilities.customerAccounts).toBe(false);
    expect(result.current.error).toContain('carrito y la cuenta');
  });
});
