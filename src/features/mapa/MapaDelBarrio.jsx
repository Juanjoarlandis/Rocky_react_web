import { useId } from 'react';
import { Link } from 'react-router';
import CabezaMuneco from '../../components/CabezaMuneco.jsx';
import { CREW } from '../../data/crew.js';
import { VOCES } from '../../data/voces.js';
import { FUERA_DEL_MAPA, LUGARES, puntoDe, resumen, vecinosDe } from './lugares.js';
import { PLANO } from './plano.js';
import '../../styles/components/mapa.css';

const VECINOS = vecinosDe(CREW);
const SITIOS = LUGARES.map((lugar, i) => ({ ...lugar, num: i + 1, punto: puntoDe(lugar) }));

// La hoja del mapa, con el canto roto abajo a la derecha (del primer prototipo aprobado).
const HOJA =
  'M18 22 Q 260 10 520 18 T 982 16 L 986 470 Q 930 486 905 520 Q 880 560 852 604 Q 600 610 340 606 T 16 600 Z';

// Con Ctrl, ⌘, Mayús o Alt el navegador abre el sitio en otra pestaña o ventana.
const abreAparte = (event) => event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;

/* LACOMA, el barrio de la crew (barrio-en-mapa): el plano real del barrio (OpenStreetMap,
   horneado en plano.js) con los cuatro sitios encima como enlaces de verdad. El dibujo es
   decorativo; la navegación es la lista. `tuEstasAqui` (el 404) pone la chincheta del canto
   roto y la nota de que estás fuera del mapa; `onIr` avisa al pulsar un sitio (el diálogo del
   pie se cierra), salvo si se abre aparte. */
export default function MapaDelBarrio({ tuEstasAqui = false, onIr }) {
  const tituloId = useId();
  return (
    <section className="mapa" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="mapa-titulo">
        Lacoma
      </h2>
      <p className="mapa-lema">Dónde vive cada uno de la crew en Lacoma.</p>
      <div className="mapa-lienzo">
        <Plano tuEstasAqui={tuEstasAqui} />
        <nav aria-label="El mapa de Lacoma">
          <ul className="mapa-lugares">
            {SITIOS.map((sitio) => (
              <li
                key={sitio.id}
                className="mapa-lugar"
                style={{
                  '--x': `${sitio.carta[0] / 10}%`,
                  '--y': `${sitio.carta[1] / 6.2}%`,
                  '--giro': `${sitio.giro}deg`,
                }}
              >
                <Link
                  to={sitio.to}
                  onClick={(event) => {
                    if (!abreAparte(event)) onIr?.();
                  }}
                >
                  <span className="mapa-num" aria-hidden="true">
                    {sitio.num}
                  </span>
                  <CabezaMuneco voz={VOCES[sitio.cabeza]} tamano={44} />
                  <span>
                    {/* El espacio no se ve (son bloques), pero separa nombre y sección al
                        leerlos en voz alta. */}
                    <strong>{sitio.nombre}</strong>{' '}
                    <small>
                      <b>{sitio.seccion}</b> · {resumen(VECINOS.get(sitio.id))}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {/* La licencia de OpenStreetMap (ODbL) pide citar la fuente donde se ven sus datos. */}
      <p className="mapa-credito">
        Plano: ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          colaboradores de OpenStreetMap
        </a>
      </p>
      {tuEstasAqui && (
        <p className="mapa-fuera">
          <strong>Tú estás aquí:</strong> fuera del mapa, con {resumen(VECINOS.get(FUERA_DEL_MAPA))}
          , que viven en el 404.
        </p>
      )}
    </section>
  );
}

/* El plano: la hoja, que recorta el trazado; los parques; las calles con su borde de tinta; la
   guía de cada sitio hasta su tarjeta; unos pocos rótulos a mano; el metro; los cuatro puntos
   numerados; y, en el 404, la chincheta. Todo pinta con clases que usan tokens. */
function Plano({ tuEstasAqui }) {
  // Un recorte por mapa: el 404 y el diálogo del pie pueden coincidir en la página.
  const recorte = `mapa-hoja-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [mx, my] = PLANO.metro;
  return (
    <svg className="mapa-dibujo" viewBox="0 0 1000 620" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={recorte}>
          <path d={HOJA} />
        </clipPath>
      </defs>
      <path className="mapa-tinta mapa-hoja" d={HOJA} />
      <g clipPath={`url(#${recorte})`}>
        <path className="mapa-parque" d={PLANO.parques} />
        <path className="mapa-calle-borde" d={PLANO.calles} />
        <path className="mapa-ancha-borde" d={PLANO.anchas} />
        <path className="mapa-calle" d={PLANO.calles} />
        <path className="mapa-ancha" d={PLANO.anchas} />
        {/* Las guías van debajo de los rótulos: donde se cruzan, el halo del texto las tapa. */}
        {SITIOS.map(({ id, punto, carta }) => (
          <path
            key={`guia-${id}`}
            className="mapa-guia"
            d={`M${Math.round(punto.x)} ${Math.round(punto.y)} L${carta[0]} ${carta[1]}`}
          />
        ))}
        {PLANO.rotulos.map((rotulo) => (
          <text
            key={rotulo.texto}
            className="mapa-mano"
            x={rotulo.x}
            y={rotulo.y}
            dy="-9"
            textAnchor="middle"
            transform={`rotate(${rotulo.giro} ${rotulo.x} ${rotulo.y})`}
          >
            {rotulo.texto}
          </text>
        ))}
      </g>
      <path className="mapa-tinta mapa-canto" d="M905 520 Q 880 560 852 604" />
      <g transform={`translate(${mx} ${my})`}>
        <g className="mapa-metro">
          <circle r="13" />
          <text dy="5">M</text>
          <text className="mapa-mano mapa-metro-nombre" x="20" dy="6">
            Lacoma
          </text>
        </g>
      </g>
      {SITIOS.map(({ id, num, punto }) => (
        <g
          key={`punto-${id}`}
          transform={`translate(${Math.round(punto.x)} ${Math.round(punto.y)})`}
        >
          <g className="mapa-punto">
            <circle r="13" />
            <text dy="5">{num}</text>
          </g>
        </g>
      ))}
      {tuEstasAqui && (
        <g className="mapa-chincheta" transform="translate(946 560)">
          <path
            className="mapa-rojo mapa-tinta"
            d="M0 -34 C -22 -34 -22 -6 0 18 C 22 -6 22 -34 0 -34 Z"
          />
          <circle className="mapa-blanco" cy="-20" r="7" />
        </g>
      )}
    </svg>
  );
}
