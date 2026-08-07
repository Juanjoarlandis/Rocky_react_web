import React from 'react';
import { Link, useLocation } from 'react-router';
import { useMusic } from '../context/MusicContext';
import { CrosshairSpinner } from './BrandDoodles';
import { IconPlay, IconPause } from './Boombox';
import '../styles/MiniPlayer.css';

// Píldora flotante de la radio: visible en toda la web menos en La Colmena
// (allí ya está el radiocasete grande). El título lleva al estudio.
function MiniPlayer() {
    const { track, playing, toggle } = useMusic();
    const location = useLocation();

    if (location.pathname === '/estudio') return null;

    return (
        <div className={`mini-player ${playing ? 'playing' : ''}`}>
            <CrosshairSpinner className="mini-player-disc" />
            <Link to="/estudio" className="mini-player-title" title="Ir a La Colmena">
                {track.title}
            </Link>
            <button
                type="button"
                className="mini-player-btn"
                onClick={toggle}
                aria-label={playing ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
            >
                {playing ? <IconPause /> : <IconPlay />}
            </button>
        </div>
    );
}

export default MiniPlayer;
