// Header.js
import React from 'react';
import { useState } from 'react'; // Importamos el hook useState
import { Link } from 'react-router-dom'; // Importamos Link para manejar la navegación

import '../styles/Header.css' // Importamos el archivo CSS correspondiente
import logo from '../images/Rockypng.png';


const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false); // Estado para el menú

    // Función para manejar el clic en el botón del menú
    const handleMenuClick = () => {
        setMenuOpen(!menuOpen); // Cambia el estado actual del menú
    };

    return (
        <header className="header-container">
            <div className="logo-container">
                <Link to="/">
                    <img src={logo} alt="Logo Rocky 35" className="logo-image" />
                </Link>
            </div>
        </header>
    );
};

export default Header;
