import { describe, expect, it } from 'vitest';
import { normalizeCart, normalizeCatalog, normalizeDemoCatalog, slugify } from './normalize.js';

describe('Shopify UI normalization', () => {
  it('maps products to handles and chooses the first sellable variant', () => {
    const products = normalizeCatalog([
      {
        id: 'gid://shopify/Product/1',
        handle: 'camiseta-rocky',
        title: 'Camiseta Rocky',
        description: 'Algodón',
        image: { url: 'https://cdn.shopify.com/tee.jpg', alt: 'Camiseta' },
        drop: { handle: 'drop-4', title: 'DROP 4' },
        variants: [
          {
            id: 'gid://shopify/ProductVariant/1',
            title: 'S',
            availableForSale: false,
            price: { amount: '30.00', currencyCode: 'EUR' },
            selectedOptions: [{ name: 'Talla', value: 'S' }],
          },
          {
            id: 'gid://shopify/ProductVariant/2',
            title: 'M',
            availableForSale: true,
            price: { amount: '35.00', currencyCode: 'EUR' },
            selectedOptions: [{ name: 'Talla', value: 'M' }],
          },
        ],
      },
    ]);

    expect(products[0]).toMatchObject({
      id: 'camiseta-rocky',
      handle: 'camiseta-rocky',
      shopifyId: 'gid://shopify/Product/1',
      image: 'https://cdn.shopify.com/tee.jpg',
      imageAlt: 'Camiseta',
      drop: 'DROP 4',
      defaultVariantId: 'gid://shopify/ProductVariant/2',
      price: { amount: '35.00', currencyCode: 'EUR' },
      availableForSale: true,
    });
  });

  /* sistema-de-drops (D14, H-019): el drop sale del modelo del servidor; un
     producto sin foto ya no se esconde «bajo llave» en un drop inventado. */
  it('toma el drop del modelo y deja en «Tienda» lo que no es de ningún drop', () => {
    const [enDrop, sinFoto] = normalizeCatalog([
      {
        handle: 'rocky-sin-frenos',
        title: 'Sin frenos',
        image: { url: 'https://cdn.shopify.com/tee.jpg', alt: '' },
        drop: { handle: 'rocky-drop-5', title: 'ROCKY DROP 5', number: 5, state: 'en-la-calle' },
        purchasable: true,
        variants: [],
      },
      {
        handle: 'sin-foto',
        title: 'Sin foto',
        image: null,
        drop: null,
        purchasable: true,
        variants: [],
      },
    ]);

    expect(enDrop).toMatchObject({
      drop: 'ROCKY DROP 5',
      dropHandle: 'rocky-drop-5',
      dropNumber: 5,
      dropState: 'en-la-calle',
      purchasable: true,
    });
    expect(sinFoto).toMatchObject({
      drop: 'Tienda',
      dropHandle: 'tienda',
      dropState: null,
      purchasable: true,
    });
  });

  it('un diseño de un drop cerrado llega marcado como no vendible', () => {
    const [cerrado] = normalizeCatalog([
      {
        handle: 'rocky-congelado',
        title: 'Congelado',
        image: { url: 'https://cdn.shopify.com/c.jpg', alt: '' },
        drop: { handle: 'rocky-drop-3', title: 'ROCKY DROP 3', number: 3, state: 'archivo' },
        purchasable: false,
        variants: [],
      },
    ]);
    expect(cerrado).toMatchObject({ dropState: 'archivo', purchasable: false });
  });

  it('maps only sanitized cart data and retains Shopify totals as Money values', () => {
    const cart = normalizeCart({
      totalQuantity: 2,
      lines: [
        {
          // Forma real de Shopify: UUID con guiones y token del carrito.
          id: 'gid://shopify/CartLine/c1cc8c01-8339-4bf3-bbcf-f9ada9a4df4a?cart=hWNFNxSlWtmqSRT6',
          quantity: 2,
          variant: {
            id: 'gid://shopify/ProductVariant/2',
            title: 'M',
            availableForSale: true,
            product: { handle: 'camiseta-rocky', title: 'Camiseta Rocky' },
            image: { url: 'https://cdn.shopify.com/tee.jpg', alt: 'Camiseta' },
            price: { amount: '35.00', currencyCode: 'EUR' },
          },
          cost: { totalAmount: { amount: '70.00', currencyCode: 'EUR' } },
        },
      ],
      cost: {
        subtotalAmount: { amount: '70.00', currencyCode: 'EUR' },
        totalAmount: { amount: '70.00', currencyCode: 'EUR' },
      },
    });

    expect(cart.items[0]).toEqual({
      id: 'gid://shopify/CartLine/c1cc8c01-8339-4bf3-bbcf-f9ada9a4df4a?cart=hWNFNxSlWtmqSRT6',
      lineId: 'gid://shopify/CartLine/c1cc8c01-8339-4bf3-bbcf-f9ada9a4df4a?cart=hWNFNxSlWtmqSRT6',
      productId: 'camiseta-rocky',
      variantId: 'gid://shopify/ProductVariant/2',
      variantTitle: 'M',
      availableForSale: true,
      title: 'Camiseta Rocky',
      image: 'https://cdn.shopify.com/tee.jpg',
      imageAlt: 'Camiseta',
      price: { amount: '35.00', currencyCode: 'EUR' },
      lineCost: { totalAmount: { amount: '70.00', currencyCode: 'EUR' } },
      quantity: 2,
    });
    expect(cart.cost.totalAmount.amount).toBe('70.00');
    expect(JSON.stringify(cart)).not.toContain('?key=');
  });

  it('normaliza el catálogo demo con handle, dropHandle y sin variantes', () => {
    const [tee, revealed] = normalizeDemoCatalog([
      {
        id: 1,
        drop: 'ROCKY DROP 4',
        title: '35 RED',
        specifications: ['Próximamente'],
        price: '??',
        image: '/products/placeholder-unreleased.webp',
        description: 'Roja',
      },
      {
        id: 15,
        drop: 'ROCKY DROP 4',
        title: 'RockyRacing',
        price: '35',
        image: '/products/rocky-racing.webp',
      },
    ]);
    expect(tee).toMatchObject({
      id: '35-red',
      handle: '35-red',
      demoId: 1,
      dropHandle: 'rocky-drop-4',
      variants: [],
      defaultVariantId: null,
      price: null,
      availableForSale: false,
      isPreview: false,
      isUnreleased: true,
      imageAlt: '35 RED',
    });
    expect(revealed).toMatchObject({ handle: 'rockyracing', price: '35', isUnreleased: false });
    expect(slugify('Ñandú · Éxito!')).toBe('nandu-exito');
  });
});

