import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.mjs';
import { hashPassword } from './lib/password-hash.mjs';
import { base32Decode, totpAt } from './lib/totp.mjs';
import { MemoryStore } from './storage/memory-store.mjs';

// La app entera con una Shopify falsa: Admin API (drops) y Storefront
// (catálogo y carrito). Fija los contratos públicos de sistema-de-drops.

const running = new Set();
afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

const DAY = 24 * 60 * 60 * 1000;
// Ids numéricos como los de Shopify (el BFF solo acepta la forma canónica).
const variantNumbers = new Map();
const variantOf = (handle) => {
  if (!variantNumbers.has(handle)) variantNumbers.set(handle, 1000 + variantNumbers.size);
  return `gid://shopify/ProductVariant/${variantNumbers.get(handle)}`;
};
const iso = (offset) => new Date(Date.now() + offset).toISOString();

const config = (number, launchOffset, endsOffset = null) =>
  JSON.stringify({
    version: 1,
    number,
    tagline: `Lema del ${number}`,
    story: `Historia del ${number}`,
    launchAt: iso(launchOffset),
    endsAt: endsOffset === null ? null : iso(endsOffset),
    status: 'programado',
  });

const COLLECTIONS = [
  {
    id: 'c6',
    handle: 'rocky-drop-6',
    title: 'ROCKY DROP 6',
    image: null,
    metafield: { value: config(6, 3 * DAY) },
  },
  {
    id: 'c5',
    handle: 'rocky-drop-5',
    title: 'ROCKY DROP 5',
    image: null,
    metafield: { value: config(5, -2 * DAY) },
  },
  {
    id: 'c3',
    handle: 'rocky-drop-3',
    title: 'ROCKY DROP 3',
    image: null,
    metafield: { value: config(3, -40 * DAY, -30 * DAY) },
  },
];

const adminProduct = (handle) => ({
  id: `gid://shopify/Product/${handle}`,
  handle,
  title: handle,
  status: 'ACTIVE',
  descriptionHtml: '',
  featuredImage: null,
  collections: { nodes: [] },
  variants: {
    nodes: [
      {
        id: variantOf(handle),
        availableForSale: true,
        price: '34.99',
        inventoryQuantity: 0,
        selectedOptions: [{ name: 'Talla', value: 'M' }],
        inventoryItem: { id: 'i', tracked: false },
      },
    ],
  },
});

const MEMBERS = { c6: ['rocky-el-jefe'], c5: ['rocky-sin-frenos'], c3: ['rocky-congelado'] };

const storefrontProduct = (handle) => ({
  id: `gid://shopify/Product/${handle}`,
  handle,
  title: handle,
  description: '',
  featuredImage: { url: `https://cdn.shopify.com/${handle}.png`, altText: '' },
  collections: { nodes: [] },
  variants: {
    nodes: [
      {
        id: variantOf(handle),
        title: 'M',
        availableForSale: true,
        selectedOptions: [{ name: 'Talla', value: 'M' }],
        price: { amount: '34.99', currencyCode: 'EUR' },
        image: null,
      },
    ],
  },
});

const json = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function fakeShopify() {
  return vi.fn(async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith('/admin/oauth/access_token')) {
      return json({ access_token: 'admin-token', expires_in: 86_400, scope: 'read_products' });
    }
    const { query, variables } = JSON.parse(options.body);
    const name = query.match(/(?:query|mutation)\s+(\w+)/)[1];
    if (href.includes('/admin/api/')) {
      if (name === 'RockyDrops') return json({ data: { collections: { nodes: COLLECTIONS } } });
      if (name === 'RockyDropProducts') {
        return json({
          data: { collection: { products: { nodes: MEMBERS[variables.id].map(adminProduct) } } },
        });
      }
    }
    if (name === 'RockyProducts') {
      // El Jefe sale en la Storefront como si alguien lo hubiera publicado a mano.
      return json({
        data: {
          products: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: ['rocky-el-jefe', 'rocky-sin-frenos', 'rocky-congelado', 'rocky-suelta'].map(
              storefrontProduct
            ),
          },
        },
      });
    }
    if (name === 'RockyCartCreate') {
      return json({
        data: {
          cartCreate: {
            cart: {
              id: 'gid://shopify/Cart/1?key=secret',
              totalQuantity: 1,
              checkoutUrl: 'https://rocky-dev.myshopify.com/checkout',
              lines: { nodes: [] },
              cost: {
                subtotalAmount: { amount: '0', currencyCode: 'EUR' },
                totalAmount: { amount: '0', currencyCode: 'EUR' },
              },
            },
            userErrors: [],
            warnings: [],
          },
        },
      });
    }
    throw new Error(`Llamada inesperada a Shopify: ${name}`);
  });
}

async function start(env, fetchImpl = fakeShopify()) {
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: 'https://rocky.test',
      OPENROUTER_API_KEY: 'test-key',
      SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com',
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'storefront-token',
      APP_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
      ...env,
    },
    fetchImpl,
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    store: new MemoryStore(),
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return { base: `http://127.0.0.1:${server.address().port}`, fetchImpl };
}

