const MAX_CHAT_PRODUCTS = 3;
const SAFE_HANDLE = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_VARIANT_ID = /^gid:\/\/shopify\/ProductVariant\/[A-Za-z0-9]+$/;
const SAFE_DEMO_IMAGE = /^\/products\/[a-z0-9][a-z0-9-]*\.(?:avif|jpe?g|png|webp)$/;
const COMMERCE_TERMS = new Set([
  'agotada',
  'agotado',
  'camiseta',
  'camisetas',
  'catalogo',
  'comprar',
  'compra',
  'cuanto',
  'cuesta',
  'cuestan',
  'disponible',
  'disponibles',
  'drop',
  'ensename',
  'hay',
  'muestrame',
  'precio',
  'precios',
  'producto',
  'productos',
  'queda',
  'quedan',
  'quiero',
  'recomienda',
  'recomiendame',
  'recomiendas',
  'ropa',
  'stock',
  'talla',
  'tallas',
  'teneis',
  'tienda',
  'todas',
  'todos',
  'vale',
  'valen',
  'ver',
]);
const COMMERCE_INTENT_TERMS = new Set([
  'agotada',
  'agotado',
  'camiseta',
  'camisetas',
  'catalogo',
  'compra',
  'comprar',
  'cuesta',
  'cuestan',
  'disponible',
  'disponibles',
  'drop',
  'precio',
  'precios',
  'producto',
  'productos',
  'ropa',
  'stock',
  'talla',
  'tallas',
  'tienda',
  'vale',
  'valen',
]);
const PRODUCT_REQUEST_TERMS = new Set([
  'ensename',
  'hay',
  'muestrame',
  'quiero',
  'recomienda',
  'recomiendame',
  'recomiendas',
  'teneis',
  'ver',
]);
const COMMERCE_FOLLOW_UP_TERMS = new Set([
  'esa',
  'ese',
  'estas',
  'estos',
  'cuanto',
  'cuesta',
  'cuestan',
  'precio',
  'precios',
  'stock',
  'talla',
  'tallas',
  'vale',
  'valen',
  'y',
]);
const SEARCH_STOP_TERMS = new Set([
  'algo',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'me',
  'para',
  'por',
  'que',
  'un',
  'una',
  'recomiendas',
  'ver',
  'y',
]);

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function safeText(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  return (
    value
      // Se limpian a propósito los caracteres de control que llegan del navegador.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength)
  );
}

function safeImage(image) {
  if (!image || typeof image.url !== 'string') return null;
  try {
    const url = new URL(image.url);
    if (url.protocol !== 'https:') return null;
    return { url: url.toString(), alt: safeText(image.alt, 160) };
  } catch {
    return null;
  }
}

function safeDemoImage(product) {
  const url = safeText(product?.image, 180);
  if (!SAFE_DEMO_IMAGE.test(url)) return null;
  return { url, alt: safeText(product.imageAlt, 160) || safeText(product.title, 120) };
}

function safeMoney(price) {
  const rawAmount = price?.amount;
  if (!['number', 'string'].includes(typeof rawAmount)) {
    return null;
  }
  const amountText = String(rawAmount).trim();
  const currencyText = typeof price?.currencyCode === 'string' ? price.currencyCode.trim() : '';
  if (
    !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amountText) ||
    !/^[A-Za-z]{3}$/.test(currencyText)
  ) {
    return null;
  }
  return {
    amount: Number(amountText).toFixed(2),
    currencyCode: currencyText.toUpperCase(),
  };
}

