import { describe, expect, it, vi } from 'vitest';
import { createStorefrontClient } from './storefront.mjs';

const config = {
  storeDomain: 'rocky-dev.myshopify.com',
  apiVersion: '2026-07',
  storefrontToken: 'private-storefront-token',
  storefrontTokenType: 'private',
  exposeQuantity: true,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Forma que devuelve Shopify de verdad: UUID con guiones y el token del
// carrito colgando. Un fixture tipo .../CartLine/1 no existe en produccion y
// deja pasar validadores que rechazan todos los ids reales.
const REAL_LINE_ID =
  'gid://shopify/CartLine/c1cc8c01-8339-4bf3-bbcf-f9ada9a4df4a?cart=hWNFNxSlWtmqSRT63RRjQGep';

describe('Storefront client', () => {
  it('maps products and variants to a text-only commerce DTO', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          products: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: 'gid://shopify/Product/1',
                handle: 'camiseta-rocky',
                title: 'Camiseta Rocky',
                description: 'Algodón grueso',
                descriptionHtml: '<img src=x onerror=alert(1)>',
                featuredImage: { url: 'https://cdn.shopify.com/p.jpg', altText: 'Camiseta' },
                collections: { nodes: [{ handle: 'drop-4', title: 'DROP 4' }] },
                variants: {
                  nodes: [
                    {
                      id: 'gid://shopify/ProductVariant/2',
                      title: 'L',
                      availableForSale: true,
                      quantityAvailable: 3,
                      selectedOptions: [{ name: 'Talla', value: 'L' }],
                      price: { amount: '35.00', currencyCode: 'EUR' },
                      image: null,
                    },
                  ],
                },
              },
            ],
          },
        },
      })
    );
    const client = createStorefrontClient({ config, fetchImpl });

    const result = await client.listProducts({ first: 20, buyerIp: '203.0.113.10' });

    expect(result.products[0]).toEqual({
      id: 'gid://shopify/Product/1',
      handle: 'camiseta-rocky',
      title: 'Camiseta Rocky',
      description: 'Algodón grueso',
      image: { url: 'https://cdn.shopify.com/p.jpg', alt: 'Camiseta' },
      drop: { handle: 'drop-4', title: 'DROP 4' },
      variants: [
        {
          id: 'gid://shopify/ProductVariant/2',
          title: 'L',
          availableForSale: true,
          quantityAvailable: 3,
          selectedOptions: [{ name: 'Talla', value: 'L' }],
          price: { amount: '35.00', currencyCode: 'EUR' },
          image: null,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('descriptionHtml');
    expect(fetchImpl.mock.calls[0][1].headers).toMatchObject({
      'Shopify-Storefront-Private-Token': 'private-storefront-token',
      'Shopify-Storefront-Buyer-IP': '203.0.113.10',
    });
    expect(fetchImpl.mock.calls[0][1].headers).not.toHaveProperty(
      'X-Shopify-Storefront-Access-Token'
    );
  });

  it('never returns the secret cart ID and ignores client commerce fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          cartCreate: {
            cart: {
              id: 'gid://shopify/Cart/token?key=cart-secret',
              totalQuantity: 1,
              checkoutUrl: 'https://rocky-dev.myshopify.com/cart/c/checkout-secret',
              lines: {
                nodes: [
                  {
                    id: REAL_LINE_ID,
                    quantity: 1,
                    cost: {
                      totalAmount: { amount: '35.00', currencyCode: 'EUR' },
                    },
                    merchandise: {
                      id: 'gid://shopify/ProductVariant/2',
                      title: 'L',
                      availableForSale: true,
                      product: { handle: 'camiseta-rocky', title: 'Camiseta Rocky' },
                      image: null,
                      price: { amount: '35.00', currencyCode: 'EUR' },
                    },
                  },
                ],
              },
              cost: {
                subtotalAmount: { amount: '35.00', currencyCode: 'EUR' },
                totalAmount: { amount: '35.00', currencyCode: 'EUR' },
              },
            },
            userErrors: [],
            warnings: [],
          },
        },
      })
    );
    const client = createStorefrontClient({ config, fetchImpl });

    const result = await client.createCart({
      variantId: 'gid://shopify/ProductVariant/2',
      quantity: 1,
      price: '0.01',
      title: 'Manipulado',
    });

    expect(result.cart).not.toHaveProperty('id');
    expect(result.cart).not.toHaveProperty('checkoutUrl');
    expect(result.cart.lines[0].cost).toEqual({
      totalAmount: { amount: '35.00', currencyCode: 'EUR' },
    });
    expect(JSON.stringify(result)).not.toContain('cart-secret');
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.variables).toEqual({
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/2', quantity: 1 }],
    });
  });

  it('acepta el id de linea que Shopify devuelve de verdad', async () => {
    const cart = {
      id: 'gid://shopify/Cart/token?key=cart-secret',
      totalQuantity: 2,
      checkoutUrl: 'https://rocky-dev.myshopify.com/cart/c/checkout-secret',
      lines: { nodes: [] },
      cost: {
        subtotalAmount: { amount: '70.00', currencyCode: 'EUR' },
        totalAmount: { amount: '70.00', currencyCode: 'EUR' },
      },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: { cartLinesUpdate: { cart, userErrors: [], warnings: [] } } })
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { cartLinesRemove: { cart, userErrors: [], warnings: [] } } })
      );
    const client = createStorefrontClient({ config, fetchImpl });

    await expect(
      client.updateLines(cart.id, { lineId: REAL_LINE_ID, quantity: 2 })
    ).resolves.toMatchObject({ cart: { totalQuantity: 2 } });
    await expect(client.removeLines(cart.id, { lineId: REAL_LINE_ID })).resolves.toMatchObject({
      cart: { totalQuantity: 2 },
    });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).variables.lines).toEqual([
      { id: REAL_LINE_ID, quantity: 2 },
    ]);
  });

  it('sigue rechazando ids de linea imposibles sin llamar a Shopify', async () => {
    const fetchImpl = vi.fn();
    const client = createStorefrontClient({ config, fetchImpl });

    for (const lineId of [
      'gid://shopify/CartLine/abc?cart=token&extra=1',
      'gid://shopify/CartLine/abc?key=secreto',
      'gid://shopify/Product/1',
      '',
    ]) {
      await expect(
        client.updateLines('gid://shopify/Cart/t?key=k', { lineId, quantity: 1 })
      ).rejects.toMatchObject({ code: 'INVALID_LINE' });
      await expect(
        client.removeLines('gid://shopify/Cart/t?key=k', { lineId })
      ).rejects.toMatchObject({ code: 'INVALID_LINE' });
    }

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
