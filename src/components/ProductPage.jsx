import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from './AddToCartButton';
import EyeIcon from './EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import StreetWall from './StreetWall';
import grafiteroSpray from '../images/characters/grafitero-spray.png';
import corriendoBolsa from '../images/characters/corriendo-bolsa.png';
import { formatPrice } from '../utils/price';
import '../styles/ProductPage.css';

const PLACEHOLDER = '/products/placeholder-unreleased.webp';

function ProductPage({
    products,
    addToCart,
    commerceMode = 'demo',
    canAddToCart = true,
}) {
    const { category } = useParams();
    const [zoomImage, setZoomImage] = useState(null);

    const visibleProducts = category
        ? products.filter((product) =>
            product.drop === category || product.dropHandle === category
        )
        : products;

    if (category && visibleProducts.length === 0) {
        return (
            <div className="product-empty">
                {/* Se lo han llevado todo corriendo */}
                <img src={corriendoBolsa} alt="" className="product-empty-run" />
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
                    <h1 className="page-title no-squiggle">{category || 'ROCKY 035'}</h1>
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
                        width="821"
                        height="1356"
                        decoding="async"
                        alt=""
                        className="spray-guy"
                    />
                </div>
            </div>

            <div className="product-grid">
                {visibleProducts.map((product) => {
                    const isPlaceholder = product.image === PLACEHOLDER;
                    const price = formatPrice(product.price);
                    const productPath = product.handle ?? product.id;
                    const variantId = product.defaultVariantId || null;
                    const unavailable = commerceMode === 'shopify' && (
                        !canAddToCart || !product.availableForSale || !variantId
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
                                    <PlaceholderTee title={product.title} />
                                ) : (
                                    <img
                                        src={product.image}
                                        alt={product.imageAlt || product.title}
                                        className="product-image"
                                        loading="lazy"
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
                                            canAddToCart ? 'Agotado' : 'Carrito no disponible'
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
