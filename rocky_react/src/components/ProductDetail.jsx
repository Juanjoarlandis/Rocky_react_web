import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import '../styles/ProductDetail.css';

function ProductDetail(props) {
    // Usamos el hook useParams para obtener el ID del producto desde la URL
    const { productId } = useParams();
    const product = props.products.find(p => p.id === parseInt(productId));

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
            <img src={product.image} alt={product.title} className="product-detail-image" />
            <div className="product-detail-info">
                <h2>{product.title}</h2>
                <p>{product.description}</p>
                <p className="product-price">Precio: {product.price}</p>
                <ul className="product-specs">
                    {product.specifications.map((spec, index) => (
                        <ul key={index}>{spec}</ul>
                    ))}
                </ul>
                {/* Botón para agregar al carrito */}
                <Button variant="secondary" onClick={() => props.addToCart(product)}>Añadir al carrito</Button>
            </div>
        </div>
    );
}

export default ProductDetail;
