import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { INSTAGRAM_URL } from '../config/links';
import { DROP_STATES } from '../../shared/drops.mjs';
import { fechaCorta, horaDeMadrid } from '../features/drops/fecha.js';
import { LEGAL_PAGES, legalPath } from '../config/legal';
import { REDUCED_MOTION, prefersReducedMotion } from '../utils/media.js';
import '../styles/components/ticker.css';
import '../styles/components/footer.css';

import instagramIcon from '../images/optimized/shell/instagram-64.webp';
import guysSittingImage from '../images/optimized/shell/sentado-860.webp';
import lataPaseo from '../images/optimized/characters/lata-spray-walk-seedance-224.webp';
import lataPaseoQuieto from '../images/optimized/characters/lata-spray-walk-seedance-poster-224.webp';
import { useNightArt } from '../features/night/nightArt.js';
import { useNightMode } from '../features/night/useNightMode.js';

/* La cinta anuncia el drop destacado (muro-de-drops): con su fecha si está
   anunciado, en la calle o en últimas horas si ya ha caído, y nada si no hay
   ninguno. «Todo desde cero» sustituye a «Hecho a mano», el mismo cambio que se
   hizo en el copy del reel (commit 13499fd). */
function dropItem(drop) {
  if (!drop) return null;
  if (drop.state === DROP_STATES.ANNOUNCED) {
    return `DROP ${drop.number} · ${fechaCorta(drop.launchAt)} · ${horaDeMadrid(drop.launchAt)}`;
  }
  if (drop.state === DROP_STATES.LAST_HOURS) return `DROP ${drop.number} · ÚLTIMAS HORAS`;
  return `DROP ${drop.number} EN LA CALLE`;
}

const tickerItems = (drop) =>
  [
    'ROCKY 035',
    dropItem(drop),
    'TODO DESDE CERO',
    'ロッキー・スリーファイブ',
    'DESDE LA COLMENA',
    'LA CREW AL COMPLETO',
    'EDICIONES LIMITADAS',
    'CUANDO VUELAN, VUELAN',
  ].filter(Boolean);

// De noche la cinta avisa de que la crew se ha torcido.
const tickerItemsNoche = (drop) =>
  [
    'DESCONTROL ACTIVADO',
    'NO MIRES ATRÁS',
    'LA CREW SE HA TORCIDO',
    'ロッキー・スリーファイブ',
    'ILUMINA LAS PAREDES',
    'NO APAGUES LA LUZ',
    dropItem(drop),
    'CUANDO VUELAN, MUERDEN',
    'DESDE EL FONDO DE LA COLMENA',
  ].filter(Boolean);

const Footer = ({ featuredDrop = null }) => {
  const guysSittingArt = useNightArt(guysSittingImage);
  // De noche patrulla El Tóxico, con el mismo paseo.
  const paseoArt = useNightArt(lataPaseo);
  const paseoQuietoArt = useNightArt(lataPaseoQuieto);
  const night = useNightMode();
  const year = new Date().getFullYear();
  const tickerRef = useRef(null);
  const [lataAnimada, setLataAnimada] = useState(false);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker || prefersReducedMotion()) return undefined;

    if (typeof IntersectionObserver !== 'function') {
      setLataAnimada(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setLataAnimada(true);
        observer.disconnect();
      },
      { rootMargin: '800px 0px', threshold: 0 }
    );

    observer.observe(ticker);
    return () => observer.disconnect();
  }, []);

  const tickerText = (night ? tickerItemsNoche(featuredDrop) : tickerItems(featuredDrop))
    .map((item) => `${item} ✦ `)
    .join('');

  return (
    <>
      <div className="ticker" ref={tickerRef} aria-hidden="true">
        {/* WebP animado con alfa: mismo paseo que el APNG original pero
                    a tamaño de pantalla (663 kB frente a 7,3 MB). CSS sigue
                    controlando recorrido, dirección y extremos, y el póster
                    quieto atiende al movimiento reducido. */}
        <span className="doodle ticker-lata">
          <picture className="ticker-lata-picture">
            <source media={REDUCED_MOTION} srcSet={paseoQuietoArt} />
            <img
              src={lataAnimada ? paseoArt : paseoQuietoArt}
              width="166"
              height="224"
              loading="lazy"
              decoding="async"
              alt=""
              className="ticker-lata-image neon-art"
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
        <span className="footer-katakana" aria-hidden="true">
          ロッキースリーファイブ
        </span>
        <div className="footer-inner">
          <img
            src={guysSittingArt}
            width="860"
            height="538"
            loading="lazy"
            decoding="async"
            alt="Ilustración de tres chicos sentados con ropa ROCKY"
            className="doodle footer-illustration neon-art al-ritmo al-ritmo--suave"
            style={{ '--fase': '0.2' }}
          />
          <a
            href={INSTAGRAM_URL}
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
              className="footer-social-icon neon-art--icon"
            />
            <span>@rocky035</span>
          </a>
          <p className="footer-brand">ROCKY 035 — www.rocky035.com</p>
          <nav className="footer-links" aria-label="Información legal">
            {LEGAL_PAGES.map((page) => (
              <Link key={page.slug} to={legalPath(page.slug)}>
                {page.title}
              </Link>
            ))}
          </nav>
          <p className="footer-legal">
            © {year} Todos los derechos reservados · Designed by AKAYAY
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
