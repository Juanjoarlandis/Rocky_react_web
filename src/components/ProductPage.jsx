import React, { useState, useMemo } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { Link } from 'react-router-dom';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import '../styles/ProductPage.css';

// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

function ProductPage({ products, addToCart }) {  // Desestructurando 'products' y 'addToCart' de props
    const [isOpen, setIsOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState('');

    // Función para manejar errores de carga de imagen
    const handleImageError = (e) => {
        e.target.src = 'path_to_backup_image.jpg'; // Reemplaza con la URL de tu imagen de reserva
    };

    // useMemo para evitar cálculos innecesarios en cada render
    const renderedProducts = useMemo(() => products.map(product => (
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
                    alt={product.title}
                    loading="lazy"
                    onError={handleImageError}
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
                <Button variant="secondary" onClick={() => addToCart(product)}>
                    Añadir al carrito
                </Button>
            </Card.Body>
        </Card>
    )), [products, addToCart]); // Incluyendo 'products' y 'addToCart' en la lista de dependencias

    return (
        <div className="product-list">
            {renderedProducts}

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