const WITH_ADMIN = { SHOPIFY_CLIENT_ID: 'client', SHOPIFY_CLIENT_SECRET: 'secret' };

describe('drops en la app entera', () => {
  it('GET /api/drops da el teaser del anunciado sin nombres y el resto con sus diseños', async () => {
    const { base } = await start(WITH_ADMIN);
    const response = await fetch(`${base}/api/drops`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.featured.handle).toBe('rocky-drop-6');
    expect(body.drops.map((d) => [d.handle, d.state])).toEqual([
      ['rocky-drop-6', 'anunciado'],
      ['rocky-drop-5', 'en-la-calle'],
      ['rocky-drop-3', 'archivo'],
    ]);
    expect(body.drops[0]).toMatchObject({ designCount: 1, designs: null, story: '' });
    expect(JSON.stringify(body)).not.toContain('el-jefe');
    expect(body.drops[1].designs).toEqual(['rocky-sin-frenos']);
  });

  it('el catálogo trae el drop de cada diseño, el archivo sin venta y nada del anunciado', async () => {
    const { base } = await start(WITH_ADMIN);
    const body = await (await fetch(`${base}/api/shopify/products`)).json();
    const byHandle = Object.fromEntries(body.products.map((p) => [p.handle, p]));
    expect(Object.keys(byHandle).sort()).toEqual([
      'rocky-congelado',
      'rocky-sin-frenos',
      'rocky-suelta',
    ]);
    expect(byHandle['rocky-sin-frenos']).toMatchObject({
      purchasable: true,
      drop: { handle: 'rocky-drop-5', state: 'en-la-calle', number: 5 },
    });
    expect(byHandle['rocky-congelado']).toMatchObject({
      purchasable: false,
      drop: { state: 'archivo' },
    });
    expect(byHandle['rocky-suelta']).toMatchObject({ purchasable: true, drop: null });
    expect(JSON.stringify(body)).not.toContain('el-jefe');
    expect(body.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
  });

  it('el carrito rechaza un diseño del archivo o del anunciado y acepta uno en la calle', async () => {
    const { base } = await start(WITH_ADMIN);
    const add = (variant, operationId) =>
      fetch(`${base}/api/shopify/cart/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://rocky.test' },
        body: JSON.stringify({ variantId: variantOf(variant), quantity: 1, operationId }),
      });
    const closed = await add('rocky-congelado', 'operation-closed-1');
    expect(closed.status).toBe(409);
    expect(await closed.json()).toMatchObject({ code: 'DROP_NOT_ON_SALE' });
    const announced = await add('rocky-el-jefe', 'operation-teaser-1');
    expect(announced.status).toBe(409);
    const live = await add('rocky-sin-frenos', 'operation-live-1');
    expect(live.status).toBe(200);
  });

  it('el calendario heredado sirve el destacado y el nuevo el de cada drop', async () => {
    const { base } = await start(WITH_ADMIN);
    expect((await fetch(`${base}/api/drop/calendario.ics`)).status).toBe(200);
    expect((await fetch(`${base}/api/drops/rocky-drop-6/calendario.ics`)).status).toBe(200);
    expect((await fetch(`${base}/api/drops/rocky-drop-3/calendario.ics`)).status).toBe(404);
  });

  it('sin credenciales Admin no hay drops, el catálogo sigue y no se llama a la Admin API', async () => {
    const { base, fetchImpl } = await start({});
    expect(await (await fetch(`${base}/api/drops`)).json()).toMatchObject({
      featured: null,
      drops: [],
    });
    const products = (await (await fetch(`${base}/api/shopify/products`)).json()).products;
    expect(products).toHaveLength(4);
    expect(products.every((p) => p.drop === null && p.purchasable)).toBe(true);
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/admin/'))).toBe(false);
  });

  it('sin la configuración del Taller, /api/taller responde 404', async () => {
    const { base } = await start(WITH_ADMIN);
    const response = await fetch(`${base}/api/taller/session`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'TALLER_DISABLED' });
  });

  it('con el Taller configurado se entra con clave y código y se listan los drops', async () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const { base } = await start({
      ...WITH_ADMIN,
      TALLER_PASSWORD_HASH: await hashPassword('clave del taller de la app', {
        N: 1024,
        r: 8,
        p: 1,
      }),
      TALLER_TOTP_SECRET: secret,
      SHOPIFY_HEADLESS_PUBLICATION_ID: 'gid://shopify/Publication/1',
    });
    expect((await fetch(`${base}/api/taller/drops`)).status).toBe(401);
    const login = await fetch(`${base}/api/taller/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://rocky.test' },
      body: JSON.stringify({
        password: 'clave del taller de la app',
        code: totpAt(base32Decode(secret), Date.now()),
      }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const drops = await fetch(`${base}/api/taller/drops`, { headers: { Cookie: cookie } });
    expect(drops.status).toBe(200);
    const { drops: list } = await drops.json();
    expect(list.map((d) => d.handle)).toEqual(['rocky-drop-6', 'rocky-drop-5', 'rocky-drop-3']);
    expect(list[0].designs[0].handle).toBe('rocky-el-jefe');
  });
});
