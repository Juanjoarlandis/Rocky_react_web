import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../storage/memory-store.mjs';
import { createSessionManager } from './sessions.mjs';
import { createCartOperations } from './cart-operations.mjs';

describe('concurrent cart creation', () => {
  it('adds both selections to one cart when requests read the same empty session', async () => {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const first = await sessions.open({ get: () => '' }, { append() {} });
    const req = { get: () => `rocky_session=${first.id}` };
    const second = await sessions.read(req);
    const lines = [];
    const storefront = {
      createCartForSession: vi.fn(async ({ variantId }) => {
        lines.push(variantId);
        return { fullCartId: 'one-cart', cart: { lines: [...lines] }, warnings: [] };
      }),
      addLines: vi.fn(async (cartId, { variantId }) => {
        lines.push(variantId);
        return { cart: { lines: [...lines] }, warnings: [] };
      }),
    };
    const carts = createCartOperations({ store, sessions, storefront, checkoutHosts: new Set() });

    await Promise.all([
      carts.addLine(first, { variantId: 'variant-A', quantity: 1, operationId: 'operation-A' }),
      carts.addLine(second, { variantId: 'variant-B', quantity: 1, operationId: 'operation-B' }),
    ]);

    expect(storefront.createCartForSession).toHaveBeenCalledTimes(1);
    expect(storefront.addLines).toHaveBeenCalledWith(
      'one-cart',
      { variantId: 'variant-B', quantity: 1 },
      undefined
    );
    expect(lines).toEqual(['variant-A', 'variant-B']);
    expect((await sessions.read(req)).record.cartId).toBe('one-cart');
  });
});
