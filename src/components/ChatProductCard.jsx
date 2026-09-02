import { useState } from 'react';
import { Link } from 'react-router';
import AddToCartButton from './AddToCartButton';
import PlaceholderTee from './PlaceholderTee';
import { formatPrice } from '../utils/price';
import {
  PURCHASE_STATES,
  purchaseLabel,
  purchaseState,
} from '../features/storefront/availability.js';
import '../styles/components/chat-product-card.css';

function firstAvailableVariant(variants) {
  return variants.find((variant) => variant.availableForSale) || variants[0] || null;
}

function stockLabel(variant, isPreview) {
  if (isPreview) return 'Vista previa';
  if (!variant?.availableForSale) return 'Agotada';
  if (variant.quantityAvailable === 1) return 'Última unidad';
  if (variant.quantityAvailable > 1) return `${variant.quantityAvailable} unidades`;
  return 'Disponible';
}

function ChatProductCard({ product, addToCart, commerceMode = 'demo', canAddToCart = false }) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => firstAvailableVariant(variants)?.id || ''
  );
  const [failedImageUrl, setFailedImageUrl] = useState(null);

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || null;
  const productImage = selectedVariant?.image || product.image;
  const hasImageError = Boolean(productImage?.url && failedImageUrl === productImage.url);
  const price = formatPrice(selectedVariant?.price || product.price);
  const productPath = `/product/${encodeURIComponent(product.handle)}`;
  const state = purchaseState(product, selectedVariant, {
    mode: commerceMode,
    cartEnabled: canAddToCart,
  });
  const productForCart = {
    ...product,
    id: product.handle,
    image: productImage?.url || null,
    imageAlt: productImage?.alt || product.title,
    defaultVariantId: selectedVariant?.id || null,
  };

  return (
    <article className="chat-product-card">
      <Link to={productPath} className="chat-product-media" aria-label={`Ver ${product.title}`}>
        {productImage?.url && !hasImageError ? (
          <img
            src={productImage.url}
            width={productImage.width ?? 1254}
            height={productImage.height ?? 1254}
            alt={productImage.alt || product.title}
            loading="lazy"
            onError={() => setFailedImageUrl(productImage.url)}
          />
        ) : (
          <PlaceholderTee title={product.title} compact />
        )}
        <span className="chat-product-open" aria-hidden="true">
          ↗
        </span>
      </Link>

      <div className="chat-product-copy">
        <p className="kicker chat-product-drop">{product.drop}</p>
        <Link to={productPath} className="chat-product-title">
          {product.title}
        </Link>

        <div className="chat-product-facts">
          {price && <strong>{price}</strong>}
          <span
            className={
              product.isPreview
                ? 'is-preview'
                : selectedVariant?.availableForSale
                  ? 'is-available'
                  : 'is-sold-out'
            }
          >
            {stockLabel(selectedVariant, product.isPreview)}
          </span>
        </div>

        {variants.length > 1 ? (
          <label className="chat-product-variant">
            <span>Talla</span>
            <select
              aria-label={`Talla para ${product.title}`}
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={!variant.availableForSale}>
                  {variant.label}
                  {variant.availableForSale ? '' : ' — agotada'}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="chat-product-single-variant">
            {product.isPreview ? 'Concepto de prueba' : selectedVariant?.label || 'Talla única'}
          </p>
        )}

        {state === PURCHASE_STATES.BUY || state === PURCHASE_STATES.SOLD_OUT ? (
          <AddToCartButton
            product={productForCart}
            variantId={selectedVariant?.id || null}
            addToCart={addToCart}
            className="chat-product-add"
            disabled={state !== PURCHASE_STATES.BUY}
            unavailableLabel={purchaseLabel(state)}
          />
        ) : state === PURCHASE_STATES.NOTIFY ? (
          <Link to={`${productPath}#aviso`} className="btn btn--ghost chat-product-add">
            Avísame
          </Link>
        ) : (
          <Link to={productPath} className="btn btn--ghost chat-product-add">
            Ver producto
          </Link>
        )}
      </div>
    </article>
  );
}

export default ChatProductCard;
