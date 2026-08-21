import React from 'react';
import Boombox from './Boombox';
import { CrosshairSpinner } from './BrandDoodles';
import { useMusic } from '../context/MusicContext';
import { ARTIST, TRACKS, EPS } from '../data/studio';
import auricularesSentado from '../images/optimized/characters/auriculares-sentado-600.webp';
import colgadoBorde from '../images/optimized/characters/colgado-borde-600.webp';
import teleSentado from '../images/optimized/characters/tele-sentado-borde-600.webp';
import lunaMovil from '../images/optimized/characters/luna-movil-600.webp';
import BeatMachine from './BeatMachine';
import '../styles/Studio.css';

// Abeja garabateada de La Colmena, con su vuelo en trazos discontinuos.
// Ojo de diana para que sea de la familia.
function BeeDoodle(props) {
    return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" {...props}>
            {/* Vuelo en bucle */}
            <path
                d="M6 96 Q40 36 78 66 Q104 88 88 100 Q70 108 78 88 Q90 62 128 62"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
            />
            {/* Alas */}
            <ellipse cx="152" cy="38" rx="13" ry="19" transform="rotate(-24 152 38)" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="3.5" />
            <ellipse cx="170" cy="36" rx="11" ry="16" transform="rotate(18 170 36)" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="3.5" />
            {/* Cuerpo a rayas miel */}
            <ellipse cx="158" cy="70" rx="30" ry="21" fill="#f4b942" stroke="#1a1a1a" strokeWidth="4.5" />
            <path d="M148 51 L144 89 M162 50 L160 91 M176 55 L174 86" stroke="#1a1a1a" strokeWidth="4.5" strokeLinecap="round" />
            {/* Cabeza con ojo de diana */}
            <circle cx="130" cy="66" r="13" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="4" />
            <circle cx="128" cy="65" r="4.5" fill="none" stroke="#e63946" strokeWidth="2" />
            <path d="M121.5 65 L134.5 65 M128 58.5 L128 71.5" stroke="#e63946" strokeWidth="1.6" strokeLinecap="round" />
            {/* Antenas */}
            <path d="M124 54 Q120 46 113 44 M135 53 Q135 44 141 40" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
            <circle cx="112" cy="43" r="2.6" fill="#1a1a1a" />
            <circle cx="142" cy="39" r="2.6" fill="#1a1a1a" />
            {/* Aguijón */}
            <path d="M187 72 L197 76 L186 80 Z" fill="#1a1a1a" />
        </svg>
    );
}

// Pegatina hexagonal del estudio para el radiocasete
function ColmenaSticker(props) {
    return (
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" {...props}>
            <path
                d="M60 8 L104 33 L104 86 L60 112 L16 86 L16 33 Z"
                fill="#f4b942"
                stroke="#1a1a1a"
                strokeWidth="5"
                strokeLinejoin="round"
            />
            <path
                d="M60 22 L92 40 L92 79 L60 98 L28 79 L28 40 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="3"
                strokeDasharray="7 6"
            />
            <text x="60" y="56" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="17" fill="#1a1a1a">
                LA
            </text>
            <text x="60" y="78" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="17" fill="#1a1a1a">
                COLMENA
            </text>
        </svg>
    );
}

// Portada dibujada para EPs sin artwork todavía
function EpCover({ initials }) {
    return (
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="ep-cover" aria-hidden="true">
            <rect x="6" y="6" width="188" height="188" rx="10" fill="#141414" stroke="#1a1a1a" strokeWidth="5" />
            <circle cx="100" cy="86" r="34" fill="none" stroke="#e63946" strokeWidth="5" />
            <path d="M100 44 L100 62 M100 110 L100 128 M58 86 L76 86 M124 86 L142 86" stroke="#e63946" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="100" cy="86" r="4" fill="#fffdf8" />
            <text x="100" y="166" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="34" fill="#fffdf8">
                {initials}
            </text>
        </svg>
    );
}

