import React, { useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { Link } from 'react-router-dom';
import '../styles/ProductPage.css';

function ProductPage(props) {
    const products = props.products; // Ya no necesitamos useState para los productos

    return (
        <div className="product-list">
            {products.map(product => (
                <Card key={product.id} className="product-card">
                    <Card.Img variant="top" src={product.image} className="product-image" />
                    <Card.Body>
                        <Card.Title>{product.title}</Card.Title>
                        <Card.Text>
                            Precio: {product.price}
                        </Card.Text>
                        <Link to={`/product/${product.id}`}>
                            <Button variant="primary">Más detalles</Button>
                        </Link>
                        {/* Botón para agregar al carrito */}
                        <Button variant="secondary" onClick={() => props.addToCart(product)}>Añadir al carrito</Button>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
}

export default ProductPage;
