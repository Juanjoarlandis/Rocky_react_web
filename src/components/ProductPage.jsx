import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from './AddToCartButton';
import EyeIcon from './EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import StreetWall from './StreetWall';
import grafiteroSpray from '../images/optimized/splash/grafitero-spray.webp';
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
                    className="product-empty-run"
                />
                <h1 className="page-title">Nada por aquí</h1>
                <p>No hay productos en «{category}». Volaron.</p>
                <Link to="/menudrop" className="btn btn-ghost">Ver drops</Link>
            </div>
        );
    }

    return (
        <div className="product-page">
            <div className="product-page-head">
                <div className="product-page-head-row">
                    <h1 className="page-title no-squiggle">{pageTitle}</h1>
                    <p className="product-count">{visibleProducts.length} productos</p>
                </div>
                {/* El grafitero pinta la línea del título con su spray */}
                <div className="spray-line-wrap" aria-hidden="true">
                    <svg className="spray-line" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path
                            d="M2 6 Q 10 2 18 6 T 34 6 T 50 6 T 66 6 T 82 6 T 98 5"
                            fill="none"
                            stroke="#e63946"
                            strokeWidth="3"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <img
                        src={grafiteroSpray}
                        width="255"
                        height="420"
                        decoding="async"
                        alt=""
                        className="spray-guy"
                    />
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
