import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCart } from './useCart.js';

const api = vi.hoisted(() => ({
  addCartLine: vi.fn(),
  removeCartLine: vi.fn(),
  updateCartLine: vi.fn(),
  beginCheckout: vi.fn(),
}));
vi.mock('../../api/shopify.js', () => api);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function serverCart(quantity) {
  return {
    lines: quantity
      ? [
          {
            id: 'line-1',
            quantity,
            variant: {
              id: 'v1',
              title: 'M',
              availableForSale: true,
              product: { handle: 'tee', title: 'Tee' },
              price: { amount: '35', currencyCode: 'EUR' },
            },
          },
        ]
      : [],
    totalQuantity: quantity,
  };
}

const product = { id: 'tee', title: 'Tee', price: '35' };
const item = { id: 'line-1', lineId: 'line-1', quantity: 1 };
beforeEach(() => vi.resetAllMocks());

describe('cart operation boundaries', () => {
  it.each(['demo', 'shopify'])('applies both increments from the same item in %s', async (mode) => {
    api.updateCartLine.mockImplementation(({ quantity }) =>
      Promise.resolve({ cart: serverCart(quantity) })
    );
    const { result } = renderHook(() => useCart({ mode, cartEnabled: true }));
    if (mode === 'shopify') act(() => result.current.applyServerCart(serverCart(1)));
    else await act(() => result.current.addToCart(product));
    const originalItem = result.current.items[0];
    await act(async () => {
      await Promise.all([
        result.current.incrementQuantity(originalItem),
        result.current.incrementQuantity(originalItem),
      ]);
    });
    expect(result.current.items[0].quantity).toBe(3);
    if (mode === 'shopify')
      expect(api.updateCartLine.mock.calls.map(([input]) => input.quantity)).toEqual([2, 3]);
    const updatedItem = result.current.items[0];
    await act(async () => {
      await Promise.all([
        result.current.decrementQuantity(updatedItem),
        result.current.decrementQuantity(updatedItem),
      ]);
    });
    expect(result.current.items[0].quantity).toBe(1);
  });

  it('removes a line when queued decrements reach zero', async () => {
    api.updateCartLine.mockResolvedValue({ cart: serverCart(1) });
    api.removeCartLine.mockResolvedValue({ cart: serverCart(0) });
    const { result } = renderHook(() => useCart({ mode: 'shopify', cartEnabled: true }));
    act(() => result.current.applyServerCart(serverCart(2)));
    const originalItem = result.current.items[0];
    await act(async () => {
      await Promise.all([
        result.current.decrementQuantity(originalItem),
        result.current.decrementQuantity(originalItem),
      ]);
    });
    expect(api.updateCartLine).toHaveBeenCalledWith({ lineId: 'line-1', quantity: 1 });
    expect(api.removeCartLine).toHaveBeenCalledWith({ lineId: 'line-1' });
    expect(result.current.items).toEqual([]);
  });
  it.each(['checking', 'unavailable', 'shopify'])(
    'blocks mutations in %s without cart capability',
    async (mode) => {
      const { result } = renderHook(() => useCart({ mode, cartEnabled: false }));
      await act(async () => {
        await expect(result.current.addToCart(product, 'v1')).rejects.toThrow();
        await expect(result.current.removeFromCart(item)).rejects.toThrow();
        await expect(result.current.incrementQuantity(item)).rejects.toThrow();
        await expect(result.current.decrementQuantity(item)).rejects.toThrow();
      });
      expect(result.current.items).toEqual([]);
      Object.values(api).forEach((method) => expect(method).not.toHaveBeenCalled());
    }
  );

  it('runs additions in order, including queued operations in busy', async () => {
    const first = deferred();
    const second = deferred();
    api.addCartLine.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useCart({ mode: 'shopify', cartEnabled: true }));
    let a;
    let b;
    await act(async () => {
      a = result.current.addToCart(product, 'v1');
      b = result.current.addToCart(product, 'v1');
    });
    expect(api.addCartLine).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(true);
    await act(async () => {
      first.resolve({ cart: serverCart(1) });
      await a;
    });
    expect(api.addCartLine).toHaveBeenCalledTimes(2);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.busy).toBe(true);
    await act(async () => {
      second.resolve({ cart: serverCart(2) });
      await b;
    });
    expect(result.current.totalItems).toBe(2);
    expect(result.current.busy).toBe(false);
  });

  it('continues queued updates and checkout after a rejected addition', async () => {
    const first = deferred();
    const update = deferred();
    api.addCartLine.mockReturnValue(first.promise);
    api.updateCartLine.mockReturnValue(update.promise);
    api.beginCheckout.mockResolvedValue({ checkoutUrl: 'https://shop.example/checkout' });
    const { result } = renderHook(() => useCart({ mode: 'shopify', cartEnabled: true }));
    act(() => result.current.applyServerCart(serverCart(1)));
    let failed;
    let changed;
    let checkout;
    await act(async () => {
      failed = result.current.addToCart(product, 'v1').catch((error) => error);
      changed = result.current.incrementQuantity(item);
      checkout = result.current.checkout();
    });
    expect(api.updateCartLine).not.toHaveBeenCalled();
    await act(async () => {
      first.reject(new Error('Sin stock'));
      await failed;
    });
    expect(api.updateCartLine).toHaveBeenCalledTimes(1);
    expect(api.beginCheckout).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(true);
    await act(async () => {
      update.resolve({ cart: serverCart(2) });
      await changed;
      await checkout;
    });
    expect(await checkout).toBe('https://shop.example/checkout');
    expect(result.current.totalItems).toBe(2);
    expect(result.current.busy).toBe(false);
  });

  it('reports no addition when Shopify leaves an existing variant unchanged', async () => {
    const warning = {
      code: 'MERCHANDISE_OUT_OF_STOCK',
      message: 'Sin stock',
      target: 'private-token',
    };
    api.addCartLine.mockResolvedValue({ cart: serverCart(1), warnings: [warning] });
    const { result } = renderHook(() => useCart({ mode: 'shopify', cartEnabled: true }));
    act(() => result.current.applyServerCart(serverCart(1)));
    let response;
    await act(async () => {
      response = await result.current.addToCart(product, 'v1');
    });
    expect(response.added).toBe(false);
    expect(response.warnings).toEqual([{ code: warning.code, message: warning.message }]);
    expect(result.current.totalItems).toBe(1);
  });

  it('reports an effective addition even when Shopify adjusts another line', async () => {
    api.addCartLine.mockResolvedValue({
      cart: serverCart(1),
      warnings: [{ code: 'ADJUSTED', message: 'Otra línea ajustada' }],
    });
    const { result } = renderHook(() => useCart({ mode: 'shopify', cartEnabled: true }));
    let response;
    await act(async () => {
      response = await result.current.addToCart(product, 'v1');
    });
    expect(response.added).toBe(true);
    expect(result.current.totalItems).toBe(1);
  });
});
