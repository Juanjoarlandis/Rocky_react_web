import { describe, expect, it } from 'vitest';
import { IMAGE_FIELDS, mapShopifyImage } from './image.mjs';

const cdn = (file, width) => `https://cdn.shopify.com/s/files/${file}?v=1&width=${width}`;

describe('imagen de Shopify', () => {
  it('pide a Shopify el tamaño real y una URL por ancho', () => {
    expect(IMAGE_FIELDS).toMatch(/\burl\b/);
    expect(IMAGE_FIELDS).toMatch(/\baltText\b/);
    expect(IMAGE_FIELDS).toMatch(/\bwidth\b/);
    expect(IMAGE_FIELDS).toMatch(/\bheight\b/);
    for (const width of [320, 640, 1280]) {
      expect(IMAGE_FIELDS).toContain(`w${width}: url(transform: { maxWidth: ${width} })`);
    }
  });

  it('añade el tamaño y las variantes sin tocar url ni alt', () => {
    expect(
      mapShopifyImage({
        url: 'https://cdn.shopify.com/s/files/foto.jpg?v=1',
        altText: 'Camiseta',
        width: 1200,
        height: 1600,
        w320: cdn('foto.jpg', 320),
        w640: cdn('foto.jpg', 640),
        w1280: cdn('foto.jpg', 1280),
      })
    ).toEqual({
      url: 'https://cdn.shopify.com/s/files/foto.jpg?v=1',
      alt: 'Camiseta',
      width: 1200,
      height: 1600,
      sources: [
        { width: 320, url: cdn('foto.jpg', 320) },
        { width: 640, url: cdn('foto.jpg', 640) },
        { width: 1200, url: cdn('foto.jpg', 1280) },
      ],
    });
  });

  it('declara 1.280 px cuando el original es mayor', () => {
    const image = mapShopifyImage({
      url: 'https://cdn.shopify.com/s/files/grande.jpg',
      altText: null,
      width: 4000,
      height: 3000,
      w320: cdn('grande.jpg', 320),
      w640: cdn('grande.jpg', 640),
      w1280: cdn('grande.jpg', 1280),
    });

    expect(image.alt).toBe('');
    expect(image.sources.map(({ width }) => width)).toEqual([320, 640, 1280]);
  });

  it('no repite variantes cuando el original es pequeño', () => {
    const image = mapShopifyImage({
      url: 'https://cdn.shopify.com/s/files/mini.png',
      altText: 'Mini',
      width: 500,
      height: 500,
      w320: cdn('mini.png', 320),
      w640: cdn('mini.png', 640),
      w1280: cdn('mini.png', 1280),
    });

    expect(image.sources).toEqual([
      { width: 320, url: cdn('mini.png', 320) },
      { width: 500, url: cdn('mini.png', 640) },
    ]);
  });

  it('una respuesta sin los campos nuevos sigue dando solo url y alt', () => {
    expect(mapShopifyImage({ url: 'https://cdn.shopify.com/p.jpg', altText: 'Camiseta' })).toEqual({
      url: 'https://cdn.shopify.com/p.jpg',
      alt: 'Camiseta',
    });
  });

  it('un producto sin foto sigue sin imagen', () => {
    expect(mapShopifyImage(null)).toBeNull();
    expect(mapShopifyImage(undefined)).toBeNull();
  });
});
