import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CREW, POR_FICHAR } from '../data/crew';
import '../styles/pages/crew.css';
import { STORAGE_KEYS } from '../config/storageKeys.js';
import { prefersReducedMotion } from '../utils/media.js';
import { readJson, writeJson } from '../utils/storage.js';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll.js';

const TOTAL_CROMOS = CREW.length + POR_FICHAR.length;
const CLAVE_ABIERTOS = STORAGE_KEYS.albumOpened;

// El álbum se lee por láminas: la vitrina (rarezas), la plantilla y el banquillo
const VITRINA = [...CREW]
  .filter((m) => m.rareza || m.especial)
  .sort((a, b) => a.numero.localeCompare(b.numero));
const PLANTILLA = CREW.filter((m) => !VITRINA.includes(m));

// Desfile de la cabecera: unos cuantos de la banda posando sobre la línea
const DESFILE = [
  { id: 'cruiser', alto: 68 },
  { id: 'spray', alto: 96 },
  { id: 'recadero', alto: 80 },
  { id: 'rocky', alto: 62 },
  { id: 'dormilon', alto: 56 },
  { id: 'ollie', alto: 84, vuela: 24 },
];

function leerAbiertos() {
  const crudo = readJson(CLAVE_ABIERTOS, []);
  const ids = Array.isArray(crudo) ? crudo : [];
  return new Set(ids.filter((id) => CREW.some((m) => m.id === id)));
}

