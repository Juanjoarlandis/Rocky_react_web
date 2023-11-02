import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { Link } from 'react-router-dom';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import '../styles/ProductPage.css';

// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

function ProductPage(props) {
    const products = props.products;

    const [isOpen, setIsOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState('');

    return (
        <div className="product-list">
            {products.map(product => (
                <Card key={product.id} className="product-card">
                    <div
                        className="image-container"
                        onClick={() => {
                            setCurrentImage(product.image);
                            setIsOpen(true);
                        }}
                    >
                        <Card.Img
                            variant="top"
                            src={product.image}
                            className="product-image"
                        />
                        <span className="eye-icon-page">
                            <FontAwesomeIcon icon={faEye} />
                        </span>
                    </div>
                    <Card.Body>
                        <Card.Title>{product.title}</Card.Title>
                        <Card.Text>
                            Precio: {product.price}
                        </Card.Text>
                        <Link to={`/product/${product.id}`}>
                            <Button variant="primary">Más detalles</Button>
                        </Link>
                        <Button variant="secondary" onClick={() => props.addToCart(product)}>Añadir al carrito</Button>
                    </Card.Body>
                </Card>
            ))}

            {isOpen && (
                <Lightbox
                    mainSrc={currentImage}
                    onCloseRequest={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default ProductPage;
