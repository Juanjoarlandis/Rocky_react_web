import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CREW, POR_FICHAR } from '../data/crew';
import '../styles/pages/crew.css';

const TOTAL_CROMOS = CREW.length + POR_FICHAR.length;
const CLAVE_ABIERTOS = 'rocky-album-abiertos';

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
    try {
        const crudo = JSON.parse(localStorage.getItem(CLAVE_ABIERTOS) || '[]');
        return new Set(crudo.filter((id) => CREW.some((m) => m.id === id)));
    } catch {
        return new Set();
    }
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
                        fill={n <= valor ? '#e63946' : 'none'}
                        stroke={n <= valor ? '#1a1a1a' : '#b9b2a2'}
                        strokeWidth="2"
                    />
                    <path
                        d="M10 1.5 L10 5 M10 15 L10 18.5 M1.5 10 L5 10 M15 10 L18.5 10"
                        stroke={n <= valor ? '#1a1a1a' : '#b9b2a2'}
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
                // eslint-disable-next-line react/no-array-index-key
                <rect key={i} x={i * 4.3} y="0" width={ancho} height="14" fill="currentColor" />
            ))}
        </svg>
    );
}

// Siluetas punteadas de los cromos que faltan
function SiluetaHueco({ id }) {
    const trazo = { fill: 'none', stroke: '#b9b2a2', strokeWidth: 3.5, strokeDasharray: '7 7', strokeLinecap: 'round', strokeLinejoin: 'round' };
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
            <text x="60" y="122" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="34" fill="#b9b2a2">?</text>
        </svg>
    );
}

