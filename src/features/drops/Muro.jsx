import { Link } from 'react-router';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { CrosshairSpinner } from '../../components/doodles/CrosshairSpinner';
import { ROUTES } from '../../config/routes.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import pegador from '../../images/optimized/characters/pegador-carteles-600.webp';
import { useNightArt } from '../night/nightArt.js';
import Cartel from './Cartel';
import '../../styles/pages/muro.css';

/* EL MURO (muro-de-drops): los drops de la crew pegados en una pared. Arriba
   los anunciados, después lo que está en la calle y al fondo el archivo, que
   asoma roto por detrás de los carteles nuevos. El Pegador está dando la
   última pasada de engrudo al cartel destacado. */
export default function Muro({
  drops = [],
  featured = null,
  products = [],
  serverNow,
  loading = false,
}) {
  useDocumentTitle('El muro');
  const pegadorArt = useNightArt(pegador);
  const destacado = featured?.handle ?? drops[0]?.handle ?? null;

  return (
    <div className="page-container muro">
      <header className="muro-cabecera">
        <div>
          <h1 className="page-title">El muro</h1>
          <p className="subtitle">
            Los drops de la crew, pegados en la calle. Cuando vuelan, vuelan.
          </p>
        </div>
        <Link to={ROUTES.home} className="btn btn--ghost muro-catalogo">
          Todo el catálogo
        </Link>
      </header>

      {loading && (
        <div className="page-loading">
          <CrosshairSpinner className="page-loading-spinner" />
          <span>Cargando el muro…</span>
        </div>
      )}

      {!loading && drops.length === 0 && (
        <div className="muro-vacio">
          <img
            src={pegadorArt}
            width="583"
            height="600"
            alt=""
            className="muro-vacio-pegador neon-art"
          />
          <p className="muro-vacio-texto">Todavía no hay nada pegado. El Pegador está en ello.</p>
        </div>
      )}

      {!loading && drops.length > 0 && (
        <div className="muro-pared">
          {drops.map((drop, index) => {
            const archivo = drop.state === DROP_STATES.ARCHIVE;
            return (
              <div
                key={drop.handle}
                className={`muro-hueco doodle-shelf${archivo ? ' muro-hueco--archivo' : ''}`}
                // Cada cartel tapa al siguiente: los nuevos quedan encima.
                style={{ '--capa': drops.length - index }}
              >
                <Cartel drop={drop} products={products} serverNow={serverNow} />
                {drop.handle === destacado && (
                  <img
                    src={pegadorArt}
                    width="583"
                    height="600"
                    alt=""
                    className="doodle muro-pegador neon-art"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
