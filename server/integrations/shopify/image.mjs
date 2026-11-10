// La imagen de Shopify tal como la usa la web: además de la URL original, su
// tamaño real y una URL por ancho, que Shopify redimensiona en su CDN (y sirve
// en WebP o AVIF a quien lo acepta). Vale para la Storefront API y la Admin.

const SOURCE_WIDTHS = [320, 640, 1280];

export const IMAGE_FIELDS = [
  'url altText width height',
  ...SOURCE_WIDTHS.map((width) => `w${width}: url(transform: { maxWidth: ${width} })`),
].join(' ');

// { url, alt } como siempre, más { width, height, sources } cuando Shopify los
// manda. Shopify no amplía: una variante pedida más ancha que el original mide
// lo que el original, y dos variantes del mismo ancho se quedan en una.
export function mapShopifyImage(image) {
  if (!image) return null;
  const mapped = { url: image.url, alt: image.altText || '' };
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height)) return mapped;

  const sources = [];
  for (const requested of SOURCE_WIDTHS) {
    const url = image[`w${requested}`];
    const width = Math.min(requested, image.width);
    if (typeof url === 'string' && !sources.some((source) => source.width === width)) {
      sources.push({ width, url });
    }
  }
  return { ...mapped, width: image.width, height: image.height, sources };
}
