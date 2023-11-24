// NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NavBar.css';

import cartIcon from "../images/cart.png"
import aiIcon from "../images/ia.png"
import menuIcon from "../images/menu.png"
import medidaIcon from "../images/medidas.png"
import galleryIcon from "../images/gallery.png"

const NavBar = (props) => {
    return (
        <div className="navbar-container">
            <Link to="/" className="logo-container">
                <img src={"https://rockystorage.s3.us-east-1.amazonaws.com/icons/Rockypng.webp"} alt="Logo Principal" className="main-logo" />
            </Link>
            <div className="navbar">
                <Link to="/menudrop" className="logo-container">
                    <img src={"https://rockystorage.s3.us-east-1.amazonaws.com/icons/menu.webp"} alt="Logo 3" className="logo" />
                </Link>
                <Link to="/cart" className="logo-container">
                    <img src={"https://rockystorage.s3.us-east-1.amazonaws.com/icons/cart.webp"} alt="Logo 1" className="logo" />
                    {props.cart.length > 0 && <span className="cart-counter">{props.totalItems + " items"}</span>}
                </Link>
                <Link to="/galeria" className="logo-container">
                    <img src={galleryIcon} alt="Galería" className="logo" />
                </Link>
                <Link to="/rockyIA" className="logo-container">
                    <img src={"https://rockystorage.s3.us-east-1.amazonaws.com/icons/ia.webp"} alt="Logo 4" className="logo" />
                </Link>
            </div>
        </div>
    );
}

export default NavBar;