function safeQuantity(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function variantLabel(variant) {
  const optionValues = Array.isArray(variant?.selectedOptions)
    ? variant.selectedOptions.map((option) => safeText(option?.value, 40)).filter(Boolean)
    : [];
  return safeText(optionValues.join(' / ') || variant?.title || 'Variante', 80);
}

function sanitizeVariant(variant) {
  if (!SAFE_VARIANT_ID.test(variant?.id || '')) return null;
  const price = safeMoney(variant.price);
  if (!price) return null;
  return {
    id: variant.id,
    label: variantLabel(variant),
    availableForSale: Boolean(variant.availableForSale),
    quantityAvailable: safeQuantity(variant.quantityAvailable),
    price,
    image: safeImage(variant.image),
  };
}

function sanitizeProduct(product) {
  const handle = safeText(product?.handle, 120);
  const title = safeText(product?.title, 120);
  if (!SAFE_HANDLE.test(handle) || !title) return null;

  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .map(sanitizeVariant)
    .filter(Boolean);
  if (variants.length === 0) return null;

  const defaultVariant = variants.find((variant) => variant.availableForSale) || variants[0];
  return {
    handle,
    title,
    drop: safeText(product.drop?.title, 80) || 'Tienda',
    image: safeImage(product.image) || defaultVariant.image,
    price: defaultVariant.price,
    availableForSale: variants.some((variant) => variant.availableForSale),
    variants,
  };
}

function sanitizeDemoProduct(product) {
  const handle = safeText(product?.handle || product?.id, 120);
  const title = safeText(product?.title, 120);
  if (!SAFE_HANDLE.test(handle) || !title) return null;

  return {
    handle,
    title,
    drop: safeText(product.drop, 80) || 'Tienda',
    image: safeDemoImage(product),
    price: null,
    availableForSale: false,
    isPreview: true,
    variants: [],
  };
}

function termsForMessage(message) {
  return normalizeSearchText(message)
    .split(' ')
    .filter((term) => term.length > 1 && !COMMERCE_TERMS.has(term) && !SEARCH_STOP_TERMS.has(term));
}

function includesTerm(text, term) {
  const words = text.split(' ').filter(Boolean);
  if (words.includes(term)) return true;
  if (term.length < 5) return false;
  const singularTerm = term.slice(0, -1);
  return words.some(
    (word) => word === singularTerm || (word.length >= 5 && word.slice(0, -1) === term)
  );
}

function relevanceScore(messageTerms, product) {
  const title = normalizeSearchText(product.title);
  const drop = normalizeSearchText(
    typeof product.drop === 'string' ? product.drop : product.drop?.title
  );
  const description = normalizeSearchText(product.description);
  const variants = normalizeSearchText(
    (product.variants || [])
      .flatMap((variant) => [
        variant.title,
        ...(variant.selectedOptions || []).flatMap((option) => [option.name, option.value]),
      ])
      .join(' ')
  );

  return messageTerms.reduce((score, term) => {
    if (includesTerm(title, term)) return score + 12;
    if (includesTerm(variants, term)) return score + 7;
    if (includesTerm(drop, term)) return score + 5;
    if (includesTerm(description, term)) return score + 3;
    return score;
  }, 0);
}

function referencesKnownProduct(message, knownProducts) {
  const normalizedMessage = ` ${normalizeSearchText(message)} `;
  return (Array.isArray(knownProducts) ? knownProducts : []).some((product) =>
    [product?.handle, product?.title]
      .map(normalizeSearchText)
      .filter((value) => value.length >= 3)
      .some((value) => normalizedMessage.includes(` ${value} `))
  );
}

function hasDirectCommerceIntent(message, knownProducts) {
  const terms = new Set(normalizeSearchText(message).split(' '));
  if ([...COMMERCE_INTENT_TERMS].some((term) => terms.has(term))) return true;
  return (
    [...PRODUCT_REQUEST_TERMS].some((term) => terms.has(term)) &&
    referencesKnownProduct(message, knownProducts)
  );
}

export function hasCommerceIntent(message, { history = [], knownProducts = [] } = {}) {
  if (hasDirectCommerceIntent(message, knownProducts)) return true;

  const hasRecentCommerceTurn = (Array.isArray(history) ? history : [])
    .slice(-4)
    .some(
      (entry) => entry?.role === 'user' && hasDirectCommerceIntent(entry.content, knownProducts)
    );
  if (!hasRecentCommerceTurn) return false;

  const terms = new Set(normalizeSearchText(message).split(' '));
  return [...COMMERCE_FOLLOW_UP_TERMS].some((term) => terms.has(term));
}

export function selectChatProducts(message, products, limit = MAX_CHAT_PRODUCTS) {
  return selectCatalogChatProducts(message, products, [], limit);
}

function rankedProducts(messageTerms, products, source) {
  return (Array.isArray(products) ? products : []).map((product, index) => ({
    product,
    index,
    source,
    score: relevanceScore(messageTerms, product),
    isAvailable:
      source === 'shopify' && (product.variants || []).some((variant) => variant.availableForSale),
  }));
}

export function selectCatalogChatProducts(
  message,
  shopifyProducts = [],
  demoProducts = [],
  limit = MAX_CHAT_PRODUCTS
) {
  const boundedLimit = Math.max(
    1,
    Math.min(Number.parseInt(limit, 10) || MAX_CHAT_PRODUCTS, MAX_CHAT_PRODUCTS)
  );
  const messageTerms = termsForMessage(message);
  const liveHandles = new Set(
    (Array.isArray(shopifyProducts) ? shopifyProducts : [])
      .map((product) => safeText(product?.handle, 120))
      .filter((handle) => SAFE_HANDLE.test(handle))
  );
  const distinctDemoProducts = (Array.isArray(demoProducts) ? demoProducts : []).filter(
    (product) => !liveHandles.has(safeText(product?.handle, 120))
  );

  const ranked = [
    ...rankedProducts(messageTerms, shopifyProducts, 'shopify'),
    ...rankedProducts(messageTerms, distinctDemoProducts, 'preview'),
  ];
  const hasSpecificRequest = messageTerms.length > 0;

  return ranked
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.isAvailable) - Number(left.isAvailable) ||
        Number(right.source === 'shopify') - Number(left.source === 'shopify') ||
        left.index - right.index
    )
    .filter((candidate) => !hasSpecificRequest || candidate.score > 0)
    .map(({ product, source }) =>
      source === 'shopify' ? sanitizeProduct(product) : sanitizeDemoProduct(product)
    )
    .filter(Boolean)
    .slice(0, boundedLimit);
}

