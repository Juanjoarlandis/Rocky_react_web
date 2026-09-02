import { formatPrice } from '../../utils/price.js';

/* La regla de compra, una sola vez para tarjetas, ficha y chat.

   Un producto se puede añadir sólo si no es un concepto, si su precio se
   conoce y si hay una variante que añadir; en modo Shopify, además, el
   carrito tiene que estar activo y la variante en stock. Todo lo demás
   acaba en uno de estos estados, y cada pantalla decide cómo contarlo. */

export const PURCHASE_STATES = Object.freeze({
    BUY: 'buy',
    PREVIEW: 'preview',
    NOTIFY: 'notify',
    SOLD_OUT: 'sold-out',
    CART_UNAVAILABLE: 'cart-unavailable',
});

export function hasKnownPrice(product, variant) {
    return Boolean(formatPrice(variant?.price ?? product?.price));
}

export function purchaseState(product, variant, { mode = 'demo', cartEnabled = true } = {}) {
    if (!product) return PURCHASE_STATES.NOTIFY;
    if (product.isPreview) return PURCHASE_STATES.PREVIEW;
    if (!hasKnownPrice(product, variant) || !variant) return PURCHASE_STATES.NOTIFY;
    if (mode === 'shopify' && !cartEnabled) return PURCHASE_STATES.CART_UNAVAILABLE;
    if (variant.availableForSale === false || product.availableForSale === false) {
        return PURCHASE_STATES.SOLD_OUT;
    }
    return PURCHASE_STATES.BUY;
}

export function canAddProduct(product, variant, context) {
    return purchaseState(product, variant, context) === PURCHASE_STATES.BUY;
}

const LABELS = Object.freeze({
    [PURCHASE_STATES.PREVIEW]: 'Vista previa',
    [PURCHASE_STATES.NOTIFY]: 'Avísame',
    [PURCHASE_STATES.SOLD_OUT]: 'Agotado',
    [PURCHASE_STATES.CART_UNAVAILABLE]: 'Carrito no disponible',
    [PURCHASE_STATES.BUY]: 'Añadir al carrito',
});

export function purchaseLabel(state) {
    return LABELS[state] || LABELS[PURCHASE_STATES.NOTIFY];
}
