import { describe, expect, it, vi } from 'vitest';
import { createCatalogCache } from './catalog-cache.mjs';

function catalog(handle) {
  return { products: [{ handle }], pageInfo: { hasNextPage: false, endCursor: null } };
}

describe('createCatalogCache', () => {
  it('serves the same page for a minute and shares one request in flight', async () => {
    let now = 1_000;
    const storefront = { listProducts: vi.fn().mockResolvedValue(catalog('rockydz-boyz')) };
    const cache = createCatalogCache({ storefront, ttlMs: 60_000, clock: () => now });

    const [first, second] = await Promise.all([cache.list(), cache.list({ buyerIp: '1.1.1.1' })]);
    now = 30_000;
    const third = await cache.list();

    expect(storefront.listProducts).toHaveBeenCalledTimes(1);
    expect(storefront.listProducts).toHaveBeenCalledWith({ first: 50, buyerIp: undefined });
    expect(first).toBe(second);
    expect(third).toBe(first);
  });

  it('refreshes after the TTL and never caches a failure', async () => {
    let now = 1_000;
    const storefront = {
      listProducts: vi
        .fn()
        .mockRejectedValueOnce(new Error('caído'))
        .mockResolvedValueOnce(catalog('primero'))
        .mockResolvedValueOnce(catalog('segundo')),
    };
    const cache = createCatalogCache({ storefront, ttlMs: 60_000, clock: () => now });

    await expect(cache.list()).rejects.toThrow('caído');
    await expect(cache.list()).resolves.toEqual(catalog('primero'));
    now = 61_001;
    await expect(cache.list()).resolves.toEqual(catalog('segundo'));
    expect(storefront.listProducts).toHaveBeenCalledTimes(3);
  });
});
