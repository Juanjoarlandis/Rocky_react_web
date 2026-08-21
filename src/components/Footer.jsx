import React from 'react';
import '../styles/Footer.css';

import instagramIcon from '../images/optimized/shell/instagram-64.webp';
import guysSittingImage from '../images/optimized/shell/sentado-860.webp';
import lataPaseo from '../images/optimized/characters/lata-spray-walk-seedance-224.webp';
import lataPaseoQuieto from '../images/optimized/characters/lata-spray-walk-seedance-poster-224.webp';

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
                {/* WebP animado con alfa: mismo paseo que el APNG original pero
                    a tamaño de pantalla (663 kB frente a 7,3 MB). CSS sigue
                    controlando recorrido, dirección y extremos, y el póster
                    quieto atiende al movimiento reducido. */}
                <span className="ticker-lata">
                    <picture className="ticker-lata-picture">
                        <source
                            media="(prefers-reduced-motion: reduce)"
                            srcSet={lataPaseoQuieto}
                        />
                        <img
                            src={lataPaseo}
                            width="166"
                            height="224"
                            loading="lazy"
                            decoding="async"
                            alt=""
                            className="ticker-lata-image"
                        />
                    </picture>
                </span>
                <div className="ticker-clip">
                    <div className="ticker-track">
                        <span>{tickerText}</span>
                        <span>{tickerText}</span>
                    </div>
                </div>
            </div>
            <footer className="footer">
            <span className="footer-katakana" aria-hidden="true">ロッキースリーファイブ</span>
            <div className="footer-inner">
                <img
                    src={guysSittingImage}
                    width="860"
                    height="538"
                    loading="lazy"
                    decoding="async"
                    alt="Ilustración de tres chicos sentados con ropa ROCKY"
                    className="footer-illustration al-ritmo al-ritmo--suave"
                    style={{ '--fase': '0.2' }}
                />
                <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social"
                    aria-label="Instagram de ROCKY 035"
                >
                    <img
                        src={instagramIcon}
                        width="64"
                        height="64"
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="footer-social-icon"
                    />
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
