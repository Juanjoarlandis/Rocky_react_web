import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import streetWall from '../data/streetWall';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/links';
import { between } from '../utils/math.js';
import { prefersReducedMotion } from '../utils/media.js';
import fotografoAgachado from '../images/optimized/shell/fotografo-agachado.webp';
import dianaJefe from '../images/optimized/splash/diana-jefe.webp';
import '../styles/components/street-wall.css';

/* El disparo entero del Paparazzi: chispazo en el objetivo y fogonazo hacia
   quien mira. Las animaciones de StreetWall.css duran exactamente esto. */
export const DISPARO_MS = 600;
// Te saca la primera foto al poco de llegar al muro…
const PRIMERA_FOTO = [1_600, 2_600];
// …y si te quedas mirando repite de vez en cuando, sin ametrallar.
const ENTRE_FOTOS = [9_000, 16_000];
// Dónde cae el objetivo de la cámara dentro del encuadre del dibujo.
const LENTE = Object.freeze({ x: 0.35, y: 0.4 });
// Cuánto fotógrafo tiene que verse para que dispare. En móvil está oculto del
// todo, así que ahí nunca llega a encuadrar a nadie.
const A_TIRO = 0.6;

/* La estrella del chispazo, con las puntas desiguales como el resto de trazos
   de ROCKY. Los tres palitos sueltos son las chispas que saltan aparte. */
const CHISPAZO =
  '114.9,57.1 79.3,49.5 97.5,28.5 71.2,37.6 58.0,3.0 52.0,41.7 23.5,30.4 ' +
  '37.2,47.6 6.1,56.2 41.2,69.4 25.3,96.0 52.0,82.6 53.9,117.7 66.0,79.1 ' +
  '96.2,91.5 83.4,68.8';

// Muro de fotos tipo pared de habitación: polaroids pegadas con celo,
// en blanco y negro, con pies de foto en rotulador.
function StreetWall() {
  const figuraRef = useRef(null);
  const wallGridRef = useRef(null);
  const [disparo, setDisparo] = useState(null);
  const [wallImagesReady, setWallImagesReady] = useState(false);

  /* La sesión de fotos: cuando el fotógrafo entra en pantalla arma el
       disparo, y cada foto es un chispazo en la cámara más un fogonazo que
       nace en el objetivo. Sale de aquí y no de CSS porque hay que saber
       cuándo está a tiro y dónde queda la cámara en ese momento. */
  useEffect(() => {
    const figura = figuraRef.current;
    if (!figura) return undefined;
    // Un fogonazo a pantalla completa es justo lo que pide evitar quien
    // activa el movimiento reducido.
    if (prefersReducedMotion()) return undefined;
    if (typeof IntersectionObserver !== 'function') return undefined;

    let aTiro = false;
    let sesion;
    let recogida;
    let contador = 0;

    const dispara = () => {
      if (!aTiro) return;
      // En una pestaña de fondo nadie posa: lo intenta más tarde.
      if (document.hidden) {
        sesion = window.setTimeout(dispara, 3_000);
        return;
      }
      const caja = figura.getBoundingClientRect();
      contador += 1;
      setDisparo({
        id: contador,
        x: Math.round(caja.left + caja.width * LENTE.x),
        y: Math.round(caja.top + caja.height * LENTE.y),
      });
      recogida = window.setTimeout(() => setDisparo(null), DISPARO_MS);
      sesion = window.setTimeout(dispara, between(ENTRE_FOTOS));
    };

    const observer = new IntersectionObserver(
      (entradas) => {
        // El navegador puede agrupar varios cruces en un solo aviso
        // (salir y volver a entrar en un scroll rápido llega como
        // [fuera, dentro]): el que vale es el último, que es donde ha
        // quedado de verdad. Mirar sólo el primero dejaba la sesión
        // muerta con el fotógrafo en pantalla.
        const entrada = entradas[entradas.length - 1];
        if (entrada.isIntersecting === aTiro) return;
        aTiro = entrada.isIntersecting;
        window.clearTimeout(sesion);
        // Cada vuelta al muro es una llegada: vuelve a pillarte pronto.
        if (aTiro) sesion = window.setTimeout(dispara, between(PRIMERA_FOTO));
      },
      { threshold: A_TIRO }
    );

    observer.observe(figura);
    return () => {
      observer.disconnect();
      window.clearTimeout(sesion);
      window.clearTimeout(recogida);
    };
  }, []);

  /* El lazy loading nativo descarga imágenes demasiado alejadas para este
       muro. Las activamos con margen suficiente para que lleguen antes del
       scroll, pero fuera de la carga inicial de la portada. */
  useEffect(() => {
    const grid = wallGridRef.current;
    if (!grid) return undefined;

    if (typeof IntersectionObserver !== 'function') {
      setWallImagesReady(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry?.isIntersecting) return;
        setWallImagesReady(true);
        observer.disconnect();
      },
      { rootMargin: '400px 0px', threshold: 0 }
    );

    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  if (!streetWall.length) return null;

  return (
    <section className="street-wall">
      <div className="street-wall-head">
        <h2 className="page-title">La banda</h2>
        <a
          className="street-wall-handle"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          del insta {INSTAGRAM_HANDLE}
        </a>
        {/* El fotógrafo de la crew, disparando el muro */}
        <span className="doodle street-photographer" ref={figuraRef}>
          <img
            src={fotografoAgachado}
            width="212"
            height="316"
            loading="lazy"
            decoding="async"
            alt=""
            className="neon-art"
          />
          {disparo && (
            <span
              key={disparo.id}
              className="street-photographer-flash"
              data-testid="paparazzi-flash"
              aria-hidden="true"
            >
              <svg viewBox="0 0 120 120" focusable="false">
                <polygon
                  points={CHISPAZO}
                  fill="#fff"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinejoin="round"
                />
                <path
                  d="M101 20 l9 -7"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M10 92 l-7 6"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M103 98 l8 8"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          {/* El fogonazo llega hasta el espectador: va clavado a la
                        ventana entera, por eso vive colgado del body. */}
          {disparo &&
            createPortal(
              <span
                key={disparo.id}
                className="street-flash-blink"
                data-testid="paparazzi-fogonazo"
                style={{
                  '--flash-x': `${disparo.x}px`,
                  '--flash-y': `${disparo.y}px`,
                }}
                aria-hidden="true"
              />,
              document.body
            )}
        </span>
      </div>
      <div className="street-wall-grid" ref={wallGridRef}>
        {streetWall.map((photo) => (
          <figure key={photo.src} className="street-photo tape">
            <img
              src={wallImagesReady ? photo.src : undefined}
              width={photo.width}
              height={photo.height}
              alt={wallImagesReady ? photo.alt : ''}
              loading="lazy"
              decoding="async"
            />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="street-wall-cta">
        {/* El Diana, la marca en persona, presenta a la banda */}
        <img
          src={dianaJefe}
          width="231"
          height="400"
          loading="lazy"
          decoding="async"
          alt=""
          className="cta-diana neon-art al-ritmo"
          style={{ '--fase': '0.45' }}
        />
        <Link to="/crew" className="btn btn--primary">
          Conoce a la crew →
        </Link>
      </div>
    </section>
  );
}

export default StreetWall;
