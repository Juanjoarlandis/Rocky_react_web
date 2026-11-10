// Tamaño real de las fotos de producto de public/products, para que las
// tarjetas y la ficha reserven su sitio antes de que cargue la imagen. Cada
// una tiene además sus variantes <nombre>-640.webp y <nombre>-320.webp, que
// genera `npm run images:optimize -- --widths 320,640,1280`.
export const PRODUCT_IMAGE_SIZES = Object.freeze({
  '/products/placeholder-unreleased.webp': [1254, 1254],
  '/products/rocky-airwave.webp': [1254, 1254],
  '/products/rocky-marea-035.webp': [1254, 1254],
  '/products/rocky-night-runner.webp': [1254, 1254],
  '/products/rocky-pit-crew.webp': [1254, 1254],
  '/products/rocky-racing.webp': [850, 850],
  '/products/rocky-signal-ghost.webp': [1254, 1254],
  '/products/rocky-solar-club.webp': [1254, 1254],
  '/products/rocky35-camel.webp': [1280, 1280],
  '/products/rockydz-boyz.webp': [1280, 1280],
});

export function productImageSize(src) {
  const [width, height] = PRODUCT_IMAGE_SIZES[src] || [1254, 1254];
  return { width, height };
}

const VARIANT_WIDTHS = [320, 640];

// Variantes de una foto local, de menor a mayor: [{ width, url }]. Una foto
// que no es de public/products no tiene ninguna.
export function localPhotoSources(src) {
  const size = PRODUCT_IMAGE_SIZES[src];
  if (!size) return [];
  const [width] = size;
  return [
    ...VARIANT_WIDTHS.filter((variant) => variant < width).map((variant) => ({
      width: variant,
      url: src.replace(/\.webp$/, `-${variant}.webp`),
    })),
    { width, url: src },
  ];
}
