import ProductPhoto from '../../components/ProductPhoto.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { lazyPiece } from '../../utils/pieces.jsx';
import AddToCartButton from '../cart/AddToCartButton';
import EyeIcon from '../../components/icons/EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import { CrosshairSpinner } from '../../components/doodles/CrosshairSpinner';
import { ProductReticle } from '../../components/doodles/ProductReticle';
import { TornSticker } from '../../components/doodles/TornSticker';
import { PLACEHOLDER_IMAGE } from '../../config/commerce.js';
import { PURCHASE_STATES, purchaseLabel, purchaseState } from '../storefront/availability.js';
import { designCount } from './designCount.js';
import { isTornFlipped } from './tornVariant.js';
import { DROP_STATES, isDropHandle } from '../../../shared/drops.mjs';
import Cartel from '../drops/Cartel';
import { fechaLarga, horaDeMadrid } from '../drops/fecha.js';
// Variante sin los puntos de spray pintados: el chorro se anima aparte.
import grafiteroSpray from '../../images/optimized/characters/grafitero-sin-chorro-420.webp';
import corriendoBolsa from '../../images/optimized/splash/corriendo-bolsa.webp';
import cruiserPatinando from '../../images/optimized/splash/cruiser-patinando.webp';
import { formatPrice } from '../../utils/price';
import '../../styles/components/product-media.css';
import { ROUTES } from '../../config/routes.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { NOT_FOUND_TITLE, useNotFound } from '../../hooks/usePageMetadata.js';
import '../../styles/pages/home.css';
import { useNightArt } from '../night/nightArt.js';

// Tarjetas que caben en la primera fila de la rejilla en escritorio.
const FIRST_ROW = 4;

// «La banda» va al final de la portada, por debajo del pliegue.
const StreetWall = lazyPiece(() => import('../../components/StreetWall'));
// La foto a lo grande solo hace falta cuando alguien la abre.
const Lightbox = lazyPiece(() => import('./Lightbox'));

// Cómo se cuenta cada estado en la cabecera de su sección del catálogo.
const SECCION = Object.freeze({
  [DROP_STATES.LIVE]: 'Ya en la calle',
  [DROP_STATES.LAST_HOURS]: 'Últimas horas',
  [DROP_STATES.ARCHIVE]: 'Voló',
});

/* El catálogo sigue el orden del muro (muro-de-drops): primero el cartel
   teaser de cada drop anunciado, después cada drop con sus diseños bajo su
   cabecera y al final lo que no es de ningún drop. */
function buildCatalog(products, drops) {
  const items = [];
  const placed = new Set();
  // `ordinal` cuenta solo productos: decide qué fotos se piden desde el
  // principio, haya o no carteles y cabeceras por delante.
  let ordinal = 0;
  const addProduct = (product) => {
    items.push({ kind: 'product', product, ordinal });
    ordinal += 1;
  };
  drops.forEach((drop) => {
    if (drop.state === DROP_STATES.ANNOUNCED) {
      items.push({ kind: 'teaser', drop });
      return;
    }
    const own = products.filter((product) => product.dropHandle === drop.handle);
    if (!own.length) return;
    items.push({ kind: 'section', drop });
    own.forEach((product) => {
      placed.add(product);
      addProduct(product);
    });
  });
  products.forEach((product) => {
    if (!placed.has(product)) addProduct(product);
  });
  return items;
}

const EMPTY = Object.freeze([]);