// Mini dianas para las estadísticas de cada cromo (0-5)
function StatDianas({ valor }) {
  return (
    <span className="stat-dianas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className="stat-diana" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="6.5"
            fill={n <= valor ? 'var(--accent)' : 'none'}
            stroke={n <= valor ? 'var(--ink)' : 'var(--line)'}
            strokeWidth="2"
          />
          <path
            d="M10 1.5 L10 5 M10 15 L10 18.5 M1.5 10 L5 10 M15 10 L18.5 10"
            stroke={n <= valor ? 'var(--ink)' : 'var(--line)'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </span>
  );
}

// Código de barras garabateado del reverso, determinista por número de cromo
function Barcode({ numero }) {
  const seed = parseInt(numero, 10) + 3;
  const barras = Array.from({ length: 22 }, (_, i) => ((seed * 31 + i * 17) % 4) + 1);
  return (
    <svg viewBox="0 0 96 14" className="expediente-barcode" aria-hidden="true">
      {barras.map((ancho, i) => (
        <rect key={i} x={i * 4.3} y="0" width={ancho} height="14" fill="currentColor" />
      ))}
    </svg>
  );
}

// Siluetas punteadas de los cromos que faltan
function SiluetaHueco({ id }) {
  const trazo = {
    fill: 'none',
    stroke: 'var(--line)',
    strokeWidth: 3.5,
    strokeDasharray: '7 7',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (id === 'rapero') {
    return (
      <svg viewBox="0 0 120 150" className="hueco-silueta" aria-hidden="true">
        <circle cx="58" cy="40" r="26" {...trazo} />
        <path d="M26 138 Q26 84 58 82 Q90 84 90 138" {...trazo} />
        <path d="M84 52 L102 44" {...trazo} />
        <circle cx="108" cy="41" r="7" {...trazo} />
      </svg>
    );
  }
  if (id === 'abeja') {
    return (
      <svg viewBox="0 0 120 150" className="hueco-silueta" aria-hidden="true">
        <ellipse cx="60" cy="92" rx="36" ry="26" {...trazo} />
        <path d="M48 68 L46 116 M72 68 L74 116" {...trazo} />
        <ellipse cx="44" cy="52" rx="14" ry="20" transform="rotate(-24 44 52)" {...trazo} />
        <ellipse cx="78" cy="50" rx="12" ry="17" transform="rotate(20 78 50)" {...trazo} />
        <path d="M98 90 L110 94 L97 100" {...trazo} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" className="hueco-silueta" aria-hidden="true">
      <circle cx="60" cy="40" r="26" {...trazo} />
      <path d="M28 138 Q28 84 60 82 Q92 84 92 138" {...trazo} />
      <text
        x="60"
        y="122"
        textAnchor="middle"
        fontFamily="'Luckiest Guy', cursive"
        fontSize="34"
        fill="var(--line)"
      >
        ?
      </text>
    </svg>
  );
}

// Un cromo con su giro al expediente, tilt 3D y enlace propio
export function CrewCard({
  miembro,
  autoGirado = false,
  linkEnabled = true,
  abierto = false,
  onAbrir,
  reveal = 'static',
  orden = 0,
}) {
  const [girado, setGirado] = useState(autoGirado);
  const cardRef = useRef(null);
  const { copied: copiado, copy } = useCopyToClipboard();

  useEffect(() => {
    if (autoGirado && cardRef.current) {
      onAbrir?.(miembro.id);
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
    // Sólo al llegar por enlace directo; abrir el expediente ya se avisa al girar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGirado]);

  const girar = () => {
    // El aviso al álbum va fuera del updater: StrictMode los ejecuta dos veces.
    if (!girado) onAbrir?.(miembro.id);
    setGirado((v) => !v);
  };

  // Tilt 3D siguiendo el ratón (solo con la carta de frente)
  const alMover = (e) => {
    const card = cardRef.current;
    if (!card || girado) return;
    if (prefersReducedMotion()) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('is-tilting');
    card.style.setProperty('--tilt-x', `${(py * -7).toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${(px * 9).toFixed(2)}deg`);
  };

  const alSalir = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('is-tilting');
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
  };

  const compartir = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/crew#${miembro.id}`;
    const ok = await copy(url);
    if (!ok) window.prompt('Copia el enlace de este cromo:', url);
  };

  const esFoil = Boolean(miembro.rareza || miembro.especial);

  const clases = [
    'crew-card',
    girado ? 'is-flipped' : '',
    miembro.especial ? 'especial' : '',
    esFoil ? 'foil' : '',
    reveal === 'hidden' ? 'is-hidden' : '',
    reveal === 'revealed' ? 'is-revealed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    /* El control accesible es el botón «expediente»/«volver» de cada cara; el
       clic sobre toda la carta es un atajo de ratón. */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <article
      ref={cardRef}
      id={`cromo-${miembro.id}`}
      className={clases}
      data-reveal-id={miembro.id}
      style={{ '--orden': orden }}
      aria-label={`Cromo de ${miembro.nombre}`}
      onClick={() => {
        alSalir();
        girar();
      }}
      onMouseMove={alMover}
      onMouseLeave={alSalir}
    >
      <div className="crew-card-inner">
        {/* Frente */}
        <div className="crew-card-face crew-card-front" inert={girado || undefined}>
          <div className="crew-card-top">
            <span className="crew-num">#{miembro.numero}</span>
            {miembro.rareza && (
              <span
                className={`crew-rareza rareza-${miembro.rareza.toLowerCase().replace(/\s/g, '-')}`}
              >
                {miembro.rareza}
              </span>
            )}
          </div>
          <div className="crew-card-media">
            {/* Cada cromo cabecea con su propia fase —sale del
                            número de ficha, que es estable— y El Productor
                            más fuerte que nadie, que para eso es lo suyo. */}
            <img
              src={miembro.img}
              alt=""
              loading="lazy"
              className={`neon-art al-ritmo${miembro.id === 'productor' ? ' al-ritmo--fuerte' : ''}`}
              style={{ '--fase': `${((Number(miembro.numero) || 0) % 7) * 0.31}` }}
            />
          </div>
          {abierto && (
            <span className="sello-fichado" aria-hidden="true">
              FICHADO
            </span>
          )}
          <h3 className="crew-nombre">{miembro.nombre}</h3>
          <p className="crew-rol">{miembro.rol}</p>
          {miembro.stats.length > 0 && (
            <ul className="crew-stats">
              {miembro.stats.map((stat) => (
                <li key={stat.label}>
                  <span className="stat-label">{stat.label}</span>
                  <StatDianas valor={stat.valor} />
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="crew-girar"
            aria-expanded={girado}
            onClick={(e) => {
              e.stopPropagation();
              alSalir();
              girar();
            }}
          >
            ↻ expediente
          </button>
        </div>

        {/* Reverso: el expediente */}
        <div className="crew-card-face crew-card-back" inert={!girado || undefined}>
          <p className="expediente-titulo">Expediente</p>
          <dl className="expediente-datos">
            <div>
              <dt className="kicker">Alias</dt>
              <dd>{miembro.nombre}</dd>
            </div>
            <div>
              <dt className="kicker">Oficio</dt>
              <dd>{miembro.rol}</dd>
            </div>
            <div>
              <dt className="kicker">Dice</dt>
              <dd>«{miembro.frase}»</dd>
            </div>
            <div>
              <dt className="kicker">Visto en</dt>
              <dd>
                {linkEnabled ? (
                  <Link
                    to={miembro.vistoEn.to}
                    className="expediente-enlace"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {miembro.vistoEn.label} →
                  </Link>
                ) : (
                  <span className="expediente-enlace">{miembro.vistoEn.label}</span>
                )}
              </dd>
            </div>
          </dl>
          <button type="button" className="expediente-compartir" onClick={compartir}>
            {copiado ? '¡Enlace copiado!' : '⎘ compartir cromo'}
          </button>
          <div className="expediente-serie" aria-hidden="true">
            <Barcode numero={miembro.numero} />
            <span>
              ROCKY 035 · Nº {miembro.numero} · ED. {TOTAL_CROMOS}
            </span>
          </div>
          <span className="expediente-sello" aria-hidden="true" />
          <button
            type="button"
            className="crew-girar"
            onClick={(e) => {
              e.stopPropagation();
              girar();
            }}
          >
            ↻ volver
          </button>
        </div>
      </div>
    </article>
  );
}

// Separador de lámina: cinta pintada con su cuenta de piezas
function LaminaSep({ numero, titulo, nota, cuenta }) {
  return (
    <div className="lamina-sep squiggle-baseline">
      <span className="lamina-cinta">
        <span className="lamina-num">{numero}</span>
        {titulo}
      </span>
      <span className="lamina-nota">{nota}</span>
      <span className="kicker lamina-cuenta">{cuenta}</span>
    </div>
  );
}

function Crew() {
  const albumRef = useRef(null);
  const { hash } = useLocation();
  const hashId = decodeURIComponent(hash.slice(1));
  useDocumentTitle('La Crew');

  // Tu colección: expedientes que ya has abierto, guardados en el navegador
  const [abiertos, setAbiertos] = useState(leerAbiertos);

  // La colección se guarda al cambiar, no dentro del updater.
  useEffect(() => {
    // Modo incógnito: la colección vive solo esta sesión
    writeJson(CLAVE_ABIERTOS, [...abiertos]);
  }, [abiertos]);

  const abrirExpediente = useCallback((id) => {
    setAbiertos((previos) => {
      if (previos.has(id)) return previos;
      const siguientes = new Set(previos);
      siguientes.add(id);
      return siguientes;
    });
  }, []);

  const albumCompleto = abiertos.size === CREW.length;

  // Los cromos van apareciendo escalonados al entrar en pantalla: el hook
  // dice cuáles han entrado ya y cada pieza pinta su clase.
  const { revealed, animated } = useRevealOnScroll(albumRef);
  const revealOf = (id) => (animated ? (revealed.has(id) ? 'revealed' : 'hidden') : 'static');

  return (
    <div className="page-container crew">
      <div className="crew-head">
        <div className="crew-head-txt">
          <h1 className="page-title">La Crew</h1>
          <p className="subtitle">
            Los que hacen que esto ruede. Gira los cromos y colecciónalos a todos.
          </p>
        </div>

        {/* El marcador del álbum: lo que ficha el club y lo que llevas tú */}
        <aside
          className={`crew-marcador ${albumCompleto ? 'is-complete' : ''}`}
          aria-label="Progreso del álbum"
        >
          <p className="marcador-titulo">El álbum · ed. {TOTAL_CROMOS}</p>
          <p className="marcador-club">
            <b>
              {CREW.length}/{TOTAL_CROMOS}
            </b>{' '}
            fichados — faltan {TOTAL_CROMOS - CREW.length}
          </p>
          <div
            className="marcador-casillas"
            role="img"
            aria-label={`Has abierto ${abiertos.size} de ${CREW.length} expedientes`}
          >
            {CREW.map((m) => (
              <span key={m.id} className={abiertos.has(m.id) ? 'is-on' : ''} />
            ))}
          </div>
          <p className="marcador-tuyo">
            {albumCompleto ? (
              <span className="marcador-logro">★ álbum completo ★</span>
            ) : (
              <>
                tu colección:{' '}
                <b>
                  {abiertos.size}/{CREW.length}
                </b>{' '}
                expedientes
              </>
            )}
          </p>
        </aside>
      </div>

      {/* El desfile: la banda posando sobre la línea */}
      <div className="crew-parade-row squiggle-baseline">
        <div className="crew-parade" aria-hidden="true">
          {DESFILE.map(({ id, alto, vuela }) => {
            const miembro = CREW.find((m) => m.id === id);
            if (!miembro) return null;
            return (
              <img
                key={id}
                src={miembro.img}
                alt=""
                className="neon-art"
                style={{ height: alto, marginBottom: vuela || 0 }}
              />
            );
          })}
        </div>
      </div>

      <div className="crew-album" ref={albumRef}>
        {/* Lámina 1: la vitrina, las piezas con rareza */}
        <section className="crew-lamina">
          <LaminaSep
            numero="Lám. 01"
            titulo="La vitrina"
            nota="las piezas serias del álbum"
            cuenta={`${VITRINA.length} rarezas`}
          />
          <div className="crew-vitrina-marco tape">
            <div className="crew-grid crew-grid--vitrina">
              {VITRINA.map((miembro, indice) => (
                <CrewCard
                  key={miembro.id}
                  miembro={miembro}
                  autoGirado={hashId === miembro.id}
                  reveal={revealOf(miembro.id)}
                  orden={indice % 6}
                  abierto={abiertos.has(miembro.id)}
                  onAbrir={abrirExpediente}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Lámina 2: la plantilla al completo */}
        <section className="crew-lamina">
          <LaminaSep
            numero="Lám. 02"
            titulo="La plantilla"
            nota="los que curran a diario"
            cuenta={`${PLANTILLA.length} cromos`}
          />
          <div className="crew-grid">
            {PLANTILLA.map((miembro, indice) => (
              <CrewCard
                key={miembro.id}
                miembro={miembro}
                autoGirado={hashId === miembro.id}
                reveal={revealOf(miembro.id)}
                orden={indice % 6}
                abierto={abiertos.has(miembro.id)}
                onAbrir={abrirExpediente}
              />
            ))}
          </div>
        </section>

        {/* Lámina 3: el banquillo, los huecos por fichar */}
        <section className="crew-lamina">
          <LaminaSep
            numero="Lám. 03"
            titulo="El banquillo"
            nota="huecos reservados en el álbum"
            cuenta={`${POR_FICHAR.length} por fichar`}
          />
          <div className="crew-grid">
            {POR_FICHAR.map((hueco, indice) => (
              <div
                key={hueco.id}
                className={`crew-hueco ${revealOf(hueco.id) === 'hidden' ? 'is-hidden' : ''} ${revealOf(hueco.id) === 'revealed' ? 'is-revealed' : ''}`.trim()}
                data-reveal-id={hueco.id}
                style={{ '--orden': (CREW.length + indice) % 6 }}
              >
                <SiluetaHueco id={hueco.id} />
                <h3 className="crew-nombre">{hueco.nombre}</h3>
                <p className="crew-hueco-nota">{hueco.nota}</p>
                {hueco.enlace && (
                  <a
                    className="btn btn--ghost crew-hueco-btn"
                    href={hueco.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preséntate
                  </a>
                )}
                <span className="badge badge--dashed">Cromo por conseguir</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Crew;
