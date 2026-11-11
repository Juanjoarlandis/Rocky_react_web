import { Link } from 'react-router';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { CrosshairSpinner } from '../../components/doodles/CrosshairSpinner';
import { ROUTES } from '../../config/routes.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import pegador from '../../images/optimized/characters/pegador-carteles-600.webp';
import { useNightArt } from '../night/nightArt.js';
import Cartel from './Cartel';
import '../../styles/pages/muro.css';

/* Lo que queda en una pared de calle (muro-empapelado): la marca y las
   esquinas de un cartel que ya no está, jirones de carteles viejos, tags a
   rotulador, una pegatina y un trozo de cinta. Van por detrás de los carteles
   y solo asoman en los huecos. Decoración: fuera del lector y del foco. */
function Restos() {
  return (
    <div className="muro-restos" aria-hidden="true">
      <span className="resto resto--fantasma">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="resto resto--jiron resto--jiron-a">DROP 2</span>
      <span className="resto resto--jiron resto--jiron-b">ROCKY</span>
      <span className="resto resto--jiron resto--jiron-c">035</span>
      <span className="resto resto--tag resto--tag-a">la colmena no duerme</span>
      <span className="resto resto--tag resto--tag-b">035</span>
      <span className="resto resto--tag resto--tag-c">cuando vuelan, vuelan</span>
      <span className="resto resto--pegatina">035</span>
      <span className="resto resto--celo" />
    </div>
  );
}

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
  error = '',
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
          {error ? (
            <p className="muro-vacio-texto" role="alert">
              No hemos podido leer el muro. Prueba a recargar en un momento.
            </p>
          ) : (
            <p className="muro-vacio-texto">
              Todavía no hay nada pegado. El Pegador está{' '}
              <s className="tachon" aria-hidden="true">
                durmiendo
              </s>{' '}
              en ello.
            </p>
          )}
        </div>
      )}

      {!loading && drops.length > 0 && (
        <div className="muro-pared">
          <Restos />
          {drops.map((drop, index) => {
            const archivo = drop.state === DROP_STATES.ARCHIVE;
            const esDestacado = drop.handle === destacado;
            const clases = [
              'muro-hueco doodle-shelf',
              archivo && 'muro-hueco--archivo',
              esDestacado && 'muro-hueco--destacado',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={drop.handle}
                className={clases}
                // Cada cartel tapa al siguiente: los nuevos quedan encima.
                style={{ '--capa': drops.length - index }}
              >
                <Cartel drop={drop} products={products} serverNow={serverNow} />
                {esDestacado && (
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
