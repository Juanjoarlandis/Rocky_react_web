import { describe, expect, it } from 'vitest';
import {
  buildCommerceContext,
  hasCommerceIntent,
  selectCatalogChatProducts,
  selectChatProducts,
  selectDemoChatProducts,
} from './chat-commerce.mjs';
import previewProducts from './preview-products.mjs';

const products = [
  {
    id: 'gid://shopify/Product/1',
    handle: 'rockydz-boyz',
    title: 'Rockydz Boyz',
    description: 'Camiseta oversize blanca con los personajes de la casa.',
    image: { url: 'https://cdn.shopify.com/boyz.jpg', alt: 'Rockydz Boyz blanca' },
    drop: { handle: 'drop-4', title: 'DROP 4' },
    variants: [
      {
        id: 'gid://shopify/ProductVariant/11',
        title: 'S',
        availableForSale: false,
        quantityAvailable: 0,
        selectedOptions: [{ name: 'Talla', value: 'S' }],
        price: { amount: '35.00', currencyCode: 'EUR' },
        image: null,
      },
      {
        id: 'gid://shopify/ProductVariant/12',
        title: 'M',
        availableForSale: true,
        quantityAvailable: 3,
        selectedOptions: [{ name: 'Talla', value: 'M' }],
        price: { amount: '35.00', currencyCode: 'EUR' },
        image: null,
      },
    ],
  },
  {
    id: 'gid://shopify/Product/2',
    handle: 'smoker-edition',
    title: 'Smoker Edition',
    description: 'Camiseta azul royal con el camello ROCKY35.',
    image: { url: 'javascript:alert(1)', alt: '<b>unsafe</b>' },
    drop: { handle: 'drop-4', title: 'DROP 4' },
    variants: [
      {
        id: 'gid://shopify/ProductVariant/21',
        title: 'L',
        availableForSale: true,
        quantityAvailable: null,
        selectedOptions: [{ name: 'Talla', value: 'L' }],
        price: { amount: '39.00', currencyCode: 'EUR' },
        image: null,
      },
    ],
  },
  {
    id: 'gid://shopify/Product/3',
    handle: 'agotada-negra',
    title: 'Agotada Negra',
    description: 'Camiseta negra.',
    image: null,
    drop: null,
    variants: [
      {
        id: 'gid://shopify/ProductVariant/31',
        title: 'M',
        availableForSale: false,
        quantityAvailable: 0,
        selectedOptions: [{ name: 'Talla', value: 'M' }],
        price: { amount: '30.00', currencyCode: 'EUR' },
        image: null,
      },
    ],
  },
];

const demoProducts = [
  {
    id: 23,
    handle: 'rocky-night-runner',
    title: 'Night Runner',
    description: 'Camiseta negra para salir de noche con mapa urbano y estética racing.',
    image: '/products/rocky-night-runner.webp',
    imageAlt: 'Camiseta negra Night Runner',
    drop: 'ASPHALT AFTERDARK',
    dropHandle: 'asphalt-afterdark',
  },
  {
    id: 25,
    handle: 'rocky-airwave',
    title: 'Airwave',
    description: 'Camiseta blanca con personaje radio en azul cobalto y naranja.',
    image: '/products/rocky-airwave.webp',
    imageAlt: 'Camiseta blanca Airwave con personaje radio',
    drop: 'COLMENA SIGNAL',
    dropHandle: 'colmena-signal',
  },
  {
    id: 27,
    handle: 'rocky-solar-club',
    title: 'Solar Club',
    description: 'Camiseta color arena de verano con sol, skate y ola turquesa.',
    image: '/products/rocky-solar-club.webp',
    imageAlt: 'Camiseta arena Solar Club',
    drop: 'COSTA 035',
    dropHandle: 'costa-035',
  },
];

