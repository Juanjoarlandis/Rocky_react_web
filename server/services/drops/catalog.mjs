import { DROP_STATES, isOnSale, publicDrop } from '../../../shared/drops.mjs';

// El catálogo vivo (design.md, D5): toda la Storefront paginada de 50 en 50
// hasta 250, cacheada 30 s con una sola petición en vuelo. Cada producto lleva
// el drop del modelo (no su primera colección) y si se puede comprar ahora. Los
// diseños de un drop anunciado o en borrador no salen nunca: aunque Shopify ya
// no los sirve antes de su hora, esto cubre un producto publicado a mano.
//
// El estado se recalcula en cada consulta con la hora de ese momento; solo los
// datos de Shopify se cachean.

const PAGE_SIZE = 50;
const MAX_PAGES = 5;
const DEFAULT_TTL_MS = 30_000;
// Una variante desconocida fuerza una relectura como mucho cada 5 s: si no, un
// bot con ids inventados haría releer el catálogo entero en cada petición.
const MIN_FORCED_REFRESH_MS = 5_000;
const HIDDEN = new Set([DROP_STATES.ANNOUNCED, DROP_STATES.DRAFT]);

export function createCatalogModel({
  storefront,
  dropsModel,
  clock = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
}) {
  let cached = null;
  let pending = null;

  async function fetchAll(buyerIp) {
    const products = [];
    let after = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await storefront.listProducts({ first: PAGE_SIZE, after, buyerIp });
      products.push(...result.products);
      if (!result.pageInfo?.hasNextPage) break;
      after = result.pageInfo.endCursor;
    }
    return products;
  }

  async function raw({ buyerIp, force = false } = {}) {
    const age = cached ? clock() - cached.fetchedAt : Infinity;
    const fresh = force ? age < MIN_FORCED_REFRESH_MS : age < ttlMs;
    if (fresh) return cached.products;
    if (!pending) {
      pending = fetchAll(buyerIp)
        .then((products) => {
          cached = { products, fetchedAt: clock() };
          return products;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  }

  async function decorate(products) {
    const now = new Date(clock());
    const owners = new Map();
    for (const source of await dropsModel.sources()) {
      const state = publicDrop(source, now)?.state ?? DROP_STATES.DRAFT;
      const drop = {
        handle: source.handle,
        title: source.title,
        number: source.config.number,
        state,
      };
      for (const design of source.designs) owners.set(design.handle, drop);
    }
    return products.map((product) => {
      const drop = owners.get(product.handle) ?? null;
      return { ...product, drop, purchasable: drop ? isOnSale(drop.state) : true };
    });
  }

  const isVisible = (product) => !product.drop || !HIDDEN.has(product.drop.state);

  async function list({ buyerIp } = {}) {
    return {
      products: (await decorate(await raw({ buyerIp }))).filter(isVisible),
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  }

  const hasVariant = (product, variantId) =>
    product.variants.some((variant) => variant.id === variantId);

  return {
    list,

    /* El diseño (ya decorado) de una variante, también si está oculto: el
       guardián de la venta tiene que saber que no se vende. Si no está,
       refresca una vez: puede ser un diseño que acaba de salir. */
    async findByVariant(variantId, { buyerIp } = {}) {
      let products = await decorate(await raw({ buyerIp }));
      let found = products.find((product) => hasVariant(product, variantId));
      if (!found) {
        products = await decorate(await raw({ buyerIp, force: true }));
        found = products.find((product) => hasVariant(product, variantId));
      }
      return found ?? null;
    },

    async findByHandle(handle, { buyerIp } = {}) {
      const products = await decorate(await raw({ buyerIp }));
      return products.find((product) => product.handle === handle) ?? null;
    },

    invalidate() {
      cached = null;
    },
  };
}
