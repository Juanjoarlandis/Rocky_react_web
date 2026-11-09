import { DROP_STATES, isOnSale, publicDrop } from '../../../shared/drops.mjs';

// El catálogo vivo (design.md, D5): toda la Storefront paginada de 50 en 50
// hasta 250, cacheada 30 s con una sola petición en vuelo. Cada producto lleva
// el drop del modelo (no su primera colección) y si se puede comprar ahora. Los
// diseños de un drop anunciado o en borrador no salen nunca: aunque Shopify ya
// no los sirve antes de su hora, esto cubre un producto publicado a mano.
//
// El estado se recalcula en cada consulta con la hora de ese momento; solo los
// datos de Shopify se cachean. Al caer un drop, la lectura de antes de su hora
// se da por vieja y durante un par de minutos se relee cada 5 s: Shopify tarda
// un poco en servir lo que publica con fecha. invalidate() sube una generación
// para que una lectura que empezó antes no se guarde como fresca.

const PAGE_SIZE = 50;
const MAX_PAGES = 5;
const DEFAULT_TTL_MS = 30_000;
// Una variante desconocida fuerza una relectura como mucho cada 5 s: si no, un
// bot con ids inventados haría releer el catálogo entero en cada petición.
const MIN_FORCED_REFRESH_MS = 5_000;
const HIDDEN = new Set([DROP_STATES.ANNOUNCED, DROP_STATES.DRAFT]);
const LAUNCH_WINDOW_MS = 2 * 60_000;
const LAUNCH_TTL_MS = 5_000;

export function createCatalogModel({
  storefront,
  dropsModel,
  clock = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
}) {
  let cached = null;
  let pending = null;
  let generation = 0;

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

  /* Cuánto vale la lectura guardada: nada si un drop cayó después de leerla;
     poco justo después de un lanzamiento; si no, el TTL normal. */
  async function ttlFor(fetchedAt, now) {
    let ttl = ttlMs;
    for (const source of await dropsModel.sources()) {
      const launch = Date.parse(source.config.launchAt ?? '');
      if (!Number.isFinite(launch) || launch > now) continue;
      if (launch > fetchedAt) return 0;
      if (now - launch < LAUNCH_WINDOW_MS) ttl = Math.min(ttl, LAUNCH_TTL_MS);
    }
    return ttl;
  }

  async function raw({ buyerIp, force = false } = {}) {
    const now = clock();
    const age = cached ? now - cached.fetchedAt : Infinity;
    const limit = force ? MIN_FORCED_REFRESH_MS : cached ? await ttlFor(cached.fetchedAt, now) : 0;
    if (cached && age < limit) return cached.products;
    if (!pending || pending.generation !== generation) {
      const startedAt = generation;
      const promise = fetchAll(buyerIp)
        .then((products) => {
          if (startedAt === generation) cached = { products, fetchedAt: clock() };
          return products;
        })
        .finally(() => {
          if (pending?.promise === promise) pending = null;
        });
      pending = { promise, generation: startedAt };
    }
    return pending.promise;
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

  async function fromDropsModel(variantId) {
    const now = new Date(clock());
    for (const source of await dropsModel.sources()) {
      const design = source.products.find((candidate) =>
        (candidate.variants ?? []).some((variant) => variant.id === variantId)
      );
      if (!design) continue;
      const state = publicDrop(source, now)?.state ?? DROP_STATES.DRAFT;
      return {
        handle: design.handle,
        title: design.title,
        drop: { handle: source.handle, title: source.title, number: source.config.number, state },
        purchasable: isOnSale(state),
      };
    }
    return null;
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
      // Más allá de los 250 productos leídos: el modelo de drops conoce las
      // variantes de cada diseño, así que el guardián no se queda ciego.
      return found ?? (await fromDropsModel(variantId));
    },

    async findByHandle(handle, { buyerIp } = {}) {
      const products = await decorate(await raw({ buyerIp }));
      return products.find((product) => product.handle === handle) ?? null;
    },

    invalidate() {
      generation += 1;
      cached = null;
    },
  };
}
