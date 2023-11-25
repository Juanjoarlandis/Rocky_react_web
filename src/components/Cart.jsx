import React from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';

import '../styles/Cart.css';

function Cart(props) {
    const { cart, removeFromCart, incrementQuantity, decrementQuantity } = props;

    const calculateTotal = () => {
        return cart.reduce((acc, product) => acc + parseFloat(product.price.replace('$', '')) * product.quantity, 0).toFixed(2);
    }

    return (
        <div className="cart-container">
            <div className="back-button-container">
                <Link to="/">
                    <Button variant="primary" className="back-button">Volver a inicio</Button>
                </Link>
            </div>
            <h2>Tu Carrito</h2>
            {cart.length === 0 ? (
                <p>Tu carrito está vacío</p>
            ) : (
                <>
                    {cart.map(product => (
                        <Card key={product.id} className="cart-item">
                            <Card.Img variant="left" src={product.image} className="cart-image" />
                            <Card.Body>
                                <Card.Title>{product.title}</Card.Title>
                                <Card.Text>
                                    Precio: {product.price}
                                </Card.Text>
                                <div className="quantity-modifier">
                                    <Button variant="outline-secondary" size="sm" onClick={() => decrementQuantity(product.id)}>-</Button>
                                    <span className="product-quantity">{product.quantity}</span>
                                    <Button variant="outline-secondary" size="sm" onClick={() => incrementQuantity(product.id)}>+</Button>
                                </div>
                                <Button variant="danger" onClick={() => removeFromCart(product.id)}>Eliminar</Button>
                            </Card.Body>
                        </Card>
                    ))}
                    <div className="cart-total">
                        <p>Total: ${calculateTotal()}</p>
                    </div>
                    <Button variant="primary" className="checkout-button">Proceder al Pago</Button>
                </>
            )}
        </div>
    );
}

export default Cart;
