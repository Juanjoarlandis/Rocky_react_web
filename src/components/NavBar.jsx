// NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NavBar.css';
import mainLogo from "../images/Rockypng.png"
import cartIcon from "../images/cart.png"
import aiIcon from "../images/ia.png"
import menuIcon from "../images/menu.png"
import medidaIcon from "../images/medidas.png"

const NavBar = (props) => {
    return (
        <div className="navbar-container">
            <Link to="/" className="logo-container">
                <img src={mainLogo} alt="Logo Principal" className="main-logo" />
            </Link>
            <div className="navbar">
                <Link to="/menudrop" className="logo-container">
                    <img src={menuIcon} alt="Logo 3" className="logo" />
                </Link>
                <Link to="/cart" className="logo-container">
                    <img src={cartIcon} alt="Logo 1" className="logo" />
                    {props.cart.length > 0 && <span className="cart-counter">{props.totalItems + " items"}</span>}
                </Link>
                <Link to="/medidas" className="logo-container">
                    <img src={medidaIcon} alt="Logo 3" className="logo" />
                </Link>
                <Link to="/rockyIA" className="logo-container">
                    <img src={aiIcon} alt="Logo 4" className="logo" />
                </Link>
            </div>
        </div>
    );
}

export default NavBar;
