const PRODUCT_PLACEHOLDER = '/products/placeholder-unreleased.webp';

function firstSellableVariant(variants) {
  return variants.find((variant) => variant.availableForSale) || variants[0] || null;
}

export function normalizeCatalog(products = []) {
  return products.map((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const defaultVariant = firstSellableVariant(variants);
    return {
      id: product.handle,
      handle: product.handle,
      shopifyId: product.id,
      title: product.title,
      description: product.description || '',
      specifications: [],
      image: product.image?.url || defaultVariant?.image?.url || PRODUCT_PLACEHOLDER,
      imageAlt: product.image?.alt || defaultVariant?.image?.alt || product.title,
      drop: product.drop?.title || 'Tienda',
      dropHandle: product.drop?.handle || 'tienda',
      variants,
      defaultVariantId: defaultVariant?.id || null,
      price: defaultVariant?.price || null,
      availableForSale: Boolean(
        defaultVariant && variants.some((variant) => variant.availableForSale)
      ),
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
      title: line.variant.product.title,
      image: line.variant.image?.url || PRODUCT_PLACEHOLDER,
      imageAlt: line.variant.image?.alt || line.variant.product.title,
      price: line.variant.price,
      lineCost: line.cost || null,
      quantity: line.quantity,
    })),
    cost: cart.cost || null,
    totalQuantity: cart.totalQuantity || 0,
  };
}
