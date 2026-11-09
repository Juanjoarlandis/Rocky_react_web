import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from '../cart/AddToCartButton';
import DropAviso from './DropAviso';
import AddToCalendar from './AddToCalendar';
import EyeIcon from '../../components/icons/EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import StreetWall from '../../components/StreetWall';
import { CrosshairSpinner } from '../../components/doodles/CrosshairSpinner';
import { ProductReticle } from '../../components/doodles/ProductReticle';
import { TornSticker } from '../../components/doodles/TornSticker';
import { CURRENT_DROP } from '../../config/campaign.js';
import { PLACEHOLDER_IMAGE } from '../../config/commerce.js';
import { PURCHASE_STATES, purchaseLabel, purchaseState } from '../storefront/availability.js';
import { designCount } from './designCount.js';
import { isTornFlipped } from './tornVariant.js';
// Variante sin los puntos de spray pintados: el chorro se anima aparte.
import grafiteroSpray from '../../images/optimized/characters/grafitero-sin-chorro-420.webp';
import corriendoBolsa from '../../images/optimized/splash/corriendo-bolsa.webp';
import cruiserPatinando from '../../images/optimized/splash/cruiser-patinando.webp';
import { formatPrice } from '../../utils/price';
import '../../styles/components/product-media.css';
import { ROUTES } from '../../config/routes.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import '../../styles/pages/home.css';
import { useNightArt } from '../night/nightArt.js';

/* El catálogo se lee por drops, en el orden en que aparecen: dentro de cada
   drop van primero los diseños con foto y los que siguen bajo llave se
   agrupan en un único bloque con su contador y un solo aviso. */
function groupByDrop(products) {
  const drops = new Map();
  products.forEach((product) => {
    const key = product.dropHandle || product.drop || 'tienda';
    if (!drops.has(key)) {
      drops.set(key, { key, title: product.drop, revealed: [], locked: [] });
    }
    const group = drops.get(key);
    (product.image === PLACEHOLDER_IMAGE ? group.locked : group.revealed).push(product);
  });
  const items = [];
  drops.forEach((group) => {
    group.revealed.forEach((product) => items.push({ kind: 'product', product }));
    if (group.locked.length) {
      items.push({ kind: 'locked', key: group.key, title: group.title, products: group.locked });
    }
  });
  return items;
}

function LockedDesigns({ dropKey, title, products }) {
  const count = products.length;
  return (
    <article className="paper-card product-card product-card--locked" data-testid="locked-designs">
      {/* Sin la etiqueta del mockup: el cuerpo ya dice drop, estado y número, y
          con ella la tarjeta repetía dos veces «N diseños bajo llave». */}
      <div className="product-media product-media--locked" aria-hidden="true">
        <PlaceholderTee title={designCount(count)} compact />
      </div>
      <div className="product-body">
        <p className="kicker product-locked-kicker">{title} · sin revelar</p>
        <h2 className="product-title">{designCount(count)} bajo llave</h2>
        <p className="product-locked-names">
          {products.map((product) => product.title).join(' · ')}
        </p>
        <DropAviso producto={dropKey} />
        <AddToCalendar />
      </div>
    </article>
  );
}