describe('tamaño y variantes de las fotos de Shopify', () => {
  const image = {
    url: 'https://cdn.shopify.com/tee.jpg',
    alt: 'Camiseta',
    width: 1200,
    height: 1600,
    sources: [
      { width: 320, url: 'https://cdn.shopify.com/tee.jpg?width=320' },
      { width: 640, url: 'https://cdn.shopify.com/tee.jpg?width=640' },
    ],
  };
  const variant = {
    id: 'gid://shopify/ProductVariant/2',
    title: 'M',
    availableForSale: true,
    price: { amount: '35.00', currencyCode: 'EUR' },
    image: null,
  };

  it('el catálogo conserva el tamaño real y las variantes de cada foto', () => {
    const [product] = normalizeCatalog([
      { id: 'p1', handle: 'camiseta-rocky', title: 'Camiseta Rocky', image, variants: [variant] },
    ]);

    expect(product).toMatchObject({
      image: image.url,
      imageWidth: 1200,
      imageHeight: 1600,
      imageSources: image.sources,
    });
  });

  it('una respuesta antigua, sin tamaño, sigue normalizándose igual', () => {
    const [product] = normalizeCatalog([
      {
        id: 'p1',
        handle: 'camiseta-rocky',
        title: 'Camiseta Rocky',
        image: { url: image.url, alt: 'Camiseta' },
        variants: [variant],
      },
    ]);

    expect(product.image).toBe(image.url);
    expect(product).not.toHaveProperty('imageWidth');
    expect(product).not.toHaveProperty('imageSources');
  });

  it('las líneas del carrito también', () => {
    const cart = normalizeCart({
      totalQuantity: 1,
      lines: [
        {
          id: 'gid://shopify/CartLine/c1cc8c01-8339-4bf3-bbcf-f9ada9a4df4a?cart=hWNFNxSlWtmqSRT6',
          quantity: 1,
          variant: {
            ...variant,
            image,
            product: { handle: 'camiseta-rocky', title: 'Camiseta Rocky' },
          },
        },
      ],
    });

    expect(cart.items[0]).toMatchObject({
      imageWidth: 1200,
      imageHeight: 1600,
      imageSources: image.sources,
    });
  });
});
