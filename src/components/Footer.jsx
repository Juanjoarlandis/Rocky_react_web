import React, { useEffect, useRef } from 'react';
import '../styles/Footer.css';

import instagramIcon from '../images/optimized/shell/instagram-64.webp';
import guysSittingImage from '../images/optimized/shell/sentado-860.webp';
import lataPaseo from '../images/optimized/characters/lata-spray-walk-seedance.webm';

const LATA_PLAYBACK_RATE = 1.5;

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
    const lataVideoRef = useRef(null);

    const tickerText = TICKER_ITEMS.map((item) => `${item} ✦ `).join('');

    useEffect(() => {
        const video = lataVideoRef.current;
        const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

        // En navegadores sin `matchMedia`, los atributos del propio vídeo se
        // encargan del autoplay y no hace falta duplicar esa ruta desde React.
        if (!motionQuery) return undefined;

        // CSS puede detener el recorrido, pero sólo la API de vídeo evita que
        // el personaje continúe caminando en el sitio con movimiento reducido.
        const syncMotionPreference = () => {
            if (motionQuery.matches) {
                video.pause();
                video.currentTime = 0;
                return;
            }

            // Seedance entrega la marcha demasiado pausada para la velocidad
            // de cruce de la marquesina; sólo se acelera el gesto corporal.
            video.defaultPlaybackRate = LATA_PLAYBACK_RATE;
            video.playbackRate = LATA_PLAYBACK_RATE;
            video.play().catch(() => {
                // `muted` permite autoplay; si el navegador lo bloquea, el
                // primer fotograma sigue siendo una degradación válida.
            });
        };

        syncMotionPreference();
        motionQuery.addEventListener('change', syncMotionPreference);
        return () => motionQuery.removeEventListener('change', syncMotionPreference);
    }, []);

    return (
        <>
            <div className="ticker" aria-hidden="true">
                {/* Seedance aporta la marcha continua; CSS conserva el control
                    del recorrido para que dirección y extremos sean exactos. */}
                <span className="ticker-lata">
                    <video
                        ref={lataVideoRef}
                        src={lataPaseo}
                        width="656"
                        height="881"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="ticker-lata-video"
                    />
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
                    className="footer-illustration"
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
