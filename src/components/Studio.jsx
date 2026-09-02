import React from 'react';
import Boombox from './Boombox';
import { CrosshairSpinner } from './doodles/CrosshairSpinner';
import { BeeDoodle } from './doodles/BeeDoodle';
import { ColmenaSticker } from './doodles/ColmenaSticker';
import { EpCover } from './doodles/EpCover';
import { useMusic } from '../context/MusicContext';
import { ARTIST, TRACKS, EPS } from '../data/studio';
import auricularesSentado from '../images/optimized/characters/auriculares-sentado-600.webp';
import colgadoBorde from '../images/optimized/characters/colgado-borde-600.webp';
import teleSentado from '../images/optimized/characters/tele-sentado-borde-600.webp';
import lunaMovil from '../images/optimized/characters/luna-movil-600.webp';
import BeatMachine from './BeatMachine';
import '../styles/Studio.css';

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
                <img src={auricularesSentado} alt="" className="studio-doodle neon-art al-ritmo al-ritmo--fuerte" style={{ '--fase': '0' }} />
                <div className="studio-player">
                    <ColmenaSticker className="studio-sticker" />
                    <Boombox />
                </div>
            </div>

            <section className="setlist" aria-label="Lista de temas">
                <h2 className="studio-section-title">Setlist</h2>
                <div className="setlist-frame">
                {/* El Luna, de turno de noche, escucha con el móvil en cuclillas */}
                <img src={lunaMovil} alt="" className="setlist-luna neon-art al-ritmo" style={{ '--fase': '0.65' }} />
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
                    Ocho pistas, dieciséis pads y swing. Deja tu ritmo en La Colmena: El Freeze lo baila.
                </p>
                <BeatMachine />
            </section>

            <section className="listen" aria-label={`Escuchar a ${ARTIST.name}`}>
                <h2 className="studio-section-title">Escúchalo en serio</h2>
                <div className="listen-wrap">
                    {/* El Tele viendo la tele que es él mismo, sentado en el reproductor */}
                    <img src={teleSentado} alt="" className="listen-tele neon-art al-ritmo" style={{ '--fase': '0.95' }} />
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
                    <img src={colgadoBorde} alt="" className="listen-hanger neon-art al-ritmo" style={{ '--fase': '1.25' }} />
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
