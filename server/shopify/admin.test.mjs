import { describe, expect, it, vi } from 'vitest';
import { createAdminClient } from './admin.mjs';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Admin GraphQL client', () => {
  it('keeps client credentials server-side and reuses the short-lived token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ access_token: 'admin-token', expires_in: 86_399 }))
      .mockResolvedValueOnce(response({ data: { shop: { id: 'gid://shopify/Shop/1' } } }))
      .mockResolvedValueOnce(response({ data: { shop: { id: 'gid://shopify/Shop/1' } } }));
    const client = createAdminClient({
      config: {
        storeDomain: 'rocky-dev.myshopify.com',
        apiVersion: '2026-07',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      fetchImpl,
      clock: () => 1_000,
    });

    await expect(client.query('query Shop { shop { id } }')).resolves.toEqual({
      shop: { id: 'gid://shopify/Shop/1' },
    });
    await client.query('query Shop { shop { id } }');

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const tokenRequest = fetchImpl.mock.calls[0];
    expect(tokenRequest[0]).toBe('https://rocky-dev.myshopify.com/admin/oauth/access_token');
    expect(String(tokenRequest[1].body)).toContain('grant_type=client_credentials');
    expect(String(tokenRequest[1].body)).toContain('client_secret=client-secret');
    expect(tokenRequest[1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchImpl.mock.calls[1][1].headers).toMatchObject({
      'X-Shopify-Access-Token': 'admin-token',
    });
  });

  it('rejects malformed token lifetimes instead of caching them', async () => {
    const client = createAdminClient({
      config: {
        storeDomain: 'rocky-dev.myshopify.com',
        apiVersion: '2026-07',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      fetchImpl: vi
        .fn()
        .mockResolvedValue(response({ access_token: 'admin-token', expires_in: '86399' })),
    });

    await expect(client.getToken()).rejects.toMatchObject({
      code: 'ADMIN_TOKEN_ERROR',
    });
  });
});
