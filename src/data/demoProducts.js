import demoCatalog from './demoCatalog.json';
import previewProducts from '../../shared/preview-products.mjs';
import { normalizeDemoCatalog } from '../features/storefront/normalize.js';

// El catálogo de muestra que se enseña cuando no hay Shopify configurado: el
// de demo, normalizado, más los productos de vista previa. App lo carga solo
// en modo demo.
export default Object.freeze([...normalizeDemoCatalog(demoCatalog), ...previewProducts]);
