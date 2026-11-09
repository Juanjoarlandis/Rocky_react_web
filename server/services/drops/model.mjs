import { featuredDrop, parseDropConfig, publicDrop, sortForWall } from '../../../shared/drops.mjs';
import { ensureLogger } from '../../lib/logger.mjs';

// El modelo de drops: las colecciones `rocky-drop-*` leídas por la Admin API,
// validadas y cacheadas (design.md, D2). Una sola petición en vuelo, 30 s de
// vida y, si Shopify se cae, la última lectura buena durante 10 minutos; pasado
// eso la web se queda sin drops (y sigue vendiendo lo publicado). El Taller lee
// en modo estricto: ahí un fallo tiene que verse.

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_STALE_MS = 10 * 60_000;

const launchTime = (source) => Date.parse(source.config.launchAt ?? '') || 0;

export function createDropsModel({
  dropsAdmin,
  clock = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
  staleMs = DEFAULT_STALE_MS,
  logger,
}) {
  const log = ensureLogger(logger);
  let cached = null;
  let pending = null;

  function validate(raw) {
    const sources = [];
    for (const collection of raw) {
      const parsed = parseDropConfig(collection.rawConfig ?? '');
      if (!parsed.ok) {
        // Solo el handle y el campo: el contenido del metacampo no va al log.
        log.warn('Colección de drop con configuración no válida', {
          handle: collection.handle,
          field: parsed.error.field,
        });
        continue;
      }
      sources.push({ ...collection, config: parsed.config });
    }

    // Un diseño, un drop: si está en dos, se queda en el de lanzamiento más
    // reciente.
    const owner = new Map();
    for (const source of sources) {
      for (const product of source.products) {
        const current = owner.get(product.handle);
        if (!current || launchTime(source) > launchTime(current)) {
          if (current) {
            log.warn('Diseño en dos drops', {
              product: product.handle,
              kept: source.handle,
              dropped: current.handle,
            });
          }
          owner.set(product.handle, source);
        } else {
          log.warn('Diseño en dos drops', {
            product: product.handle,
            kept: current.handle,
            dropped: source.handle,
          });
        }
      }
    }
    return sources.map((source) => {
      const products = source.products.filter((product) => owner.get(product.handle) === source);
      return {
        ...source,
        products,
        designs: products.map((product) => ({
          handle: product.handle,
          availableForSale: product.availableForSale,
        })),
      };
    });
  }

  async function refresh() {
    const value = validate(await dropsAdmin.listDrops());
    cached = { value, fetchedAt: clock() };
    return value;
  }

  async function sources({ strict = false } = {}) {
    if (!dropsAdmin) return [];
    if (cached && clock() - cached.fetchedAt < ttlMs) return cached.value;
    if (!pending) {
      pending = refresh().finally(() => {
        pending = null;
      });
    }
    try {
      return await pending;
    } catch (error) {
      if (strict) throw error;
      if (cached && clock() - cached.fetchedAt < staleMs) {
        log.warn('Drops servidos de la última lectura buena', { reason: error?.code || 'error' });
        return cached.value;
      }
      log.error('No se han podido leer los drops de Shopify', { reason: error?.code || 'error' });
      return [];
    }
  }

  return {
    sources,

    invalidate() {
      cached = null;
    },

    /* Lo mismo que responde GET /api/drops. */
    async publicPayload(now = new Date(clock())) {
      const drops = sortForWall(
        (await sources()).map((source) => publicDrop(source, now)).filter(Boolean)
      );
      return { now: now.toISOString(), featured: featuredDrop(drops), drops };
    },

    async publicDrop(handle, now = new Date(clock())) {
      const source = (await sources()).find((candidate) => candidate.handle === handle);
      return source ? publicDrop(source, now) : null;
    },
  };
}