function ProductPage({
  products,
  addToCart,
  commerceMode = 'demo',
  canAddToCart = true,
  loading = false,
  dropsLoading = false,
  drops = EMPTY,
  featured = null,
  serverNow = Date.now,
}) {
  const grafiteroArt = useNightArt(grafiteroSpray);
  const cruiserArt = useNightArt(cruiserPatinando);
  const recaderoArt = useNightArt(corriendoBolsa);
  const { category } = useParams();
  const [zoomImage, setZoomImage] = useState(null);

  // De un drop anunciado no se enseña ningún diseño (catalogo-vivo): el
  // servidor ya no los manda; esto cubre el catálogo de demostración.
  const shownProducts = useMemo(() => {
    const hidden = new Set(
      drops.filter((drop) => drop.state === DROP_STATES.ANNOUNCED).map((drop) => drop.handle)
    );
    return products.filter((product) => !hidden.has(product.dropHandle));
  }, [products, drops]);
  const categoryDrop = category ? drops.find((drop) => drop.handle === category) : null;
  const visibleProducts = useMemo(
    () =>
      category
        ? shownProducts.filter(
            (product) => product.drop === category || product.dropHandle === category
          )
        : shownProducts,
    [shownProducts, category]
  );
  // El catálogo se pinta de una vez, con sus productos y sus drops: si los
  // productos llegan antes, el cartel de un drop anunciado entraría después
  // por encima y empujaría las tarjetas.
  const busy = loading || dropsLoading;
  const catalogItems = useMemo(
    () => (dropsLoading ? EMPTY : buildCatalog(visibleProducts, category ? EMPTY : drops)),
    [visibleProducts, category, drops, dropsLoading]
  );
  const isHome = !category;
  const pageTitle = category
    ? categoryDrop?.title || visibleProducts[0]?.drop || category
    : 'ROCKY 035';
  // Una página de drop espera también a los drops: si no, la de un anunciado
  // (la que se comparte antes del lanzamiento) diría «Volaron» un instante.
  const waiting = loading || (dropsLoading && isDropHandle(category ?? ''));
  const notFound = Boolean(category) && !categoryDrop && visibleProducts.length === 0 && !waiting;
  // Una categoría que no existe se titula «No encontrado», nunca con el slug
  // que se pidió (tampoco al saltar de una inexistente a otra), y no se indexa.
  useDocumentTitle(isHome ? '' : notFound ? NOT_FOUND_TITLE : pageTitle);
  useNotFound(notFound);

  // Una categoría tiene una sola URL, la de su handle. Abierta por su nombre
  // (/products/ROCKY%20DROP%204) se sustituye, sin dejar la otra en el historial.
  const navigate = useNavigate();
  const { search, hash } = useLocation();
  const handleOfName =
    category && !categoryDrop && !visibleProducts.some((product) => product.dropHandle === category)
      ? (visibleProducts.find((product) => product.drop === category)?.dropHandle ?? null)
      : null;
  useEffect(() => {
    if (!handleOfName) return;
    navigate({ pathname: ROUTES.category(handleOfName), search, hash }, { replace: true });
  }, [handleOfName, navigate, search, hash]);

  if (notFound) {
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

  const featuredAnnounced = featured?.state === DROP_STATES.ANNOUNCED;

  return (
    <div className="page-container product-page">
      {categoryDrop && (
        <div className="drop-cabecera">
          <Cartel
            drop={categoryDrop}
            products={products}
            serverNow={serverNow}
            cabecera
            tituloComo="h1"
          />
          {categoryDrop.state === DROP_STATES.ANNOUNCED && (
            <p className="drop-nota">
              Los diseños se destapan el día del drop. Arranca una pestaña y te avisamos.
            </p>
          )}
          {categoryDrop.state === DROP_STATES.ARCHIVE && (
            <p className="drop-nota">Este drop ya voló: aquí queda el archivo, sin venta.</p>
          )}
        </div>
      )}
      {!categoryDrop && (
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
                  {featured ? (
                    <Link
                      to={ROUTES.category(featured.handle)}
                      className="btn btn--primary product-page-hero-cta"
                    >
                      <span>Ver el Drop {featured.number}</span>
                      <span className="product-page-hero-cta-arrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  ) : (
                    <a href="#productos" className="btn btn--primary product-page-hero-cta">
                      <span>Ver el catálogo</span>
                      <span className="product-page-hero-cta-arrow" aria-hidden="true">
                        →
                      </span>
                    </a>
                  )}
                </div>
                {featuredAnnounced && (
                  <p className="product-page-hero-drop">
                    Cae el {fechaLarga(featured.launchAt)} a las {horaDeMadrid(featured.launchAt)},
                    hora de Madrid
                  </p>
                )}
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
      )}

      <div
        className={`product-grid${busy ? ' product-grid--loading' : ''}`}
        id={isHome ? 'productos' : undefined}
        aria-busy={busy || undefined}
      >
        {catalogItems.map((item) => {
          if (item.kind === 'teaser') {
            return (
              <div
                key={`teaser-${item.drop.handle}`}
                className="catalogo-teaser"
                data-testid={`catalogo-teaser-${item.drop.handle}`}
              >
                <Cartel drop={item.drop} products={products} serverNow={serverNow} compacto />
              </div>
            );
          }
          if (item.kind === 'section') {
            return (
              <p
                key={`seccion-${item.drop.handle}`}
                className="catalogo-seccion"
                data-testid={`catalogo-seccion-${item.drop.handle}`}
              >
                <span className="catalogo-seccion-titulo">{item.drop.title}</span>
                <span className="sticker catalogo-seccion-estado">
                  {SECCION[item.drop.state] ?? ''}
                </span>
                <Link className="catalogo-seccion-enlace" to={ROUTES.category(item.drop.handle)}>
                  Ver el drop <span aria-hidden="true">→</span>
                </Link>
              </p>
            );
          }
          const { product } = item;
          const isPlaceholder = product.image === PLACEHOLDER_IMAGE;
          // La primera fila se pide desde el principio, haya intro o no: con
          // las variantes pequeñas son unos kB por foto y una de ellas suele
          // ser lo más grande de la primera pantalla.
          const isPriorityImage = item.ordinal === 0;
          const isFirstRow = item.ordinal < FIRST_ROW;
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
                  <PlaceholderTee
                    title={product.title}
                    priority={isPriorityImage}
                    compact
                    description="sin foto todavía"
                    sizes="(max-width: 640px) 42vw, (max-width: 1100px) 380px, 280px"
                  />
                ) : (
                  <ProductPhoto
                    src={product.image}
                    width={product.imageWidth}
                    height={product.imageHeight}
                    sources={product.imageSources}
                    sizes="(max-width: 640px) 42vw, (max-width: 1100px) 380px, 280px"
                    alt={product.imageAlt || product.title}
                    className="product-image"
                    priority={isPriorityImage}
                    eager={isFirstRow}
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
          sources={zoomImage.imageSources}
          alt={zoomImage.imageAlt || zoomImage.title}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
}

export default ProductPage;
