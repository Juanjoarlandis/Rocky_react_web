import React, { createContext, useContext, useRef, useState } from 'react';
import { TRACKS } from '../data/studio';

// Radio global de la web: el <audio> vive aquí, por encima de las rutas,
// para que la música siga sonando mientras navegas. El boombox de La Colmena
// y la píldora flotante son solo mandos de este contexto.

const MusicContext = createContext(null);

// audio.play() devuelve promesa en navegadores reales, pero no en jsdom (tests)
function playSafely(audio, onBlocked) {
    try {
        const result = audio.play();
        if (result && typeof result.catch === 'function') {
            result.catch(onBlocked || (() => {}));
        }
    } catch {
        onBlocked?.();
    }
}

export function MusicProvider({ children }) {
    const audioRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [source, setSource] = useState('');
    const track = TRACKS[index];

    const activateTrack = (nextIndex) => {
        const audio = audioRef.current;
        const nextTrack = TRACKS[nextIndex];
        if (!audio || !nextTrack) return;

        if (audio.getAttribute('src') !== nextTrack.src) {
            audio.setAttribute('src', nextTrack.src);
            audio.load();
            setSource(nextTrack.src);
            setTime(0);
            setDuration(0);
        }
        setIndex(nextIndex);
        playSafely(audio, () => setPlaying(false));
    };

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (!audio.getAttribute('src')) {
            activateTrack(index);
            return;
        }
        if (audio.paused) {
            playSafely(audio, () => setPlaying(false));
        } else {
            audio.pause();
        }
    };

    // Pausa explícita (la usa la Mesa de Beats para no solaparse con la radio)
    const pause = () => {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
            audio.pause();
        }
    };

    const select = (i) => {
        activateTrack(i);
    };

    const next = () => activateTrack((index + 1) % TRACKS.length);

    const prev = () => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        activateTrack((index - 1 + TRACKS.length) % TRACKS.length);
    };

    const seek = (frac) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        audio.currentTime = Math.min(Math.max(frac, 0), 1) * duration;
        setTime(audio.currentTime);
    };

    const handleEnded = () => {
        const audio = audioRef.current;
        if (TRACKS.length === 1) {
            // Con un solo tema, la radio va en bucle
            audio.currentTime = 0;
            playSafely(audio, () => setPlaying(false));
            return;
        }
        next();
    };

    const value = {
        tracks: TRACKS,
        track,
        index,
        playing,
        time,
        duration,
        toggle,
        pause,
        next,
        prev,
        select,
        seek,
    };

    return (
        <MusicContext.Provider value={value}>
            <audio
                ref={audioRef}
                src={source || undefined}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => setPlaying(false)}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={handleEnded}
            />
            {children}
        </MusicContext.Provider>
    );
}

export function useMusic() {
    const ctx = useContext(MusicContext);
    if (!ctx) {
        throw new Error('useMusic debe usarse dentro de <MusicProvider>');
    }
    return ctx;
}
