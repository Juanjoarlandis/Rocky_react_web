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
                    id: 'gid://shopify/CartLine/1',
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
});
