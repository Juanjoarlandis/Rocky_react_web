import { artSources } from '../data/art.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import perdidoMapa from '../images/optimized/characters/perdido-mapa-hd.webp';
import perroRocky from '../images/optimized/characters/perro-rocky-hd.webp';
import { useNightMode } from '../features/night/useNightMode.js';
import { useNightArt } from '../features/night/nightArt.js';
import { subscribeTorch } from '../features/night/torch.js';
import '../styles/pages/not-found.css';

// De noche la salida se esconde en otro sitio cada vez: siempre por debajo
// de la navbar y lejos de los cantos.
function hiddenExit() {
  return { x: 10 + Math.random() * 66, y: 30 + Math.random() * 50 };
}

/* El 404 a oscuras: se ha ido la luz y sólo se ve lo que alumbra la
   linterna. La navbar queda por encima, siempre a la vista. */
function Oscuridad() {
  const ref = useRef(null);
  useEffect(
    () =>
      subscribeTorch(({ x, y }) => {
        ref.current?.style.setProperty('--tx', `${Math.round(x)}px`);
        ref.current?.style.setProperty('--ty', `${Math.round(y)}px`);
      }),
    []
  );
  return <div className="notfound-oscuridad" ref={ref} aria-hidden="true" />;
}

const NotFound = () => {
  const night = useNightMode();
  const [exit] = useState(hiddenExit);
  const perroArt = useNightArt(perroRocky);

  return (
    <div className={`page-container notfound${night ? ' notfound--oscuras' : ''}`}>
      <div className="notfound-figures">
        <img
          {...artSources(perdidoMapa, 400)}
          width="614"
          height="1360"
          decoding="async"
          alt="Personaje ROCKY perdido, consultando un mapa"
          className="notfound-image neon-art al-ritmo"
          style={{ '--fase': '0.25' }}
        />
        {/* El perro de la banda, que sí sabe volver; de noche, El Sabueso Negro */}
        <img
          {...artSources(perroArt, 160)}
          alt=""
          className="notfound-dog neon-art al-ritmo"
          style={{ '--fase': '0.75' }}
        />
      </div>
      <h1 className="notfound-title">
        {night ? 'No deberías estar aquí' : 'Te has salido del mapa'}
      </h1>
      <p className="notfound-text">
        {night ? 'Se ha ido la luz. Busca la salida.' : 'La página que buscas no existe.'}
      </p>
      <Link
        to="/"
        className={`btn btn--primary${night ? ' notfound-salida' : ''}`}
        style={night ? { '--sx': `${exit.x}%`, '--sy': `${exit.y}%` } : undefined}
      >
        {night ? 'Salir de aquí' : 'Volver a la tienda'}
      </Link>
      {night && (
        <>
          <Oscuridad />
          <p className="notfound-pista">Mueve el ratón o toca la pantalla para alumbrar.</p>
        </>
      )}
    </div>
  );
};

export default NotFound;
