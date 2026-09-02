import React from 'react';
import { Link } from 'react-router';
import { useMusic } from '../context/MusicContext';
import { CrosshairSpinner } from './BrandDoodles';
import { IconPlay, IconPause } from './Boombox';
import '../styles/components/mini-player.css';

// App decide dónde se monta; este componente solo presenta el mando de la radio.
function MiniPlayer({ variant = 'content' }) {
    const { track, playing, toggle } = useMusic();
    const variantClass = variant === 'chat' ? 'mini-player--chat' : 'mini-player--content';

    return (
        <div
            className={`mini-player ${variantClass} ${playing ? 'is-playing' : ''}`}
            role="group"
            aria-label="Reproductor de Rocky 035"
        >
            <CrosshairSpinner className="mini-player-disc" />
            <Link
                to="/estudio"
                className="mini-player-title"
                aria-label={`Ir a La Colmena: ${track.title}`}
                title={track.title}
            >
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
