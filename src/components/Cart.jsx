import React from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';

import '../styles/Cart.css';

function Cart(props) {
    const { cart, removeFromCart } = props;

    const calculateTotal = () => {
        return cart.reduce((acc, product) => acc + parseFloat(product.price.replace('$', '')) * product.quantity, 0).toFixed(2);
    }

    return (
        <div className='espacio'>

            <div className="cart-container">
                <div className="back-button-container">
                    <Link to="/">
                        <button className="back-button">Volver a inicio</button>
                    </Link>
                </div>
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
                                    <Card.Text>
                                        Cantidad: {product.quantity}
                                    </Card.Text>
                                    <Card.Text>
                                        Cantidad:
                                        <Button variant="outline-secondary" size="sm" onClick={() => props.decrementQuantity(product.id)}>-</Button>
                                        {product.quantity}
                                        <Button variant="outline-secondary" size="sm" onClick={() => props.incrementQuantity(product.id)}>+</Button>
                                    </Card.Text>

                                    <Button variant="secondary" onClick={() => removeFromCart(product.id)}>Eliminar</Button>
                                </Card.Body>
                            </Card>
                        ))}
                        <div className="cart-total">
                            <p>Total: ${calculateTotal()}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Cart;
