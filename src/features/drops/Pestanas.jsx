import { useEffect, useId, useRef, useState } from 'react';
import DropAviso from '../catalog/DropAviso';
import { fechaCorta } from './fecha.js';

// Cuántas pestañas tiene la tira y cuáles ya se llevó alguien antes (huecos).
const PESTANAS = 7;
const HUECOS = new Set([1, 4]);

/* Las pestañas recortables del cartel anunciado, como los anuncios de farola
   (muro-de-drops): «AVÍSAME · 13·11». Cuelgan de la nota (children) en una
   sola hoja, cortadas desde su borde de puntos; las que ya se llevó alguien
   dejan un resto de papel rasgado. Arrancar una abre el aviso de ese drop y
   lleva el foco al email (o al aviso, si ya estaba apuntado). Son botones de
   verdad, pero solo uno entra en el tabulador: hacen todos lo mismo. La caída
   solo se anima sin movimiento reducido (cartel.css). */
export default function Pestanas({ drop, children }) {
  const [arrancadas, setArrancadas] = useState(() => new Set());
  const [abierto, setAbierto] = useState(false);
  // Cuenta las veces que se arranca una: cada una vuelve a mover el foco.
  const [tirones, setTirones] = useState(0);
  const avisoRef = useRef(null);
  const formId = useId();
  const fecha = fechaCorta(drop.launchAt);
  const nombre = `Avísame cuando caiga el ${drop.title}`;

  const enTurno = Array.from({ length: PESTANAS }, (_, index) => index).find(
    (index) => !HUECOS.has(index) && !arrancadas.has(index)
  );

  function arrancar(index) {
    setArrancadas((actual) => new Set(actual).add(index));
    setAbierto(true);
    setTirones((cuenta) => cuenta + 1);
  }

  useEffect(() => {
    if (!tirones) return;
    const aviso = avisoRef.current;
    const email = aviso?.querySelector('input[type="email"]');
    (email ?? aviso)?.focus();
  }, [tirones]);

  return (
    <>
      <div className="cartel-hoja cartel-hoja--pestanas">
        {children}
        <ul className="pestanas-tira">
          {Array.from({ length: PESTANAS }, (_, index) =>
            HUECOS.has(index) ? (
              <li key={index} className="pestana-hueco" aria-hidden="true" />
            ) : (
              <li key={index} className={arrancadas.has(index) ? 'is-torn' : undefined}>
                <button
                  type="button"
                  className={`pestana${arrancadas.has(index) ? ' is-torn' : ''}`}
                  onClick={() => arrancar(index)}
                  aria-expanded={abierto}
                  aria-controls={formId}
                  aria-label={nombre}
                  tabIndex={index === enTurno ? 0 : -1}
                >
                  <span className="pestana-texto" aria-hidden="true">
                    <span className="pestana-avisame">AVÍSAME</span>
                    <span className="pestana-fecha">{fecha}</span>
                  </span>
                </button>
              </li>
            )
          )}
        </ul>
      </div>
      <div id={formId} ref={avisoRef} className="pestanas-aviso" hidden={!abierto} tabIndex={-1}>
        {abierto && <DropAviso producto={drop.handle} />}
      </div>
    </>
  );
}
