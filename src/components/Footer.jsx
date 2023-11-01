// Footer.js
import React from 'react';


// Importando los componentes de íconos SVG
import { FacebookIcon, TwitterIcon, InstagramIcon, LinkedInIcon } from './Icons'; // Asumiendo que los guardaste en un archivo llamado Icons.js

const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="footer-social">
                <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">
                    <FacebookIcon />
                </a>
                <a href="https://twitter.com/" target="_blank" rel="noreferrer">
                    <TwitterIcon />
                </a>
                <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
                    <InstagramIcon />
                </a>
                <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">

                </a>
            </div>

            <div className="footer-info">
                <p>Email: ejemplo@tiendaropa.com</p>
                <p>Teléfono: +1 (555) 123-4567</p>
            </div>

            <div className="footer-links">
                <a href="/terminos-y-condiciones">Términos y condiciones</a>
                <a href="/politica-de-privacidad">Política de privacidad</a>
                <p>Designed by AKAYAY</p>
            </div>
        </footer>
    );
};

export default Footer;
