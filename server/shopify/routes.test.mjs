import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../encrypted-store.mjs';
import { createApp } from '../../server.mjs';

const runningServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...runningServers].map((server) => new Promise((resolve) => server.close(resolve)))
  );
  runningServers.clear();
});

async function start({ env = {}, fetchImpl = vi.fn(), store = new MemoryStore() } = {}) {
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: 'https://rocky.test',
      ...env,
    },
    fetchImpl,
    store,
    logger: { error: vi.fn(), info: vi.fn() },
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  runningServers.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function configuredEnv() {
  return {
    SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com',
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'storefront-token',
    APP_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
  };
}

function cartPayload() {
  return {
    data: {
      cartCreate: {
        cart: {
          id: 'gid://shopify/Cart/token?key=full-cart-secret',
          totalQuantity: 1,
          checkoutUrl: 'https://rocky-dev.myshopify.com/cart/c/checkout-secret',
          lines: {
            nodes: [
              {
                id: 'gid://shopify/CartLine/1',
                quantity: 1,
                merchandise: {
                  id: 'gid://shopify/ProductVariant/2',
                  title: 'L',
                  availableForSale: true,
                  product: { handle: 'camiseta', title: 'Camiseta' },
                  image: null,
                  price: { amount: '35.00', currencyCode: 'EUR' },
                },
              },
            ],
          },
          cost: {
            subtotalAmount: { amount: '35.00', currencyCode: 'EUR' },
            totalAmount: { amount: '35.00', currencyCode: 'EUR' },
          },
        },
        userErrors: [],
        warnings: [],
      },
    },
  };
}

describe('Shopify HTTP contracts', () => {
  it('reports disabled capabilities without leaking configuration', async () => {
    const baseUrl = await start();

    const response = await fetch(`${baseUrl}/api/shopify/status`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      mode: 'demo',
      apiVersion: '2026-07',
      capabilities: {
        catalog: false,
        cart: false,
        customerAccounts: false,
        admin: false,
        webhooks: false,
      },
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('rate-limits the public commerce boundary before Shopify work', async () => {
    const fetchImpl = vi.fn();
    const baseUrl = await start({
      env: { SHOPIFY_RATE_LIMIT_MAX: '1' },
      fetchImpl,
    });

    expect((await fetch(`${baseUrl}/api/shopify/status`)).status).toBe(200);
    const limited = await fetch(`${baseUrl}/api/shopify/status`);

    expect(limited.status).toBe(429);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stores the full cart ID only server-side and replays an idempotent response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(cartPayload()));
    const store = new MemoryStore();
    const baseUrl = await start({ env: configuredEnv(), fetchImpl, store });
    const requestBody = {
      variantId: 'gid://shopify/ProductVariant/2',
      quantity: 1,
      operationId: 'operation-12345',
      price: '0.01',
      title: 'Manipulado',
    };

    const first = await fetch(`${baseUrl}/api/shopify/cart/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://rocky.test' },
      body: JSON.stringify(requestBody),
    });
    const firstBody = await first.json();
    const cookie = first.headers.get('set-cookie').split(';')[0];
    const second = await fetch(`${baseUrl}/api/shopify/cart/lines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://rocky.test',
        Cookie: cookie,
      },
      body: JSON.stringify(requestBody),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(JSON.stringify(firstBody)).not.toContain('full-cart-secret');
    expect(JSON.stringify(firstBody)).not.toContain('checkout-secret');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const storedSessions = store.state.namespaces.sessions;
    expect(JSON.stringify(storedSessions)).toContain('full-cart-secret');
  });

  it('verifies webhook bytes before the global JSON parser', async () => {
    const secret = 'shopify-client-secret';
    const baseUrl = await start({
      env: {
        ...configuredEnv(),
        SHOPIFY_CLIENT_SECRET: secret,
      },
    });
    const rawBody = Buffer.from('{"current":["read_products"]}', 'utf8');
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

    const webhook = await fetch(`${baseUrl}/api/shopify/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Webhook-Id': 'delivery-12345',
        'X-Shopify-Event-Id': 'event-12345',
        'X-Shopify-Topic': 'app/scopes_update',
        'X-Shopify-Shop-Domain': 'rocky-dev.myshopify.com',
        'X-Shopify-Api-Version': '2026-07',
      },
      body: rawBody,
    });

    expect(webhook.status).toBe(200);
    await expect(webhook.json()).resolves.toEqual({ accepted: true, duplicate: false });
  });

  it('credits a signed paid order to Crew exactly once', async () => {
    const secret = 'shopify-client-secret';
    const store = new MemoryStore();
    const baseUrl = await start({
      env: {
        ...configuredEnv(),
        SHOPIFY_CLIENT_SECRET: secret,
        SHOPIFY_WEBHOOK_TOPICS: 'orders/paid',
      },
      store,
    });
    const rawBody = Buffer.from(JSON.stringify({
      admin_graphql_api_id: 'gid://shopify/Order/77',
      name: '#1035',
      processed_at: '2026-08-07T18:00:00Z',
      current_total_price_set: {
        shop_money: { amount: '34.99', currency_code: 'EUR' },
      },
      customer: { admin_graphql_api_id: 'gid://shopify/Customer/1' },
      line_items: [{ title: 'Rockydz Boyz', quantity: 1 }],
    }));
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Hmac-Sha256': hmac,
      'X-Shopify-Webhook-Id': 'delivery-paid-123',
      'X-Shopify-Event-Id': 'event-paid-123',
      'X-Shopify-Topic': 'orders/paid',
      'X-Shopify-Shop-Domain': 'rocky-dev.myshopify.com',
      'X-Shopify-Api-Version': '2026-07',
    };

    const first = await fetch(`${baseUrl}/api/shopify/webhooks`, {
      method: 'POST',
      headers,
      body: rawBody,
    });
    const second = await fetch(`${baseUrl}/api/shopify/webhooks`, {
      method: 'POST',
      headers,
      body: rawBody,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const storedProfiles = Object.values(store.state.namespaces.crewProfiles || {});
    expect(storedProfiles).toHaveLength(1);
    expect(storedProfiles[0].value).toMatchObject({
      xp: 34,
      ticketBalanceTenths: 34,
      creditedOrderIds: ['gid://shopify/Order/77'],
    });
  });
});
