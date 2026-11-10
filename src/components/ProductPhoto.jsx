import { localPhotoSources, productImageSize } from '../data/productImages.js';

/* La foto de un producto, pintada igual en todos los sitios: el navegador
   elige entre las variantes (srcSet) según `sizes`, el ancho al que la pinta
   quien la usa. Las fotos locales sacan sus variantes de la convención de
   nombre de public/products; las de Shopify traen las suyas del servidor. Una
   foto sin variantes se pinta con su URL y ya. */
function ProductPhoto({
  src,
  alt,
  width,
  height,
  sources,
  sizes,
  priority = false,
  // Se pide desde el principio (primera fila) pero sin prioridad alta.
  eager = false,
  // false: no reserva caja con width y height (el lightbox la ajusta por CSS
  // y con las dos medidas puestas recortaba cada eje por separado).
  intrinsicSize = true,
  className,
  onError,
}) {
  const variants = [...(sources?.length ? sources : localPhotoSources(src))].sort(
    (left, right) => left.width - right.width
  );
  const hasVariants = variants.length > 1;
  const size = productImageSize(src);

  return (
    <img
      src={src}
      srcSet={
        hasVariants ? variants.map(({ url, width: w }) => `${url} ${w}w`).join(', ') : undefined
      }
      sizes={hasVariants ? sizes : undefined}
      width={intrinsicSize ? (width ?? size.width) : undefined}
      height={intrinsicSize ? (height ?? size.height) : undefined}
      alt={alt}
      className={className}
      loading={priority || eager ? 'eager' : 'lazy'}
      decoding={priority ? 'auto' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      onError={onError}
    />
  );
}

export default ProductPhoto;
