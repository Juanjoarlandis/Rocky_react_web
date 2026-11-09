import { describe, expect, it, vi } from 'vitest';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { createCatalogModel } from './catalog.mjs';

const NOW = Date.parse('2026-11-14T12:00:00Z');

const product = (handle, { variants = 1, available = true } = {}) => ({
  id: `gid://shopify/Product/${handle}`,
  handle,
  title: handle,
  description: '',
  image: { url: `https://cdn.shopify.com/${handle}.png`, alt: '' },
  drop: { handle: 'frontpage', title: 'Home page' },
  variants: Array.from({ length: variants }, (_, i) => ({
    id: `gid://shopify/ProductVariant/${handle}-${i}`,
    availableForSale: available,
    price: { amount: '34.99', currencyCode: 'EUR' },
  })),
});

const source = (handle, number, launchAt, endsAt, handles) => ({
  handle,
  title: `ROCKY DROP ${number}`,
  poster: null,
  config: { version: 1, number, tagline: '', story: '', launchAt, endsAt, status: 'programado' },
  products: handles.map((h) => ({ handle: h, availableForSale: true })),
  designs: handles.map((h) => ({ handle: h, availableForSale: true })),
});

function storefrontWith(pages) {
  return {
    listProducts: vi.fn(async ({ after }) => {
      const index = after ? Number(after) : 0;
      return {
        products: pages[index],
        pageInfo: { hasNextPage: index + 1 < pages.length, endCursor: String(index + 1) },
      };
    }),
  };
}

const dropsWith = (sources) => ({ sources: vi.fn(async () => sources) });

