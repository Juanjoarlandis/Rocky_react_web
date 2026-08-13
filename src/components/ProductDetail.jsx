import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import Lightbox from './Lightbox';
import AddToCartButton from './AddToCartButton';
import EyeIcon from './EyeIcon';
import PlaceholderTee from './PlaceholderTee';
import sentadoBordeBlanco from '../images/optimized/characters/sentado-borde-blanco-600.webp';
import nubePaseando from '../images/optimized/characters/nube-paseando-600.webp';
import { formatPrice } from '../utils/price';
import '../styles/ProductDetail.css';

const PLACEHOLDER = '/products/placeholder-unreleased.webp';

function ProductDetail({
    products,
    addToCart,
    commerceMode = 'demo',
    canAddToCart = true,
}) {
    const { productId } = useParams();
    const [zoomOpen, setZoomOpen] = useState(false);

    const product = products.find(
        (candidate) => String(candidate.handle ?? candidate.id) === String(productId)
    );
    const [selectedVariantId, setSelectedVariantId] = useState(
        () => product?.defaultVariantId || product?.variants?.[0]?.id || null
    );

    React.useEffect(() => {
        setSelectedVariantId(
            product?.defaultVariantId || product?.variants?.[0]?.id || null
        );
    }, [product]);

    if (!product) {
        return (
            <div className="product-empty">
                <h1 className="page-title">Producto no encontrado</h1>
                <Link to="/" className="btn btn-ghost">Volver a la tienda</Link>
            </div>
        );
    }

    const isPlaceholder = product.image === PLACEHOLDER;
    const variants = product.variants || [];
    const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
    const price = formatPrice(selectedVariant?.price || product.price);
    const selectionRequired = commerceMode === 'shopify';
    const addDisabled = product.isPreview || (
        selectionRequired && (
            !canAddToCart || !selectedVariant || !selectedVariant.availableForSale
        )
    );

    return (
        <div className="detail">
            <Link to="/" className="detail-back">← Volver a la tienda</Link>

            <div className="detail-grid">
                <div className="detail-info">
                    <p className="detail-drop">{product.drop}</p>
                    <h1 className="detail-title">{product.title}</h1>
                    {product.description && (
                        <p className="detail-description">{product.description}</p>
                    )}
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
                                            {optionLabel}{variant.availableForSale ? '' : ' — agotada'}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    )}
                    <div className="detail-buy">
                        {/* El Nube pasea por la línea de puntos con su paraguas */}
                        <img src={nubePaseando} alt="" className="detail-nube" />
                        {price ? (
                            <p className="detail-price">{price}</p>
                        ) : (
                            <p className="badge-soon">Próximamente</p>
                        )}
                        <AddToCartButton
                            product={product}
                            variantId={selectedVariantId}
                            addToCart={addToCart}
                            disabled={addDisabled}
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

                <div className="detail-media-wrap">
                    {/* Un chaval de la banda vigila el producto desde el marco */}
                    <img
                        src={sentadoBordeBlanco}
                        width="717"
                        height="1186"
                        decoding="async"
                        alt=""
                        className="detail-doodle"
                    />
                    <button
                        type="button"
                        className="detail-media"
                        onClick={() => !isPlaceholder && setZoomOpen(true)}
                        aria-label={`Ver ${product.title} en grande`}
                        disabled={isPlaceholder}
                    >
                        {isPlaceholder ? (
                            <PlaceholderTee title={product.title} />
                        ) : (
                            <img src={product.image} alt={product.title} className="detail-image" />
                        )}
                        {!isPlaceholder && (
                            <span className="product-zoom" aria-hidden="true">
                                <EyeIcon />
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {zoomOpen && (
                <Lightbox
                    src={product.image}
                    alt={product.title}
                    onClose={() => setZoomOpen(false)}
                />
            )}
        </div>
    );
}

export default ProductDetail;
