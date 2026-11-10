import { PLACEHOLDER_IMAGE } from '../../config/commerce.js';
import { localPhotoSources } from '../../data/productImages.js';
import '../../styles/components/placeholder-tee.css';

const PLACEHOLDER_SRCSET = localPhotoSources(PLACEHOLDER_IMAGE)
  .map(({ url, width }) => `${url} ${width}w`)
  .join(', ');

/* La camiseta tapada: el mockup de un diseño que aún no se ve. `kicker` dice
   de qué drop es (solo si se sabe, nunca un drop fijo) y `description`, por qué
   no se ve: sin revelar o, si ya está a la venta, sin foto todavía. */
function PlaceholderTee({
  title = '',
  compact = false,
  priority = false,
  label = 'Diseño bajo llave',
  kicker = null,
  description = 'diseño todavía sin revelar',
  // Ancho al que se pinta, como en ProductPhoto: elige la variante del mockup.
  sizes = compact ? '96px' : '(max-width: 640px) 42vw, (max-width: 1100px) 380px, 280px',
}) {
  return (
    <span
      role="img"
      aria-label={title ? `${title} — ${description}` : description}
      className={`placeholder-tee${compact ? ' placeholder-tee--compact' : ''}`}
    >
      <img
        src={PLACEHOLDER_IMAGE}
        srcSet={PLACEHOLDER_SRCSET}
        sizes={sizes}
        alt=""
        width="1254"
        height="1254"
        decoding={priority ? 'auto' : 'async'}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        draggable="false"
        className="placeholder-tee__image"
      />
      {!compact && (
        <span className="placeholder-tee__label" aria-hidden="true">
          {kicker && <span>{kicker}</span>}
          <strong>{label}</strong>
        </span>
      )}
    </span>
  );
}

export default PlaceholderTee;
