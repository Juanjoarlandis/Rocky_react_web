import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

export function createKnownProducts({ catalog = null, demoCatalogPath, logger } = {}) {
  const staticHandles = new Set([
    ...previewProducts.flatMap((product) => [product.handle, product.dropHandle]),
    ...loadDemoCatalogHandles(demoCatalogPath, { logger }),
  ]);

  return {
    staticHandles,

    async includes(handle) {
      if (staticHandles.has(handle)) return true;
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
