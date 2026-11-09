import { useId } from 'react';
import { Link } from 'react-router';
import { DROP_STATES, dropState, isOnSale } from '../../../shared/drops.mjs';
import { DateRing } from '../../components/doodles/DateRing';
import { ROUTES } from '../../config/routes.js';
import AddToCalendar from '../catalog/AddToCalendar';
import PlaceholderTee from '../catalog/PlaceholderTee';
import CuentaAtras from './CuentaAtras';
import Pestanas from './Pestanas';
import { fechaAccesible, fechaCorta, horaDeMadrid, quedan } from './fecha.js';
import { useServerTime } from './useServerTime.js';
import '../../styles/components/cartel.css';

// El rótulo de cada estado: lo que se lee en la cabecera del pie del cartel.
const ESTADO = Object.freeze({
  [DROP_STATES.ANNOUNCED]: 'Próximamente',
  [DROP_STATES.LIVE]: 'Ya en la calle',
  [DROP_STATES.LAST_HOURS]: 'Últimas horas',
  [DROP_STATES.ARCHIVE]: 'Voló',
});
const MAX_SILUETAS = 6;
const MAX_MINIATURAS = 4;

/* El giro del cartel en la pared: entre -2,5º y 2,5º, siempre el mismo para el
   mismo drop (no baila al recargar). */
export function giroDe(handle) {
  let hash = 0;
  for (const char of handle) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return ((Math.abs(hash) % 51) - 25) / 10;
}

/* El estado de ahora con la hora del servidor: el cartel cambia solo al llegar
   la hora, aunque el servidor aún no haya contestado con los diseños. */
function estadoDe(drop, now) {
  return dropState({ status: 'programado', launchAt: drop.launchAt, endsAt: drop.endsAt }, now, {
    soldOut: drop.soldOut,
  });
}

function CartelTipografico({ drop }) {
  return (
    <div className="cartel-tipo" aria-hidden="true">
      <span className="cartel-tipo-drop">DROP</span>
      <span className="cartel-tipo-numero">{drop.number}</span>
      <span className="cartel-tipo-firma">ROCKY 035</span>
    </div>
  );
}

/* Un drop como cartel pegado en la calle (muro-de-drops). Del anunciado enseña
   solo el teaser: cinta, fecha, cuenta atrás, siluetas y pestañas de aviso.
   `cabecera` es el de la página del drop (con calendario); `compacto`, el de la
   portada. */
export default function Cartel({
  drop,
  products = [],
  serverNow,
  cabecera = false,
  compacto = false,
  // En la página del drop el cartel es el título de la página.
  tituloComo: Titulo = 'h2',
}) {
  const tituloId = useId();
  const now = useServerTime(serverNow, { intervalMs: 30_000 });
  const estado = estadoDe(drop, now);
  const anunciado = estado === DROP_STATES.ANNOUNCED;
  const archivo = estado === DROP_STATES.ARCHIVE;
  const enLaCalle = isOnSale(estado);
  const disenos = drop.designs
    ? products.filter((product) => drop.designs.includes(product.handle))
    : [];
  const cinta = `PRÓXIMAMENTE · DROP ${drop.number} · `.repeat(4);
  const clases = [
    'cartel',
    `cartel--${estado}`,
    cabecera && 'cartel--cabecera',
    compacto && 'cartel--compacto',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={clases}
      style={{ '--giro': `${giroDe(drop.handle)}deg` }}
      aria-labelledby={tituloId}
      data-testid={`cartel-${drop.handle}`}
    >
      <div className="cartel-papel">
        {drop.poster ? (
          <img
            className="cartel-arte"
            src={drop.poster.url}
            alt={drop.poster.alt || ''}
            width="1024"
            height="1536"
            loading={cabecera ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <CartelTipografico drop={drop} />
        )}
        {anunciado && (
          <>
            <span className="cartel-cinta cartel-cinta--a" aria-hidden="true">
              {cinta}
            </span>
            <span className="cartel-cinta cartel-cinta--b" aria-hidden="true">
              {cinta}
            </span>
            <DateRing day={fechaCorta(drop.launchAt)} time={horaDeMadrid(drop.launchAt)} />
          </>
        )}
        {enLaCalle && (
          <span className="cartel-sello" aria-hidden="true">
            Ya en la calle
          </span>
        )}
        {estado === DROP_STATES.LAST_HOURS && (
          <span className="cartel-esquina" aria-hidden="true" />
        )}
        {archivo && (
          <span className="cartel-sello cartel-sello--volo" aria-hidden="true">
            Voló
          </span>
        )}
      </div>

      <div className="cartel-pie">
        <p className="kicker cartel-estado">{ESTADO[estado]}</p>
        <Titulo id={tituloId} className="cartel-titulo">
          {drop.title}
        </Titulo>
        {drop.tagline && <p className="cartel-lema">{drop.tagline}</p>}

        {anunciado && (
          <>
            <p className="cartel-cuando">{fechaAccesible(drop.launchAt)}</p>
            <CuentaAtras target={drop.launchAt} serverNow={serverNow} />
            {drop.designCount > 0 && (
              <div className="cartel-siluetas">
                <ul className="cartel-siluetas-lista" aria-hidden="true">
                  {Array.from({ length: Math.min(drop.designCount, MAX_SILUETAS) }, (_, i) => (
                    <li key={i} className="cartel-silueta">
                      <PlaceholderTee compact kicker={`Drop ${drop.number} · sin revelar`} />
                    </li>
                  ))}
                </ul>
                <p className="cartel-siluetas-texto">
                  {drop.designCount === 1
                    ? '1 diseño bajo llave'
                    : `${drop.designCount} diseños bajo llave`}
                </p>
              </div>
            )}
            <Pestanas drop={drop} />
            {cabecera && <AddToCalendar drop={drop} />}
          </>
        )}

        {estado === DROP_STATES.LAST_HOURS && drop.endsAt && (
          <p className="sticker cartel-ultimas">
            Últimas horas · {quedan(Date.parse(drop.endsAt) - now)}
          </p>
        )}

        {enLaCalle && disenos.length > 0 && !cabecera && (
          <ul className="cartel-miniaturas">
            {disenos.slice(0, MAX_MINIATURAS).map((product) => (
              <li key={product.handle}>
                <img
                  src={product.image}
                  alt={product.imageAlt || product.title}
                  width="96"
                  height="96"
                  loading="lazy"
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        )}

        {!anunciado && !cabecera && (
          <Link className="btn btn--ghost btn--sm cartel-entrar" to={ROUTES.category(drop.handle)}>
            {archivo ? 'Ver el archivo' : 'Entrar al drop'}
            <span aria-hidden="true"> →</span>
          </Link>
        )}
      </div>
    </article>
  );
}
