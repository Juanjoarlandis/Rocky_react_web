import { featuredDrop, parseDropConfig, publicDrop, sortForWall } from '../../../shared/drops.mjs';
import { ensureLogger } from '../../lib/logger.mjs';

// El modelo de drops: las colecciones `rocky-drop-*` leídas por la Admin API,
// validadas y cacheadas (design.md, D2). Una sola petición en vuelo y 30 s de
// vida. Si Shopify se cae, sirve la última lectura buena sin caducar: el estado
// se calcula con la hora de cada consulta, así que una lectura vieja sigue
// cerrando los drops a su hora y el guardián de la venta no se abre. El Taller
// lee en modo estricto: ahí un fallo tiene que verse.
//
// invalidate() sube una generación: una lectura que empezó antes no se guarda
// como fresca ni la reutiliza quien llega después.

const DEFAULT_TTL_MS = 30_000;

const launchTime = (source) => Date.parse(source.config.launchAt ?? '') || 0;

export function createDropsModel({
  dropsAdmin,
  clock = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
  logger,
}) {
  const log = ensureLogger(logger);
  let cached = null;
  let lastGood = null;
  let pending = null;
  let generation = 0;

  function validate(raw) {
    const sources = [];
    for (const collection of raw) {
      // Sin metacampo no es un drop (una colección antigua): se ignora sin
      // ruido. Un metacampo roto sí se avisa.
      if (collection.rawConfig === null || collection.rawConfig === undefined) continue;
      const parsed = parseDropConfig(collection.rawConfig);
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

  async function refresh(startedAt) {
    const value = validate(await dropsAdmin.listDrops());
    const read = { value, fetchedAt: clock() };
    if (startedAt === generation) {
      cached = read;
      lastGood = read;
    }
    return value;
  }

  async function sources({ strict = false } = {}) {
    if (!dropsAdmin) return [];
    if (cached && clock() - cached.fetchedAt < ttlMs) return cached.value;
    if (!pending || pending.generation !== generation) {
      const startedAt = generation;
      const promise = refresh(startedAt).finally(() => {
        if (pending?.promise === promise) pending = null;
      });
      pending = { promise, generation: startedAt };
    }
    try {
      return await pending.promise;
    } catch (error) {
      if (strict) throw error;
      if (lastGood) {
        log.warn('Drops servidos de la última lectura buena', { reason: error?.code || 'error' });
        return lastGood.value;
      }
      log.error('No se han podido leer los drops de Shopify', { reason: error?.code || 'error' });
      return [];
    }
  }

  return {
    sources,

    invalidate() {
      generation += 1;
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
