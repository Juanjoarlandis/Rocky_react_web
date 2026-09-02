import React from 'react';
import { Link } from 'react-router';
import { parsePrice, formatPrice } from '../utils/price';
import PlaceholderTee from './PlaceholderTee';
import emptyCartImage from '../images/optimized/shell/tumbado-800.webp';
import asomadoBorde from '../images/optimized/characters/asomado-borde-600.webp';
import dormidoEsperando from '../images/optimized/characters/dormido-esperando-600.webp';
import bombillaEureka from '../images/optimized/characters/bombilla-eureka-600.webp';
import '../styles/pages/cart.css';

const PLACEHOLDER = '/products/placeholder-unreleased.webp';

function Cart({
    cart,
    cartCost = null,
    warnings = [],
    commerceMode = 'demo',
    canCheckout = false,
    busy = false,
    checkout,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
}) {
    const isShopify = commerceMode === 'shopify';
    const knownSubtotal = cart.reduce((acc, product) => {
        const price = parsePrice(product.price);
        return price === null ? acc : acc + price * product.quantity;
    }, 0);
    const hasUnknownPrices = !isShopify && cart.some((p) => parsePrice(p.price) === null);
    const authoritativeTotal = isShopify
        ? formatPrice(cartCost?.totalAmount || cartCost?.subtotalAmount)
        : null;

    const handleCheckout = async () => {
        try {
            const checkoutUrl = await checkout();
            if (checkoutUrl) window.location.assign(checkoutUrl);
        } catch {
            // El hook muestra un error seguro y mantiene al usuario en el carrito.
        }
    };

    if (cart.length === 0) {
        return (
            <div className="cart-empty">
                <div className="paper-card cart-empty-card">
                    <img src={emptyCartImage} alt="" className="doodle cart-empty-illustration neon-art al-ritmo al-ritmo--suave" style={{ '--fase': '0.1' }} />
                    {/* El Bombilla ya sabe la solución: ¡a la tienda! */}
                    <img src={bombillaEureka} alt="" className="doodle cart-empty-idea neon-art al-ritmo" style={{ '--fase': '0.6' }} />
                    <h1 className="page-title">Tu carrito está vacío</h1>
                    <p>Échale un ojo al último drop.</p>
                    <Link to="/" className="btn btn-primary">Ver la tienda</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container cart">
            <div className="cart-head">
                <h1 className="page-title">Tu carrito</h1>
                <Link to="/" className="btn btn-ghost">Seguir comprando</Link>
            </div>

            {warnings.length > 0 && (
                <ul className="cart-warnings" role="alert">
                    {warnings.map((warning) => (
                        <li key={`${warning.code}:${warning.message}`}>{warning.message}</li>
                    ))}
                </ul>
            )}

            <div className="doodle-shelf cart-list-wrap">
                {/* Un curioso asomado tras el borde del carrito */}
                <img src={asomadoBorde} alt="" className="doodle cart-peeker neon-art al-ritmo" style={{ '--fase': '0.3' }} />
                <ul className="paper-card cart-list">
                {cart.map((product) => {
                    const unitPrice = formatPrice(product.price);
                    const localPrice = parsePrice(product.price);
                    const lineTotal = formatPrice(product.lineCost?.totalAmount)
                        || (localPrice !== null
                            ? formatPrice(localPrice * product.quantity)
                            : null);
                    const productPath = product.productId ?? product.id;
                    return (
                        <li key={product.id} className="cart-item">
                            <Link to={`/product/${encodeURIComponent(productPath)}`} className="cart-item-media">
                                {product.image === PLACEHOLDER ? (
                                    <PlaceholderTee title={product.title} compact />
                                ) : (
                                    <img src={product.image} alt={product.imageAlt || product.title} className="cart-item-image" />
                                )}
                            </Link>
                            <div className="cart-item-info">
                                <Link to={`/product/${encodeURIComponent(productPath)}`} className="cart-item-title">
                                    {product.title}
                                </Link>
                                {isShopify && product.variantTitle && product.variantTitle !== 'Default Title' && (
                                    <p className="cart-item-variant">{product.variantTitle}</p>
                                )}
                                {unitPrice ? (
                                    <p className="cart-item-price">{unitPrice} / ud.</p>
                                ) : (
                                    <p className="badge badge--dashed">Próximamente</p>
                                )}
                                {isShopify && product.availableForSale === false && (
                                    <p className="cart-item-soldout">Agotado — quítalo del carrito</p>
                                )}
                            </div>
                            <div className="cart-item-quantity" aria-label={`Cantidad de ${product.title}`}>
                                <button
                                    type="button"
                                    className="quantity-btn"
                                    onClick={() => decrementQuantity(product)}
                                    disabled={busy}
                                    aria-label="Quitar una unidad"
                                >
                                    −
                                </button>
                                <span className="quantity-value">{product.quantity}</span>
                                <button
                                    type="button"
                                    className="quantity-btn"
                                    onClick={() => incrementQuantity(product)}
                                    disabled={busy || product.quantity >= 20}
                                    aria-label="Añadir una unidad"
                                >
                                    +
                                </button>
                            </div>
                            <div className="cart-item-total">
                                {lineTotal || '—'}
                            </div>
                            <button
                                type="button"
                                className="cart-item-remove"
                                onClick={() => removeFromCart(product)}
                                disabled={busy}
                                aria-label={`Eliminar ${product.title} del carrito`}
                            >
                                ×
                            </button>
                        </li>
                    );
                })}
                </ul>
            </div>

            <div className="cart-summary-wrap">
            {/* Dormido esperando a que abra el pago del drop; cabecea flojito,
                bastante hace con seguir el ritmo en sueños */}
            <img src={dormidoEsperando} alt="" className="doodle cart-sleeper neon-art al-ritmo al-ritmo--suave" style={{ '--fase': '0.8' }} />
            <div className="cart-summary">
                <div className="cart-summary-row">
                    <span>Total</span>
                    <span className="cart-summary-total">
                        {isShopify
                            ? (authoritativeTotal || 'Calculando…')
                            : hasUnknownPrices
                            ? (knownSubtotal > 0 ? `${formatPrice(knownSubtotal)} + pendiente` : 'Pendiente')
                            : formatPrice(knownSubtotal)}
                    </span>
                </div>
                {hasUnknownPrices && (
                    <p className="cart-summary-note">
                        Los precios del DROP 4 se anunciarán en el lanzamiento.
                    </p>
                )}
                {!isShopify && (
                    <p className="cart-summary-note">
                        Vista previa local: este carrito no reserva stock ni permite pagos.
                    </p>
                )}
                <button
                    type="button"
                    className="btn btn-primary cart-checkout"
                    disabled={!canCheckout || busy}
                    onClick={handleCheckout}
                >
                    {isShopify
                        ? (busy ? 'Actualizando…' : 'Ir al pago seguro')
                        : 'Pago desactivado en modo demo'}
                </button>
            </div>
            </div>
        </div>
    );
}

export default Cart;
