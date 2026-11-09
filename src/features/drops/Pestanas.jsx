import { useId, useState } from 'react';
import DropAviso from '../catalog/DropAviso';
import { fechaCorta } from './fecha.js';

// Cuántas pestañas tiene la tira y cuáles ya se llevó alguien antes (huecos).
const PESTANAS = 7;
const HUECOS = new Set([1, 4]);

/* Las pestañas recortables del cartel anunciado, como los anuncios de farola
   (muro-de-drops): «AVÍSAME · 13·11». Arrancar una abre el aviso de ese drop con
   el foco en el email. Son botones de verdad; la caída solo se anima sin
   movimiento reducido (cartel.css). */
export default function Pestanas({ drop }) {
  const [arrancadas, setArrancadas] = useState(() => new Set());
  const [abierto, setAbierto] = useState(false);
  const formId = useId();
  const fecha = fechaCorta(drop.launchAt);
  const nombre = `Avísame cuando caiga el ${drop.title}`;

  function arrancar(index) {
    setArrancadas((actual) => new Set(actual).add(index));
    setAbierto(true);
  }

  return (
    <div className="pestanas">
      <ul className="pestanas-tira">
        {Array.from({ length: PESTANAS }, (_, index) =>
          HUECOS.has(index) ? (
            <li key={index} className="pestana-hueco" aria-hidden="true" />
          ) : (
            <li key={index}>
              <button
                type="button"
                className={`pestana${arrancadas.has(index) ? ' is-torn' : ''}`}
                onClick={() => arrancar(index)}
                aria-expanded={abierto}
                aria-controls={formId}
                aria-label={nombre}
              >
                <span aria-hidden="true">AVÍSAME · {fecha}</span>
              </button>
            </li>
          )
        )}
      </ul>
      <div id={formId} className="pestanas-aviso" hidden={!abierto}>
        {abierto && <DropAviso producto={drop.handle} enfocar />}
      </div>
    </div>
  );
}
