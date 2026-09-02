import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import '../styles/components/navbar.css';

import { getCrewAvatarImage } from '../data/crewAvatarImages.js';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll.js';
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

/* Tres trazos a mano que se cruzan en aspa cuando el menú está abierto. */
const MenuIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    width="26"
    height="26"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    aria-hidden="true"
    className={`navbar-menu-icon${open ? ' is-open' : ''}`}
  >
    <path className="navbar-menu-stroke navbar-menu-stroke--top" d="M4 7 q8 -1.2 16 0" />
    <path className="navbar-menu-stroke navbar-menu-stroke--mid" d="M4 12 q8 1 16 0" />
    <path className="navbar-menu-stroke navbar-menu-stroke--bottom" d="M4 17 q8 -1 16 0" />
  </svg>
);

const DESTINATIONS = [
  { to: '/', label: 'Tienda', end: true },
  { to: '/menudrop', label: 'Drops' },
  { to: '/estudio', label: 'Estudio' },
  { to: '/crew', label: 'Crew' },
  { to: '/rockyIA', label: 'Rocky IA' },
];

// react-router marca el destino actual con `active`; aquí se traduce al
// prefijo de estado de la casa.
const navLinkClass = ({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`;
const sheetLinkClass = ({ isActive }) => `navbar-sheet-link${isActive ? ' is-active' : ''}`;
const FOCUSABLE = 'a[href], button:not([disabled])';

function cartLabel(totalItems) {
  if (!totalItems) return 'Carrito, vacío';
  return `Carrito, ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
}

/* El acceso a Mi Crew cambia según haya cuentas de cliente y sesión: avatar
   equipado, enlace al login de Shopify o la ruta de vista previa. */
function AccountEntry({ accountEnabled, account, crewAvatarId, className, onNavigate }) {
  if (accountEnabled && account.loggedIn) {
    return (
      <NavLink
        to="/mi-crew"
        className={({ isActive }) =>
          `${className} navbar-account--avatar${isActive ? ' is-active' : ''}`
        }
        aria-label="Mi Crew"
        title="Mi Crew"
        onClick={onNavigate}
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
    );
  }
  if (accountEnabled) {
    return (
      <a href="/api/shopify/account/login?returnPath=%2Fmi-crew" className={className}>
        Mi Crew
      </a>
    );
  }
  return (
    <NavLink to="/mi-crew" className={className} onClick={onNavigate}>
      Mi Crew
    </NavLink>
  );
}

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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const sheetRef = useRef(null);
  const sheetId = useId();
  const location = useLocation();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Cambiar de ruta cierra la hoja aunque se llegue por otro camino.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useLockBodyScroll(menuOpen);

  /* Con la hoja abierta el foco entra en ella, Tab da vueltas dentro y
       Escape la cierra devolviendo el foco al botón que la abrió. */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const sheet = sheetRef.current;
    const button = menuButtonRef.current;
    sheet?.querySelector(FOCUSABLE)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        button?.focus();
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;
      const focusable = [...sheet.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const themeButton = (className) => (
    <button
      type="button"
      className={`${className} ${neonPuesto ? 'navbar-theme--on' : ''}`}
      onClick={enciendeApaga}
      aria-pressed={neonPuesto}
      aria-label={neonPuesto ? 'Apagar el neón' : 'Encender el neón'}
      title={neonPuesto ? 'Apagar el neón' : 'Encender el neón'}
    >
      <BombillaIcon />
      {className.includes('sheet') && (
        <span>{neonPuesto ? 'Apagar el neón' : 'Encender el neón'}</span>
      )}
    </button>
  );

  /* La hoja va fuera del <header>: su backdrop-filter crea un bloque
       contenedor y dejaría el position: fixed encerrado en los 56px de barra. */
  return (
    <>
      <header className={`navbar${menuOpen ? ' navbar--menu-open' : ''}`}>
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
            {DESTINATIONS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
            <AccountEntry
              accountEnabled={accountEnabled}
              account={account}
              crewAvatarId={crewAvatarId}
              className="navbar-account"
            />
          </nav>
          <div className="navbar-tools">
            <NavLink to="/cart" className="navbar-cart" aria-label={cartLabel(totalItems)}>
              <img
                src={cartIcon}
                width="96"
                height="96"
                decoding="async"
                alt=""
                className="navbar-cart-icon neon-art--icon"
              />
              {totalItems > 0 && (
                <span className="cart-counter" aria-hidden="true">
                  {totalItems}
                </span>
              )}
            </NavLink>
            {themeButton('navbar-theme')}
            <button
              type="button"
              ref={menuButtonRef}
              className="navbar-menu"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={sheetId}
              aria-label={menuOpen ? 'Cerrar el menú' : 'Abrir el menú'}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div
          id={sheetId}
          ref={sheetRef}
          className="navbar-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          <nav className="navbar-sheet-links" aria-label="Navegación principal">
            {DESTINATIONS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={sheetLinkClass} onClick={closeMenu}>
                {label}
              </NavLink>
            ))}
            <AccountEntry
              accountEnabled={accountEnabled}
              account={account}
              crewAvatarId={crewAvatarId}
              className="navbar-sheet-link navbar-sheet-account"
              onNavigate={closeMenu}
            />
          </nav>
          <div className="navbar-sheet-footer">
            {themeButton('navbar-theme navbar-theme--sheet')}
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
