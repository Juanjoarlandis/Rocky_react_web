const DEFAULT_TTL_MS = 60_000;
const CATALOG_PAGE_SIZE = 50;

// Caché de proceso del catálogo Shopify para lecturas internas (Rocky IA,
// validación de avisos): una página de 50 productos, un minuto de vida y
// una sola petición en vuelo aunque lleguen varias a la vez. Un fallo no se
// cachea. El valor devuelto es compartido: no se debe mutar.
export function createCatalogCache({
  storefront,
  ttlMs = DEFAULT_TTL_MS,
  clock = () => Date.now(),
}) {
  let cached = null;
  let pending = null;

  return {
    async list({ buyerIp } = {}) {
      if (cached && cached.expiresAt > clock()) return cached.value;
      if (!pending) {
        pending = storefront
          .listProducts({ first: CATALOG_PAGE_SIZE, buyerIp })
          .then((value) => {
            cached = { value, expiresAt: clock() + ttlMs };
            return value;
          })
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },

    invalidate() {
      cached = null;
    },
  };
}