describe('Rocky IA commerce context', () => {
  it.each([
    'Enséñame camisetas disponibles',
    'Enséñame Airwave',
    '¿Tenéis Airwave?',
    '¿Hay Airwave?',
    '¿Cuánto cuesta Airwave?',
    '¿Tenéis stock de la Smoker?',
    'Quiero comprar algo del drop',
    '¿Qué talla me recomiendas?',
  ])('recognizes a shopping request: %s', (message) => {
    expect(hasCommerceIntent(message, { knownProducts: demoProducts })).toBe(true);
  });

  it('recognizes an abbreviated commerce follow-up from server-owned history', () => {
    expect(hasCommerceIntent('¿Y esa?', {
      knownProducts: demoProducts,
      history: [{ role: 'user', content: 'Enséñame Airwave' }],
    })).toBe(true);
  });

  it.each([
    '¿Quién es El Dormilón?',
    'Quiero saber quién es El Dormilón',
    'Recomiéndame un tema de LA COLMENA',
  ])('keeps unrelated crew questions away from Shopify: %s', (message) => {
    expect(hasCommerceIntent(message)).toBe(false);
  });

  it('ranks matching sellable products and returns a bounded safe card DTO', () => {
    const selected = selectChatProducts('Quiero la camiseta Smoker azul en talla L', products, 2);

    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({
      handle: 'smoker-edition',
      title: 'Smoker Edition',
      availableForSale: true,
      image: null,
      variants: [
        {
          id: 'gid://shopify/ProductVariant/21',
          label: 'L',
          availableForSale: true,
          quantityAvailable: null,
          price: { amount: '39.00', currencyCode: 'EUR' },
        },
      ],
    });
    expect(selected[0]).not.toHaveProperty('description');
    expect(selected.map((product) => product.handle)).not.toContain('agotada-negra');
  });

  it('preserves unavailable matches when they are the requested product', () => {
    const [selected] = selectChatProducts('¿Hay stock de Agotada Negra?', products, 3);

    expect(selected).toMatchObject({
      handle: 'agotada-negra',
      availableForSale: false,
      variants: [{ quantityAvailable: 0 }],
    });
  });

  it('builds a fact-only context that directs numeric details to the cards', () => {
    const selected = selectChatProducts('Muéstrame camisetas', products, 2);
    const context = buildCommerceContext(selected);

    expect(context).toContain('CATÁLOGO VERIFICADO');
    expect(context).toContain('Rockydz Boyz');
    expect(context).toContain('no repitas precios ni cantidades');
    expect(context).not.toContain('personajes de la casa');
  });

  it.each([
    ['Quiero una camiseta negra para salir de noche', 'rocky-night-runner'],
    ['Enséñame una camiseta con personaje radio azul', 'rocky-airwave'],
    ['Busco camiseta arena para verano y skate', 'rocky-solar-club'],
  ])('ranks local preview concepts without inventing live commerce: %s', (message, handle) => {
    const [selected] = selectDemoChatProducts(message, demoProducts, 1);

    expect(selected).toMatchObject({
      handle,
      isPreview: true,
      availableForSale: false,
      price: null,
      variants: [],
    });
    expect(selected.image.url).toMatch(/^\/products\/[a-z0-9-]+\.webp$/);
  });

  it('labels preview products as non-live facts in the assistant context', () => {
    const selected = selectDemoChatProducts('Camiseta negra de noche', demoProducts, 1);
    const context = buildCommerceContext(selected);

    expect(context).toContain('vista previa sin stock real');
    expect(context).toContain('ASPHALT AFTERDARK');
    expect(context).not.toContain('"availability":"agotado"');
  });

  it('does not pad a specific recommendation with zero-score preview concepts', () => {
    const selected = selectDemoChatProducts(
      'Quiero una camiseta blanca con un personaje radio azul',
      demoProducts
    );

    expect(selected.map((product) => product.handle)).toEqual(['rocky-airwave']);
  });

  it('returns no cards when a specific preview request has no semantic match', () => {
    expect(selectDemoChatProducts('Quiero una camiseta morada', previewProducts)).toEqual([]);
  });

  it.each([
    ['noche y mapa urbano', 'rocky-night-runner'],
    ['pit crew racing', 'rocky-pit-crew'],
    ['radio azul', 'rocky-airwave'],
    ['fantasma televisor', 'rocky-signal-ghost'],
    ['arena verano', 'rocky-solar-club'],
    ['marea ola cruiser', 'rocky-marea-035'],
  ])('ranks every preview concept using its semantic description: %s', (message, handle) => {
    const selected = selectDemoChatProducts(`Enséñame una camiseta ${message}`, previewProducts, 1);
    expect(selected.map((product) => product.handle)).toEqual([handle]);
  });

  it.each([
    null,
    '',
    '   ',
    '0x10',
    '1e3',
    '+35.00',
    '-1.00',
    '35.000',
    '123456789.00',
  ])('rejects malformed Shopify prices instead of showing zero: %j', (amount) => {
    const malformed = [{
      ...products[0],
      variants: [{ ...products[0].variants[1], price: { amount, currencyCode: 'EUR' } }],
    }];

    expect(selectChatProducts('Rockydz Boyz', malformed)).toEqual([]);
  });

  it.each(['EURO', 'EUR<script>', 'EU', '€']) (
    'rejects malformed Shopify currency codes instead of truncating them: %s',
    (currencyCode) => {
      const malformed = [{
        ...products[0],
        variants: [{
          ...products[0].variants[1],
          price: { amount: '35.00', currencyCode },
        }],
      }];

      expect(selectChatProducts('Rockydz Boyz', malformed)).toEqual([]);
    }
  );

  it('ranks matching previews beside Shopify products without changing their commerce shape', () => {
    const selected = selectCatalogChatProducts(
      'Quiero comparar Night Runner y Rockydz Boyz',
      products,
      demoProducts,
      3
    );

    expect(selected).toEqual(expect.arrayContaining([
      expect.objectContaining({
        handle: 'rocky-night-runner',
        isPreview: true,
        variants: [],
      }),
      expect.objectContaining({
        handle: 'rockydz-boyz',
        availableForSale: true,
        variants: expect.arrayContaining([
          expect.objectContaining({ id: 'gid://shopify/ProductVariant/12' }),
        ]),
      }),
    ]));
  });

  it('lets a live Shopify product win an equal preview handle', () => {
    const liveAirwave = {
      ...products[0],
      handle: 'rocky-airwave',
      title: 'Airwave publicada',
      description: 'Camiseta blanca con personaje radio azul.',
    };

    const selected = selectCatalogChatProducts(
      'Enséñame la camiseta Airwave',
      [liveAirwave],
      previewProducts
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({
      handle: 'rocky-airwave',
      title: 'Airwave publicada',
      availableForSale: true,
    });
    expect(selected[0]).not.toHaveProperty('isPreview');
  });

  it.each([
    'Ver camisetas disponibles',
    '¿Qué talla me recomiendas?',
    'Recomiéndame una camiseta',
    'Ver todos los productos',
  ])('keeps a generic commerce prompt on the bounded catalog fallback: %s', (message) => {
    expect(selectCatalogChatProducts(message, products, previewProducts)).toHaveLength(3);
  });
});
