// Tamaño real de las fotos de producto de public/products, para que las
// tarjetas y la ficha reserven su sitio antes de que cargue la imagen.
export const PRODUCT_IMAGE_SIZES = Object.freeze({
  '/products/placeholder-unreleased.webp': [1254, 1254],
  '/products/rocky-airwave.webp': [1254, 1254],
  '/products/rocky-marea-035.webp': [1254, 1254],
  '/products/rocky-night-runner.webp': [1254, 1254],
  '/products/rocky-pit-crew.webp': [1254, 1254],
  '/products/rocky-racing.webp': [850, 850],
  '/products/rocky-signal-ghost.webp': [1254, 1254],
  '/products/rocky-solar-club.webp': [1254, 1254],
  '/products/rocky35-camel.webp': [5906, 5906],
  '/products/rockydz-boyz.webp': [5906, 5906],
});

export function productImageSize(src) {
  const [width, height] = PRODUCT_IMAGE_SIZES[src] || [1254, 1254];
  return { width, height };
}
