import React from 'react';
import '../styles/Footer.css';

import instagramIcon from '../images/instagram.png';
import guysSittingImage from '../images/Sentado.png';

const TICKER_ITEMS = [
    'ROCKY 035',
    'DROP 4 PRÓXIMAMENTE',
    'HECHO A MANO',
    'ロッキー・スリーファイブ',
    'DESDE LA COLMENA',
    'LA CREW AL COMPLETO',
    'EDICIONES LIMITADAS',
    'CUANDO VUELAN, VUELAN',
];

const Footer = () => {
    const year = new Date().getFullYear();

    const tickerText = TICKER_ITEMS.map((item) => `${item} ✦ `).join('');

    return (
        <>
            <div className="ticker" aria-hidden="true">
                <div className="ticker-track">
                    <span>{tickerText}</span>
                    <span>{tickerText}</span>
                </div>
            </div>
            <footer className="footer">
            <span className="footer-katakana" aria-hidden="true">ロッキースリーファイブ</span>
            <div className="footer-inner">
                <img
                    src={guysSittingImage}
                    alt="Ilustración de tres chicos sentados con ropa ROCKY"
                    className="footer-illustration"
                />
                <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social"
                    aria-label="Instagram de ROCKY 035"
                >
                    <img src={instagramIcon} alt="" className="footer-social-icon" />
                    <span>@rocky035</span>
                </a>
                <p className="footer-brand">ROCKY 035 — www.rocky035.com</p>
                <p className="footer-legal">
                    © {year} Todos los derechos reservados · Designed by AKAYAY
                </p>
            </div>
            </footer>
        </>
    );
};

export default Footer;