describe('catálogo vivo', () => {
  it('pagina hasta tener todo el catálogo', async () => {
    const pages = [
      Array.from({ length: 50 }, (_, i) => product(`a${i}`)),
      Array.from({ length: 50 }, (_, i) => product(`b${i}`)),
      [product('c0')],
    ];
    const storefront = storefrontWith(pages);
    const catalog = createCatalogModel({ storefront, dropsModel: dropsWith([]), clock: () => NOW });
    const { products, pageInfo } = await catalog.list();
    expect(products).toHaveLength(101);
    expect(pageInfo).toEqual({ hasNextPage: false, endCursor: null });
    expect(storefront.listProducts).toHaveBeenCalledTimes(3);
    expect(storefront.listProducts.mock.calls[0][0]).toMatchObject({ first: 50 });
  });

  it('no pasa de 250 productos', async () => {
    const pages = Array.from({ length: 8 }, (_, p) =>
      Array.from({ length: 50 }, (_, i) => product(`p${p}-${i}`))
    );
    const catalog = createCatalogModel({
      storefront: storefrontWith(pages),
      dropsModel: dropsWith([]),
      clock: () => NOW,
    });
    expect((await catalog.list()).products).toHaveLength(250);
  });

  it('cada diseño lleva el drop del modelo, no su primera colección', async () => {
    const catalog = createCatalogModel({
      storefront: storefrontWith([[product('rocky-sin-frenos'), product('suelta')]]),
      dropsModel: dropsWith([
        source('rocky-drop-5', 5, '2026-11-01T20:00:00+01:00', null, ['rocky-sin-frenos']),
      ]),
      clock: () => NOW,
    });
    const { products } = await catalog.list();
    expect(products[0].drop).toEqual({
      handle: 'rocky-drop-5',
      title: 'ROCKY DROP 5',
      number: 5,
      state: DROP_STATES.LIVE,
    });
    expect(products[0].purchasable).toBe(true);
    expect(products[1].drop).toBe(null);
    expect(products[1].purchasable).toBe(true);
  });

  it('no deja salir nada de un drop anunciado ni de un borrador', async () => {
    const borrador = source('rocky-drop-8', 8, null, null, ['rocky-borrador']);
    borrador.config.status = 'borrador';
    const catalog = createCatalogModel({
      storefront: storefrontWith([
        [product('rocky-el-jefe'), product('rocky-borrador'), product('rocky-sin-frenos')],
      ]),
      dropsModel: dropsWith([
        source('rocky-drop-6', 6, '2026-11-20T20:00:00+01:00', null, ['rocky-el-jefe']),
        borrador,
        source('rocky-drop-5', 5, '2026-11-01T20:00:00+01:00', null, ['rocky-sin-frenos']),
      ]),
      clock: () => NOW,
    });
    const { products } = await catalog.list();
    expect(products.map((p) => p.handle)).toEqual(['rocky-sin-frenos']);
    expect(JSON.stringify(products)).not.toContain('el-jefe');
  });

  it('un drop en archivo se ve pero no se vende', async () => {
    const catalog = createCatalogModel({
      storefront: storefrontWith([[product('rocky-congelado')]]),
      dropsModel: dropsWith([
        source('rocky-drop-3', 3, '2026-10-01T20:00:00+02:00', '2026-10-08T20:00:00+02:00', [
          'rocky-congelado',
        ]),
      ]),
      clock: () => NOW,
    });
    const [congelado] = (await catalog.list()).products;
    expect(congelado.drop.state).toBe(DROP_STATES.ARCHIVE);
    expect(congelado.purchasable).toBe(false);
  });

  it('encuentra el diseño de una variante y refresca una vez si no lo conoce', async () => {
    let now = NOW;
    let pages = [[product('rocky-uno')]];
    const storefront = {
      listProducts: vi.fn(async () => ({
        products: pages[0],
        pageInfo: { hasNextPage: false, endCursor: null },
      })),
    };
    const catalog = createCatalogModel({ storefront, dropsModel: dropsWith([]), clock: () => now });
    expect((await catalog.findByVariant('gid://shopify/ProductVariant/rocky-uno-0')).handle).toBe(
      'rocky-uno'
    );
    pages = [[product('rocky-uno'), product('rocky-nuevo')]];
    now += 6_000;
    expect((await catalog.findByVariant('gid://shopify/ProductVariant/rocky-nuevo-0')).handle).toBe(
      'rocky-nuevo'
    );
    expect(storefront.listProducts).toHaveBeenCalledTimes(2);
  });

  it('una variante inventada no fuerza más de una relectura cada 5 s', async () => {
    let now = NOW;
    const storefront = storefrontWith([[product('x')]]);
    const catalog = createCatalogModel({ storefront, dropsModel: dropsWith([]), clock: () => now });
    await catalog.list();
    now += 6_000;
    for (let i = 0; i < 20; i += 1) {
      expect(await catalog.findByVariant(`gid://shopify/ProductVariant/bot-${i}`)).toBe(null);
    }
    expect(storefront.listProducts).toHaveBeenCalledTimes(2);
  });

  it('cachea 30 s con una sola petición en vuelo', async () => {
    let now = NOW;
    const storefront = storefrontWith([[product('x')]]);
    const catalog = createCatalogModel({
      storefront,
      dropsModel: dropsWith([]),
      clock: () => now,
    });
    await Promise.all([catalog.list(), catalog.list()]);
    expect(storefront.listProducts).toHaveBeenCalledTimes(1);
    now += 31_000;
    await catalog.list();
    expect(storefront.listProducts).toHaveBeenCalledTimes(2);
  });

  it('el estado del drop se calcula con la hora de cada consulta, no la del caché', async () => {
    let now = Date.parse('2026-11-20T19:59:50+01:00');
    const catalog = createCatalogModel({
      storefront: storefrontWith([[product('rocky-el-jefe')]]),
      dropsModel: dropsWith([
        source('rocky-drop-6', 6, '2026-11-20T20:00:00+01:00', null, ['rocky-el-jefe']),
      ]),
      clock: () => now,
    });
    expect((await catalog.list()).products).toHaveLength(0);
    now += 15_000;
    const [jefe] = (await catalog.list()).products;
    expect(jefe).toMatchObject({ handle: 'rocky-el-jefe', purchasable: true });
  });

  it('la búsqueda del guardián encuentra también lo oculto, como no vendible', async () => {
    const catalog = createCatalogModel({
      storefront: storefrontWith([[product('rocky-el-jefe')]]),
      dropsModel: dropsWith([
        source('rocky-drop-6', 6, '2026-11-20T20:00:00+01:00', null, ['rocky-el-jefe']),
      ]),
      clock: () => NOW,
    });
    expect((await catalog.list()).products).toHaveLength(0);
    const jefe = await catalog.findByVariant('gid://shopify/ProductVariant/rocky-el-jefe-0');
    expect(jefe).toMatchObject({ handle: 'rocky-el-jefe', purchasable: false });
    expect(jefe.drop.state).toBe(DROP_STATES.ANNOUNCED);
  });
});