// Un cromo con su giro al expediente, tilt 3D y enlace propio
export function CrewCard({ miembro, autoGirado = false, linkEnabled = true, abierto = false, onAbrir }) {
    const [girado, setGirado] = useState(autoGirado);
    const [copiado, setCopiado] = useState(false);
    const cardRef = useRef(null);
    const copiadoTimerRef = useRef(null);

    useEffect(() => () => clearTimeout(copiadoTimerRef.current), []);

    useEffect(() => {
        if (autoGirado && cardRef.current) {
            onAbrir?.(miembro.id);
            const timer = setTimeout(() => {
                cardRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 350);
            return () => clearTimeout(timer);
        }
        return undefined;
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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('tilting');
        card.style.setProperty('--tilt-x', `${(py * -7).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(px * 9).toFixed(2)}deg`);
    };

    const alSalir = () => {
        const card = cardRef.current;
        if (!card) return;
        card.classList.remove('tilting');
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
    };

    const compartir = async (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/crew#${miembro.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            clearTimeout(copiadoTimerRef.current);
            copiadoTimerRef.current = setTimeout(() => setCopiado(false), 2200);
        } catch {
            window.prompt('Copia el enlace de este cromo:', url);
        }
    };

    const esFoil = Boolean(miembro.rareza || miembro.especial);

    return (
        <div
            ref={cardRef}
            id={`cromo-${miembro.id}`}
            className={`crew-card ${girado ? 'girado' : ''} ${miembro.especial ? 'especial' : ''} ${esFoil ? 'foil' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={girado}
            aria-label={`Cromo de ${miembro.nombre}. Pulsa para ${girado ? 'ver el frente' : 'ver el expediente'}`}
            onClick={() => {
                alSalir();
                girar();
            }}
            onMouseMove={alMover}
            onMouseLeave={alSalir}
            onKeyDown={(e) => {
                // Enter sobre el enlace o el botón del reverso es para ellos,
                // no para girar el cromo.
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    girar();
                }
            }}
        >
            <div className="crew-card-inner">
                {/* Frente */}
                <div className="crew-card-face crew-card-front">
                    <div className="crew-card-top">
                        <span className="crew-num">#{miembro.numero}</span>
                        {miembro.rareza && (
                            <span className={`crew-rareza rareza-${miembro.rareza.toLowerCase().replace(/\s/g, '-')}`}>
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
                    <span className="crew-girar" aria-hidden="true">↻ expediente</span>
                </div>

                {/* Reverso: el expediente */}
                <div className="crew-card-face crew-card-back">
                    <p className="expediente-titulo">Expediente</p>
                    <dl className="expediente-datos">
                        <div>
                            <dt>Alias</dt>
                            <dd>{miembro.nombre}</dd>
                        </div>
                        <div>
                            <dt>Oficio</dt>
                            <dd>{miembro.rol}</dd>
                        </div>
                        <div>
                            <dt>Dice</dt>
                            <dd>«{miembro.frase}»</dd>
                        </div>
                        <div>
                            <dt>Visto en</dt>
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
                                    <span className="expediente-enlace">
                                        {miembro.vistoEn.label}
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>
                    <button type="button" className="expediente-compartir" onClick={compartir}>
                        {copiado ? '¡Enlace copiado!' : '⎘ compartir cromo'}
                    </button>
                    <div className="expediente-serie" aria-hidden="true">
                        <Barcode numero={miembro.numero} />
                        <span>ROCKY 035 · Nº {miembro.numero} · ED. {TOTAL_CROMOS}</span>
                    </div>
                    <span className="expediente-sello" aria-hidden="true" />
                    <span className="crew-girar" aria-hidden="true">↻ volver</span>
                </div>
            </div>
        </div>
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
            <span className="lamina-cuenta">{cuenta}</span>
        </div>
    );
}

function Crew() {
    const albumRef = useRef(null);
    const [hashId] = useState(() => decodeURIComponent(window.location.hash.slice(1)));

    // Tu colección: expedientes que ya has abierto, guardados en el navegador
    const [abiertos, setAbiertos] = useState(leerAbiertos);

    const abrirExpediente = useMemo(
        () => (id) => {
            setAbiertos((previos) => {
                if (previos.has(id)) return previos;
                const siguientes = new Set(previos);
                siguientes.add(id);
                try {
                    localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify([...siguientes]));
                } catch {
                    /* modo incógnito: la colección vive solo esta sesión */
                }
                return siguientes;
            });
        },
        []
    );

    const albumCompleto = abiertos.size === CREW.length;

    // Los cromos van apareciendo escalonados al entrar en pantalla.
    // Sin florituras de API: comprobación manual con eventos de scroll,
    // y por defecto todo visible (la ocultación solo la pone este efecto).
    useEffect(() => {
        const album = albumRef.current;
        if (!album) return undefined;
        const piezas = [...album.querySelectorAll('.crew-card, .crew-hueco')];
        piezas.forEach((pieza, i) => pieza.style.setProperty('--orden', i % 6));

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return undefined;
        }

        piezas.forEach((pieza) => pieza.classList.add('oculto'));
        const pendientes = new Set(piezas);

        const revisar = () => {
            const limite = window.innerHeight * 1.05;
            pendientes.forEach((pieza) => {
                const r = pieza.getBoundingClientRect();
                if (r.top < limite && r.bottom > -40) {
                    pieza.classList.add('revelado');
                    pieza.classList.remove('oculto');
                    pendientes.delete(pieza);
                }
            });
            if (!pendientes.size) {
                window.removeEventListener('scroll', alScroll);
                window.removeEventListener('resize', alScroll);
            }
        };

        let esperando = false;
        const alScroll = () => {
            if (esperando) return;
            esperando = true;
            setTimeout(() => {
                esperando = false;
                revisar();
            }, 80);
        };

        revisar();
        window.addEventListener('scroll', alScroll, { passive: true });
        window.addEventListener('resize', alScroll);
        return () => {
            window.removeEventListener('scroll', alScroll);
            window.removeEventListener('resize', alScroll);
        };
    }, []);

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
                <aside className={`crew-marcador ${albumCompleto ? 'completo' : ''}`} aria-label="Progreso del álbum">
                    <p className="marcador-titulo">El álbum · ed. {TOTAL_CROMOS}</p>
                    <p className="marcador-club">
                        <b>{CREW.length}/{TOTAL_CROMOS}</b> fichados — faltan {TOTAL_CROMOS - CREW.length}
                    </p>
                    <div
                        className="marcador-casillas"
                        role="img"
                        aria-label={`Has abierto ${abiertos.size} de ${CREW.length} expedientes`}
                    >
                        {CREW.map((m) => (
                            <span key={m.id} className={abiertos.has(m.id) ? 'on' : ''} />
                        ))}
                    </div>
                    <p className="marcador-tuyo">
                        {albumCompleto ? (
                            <span className="marcador-logro">★ álbum completo ★</span>
                        ) : (
                            <>tu colección: <b>{abiertos.size}/{CREW.length}</b> expedientes</>
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
                            {VITRINA.map((miembro) => (
                                <CrewCard
                                    key={miembro.id}
                                    miembro={miembro}
                                    autoGirado={hashId === miembro.id}
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
                        {PLANTILLA.map((miembro) => (
                            <CrewCard
                                key={miembro.id}
                                miembro={miembro}
                                autoGirado={hashId === miembro.id}
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
                        {POR_FICHAR.map((hueco) => (
                            <div key={hueco.id} className="crew-hueco">
                                <SiluetaHueco id={hueco.id} />
                                <h3 className="crew-nombre">{hueco.nombre}</h3>
                                <p className="crew-hueco-nota">{hueco.nota}</p>
                                {hueco.enlace && (
                                    <a
                                        className="btn btn-ghost crew-hueco-btn"
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
