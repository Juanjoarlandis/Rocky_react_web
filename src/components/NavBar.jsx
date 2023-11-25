import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NavBar.css';

import galleryIcon from "../images/gallery.png";

const NavBar = (props) => {
    return (
        <div className="navbar-container">
            <Link to="/" className="logo-container" aria-label="Inicio">
                <img src="https://rockystorage.s3.us-east-1.amazonaws.com/icons/Rockypng.webp" alt="Logo Principal" className="main-logo" />
            </Link>
            <div className="navbar">
                <Link to="/menudrop" className="logo-container" aria-label="Menú">
                    <img src="https://rockystorage.s3.us-east-1.amazonaws.com/icons/menu.webp" alt="Menú" className="logo" />
                </Link>
                <Link to="/cart" className="logo-container" aria-label="Carrito">
                    <img src="https://rockystorage.s3.us-east-1.amazonaws.com/icons/cart.webp" alt="Carrito" className="logo" />
                    {props.cart.length > 0 && <span className="cart-counter">{props.totalItems + " items"}</span>}
                </Link>
                <Link to="/galeria" className="logo-container" aria-label="Galería">
                    <img src={galleryIcon} alt="Galería" className="logo" />
                </Link>
                <Link to="/rockyIA" className="logo-container" aria-label="Rocky IA">
                    <img src="https://rockystorage.s3.us-east-1.amazonaws.com/icons/ia.webp" alt="Rocky IA" className="logo" />
                </Link>
            </div>
        </div>
    );
}

export default NavBar;
