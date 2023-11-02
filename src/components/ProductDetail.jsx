import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import '../styles/ProductDetail.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

function ProductDetail(props) {
    const { productId } = useParams();
    const product = props.products.find(p => p.id === parseInt(productId));

    // Estados para gestionar el modal Lightbox y la imagen actual
    const [isOpen, setIsOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState('');

    if (!product) {
        return <div>Producto no encontrado</div>;
    }

    return (
        <div className="product-detail-container">
            <div className="back-button-container">
                <Link to="/">
                    <button className="back-button">Volver a inicio</button>
                </Link>
            </div>
            <div
                className="image-container"
                onClick={() => {
                    setCurrentImage(product.image);
                    setIsOpen(true);
                }}
            >
                <img src={product.image} alt={product.title} className="product-detail-image" />
                <span className="eye-icon">
                    <FontAwesomeIcon icon={faEye} />
                </span>
            </div>
            <div className="product-detail-info">
                <h2>{product.title}</h2>
                <p>{product.description}</p>
                <p className="product-price">Precio: {product.price}</p>
                <ul className="product-specs">
                    {product.specifications.map((spec, index) => (
                        <ul key={index}>{spec}</ul>
                    ))}
                </ul>
                <Button variant="secondary" onClick={() => props.addToCart(product)}>Añadir al carrito</Button>
            </div>
            {isOpen && (
                <Lightbox
                    mainSrc={currentImage}
                    onCloseRequest={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default ProductDetail;
