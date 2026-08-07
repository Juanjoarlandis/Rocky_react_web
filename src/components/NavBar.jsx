import React from 'react';
import { Link, NavLink } from 'react-router';
import '../styles/NavBar.css';

import logo from '../images/Rockypng.png';
import cartIcon from '../images/cart.png';

const NavBar = ({
    totalItems,
    accountEnabled = false,
    account = { loggedIn: false, customer: null },
    onLogout,
}) => {
    const handleLogout = async () => {
        try {
            const logoutUrl = await onLogout();
            if (logoutUrl) window.location.assign(logoutUrl);
        } catch {
            // El aviso global comunica el error sin abandonar la página.
        }
    };

    return (
        <header className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand" aria-label="Inicio">
                    <img src={logo} alt="ROCKY 035" className="navbar-logo" />
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
                    {accountEnabled && (
                        account.loggedIn ? (
                            <button
                                type="button"
                                className="navbar-account"
                                onClick={handleLogout}
                                title="Cerrar sesión"
                            >
                                {account.customer?.displayName || 'Salir'}
                            </button>
                        ) : (
                            <a
                                href="/api/shopify/account/login?returnPath=%2F"
                                className="navbar-account"
                            >
                                Cuenta
                            </a>
                        )
                    )}
                    <NavLink to="/cart" className="navbar-cart" aria-label="Carrito">
                        <img src={cartIcon} alt="" className="navbar-cart-icon" />
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