function Studio() {
    const { index, playing, select } = useMusic();

    return (
        <div className="studio">
            <div className="studio-head">
                <BeeDoodle className="studio-bee" />
                <h1 className="page-title">La Colmena</h1>
                <p className="studio-subtitle">{ARTIST.claim}</p>
            </div>

            <div className="studio-player-wrap">
                {/* El productor cabeza-hexágono vibra encima del radiocasete.
                    Cuando suena la radio cabecea el doble que nadie: es lo suyo. */}
                <img src={auricularesSentado} alt="" className="studio-doodle al-ritmo al-ritmo--fuerte" style={{ '--fase': '0' }} />
                <div className="studio-player">
                    <ColmenaSticker className="studio-sticker" />
                    <Boombox />
                </div>
            </div>

            <section className="setlist" aria-label="Lista de temas">
                <h2 className="studio-section-title">Setlist</h2>
                <div className="setlist-frame">
                {/* El Luna, de turno de noche, escucha con el móvil en cuclillas */}
                <img src={lunaMovil} alt="" className="setlist-luna al-ritmo" style={{ '--fase': '0.65' }} />
                <ol className="setlist-list">
                    {TRACKS.map((track, i) => {
                        const active = i === index;
                        return (
                            <li key={track.src}>
                                <button
                                    type="button"
                                    className={`setlist-row ${active ? 'active' : ''}`}
                                    onClick={() => select(i)}
                                >
                                    <span className="setlist-num">{String(i + 1).padStart(2, '0')}</span>
                                    <span className="setlist-title">
                                        {track.title}
                                        <em>{track.tag}</em>
                                    </span>
                                    {active && playing ? (
                                        <CrosshairSpinner className="setlist-spinner" />
                                    ) : (
                                        <span className="setlist-duration">{track.duration}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
                </div>
                <p className="setlist-note">
                    * Directo desde La Colmena — más temas de {ARTIST.name} al caer.
                </p>
            </section>

            <section className="mesa-section" aria-label="La mesa de beats">
                <h2 className="studio-section-title">La mesa de beats</h2>
                <p className="studio-subtitle mesa-subtitle">
                    Deja tu ritmo en La Colmena. El Freeze lo baila.
                </p>
                <BeatMachine />
            </section>

            <section className="listen" aria-label={`Escuchar a ${ARTIST.name}`}>
                <h2 className="studio-section-title">Escúchalo en serio</h2>
                <div className="listen-wrap">
                    {/* El Tele viendo la tele que es él mismo, sentado en el reproductor */}
                    <img src={teleSentado} alt="" className="listen-tele al-ritmo" style={{ '--fase': '0.95' }} />
                    <div className="listen-card">
                        <iframe
                            title={`${ARTIST.name} en Spotify`}
                            src={ARTIST.spotifyEmbed}
                            width="100%"
                            height="352"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        />
                    </div>
                    {/* Uno de la banda colgado del borde del reproductor */}
                    <img src={colgadoBorde} alt="" className="listen-hanger al-ritmo" style={{ '--fase': '1.25' }} />
                </div>
                <div className="listen-links">
                    <a className="btn btn-primary" href={ARTIST.spotify} target="_blank" rel="noopener noreferrer">
                        {ARTIST.name} en Spotify
                    </a>
                    <a className="btn btn-ghost" href={ARTIST.youtube} target="_blank" rel="noopener noreferrer">
                        BARRO en YouTube
                    </a>
                </div>
            </section>

            <section className="eps" aria-label="EPs">
                <h2 className="studio-section-title">EPs</h2>
                <div className="eps-grid">
                    {EPS.map((ep) => (
                        <article key={ep.title} className="ep-card">
                            <EpCover initials={ep.initials} />
                            <h3 className="ep-title">{ep.title}</h3>
                            <p className="ep-year">{ep.year}</p>
                            <div className="ep-links">
                                {ep.links.spotify && (
                                    <a className="btn btn-ghost" href={ep.links.spotify} target="_blank" rel="noopener noreferrer">
                                        Spotify
                                    </a>
                                )}
                                {ep.links.youtube && (
                                    <a className="btn btn-ghost" href={ep.links.youtube} target="_blank" rel="noopener noreferrer">
                                        YouTube
                                    </a>
                                )}
                                {!ep.links.spotify && !ep.links.youtube && (
                                    <span className="badge-soon">En el horno</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default Studio;
