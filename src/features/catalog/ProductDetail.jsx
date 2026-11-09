import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from '../cart/AddToCartButton';
import EyeIcon from '../../components/icons/EyeIcon';
import { ProductReticle } from '../../components/doodles/ProductReticle';
import PlaceholderTee from './PlaceholderTee';
import DropAviso from './DropAviso';
import AddToCalendar from './AddToCalendar';
import sentadoBordeBlanco from '../../images/optimized/characters/sentado-borde-blanco-hd.webp';
import nubePaseando from '../../images/optimized/characters/nube-paseando-hd.webp';
import { formatPrice } from '../../utils/price';
import { PLACEHOLDER_IMAGE } from '../../config/commerce.js';
import { PURCHASE_STATES, purchaseLabel, purchaseState } from '../storefront/availability.js';
import '../../styles/components/product-media.css';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { prefersReducedMotion } from '../../utils/media.js';
import '../../styles/pages/product-detail.css';
import { useNightArt } from '../night/nightArt.js';

function ProductDetail({
  products,
  addToCart,
  commerceMode = 'demo',
  canAddToCart = true,
  loading = false,
  catalogError = '',
}) {
  const vigiaArt = useNightArt(sentadoBordeBlanco);
  const { productId } = useParams();
  const { hash } = useLocation();
  const [zoomOpen, setZoomOpen] = useState(false);
  const avisoRef = useRef(null);

  const product = products.find(
    (candidate) => String(candidate.handle ?? candidate.id) === String(productId)
  );
  useDocumentTitle(
    product?.title ||
      (loading
        ? 'Cargando producto'
        : catalogError
          ? 'Producto no disponible'
          : 'Producto no encontrado')
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => product?.defaultVariantId || product?.variants?.[0]?.id || null
  );

  React.useEffect(() => {
    setSelectedVariantId(product?.defaultVariantId || product?.variants?.[0]?.id || null);
  }, [product]);

  // Llegar con #aviso (desde «Avísame» en una tarjeta) deja el foco en el email
  const focusAviso = () => {
    const input = avisoRef.current?.querySelector('input[type="email"]');
    if (!input) return;
    input.scrollIntoView?.({
      block: 'center',
      behavior: prefersReducedMotion() ? 'instant' : 'smooth',
    });
    input.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (hash === '#aviso') focusAviso();
  }, [hash, product]);

  if (!product) {
    if (loading)
      return (
        <div className="page-loading" role="status">
          Cargando producto…
        </div>
      );
    if (catalogError)
      return (
        <div className="product-empty">
          <h1 className="page-title">Producto no disponible</h1>
          <p role="alert">{catalogError}</p>
          <Link to="/" className="btn btn--ghost">
            Volver a la tienda
          </Link>
        </div>
      );
    return (
      <div className="product-empty">
        <h1 className="page-title">Producto no encontrado</h1>
        <Link to="/" className="btn btn--ghost">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const isPlaceholder = product.image === PLACEHOLDER_IMAGE;
  const variants = product.variants || [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const price = formatPrice(selectedVariant?.price || product.price);
  const state = purchaseState(product, selectedVariant, {
    mode: commerceMode,
    cartEnabled: canAddToCart,
  });
  // Agotado del todo (su variante por defecto, la primera vendible, no está a la
  // venta), igual que en el catálogo: a eso no se apunta.
  const defaultVariant = variants.find((variant) => variant.id === product.defaultVariantId);
  const productSoldOut =
    purchaseState(product, defaultVariant, { mode: commerceMode, cartEnabled: canAddToCart }) ===
    PURCHASE_STATES.SOLD_OUT;

  return (
    <div className="page-container detail">
      <Link to="/" className="detail-back">
        ← Volver a la tienda
      </Link>

      <div className="detail-grid">
        <header className="detail-heading">
          <p className="kicker detail-drop">{product.drop}</p>
          <h1 className="detail-title squiggle-underline">{product.title}</h1>
        </header>

        <div className="detail-media-wrap tape">
          {/* Un chaval de la banda vigila el producto desde el marco */}
          <img
            src={vigiaArt}
            width="717"
            height="1186"
            decoding="async"
            alt=""
            className="detail-doodle neon-art al-ritmo"
            style={{ '--fase': '1' }}
          />
          <button
            type="button"
            className="paper-card detail-media"
            onClick={() => !isPlaceholder && setZoomOpen(true)}
            aria-label={`Ver ${product.title} en grande`}
            disabled={isPlaceholder}
          >
            {isPlaceholder ? (
              <PlaceholderTee title={product.title} />
            ) : (
              <img
                src={product.image}
                width={product.imageWidth ?? 1254}
                height={product.imageHeight ?? 1254}
                alt={product.title}
                className="detail-image"
              />
            )}
            {!isPlaceholder && !productSoldOut && <ProductReticle />}
            {!isPlaceholder && (
              <span className="product-zoom" aria-hidden="true">
                <EyeIcon />
              </span>
            )}
          </button>
        </div>

        <div className="detail-info">
          {product.description && <p className="detail-description">{product.description}</p>}
          {product.specifications?.length > 0 && (
            <ul className="detail-specs">
              {product.specifications.map((spec, index) => (
                <li key={index}>{spec}</li>
              ))}
            </ul>
          )}
          {variants.length > 1 && (
            <label className="detail-variant">
              <span>Variante</span>
              <select
                value={selectedVariantId || ''}
                onChange={(event) => setSelectedVariantId(event.target.value)}
              >
                {variants.map((variant) => {
                  const optionLabel = variant.selectedOptions?.length
                    ? variant.selectedOptions.map((option) => option.value).join(' / ')
                    : variant.title;
                  return (
                    <option
                      key={variant.id}
                      value={variant.id}
                      disabled={!variant.availableForSale}
                    >
                      {optionLabel}
                      {variant.availableForSale ? '' : ' — agotada'}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          <div className="detail-buy">
            {/* El Nube pasea por la línea de puntos con su paraguas */}
            <img
              src={nubePaseando}
              width="345"
              height="600"
              alt=""
              className="doodle detail-nube neon-art al-ritmo"
              style={{ '--fase': '0.4' }}
            />
            {price ? (
              <p className="detail-price">{price}</p>
            ) : (
              <p className="badge badge--dashed">Próximamente</p>
            )}
            {state === PURCHASE_STATES.NOTIFY ? (
              <button type="button" className="btn btn--primary" onClick={focusAviso}>
                Avísame
              </button>
            ) : (
              <AddToCartButton
                product={product}
                variantId={selectedVariantId}
                addToCart={addToCart}
                disabled={state !== PURCHASE_STATES.BUY}
                unavailableLabel={purchaseLabel(state)}
              />
            )}
            {/* Sin precio no hay compra, pero sí recado: el aviso
                            usa la misma identidad con la que se llegó aquí. */}
            {state === PURCHASE_STATES.NOTIFY && (
              <div id="aviso" ref={avisoRef}>
                <DropAviso producto={String(product.handle ?? product.id)} />
                <AddToCalendar />
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomOpen && (
        <Lightbox src={product.image} alt={product.title} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
}

export default ProductDetail;
