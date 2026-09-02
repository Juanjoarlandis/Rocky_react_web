import React, { useState } from 'react';
import { Link, NavLink } from 'react-router';
import '../styles/components/navbar.css';

import { getCrewAvatarImage } from '../data/crewAvatarImages.js';
import { alternaTema, temaActual } from '../utils/theme.js';
import logo from '../images/Rockypng.png';
import cartIcon from '../images/optimized/shell/cart-96.webp';

/* La bombilla del interruptor, garabateada como el resto de trazos.
   Los rayitos sólo se encienden con el neón puesto. */
const BombillaIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 3.2 a5.6 5.6 0 0 1 5.5 5.7 c0 2.1 -1.2 3.2 -2 4.6 c-0.4 0.7 -0.6 1.3 -0.7 2 h-5.6 c-0.1 -0.7 -0.3 -1.3 -0.7 -2 c-0.8 -1.4 -2 -2.5 -2 -4.6 a5.6 5.6 0 0 1 5.5 -5.7 Z" />
        <path d="M9.9 18.4 h4.2 M10.3 20.6 h3.4" />
        <path d="M10.6 11.2 q1.4 -1.7 2.8 0" />
        <g className="navbar-theme-rays">
            <path d="M12 0.4 v1 M4.6 3.4 l0.9 0.9 M19.4 3.4 l-0.9 0.9 M1.8 10.2 h1.2 M21 10.2 h1.2" />
        </g>
    </svg>
);

// react-router marca el destino actual con `active`; aquí se traduce al
// prefijo de estado de la casa.
const navLinkClass = ({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`;

const NavBar = ({
    totalItems,
    accountEnabled = false,
    account = { loggedIn: false, customer: null },
    crewAvatarId = 'skater-head',
}) => {
    // El primer valor sale del <html> que dejó preparado index.html.
    const [tema, setTema] = useState(temaActual);
    const enciendeApaga = () => setTema(alternaTema());
    const neonPuesto = tema === 'neon';

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
                        className="navbar-logo neon-art--icon"
                    />
                </Link>
                <nav className="navbar-links" aria-label="Navegación principal">
                    <NavLink to="/" end className={navLinkClass}>
                        Tienda
                    </NavLink>
                    <NavLink to="/menudrop" className={navLinkClass}>
                        Drops
                    </NavLink>
                    <NavLink to="/estudio" className={navLinkClass}>
                        Estudio
                    </NavLink>
                    <NavLink to="/crew" className={navLinkClass}>
                        Crew
                    </NavLink>
                    <NavLink to="/rockyIA" className={navLinkClass}>
                        Rocky IA
                    </NavLink>
                    {accountEnabled && account.loggedIn ? (
                        <NavLink
                            to="/mi-crew"
                            className={({ isActive }) => `navbar-account navbar-account--avatar${isActive ? ' is-active' : ''}`}
                            aria-label="Abrir MiCrew"
                            title="Abrir MiCrew"
                        >
                            <img
                                src={getCrewAvatarImage(crewAvatarId)}
                                width="96"
                                height="96"
                                decoding="async"
                                alt=""
                                className="navbar-account-avatar neon-art--icon"
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
                            className="navbar-cart-icon neon-art--icon"
                        />
                        {totalItems > 0 && (
                            <span className="cart-counter">{totalItems}</span>
                        )}
                    </NavLink>
                    <button
                        type="button"
                        className={`navbar-theme ${neonPuesto ? 'navbar-theme--on' : ''}`}
                        onClick={enciendeApaga}
                        aria-pressed={neonPuesto}
                        aria-label={neonPuesto ? 'Apagar el neón' : 'Encender el neón'}
                        title={neonPuesto ? 'Apagar el neón' : 'Encender el neón'}
                    >
                        <BombillaIcon />
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default NavBar;
