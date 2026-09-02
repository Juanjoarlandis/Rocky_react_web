import { describe, expect, it } from 'vitest';
import { PURCHASE_STATES, canAddProduct, purchaseLabel, purchaseState } from './availability.js';

const variant = { id: 'v1', availableForSale: true, price: { amount: '35.00', currencyCode: 'EUR' } };
const product = { handle: 'tee', title: 'Tee', price: variant.price, availableForSale: true };

describe('regla de compra única', () => {
    it('sin precio conocido no se añade en ningún modo', () => {
        for (const mode of ['demo', 'shopify']) {
            expect(canAddProduct({ ...product, price: '??' }, { ...variant, price: null }, { mode })).toBe(false);
            expect(canAddProduct({ ...product, price: null }, null, { mode })).toBe(false);
        }
        expect(purchaseState({ ...product, price: null }, null, { mode: 'demo' })).toBe(PURCHASE_STATES.NOTIFY);
    });

    it('sin variante tampoco, aunque el producto traiga precio', () => {
        expect(canAddProduct(product, null, { mode: 'demo' })).toBe(false);
        expect(canAddProduct(product, undefined, { mode: 'shopify', cartEnabled: true })).toBe(false);
    });

    it('los conceptos siempre son vista previa', () => {
        expect(purchaseState({ ...product, isPreview: true }, variant, { mode: 'shopify', cartEnabled: true })).toBe(
            PURCHASE_STATES.PREVIEW
        );
        expect(purchaseLabel(PURCHASE_STATES.PREVIEW)).toBe('Vista previa');
    });

    it('en Shopify exige carrito activo y stock', () => {
        expect(purchaseState(product, variant, { mode: 'shopify', cartEnabled: false })).toBe(
            PURCHASE_STATES.CART_UNAVAILABLE
        );
        expect(purchaseState(product, { ...variant, availableForSale: false }, { mode: 'shopify', cartEnabled: true })).toBe(
            PURCHASE_STATES.SOLD_OUT
        );
        expect(canAddProduct(product, variant, { mode: 'shopify', cartEnabled: true })).toBe(true);
    });

    it('en demo basta con precio y variante', () => {
        expect(canAddProduct(product, variant, { mode: 'demo' })).toBe(true);
        expect(purchaseLabel(PURCHASE_STATES.NOTIFY)).toBe('Avísame');
    });
});
