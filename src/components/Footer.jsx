import React from 'react';
import '../styles/Footer.css'; // Asegúrate de tener tus estilos aquí

import instagramIcon from '../images/instagram.png';
import guysSittingImage from '../images/Sentado.png';

const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="footer-inner-container">
                <div className="footer-social-icons">
                    <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                        <img src={instagramIcon} alt="Instagram" className="social-icon" />
                    </a>
                </div>

                <div className="footer-image">
                    <img src={guysSittingImage} alt="Tres chicos sentados" />
                </div>

                <div className="footer-contact-info">
                    <p>ESTA MARCA PERTENECE A www.rocky035.com</p>
                </div>

                <div className="footer-policy-links">
                    <p>Todos los derechos Reservados</p>
                </div>

                <div className="footer-credit">
                    <p>Designed by AKAYAY</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
