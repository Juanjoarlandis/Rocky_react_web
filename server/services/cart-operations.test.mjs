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

describe('venta blindada por estado del drop', () => {
  const ON_SALE = { handle: 'rocky-sin-frenos', title: 'Sin frenos', purchasable: true };
  const CLOSED = { handle: 'rocky-congelado', title: 'Congelado', purchasable: false };

  function setup({ lines = [] } = {}) {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const cart = { lines };
    const storefront = {
      createCartForSession: vi.fn(async () => ({ fullCartId: 'cart-1', cart, warnings: [] })),
      addLines: vi.fn(async () => ({ cart, warnings: [] })),
      updateLines: vi.fn(async () => ({ cart, warnings: [] })),
      removeLines: vi.fn(async () => ({ cart, warnings: [] })),
      getCart: vi.fn(async () => ({
        cart,
        checkoutUrl: 'https://tienda.myshopify.com/checkout/x',
      })),
    };
    const byVariant = {
      'variant-on-sale': ON_SALE,
      'variant-closed': CLOSED,
    };
    const catalog = { findByVariant: vi.fn(async (id) => byVariant[id] ?? null) };
    const carts = createCartOperations({
      store,
      sessions,
      storefront,
      checkoutHosts: new Set(['tienda.myshopify.com']),
      catalog,
    });
    return { store, sessions, storefront, carts, catalog };
  }

  async function sessionWithCart(sessions) {
    const session = await sessions.open({ get: () => '' }, { append() {} });
    await sessions.save(session, { cartId: 'cart-1' });
    return session;
  }

  const line = (id, variantId, quantity = 1) => ({
    id,
    quantity,
    variant: {
      id: variantId,
      product: { handle: id, title: id === 'l-closed' ? 'Congelado' : 'Sin frenos' },
    },
  });

  it('añadir un diseño de un drop cerrado responde 409 y no toca el carrito', async () => {
    const { sessions, storefront, carts } = setup();
    const session = await sessions.open({ get: () => '' }, { append() {} });
    await expect(
      carts.addLine(session, { variantId: 'variant-closed', quantity: 1, operationId: 'op-1' })
    ).rejects.toMatchObject({ status: 409, code: 'DROP_NOT_ON_SALE' });
    expect(storefront.createCartForSession).not.toHaveBeenCalled();
  });

  it('añadir un diseño a la venta funciona como siempre', async () => {
    const { sessions, storefront, carts } = setup();
    const session = await sessions.open({ get: () => '' }, { append() {} });
    await carts.addLine(session, {
      variantId: 'variant-on-sale',
      quantity: 1,
      operationId: 'op-2',
    });
    expect(storefront.createCartForSession).toHaveBeenCalled();
  });

  it('un producto que el catálogo no conoce lo decide Shopify', async () => {
    const { sessions, storefront, carts } = setup();
    const session = await sessions.open({ get: () => '' }, { append() {} });
    await carts.addLine(session, { variantId: 'variant-suelta', quantity: 1, operationId: 'op-3' });
    expect(storefront.createCartForSession).toHaveBeenCalled();
  });

  it('tras el cierre no se sube la cantidad pero sí se baja', async () => {
    const { sessions, storefront, carts } = setup({
      lines: [line('l-closed', 'variant-closed', 1)],
    });
    const session = await sessionWithCart(sessions);
    await expect(
      carts.updateLine(session, { lineId: 'l-closed', quantity: 2, operationId: 'op-4' })
    ).rejects.toMatchObject({ status: 409, code: 'DROP_NOT_ON_SALE' });
    expect(storefront.updateLines).not.toHaveBeenCalled();
    await carts.updateLine(session, { lineId: 'l-closed', quantity: 0, operationId: 'op-5' });
    expect(storefront.updateLines).toHaveBeenCalledWith(
      'cart-1',
      { lineId: 'l-closed', quantity: 0 },
      undefined
    );
  });

  it('quitar una línea de un drop cerrado sigue permitido', async () => {
    const { sessions, storefront, carts } = setup({
      lines: [line('l-closed', 'variant-closed', 1)],
    });
    const session = await sessionWithCart(sessions);
    await carts.removeLine(session, { lineId: 'l-closed', operationId: 'op-6' });
    expect(storefront.removeLines).toHaveBeenCalled();
  });

  it('el pago se para con líneas de drops cerrados y nombra los diseños', async () => {
    const { sessions, carts } = setup({
      lines: [line('l-ok', 'variant-on-sale'), line('l-closed', 'variant-closed')],
    });
    const session = await sessionWithCart(sessions);
    const error = await carts.checkout(session).catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'DROP_CLOSED_IN_CART' });
    expect(error.message).toContain('Congelado');
  });

  it('con todo a la venta, el pago devuelve la URL de checkout', async () => {
    const { sessions, carts } = setup({ lines: [line('l-ok', 'variant-on-sale')] });
    const session = await sessionWithCart(sessions);
    await expect(carts.checkout(session)).resolves.toEqual({
      checkoutUrl: 'https://tienda.myshopify.com/checkout/x',
    });
  });
});