export function selectDemoChatProducts(message, products, limit = MAX_CHAT_PRODUCTS) {
  return selectCatalogChatProducts(message, [], products, limit);
}

export function buildCommerceContext(products) {
  if (!Array.isArray(products) || products.length === 0) return '';

  const facts = products.map((product) => ({
    product: product.title,
    drop: product.drop,
    availability: product.isPreview
      ? 'vista previa sin stock real'
      : product.availableForSale
        ? 'disponible'
        : 'agotado',
    variants: product.variants.map((variant) => ({
      name: variant.label,
      availability: variant.availableForSale ? 'disponible' : 'agotada',
    })),
  }));

  return `CATÁLOGO VERIFICADO PARA ESTA RESPUESTA
Estos datos los ha seleccionado el servidor y las tarjetas visibles debajo son la fuente de verdad. Recomienda sólo productos de esta lista. Si un producto es una vista previa, descríbelo como concepto y no afirmes que se puede comprar. Menciona sus nombres si ayuda, pero no repitas precios ni cantidades: indica al usuario que los consulte en las tarjetas. No inventes variantes, descuentos ni disponibilidad.
DATOS: ${JSON.stringify(facts)}`;
}

function joinProductTitles(products) {
  const titles = products.map((product) => product.title);
  if (titles.length <= 1) return titles[0] || '';
  return `${titles.slice(0, -1).join(', ')} y ${titles.at(-1)}`;
}

export function buildVerifiedCommerceReply(
  products,
  { catalogUnavailable = false, searchAttempted = false } = {}
) {
  if (catalogUnavailable) {
    return 'Ahora mismo no puedo verificar el catálogo en directo, así que no te confirmaré stock, precio ni disponibilidad. Prueba de nuevo en un momento.';
  }

  if (!Array.isArray(products) || products.length === 0) {
    return searchAttempted
      ? 'No he encontrado una coincidencia verificable en el catálogo para eso. Prueba con otro color, nombre o drop.'
      : '';
  }

  const previews = products.filter((product) => product.isPreview);
  const published = products.filter((product) => !product.isPreview);

  if (previews.length > 0 && published.length > 0) {
    return `He encontrado ${joinProductTitles(published)} en el catálogo. También te enseño ${joinProductTitles(previews)} como vista previa: esas piezas no tienen stock, precio ni tallas reales y no se pueden comprar.`;
  }

  if (previews.length > 0) {
    return `Te he sacado ${joinProductTitles(previews)}. Son conceptos en vista previa, sin stock, precio ni tallas reales, y todavía no se pueden comprar.`;
  }

  return `He encontrado ${joinProductTitles(published)} en el catálogo. El stock, el precio y las tallas vigentes son exclusivamente los que aparecen en sus tarjetas.`;
}
