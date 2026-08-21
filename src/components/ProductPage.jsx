import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from './AddToCartButton';
import EyeIcon from './EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import StreetWall from './StreetWall';
import { CrosshairSpinner } from './BrandDoodles';
// Variante sin los puntos de spray pintados: el chorro se anima aparte.
import grafiteroSpray from '../images/optimized/characters/grafitero-sin-chorro-420.webp';
import corriendoBolsa from '../images/optimized/splash/corriendo-bolsa.webp';
import cruiserPatinando from '../images/optimized/splash/cruiser-patinando.webp';
import { formatPrice } from '../utils/price';
import '../styles/ProductPage.css';

const PLACEHOLDER = '/products/placeholder-unreleased.webp';

function ProductPage({
    products,
    addToCart,
    commerceMode = 'demo',
    canAddToCart = true,
    prioritizeFirstImage = false,
    loading = false,
}) {
    const { category } = useParams();
    const [zoomImage, setZoomImage] = useState(null);

    const visibleProducts = category
        ? products.filter((product) =>
            product.drop === category || product.dropHandle === category
        )
        : products;
    const isHome = !category;
    const pageTitle = category ? visibleProducts[0]?.drop || category : 'ROCKY 035';

    if (category && visibleProducts.length === 0 && !loading) {
        return (
            <div className="product-empty">
                {/* Se lo han llevado todo corriendo */}
                <img
                    src={corriendoBolsa}
                    width="344"
                    height="350"
                    decoding="async"
                    alt=""
                    className="product-empty-run al-ritmo"
                    style={{ '--fase': '0.5' }}
                />
                <h1 className="page-title">Nada por aquí</h1>
                <p>No hay productos en «{category}». Volaron.</p>
                <Link to="/menudrop" className="btn btn-ghost">Ver drops</Link>
            </div>
        );
    }

    return (
        <div className="product-page">
            <div className={`product-page-head${isHome ? ' product-page-head--home' : ''}`}>
                <div className="product-page-head-copy">
                    <div className="product-page-head-row">
                        <h1 className="page-title no-squiggle">{pageTitle}</h1>
                        {!isHome && (
                            <p className="product-count">{visibleProducts.length} productos</p>
                        )}
                    </div>
                    {isHome && (
                        <>
                            <p className="product-page-tagline">HECHO DESDE LA COLMENA</p>
                            <div className="product-page-hero-meta">
                                <div className="product-page-hero-count">
                                    <CrosshairSpinner className="product-page-hero-count-mark" />
                                    <p className="product-count">{visibleProducts.length} productos</p>
                                </div>
                                <a href="#productos" className="btn btn-primary product-page-hero-cta">
                                    <span>Ver Drop 4</span>
                                    <span className="product-page-hero-cta-arrow" aria-hidden="true">→</span>
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
                            stroke="#e63946"
                            strokeWidth="3"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <img
                        src={grafiteroSpray}
                        width="254"
                        height="420"
                        decoding="async"
                        alt=""
                        className="spray-guy"
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
                        src={cruiserPatinando}
                        width="291"
                        height="350"
                        decoding="async"
                        alt=""
                        className="spray-cruiser"
                    />
                </div>
            </div>

            <div
                className={`product-grid${loading ? ' product-grid--loading' : ''}`}
                id={isHome ? 'productos' : undefined}
                aria-busy={loading || undefined}
            >
                {visibleProducts.map((product, index) => {
                    const isPlaceholder = product.image === PLACEHOLDER;
                    const isPriorityImage = prioritizeFirstImage && index === 0;
                    const price = formatPrice(product.price);
                    const productPath = product.handle ?? product.id;
                    const variantId = product.defaultVariantId || null;
                    const unavailable = product.isPreview || (
                        commerceMode === 'shopify' && (
                            !canAddToCart || !product.availableForSale || !variantId
                        )
                    );
                    return (
                        <article key={productPath} className="product-card">
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
                                    />
                                ) : (
                                    <img
                                        src={product.image}
                                        alt={product.imageAlt || product.title}
                                        className="product-image"
                                        loading={isPriorityImage ? 'eager' : 'lazy'}
                                        decoding={isPriorityImage ? 'auto' : 'async'}
                                        fetchPriority={isPriorityImage ? 'high' : undefined}
                                    />
                                )}
                                {!isPlaceholder && (
                                    <span className="product-zoom" aria-hidden="true">
                                        <EyeIcon />
                                    </span>
                                )}
                            </button>
                            <div className="product-body">
                                <h2 className="product-title" title={product.title}>{product.title}</h2>
                                {price ? (
                                    <p className="product-price">{price}</p>
                                ) : (
                                    <p className="badge-soon">Próximamente</p>
                                )}
                                <div className="product-actions">
                                    <Link to={`/product/${encodeURIComponent(productPath)}`} className="btn btn-ghost">
                                        Detalles
                                    </Link>
                                    <AddToCartButton
                                        product={product}
                                        variantId={variantId}
                                        addToCart={addToCart}
                                        disabled={unavailable}
                                        unavailableLabel={
                                            product.isPreview
                                                ? 'Vista previa'
                                                : canAddToCart
                                                    ? 'Agotado'
                                                    : 'Carrito no disponible'
                                        }
                                    />
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
