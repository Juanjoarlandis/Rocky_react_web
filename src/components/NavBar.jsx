import React from 'react';
import { Link, NavLink } from 'react-router';
import '../styles/NavBar.css';

import { getCrewAvatarImage } from '../data/crewAvatarImages.js';
import logo from '../images/Rockypng.png';
import cartIcon from '../images/optimized/shell/cart-96.webp';

const NavBar = ({
    totalItems,
    accountEnabled = false,
    account = { loggedIn: false, customer: null },
    crewAvatarId = 'skater-head',
}) => {
    return (
        <header className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand" aria-label="Inicio">
                    <img
                        src={logo}
                        width="831"
                        height="173"
                        decoding="async"
                        alt="ROCKY 035"
                        className="navbar-logo"
                    />
                </Link>
                <nav className="navbar-links" aria-label="Navegación principal">
                    <NavLink to="/" end className="navbar-link">
                        Tienda
                    </NavLink>
                    <NavLink to="/menudrop" className="navbar-link">
                        Drops
                    </NavLink>
                    <NavLink to="/estudio" className="navbar-link">
                        Estudio
                    </NavLink>
                    <NavLink to="/crew" className="navbar-link">
                        Crew
                    </NavLink>
                    <NavLink to="/rockyIA" className="navbar-link">
                        Rocky IA
                    </NavLink>
                    {accountEnabled && account.loggedIn ? (
                        <NavLink
                            to="/mi-crew"
                            className="navbar-account navbar-account--avatar"
                            aria-label="Abrir MiCrew"
                            title="Abrir MiCrew"
                        >
                            <img
                                src={getCrewAvatarImage(crewAvatarId)}
                                width="96"
                                height="96"
                                decoding="async"
                                alt=""
                                className="navbar-account-avatar"
                            />
                        </NavLink>
                    ) : accountEnabled ? (
                        <a
                            href="/api/shopify/account/login?returnPath=%2Fmi-crew"
                            className="navbar-account"
                        >
                            Mi Crew
                        </a>
                    ) : (
                        <NavLink to="/mi-crew" className="navbar-account">
                            Mi Crew
                        </NavLink>
                    )}
                    <NavLink to="/cart" className="navbar-cart" aria-label="Carrito">
                        <img
                            src={cartIcon}
                            width="96"
                            height="96"
                            decoding="async"
                            alt=""
                            className="navbar-cart-icon"
                        />
                        {totalItems > 0 && (
                            <span className="cart-counter">{totalItems}</span>
                        )}
                    </NavLink>
                </nav>
            </div>
        </header>
    );
};

export default NavBar;
