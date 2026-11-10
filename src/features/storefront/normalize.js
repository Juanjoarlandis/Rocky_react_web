import { PLACEHOLDER_IMAGE as PRODUCT_PLACEHOLDER } from '../../config/commerce.js';
import { productImageSize } from '../../data/productImages.js';

/* «35 RED» → «35-red», «ROCKY DROP 4» → «rocky-drop-4»: los handles del
   catálogo demo salen del título, como haría Shopify. */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* El tamaño real y las variantes que manda el servidor para una foto de
   Shopify. Una respuesta antigua, sin esos campos, no añade nada. */
function photoSize(image) {
  if (!image?.url) return {};
  return {
    ...(image.width && image.height && { imageWidth: image.width, imageHeight: image.height }),
    ...(Array.isArray(image.sources) && image.sources.length && { imageSources: image.sources }),
  };
}

function firstSellableVariant(variants) {
  return variants.find((variant) => variant.availableForSale) || variants[0] || null;
}

/* El drop de cada diseño lo decide el servidor con el modelo de drops
   (catalogo-vivo): { handle, title, number, state } o null. Lo que no es de
   ningún drop va a «Tienda»; un producto sin foto ya no se esconde bajo llave. */
function dropOf(product) {
  if (product.drop?.handle) {
    return {
      title: product.drop.title,
      handle: product.drop.handle,
      number: product.drop.number ?? null,
      state: product.drop.state ?? null,
    };
  }
  return { title: 'Tienda', handle: 'tienda', number: null, state: null };
}

export function normalizeCatalog(products = []) {
  return products.map((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const defaultVariant = firstSellableVariant(variants);
    const photo = product.image?.url ? product.image : defaultVariant?.image;
    const image = photo?.url || PRODUCT_PLACEHOLDER;
    const drop = dropOf(product);
    return {
      id: product.handle,
      handle: product.handle,
      shopifyId: product.id,
      title: product.title,
      description: product.description || '',
      specifications: [],
      image,
      ...photoSize(photo),
      imageAlt: product.image?.alt || defaultVariant?.image?.alt || product.title,
      drop: drop.title,
      dropHandle: drop.handle,
      dropNumber: drop.number,
      dropState: drop.state,
      purchasable: product.purchasable !== false,
      variants,
      defaultVariantId: defaultVariant?.id || null,
      price: defaultVariant?.price || null,
      availableForSale: Boolean(
        defaultVariant && variants.some((variant) => variant.availableForSale)
      ),
    };
  });
}

/* El catálogo demo (src/data/demoCatalog.json) adopta la misma forma que el
   de Shopify: handle, dropHandle, variants (ninguna: nada se puede añadir),
   precio nulo cuando es «??» y la marca de diseño sin revelar. */
export function normalizeDemoCatalog(products = []) {
  return products.map((product) => {
    const handle = slugify(product.handle || product.title);
    const image = product.image || PRODUCT_PLACEHOLDER;
    const { width: imageWidth, height: imageHeight } = productImageSize(image);
    const price =
      typeof product.price === 'string' && /\d/.test(product.price) ? product.price : null;
    return {
      id: handle,
      handle,
      demoId: product.id ?? null,
      title: product.title,
      description: product.description || '',
      specifications: Array.isArray(product.specifications) ? [...product.specifications] : [],
      image,
      imageWidth,
      imageHeight,
      imageAlt: product.imageAlt || product.title,
      drop: product.drop || 'Tienda',
      dropHandle: slugify(product.dropHandle || product.drop || 'tienda'),
      variants: [],
      defaultVariantId: null,
      price,
      availableForSale: false,
      isPreview: false,
      isUnreleased: image === PRODUCT_PLACEHOLDER,
    };
  });
}

export function normalizeCart(cart) {
  if (!cart) return { items: [], cost: null, totalQuantity: 0 };
  return {
    items: (cart.lines || []).map((line) => ({
      id: line.id,
      lineId: line.id,
      productId: line.variant.product.handle,
      variantId: line.variant.id,
      variantTitle: line.variant.title,
      availableForSale: Boolean(line.variant.availableForSale),
      title: line.variant.product.title,
      image: line.variant.image?.url || PRODUCT_PLACEHOLDER,
      ...photoSize(line.variant.image),
      imageAlt: line.variant.image?.alt || line.variant.product.title,
      price: line.variant.price,
      lineCost: line.cost || null,
      quantity: line.quantity,
    })),
    cost: cart.cost || null,
    totalQuantity: cart.totalQuantity || 0,
  };
}
