import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TRACKS } from '../data/studio';

// Radio global de la web: el <audio> vive aquí, por encima de las rutas,
// para que la música siga sonando mientras navegas. El boombox de La Colmena
// y la píldora flotante son solo mandos de este contexto.

const MusicContext = createContext(null);

// audio.play() devuelve promesa en navegadores reales, pero no en jsdom (tests)
function playSafely(audio, onBlocked) {
    const result = audio.play();
    if (result && typeof result.catch === 'function') {
        result.catch(onBlocked || (() => {}));
    }
}

export function MusicProvider({ children }) {
    const audioRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const track = TRACKS[index];

    // Intento de autoplay al entrar; si el navegador lo bloquea,
    // queda lista para arrancar con el primer clic en la píldora.
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) playSafely(audio);
    }, []);

    // Cambio de tema
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        setTime(0);
        if (playing) {
            playSafely(audio, () => setPlaying(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            playSafely(audio, () => setPlaying(false));
        } else {
            audio.pause();
        }
    };

    const select = (i) => {
        setIndex(i);
        setPlaying(true);
    };

    const next = () => select((index + 1) % TRACKS.length);

    const prev = () => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        select((index - 1 + TRACKS.length) % TRACKS.length);
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
        setPlaying(true);
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
        next,
        prev,
        select,
        seek,
    };

    return (
        <MusicContext.Provider value={value}>
            <audio
                ref={audioRef}
                src={track.src}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
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
