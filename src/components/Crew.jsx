import React, { useState } from 'react';
import { Link } from 'react-router';
import { CREW, POR_FICHAR } from '../data/crew';
import '../styles/Crew.css';

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

// Un cromo con su giro al expediente
function CrewCard({ miembro }) {
    const [girado, setGirado] = useState(false);

    const girar = () => setGirado((v) => !v);

    return (
        <div
            className={`crew-card ${girado ? 'girado' : ''} ${miembro.especial ? 'especial' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={girado}
            aria-label={`Cromo de ${miembro.nombre}. Pulsa para ${girado ? 'ver el frente' : 'ver el expediente'}`}
            onClick={girar}
            onKeyDown={(e) => {
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
                        <img src={miembro.img} alt="" loading="lazy" />
                    </div>
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
                                <Link
                                    to={miembro.vistoEn.to}
                                    className="expediente-enlace"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {miembro.vistoEn.label} →
                                </Link>
                            </dd>
                        </div>
                    </dl>
                    <span className="expediente-sello" aria-hidden="true" />
                    <span className="crew-girar" aria-hidden="true">↻ volver</span>
                </div>
            </div>
        </div>
    );
}

function Crew() {
    return (
        <div className="crew">
            <div className="crew-head">
                <h1 className="page-title">La Crew</h1>
                <p className="crew-subtitle">
                    Los que hacen que esto ruede. Gira los cromos y colecciónalos a todos.
                </p>
            </div>

            <div className="crew-grid">
                {CREW.map((miembro) => (
                    <CrewCard key={miembro.id} miembro={miembro} />
                ))}

                {POR_FICHAR.map((hueco) => (
                    <div key={hueco.id} className="crew-hueco">
                        <span className="crew-hueco-num" aria-hidden="true">?</span>
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
                        <span className="badge-soon">Cromo por conseguir</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Crew;
