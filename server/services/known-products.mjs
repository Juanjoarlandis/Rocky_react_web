import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDropHandle } from '../../shared/drops.mjs';
import previewProducts from '../../shared/preview-products.mjs';
import { ensureLogger } from '../lib/logger.mjs';

// Handles de producto que la web puede pedir avisar: los conceptos de vista
// previa, el catálogo demo (leído del JSON con fs, sin importar src/) y los
// handles de sus drops, más el catálogo vivo de Shopify cuando lo hay.

const DEMO_CATALOG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/data/demoCatalog.json'
);

// Misma regla que src/shopify/normalize.js: «35 RED» → «35-red».
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function loadDemoCatalogHandles(filePath = DEMO_CATALOG_PATH, { logger } = {}) {
  const log = ensureLogger(logger);
  const handles = new Set();
  let products;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    products = Array.isArray(parsed) ? parsed : parsed?.products;
  } catch (error) {
    log.warn('Demo catalog could not be loaded for known product handles', {
      reason: error?.code || 'invalid_json',
    });
    return handles;
  }
  for (const product of Array.isArray(products) ? products : []) {
    const handle = slugify(product?.handle || product?.title);
    const dropHandle = slugify(product?.dropHandle || product?.drop || 'tienda');
    if (handle) handles.add(handle);
    if (dropHandle) handles.add(dropHandle);
  }
  return handles;
}

// Un aviso se acepta para un drop que se puede anunciar o comprar; no para uno
// cerrado ni para un borrador (avisos-de-drop).
const NOTIFIABLE_DROP_STATES = new Set(['anunciado', 'en-la-calle', 'ultimas-horas']);

export function createKnownProducts({
  catalog = null,
  drops = null,
  demoCatalogPath,
  logger,
} = {}) {
  const staticHandles = new Set([
    ...previewProducts.flatMap((product) => [product.handle, product.dropHandle]),
    ...loadDemoCatalogHandles(demoCatalogPath, { logger }),
  ]);

  return {
    staticHandles,

    async includes(handle) {
      // Con Shopify, para un drop manda su estado real: el rocky-drop-4 de la
      // demo no abre la lista si en la tienda está en borrador o cerrado.
      if (drops && isDropHandle(handle)) {
        try {
          const payload = await drops.publicPayload();
          const drop = payload.drops.find((candidate) => candidate.handle === handle);
          return Boolean(drop && NOTIFIABLE_DROP_STATES.has(drop.state));
        } catch {
          // Sin modelo de drops se sigue con lo estático y el catálogo.
        }
      }
      if (staticHandles.has(handle)) return true;
      if (drops) {
        try {
          const payload = await drops.publicPayload();
          const drop = payload.drops.find((candidate) => candidate.handle === handle);
          if (drop) return NOTIFIABLE_DROP_STATES.has(drop.state);
        } catch {
          // Sin modelo de drops se sigue con el catálogo.
        }
      }
      if (!catalog) return false;
      try {
        const { products } = await catalog.list();
        return products.some(
          (product) => product.handle === handle || product.drop?.handle === handle
        );
      } catch {
        return false;
      }
    },
  };
}