function ProductPage({
  products,
  addToCart,
  commerceMode = 'demo',
  canAddToCart = true,
  prioritizeFirstImage = false,
  loading = false,
}) {
  const grafiteroArt = useNightArt(grafiteroSpray);
  const cruiserArt = useNightArt(cruiserPatinando);
  const recaderoArt = useNightArt(corriendoBolsa);
  const { category } = useParams();
  const [zoomImage, setZoomImage] = useState(null);

  const visibleProducts = useMemo(
    () =>
      category
        ? products.filter((product) => product.drop === category || product.dropHandle === category)
        : products,
    [products, category]
  );
  const catalogItems = useMemo(() => groupByDrop(visibleProducts), [visibleProducts]);
  const isHome = !category;
  const pageTitle = category ? visibleProducts[0]?.drop || category : 'ROCKY 035';
  useDocumentTitle(isHome ? '' : pageTitle);

  if (category && visibleProducts.length === 0 && !loading) {
    return (
      <div className="product-empty">
        {/* Se lo han llevado todo corriendo */}
        <img
          src={recaderoArt}
          width="344"
          height="350"
          decoding="async"
          alt=""
          className="product-empty-run neon-art al-ritmo"
          style={{ '--fase': '0.5' }}
        />
        <h1 className="page-title">Nada por aquí</h1>
        <p>No hay productos en «{category}». Volaron.</p>
        <Link to="/menudrop" className="btn btn--ghost">
          Ver drops
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container product-page">
      <div className={`product-page-head${isHome ? ' product-page-head--home' : ''}`}>
        <div className="product-page-head-copy">
          <div className="product-page-head-row">
            <h1 className="page-title no-squiggle">{pageTitle}</h1>
            {!isHome && <p className="product-count">{designCount(visibleProducts.length)}</p>}
          </div>
          {isHome && (
            <>
              <p className="product-page-tagline">HECHO DESDE LA COLMENA</p>
              <div className="product-page-hero-meta">
                <div className="product-page-hero-count">
                  <CrosshairSpinner className="product-page-hero-count-mark" />
                  <p className="product-count">{designCount(visibleProducts.length)}</p>
                </div>
                <a href="#productos" className="btn btn--primary product-page-hero-cta">
                  <span>Ver {CURRENT_DROP.shortTitle}</span>
                  <span className="product-page-hero-cta-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </div>
            </>
          )}
        </div>
        {/* El grafitero pinta la línea del título con su spray */}
        <div className="spray-line-wrap" aria-hidden="true">
          <svg className="spray-line" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path
              d="M2 6 Q 10 2 18 6 T 34 6 T 50 6 T 66 6 T 82 6 T 91 5"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <img
            src={grafiteroArt}
            width="254"
            height="420"
            decoding="async"
            alt=""
            className="spray-guy neon-art"
          />
          {/* El chorro va aparte para poder moverlo: el personaje usa
                        la variante sin los puntos pintados encima. */}
          <span className="spray-chorro">
            <i />
            <i />
            <i />
          </span>
          {/* La Cruiser rueda por la línea recién pintada */}
          <img
            src={cruiserArt}
            width="291"
            height="350"
            decoding="async"
            alt=""
            className="doodle spray-cruiser neon-art"
          />
        </div>
      </div>

      <div
        className={`product-grid${loading ? ' product-grid--loading' : ''}`}
        id={isHome ? 'productos' : undefined}
        aria-busy={loading || undefined}
      >
        {catalogItems.map((item, index) => {
          if (item.kind === 'locked') {
            return (
              <LockedDesigns
                key={`locked-${item.key}`}
                dropKey={item.key}
                title={item.title}
                products={item.products}
              />
            );
          }
          const { product } = item;
          const isPlaceholder = product.image === PLACEHOLDER_IMAGE;
          const isPriorityImage = prioritizeFirstImage && index === 0;
          const price = formatPrice(product.price);
          const productPath = product.handle ?? product.id;
          const variantId = product.defaultVariantId || null;
          const variant =
            product.variants?.find((candidate) => candidate.id === variantId) ||
            (variantId ? { id: variantId, availableForSale: product.availableForSale } : null);
          const state = purchaseState(product, variant, {
            mode: commerceMode,
            cartEnabled: canAddToCart,
          });
          // Agotado: la pegatina se queda medio arrancada en la farola.
          const soldOut = state === PURCHASE_STATES.SOLD_OUT;
          // Cada agotado lleva siempre la misma variante del desgarro (normal o en espejo).
          const tornFlip = soldOut && isTornFlipped(productPath);
          return (
            <article
              key={productPath}
              className={`paper-card product-card${soldOut ? ' is-sold-out' : ''}${tornFlip ? ' product-card--flip' : ''}`}
            >
              <button
                type="button"
                className="product-media"
                onClick={() => !isPlaceholder && setZoomImage(product)}
                aria-label={`Ver ${product.title} en grande`}
                disabled={isPlaceholder}
              >
                {isPlaceholder ? (
                  <PlaceholderTee title={product.title} priority={isPriorityImage} />
                ) : (
                  <img
                    src={product.image}
                    width={product.imageWidth ?? 1254}
                    height={product.imageHeight ?? 1254}
                    alt={product.imageAlt || product.title}
                    className="product-image"
                    loading={isPriorityImage ? 'eager' : 'lazy'}
                    decoding={isPriorityImage ? 'auto' : 'async'}
                    fetchPriority={isPriorityImage ? 'high' : undefined}
                  />
                )}
                {!isPlaceholder && soldOut && <TornSticker />}
                {/* A lo agotado no se apunta: no se puede comprar. */}
                {!isPlaceholder && !soldOut && <ProductReticle />}
                {!isPlaceholder && (
                  <span className="product-zoom" aria-hidden="true">
                    <EyeIcon />
                  </span>
                )}
              </button>
              <div className="product-body">
                <h2 className="product-title" title={product.title}>
                  {product.title}
                </h2>
                {price ? (
                  <p className="product-price">{price}</p>
                ) : (
                  <p className="badge badge--dashed">Próximamente</p>
                )}
                <div className="product-actions">
                  <Link
                    to={ROUTES.product(productPath)}
                    className="btn btn--ghost btn--sm btn--block"
                  >
                    Detalles
                  </Link>
                  {state === PURCHASE_STATES.NOTIFY ? (
                    <Link
                      to={`${ROUTES.product(productPath)}#aviso`}
                      className="btn btn--primary btn--sm btn--block"
                    >
                      Avísame
                    </Link>
                  ) : (
                    <AddToCartButton
                      product={product}
                      variantId={variantId}
                      addToCart={addToCart}
                      className="btn--sm btn--block"
                      disabled={state !== PURCHASE_STATES.BUY}
                      unavailableLabel={purchaseLabel(state)}
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* El muro de la banda, solo en la home */}
      {!category && <StreetWall />}

      {zoomImage && (
        <Lightbox
          src={zoomImage.image}
          alt={zoomImage.imageAlt || zoomImage.title}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
}

export default ProductPage;
