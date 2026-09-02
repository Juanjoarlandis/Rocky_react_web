import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TRACKS } from '../data/studio';

// Radio global de la web: el <audio> vive aquí, por encima de las rutas,
// para que la música siga sonando mientras navegas. El boombox de La Colmena
// y la píldora flotante son solo mandos de este contexto.
//
// Dos contextos: los mandos (memoizados, cambian solo al cambiar de tema o
// de estado) y el tiempo, que cambia cuatro veces por segundo mientras suena
// y sólo lo necesita quien pinta la barra de progreso.

const MusicControlsContext = createContext(null);
const MusicTimeContext = createContext(0);

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
  const track = TRACKS[index];

  /* Mientras suena la radio, el body lleva el pulso: `data-groove` enciende
     el cabeceo de los muñecos estáticos (la clase `al-ritmo`) y `--bpm` les
     marca el tempo del tema. Vive aquí y no en cada página porque el único
     que sabe si hay música, y a cuánto va, es el radiocasete. */
  useEffect(() => {
    if (!playing) return undefined;
    const body = document.body;
    body.dataset.groove = '1';
    body.style.setProperty('--bpm', String(track?.bpm ?? 92));
    return () => {
      delete body.dataset.groove;
      body.style.removeProperty('--bpm');
    };
  }, [playing, track]);

  const activateTrack = useCallback((nextIndex) => {
    const audio = audioRef.current;
    const nextTrack = TRACKS[nextIndex];
    if (!audio || !nextTrack) return;

    if (audio.getAttribute('src') !== nextTrack.src) {
      audio.setAttribute('src', nextTrack.src);
      audio.load();
      setTime(0);
      setDuration(0);
    }
    setIndex(nextIndex);
    playSafely(audio, () => setPlaying(false));
  }, []);

  const toggle = useCallback(() => {
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
  }, [activateTrack, index]);

  // Pausa explícita (la usa la Mesa de Beats para no solaparse con la radio)
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
  }, []);

  const select = useCallback((i) => activateTrack(i), [activateTrack]);

  const next = useCallback(
    () => activateTrack((index + 1) % TRACKS.length),
    [activateTrack, index]
  );

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    activateTrack((index - 1 + TRACKS.length) % TRACKS.length);
  }, [activateTrack, index]);

  const seek = useCallback(
    (frac) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = Math.min(Math.max(frac, 0), 1) * duration;
      setTime(audio.currentTime);
    },
    [duration]
  );

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

  const controls = useMemo(
    () => ({
      tracks: TRACKS,
      track,
      index,
      playing,
      duration,
      toggle,
      pause,
      next,
      prev,
      select,
      seek,
    }),
    [track, index, playing, duration, toggle, pause, next, prev, select, seek]
  );

  return (
    <MusicControlsContext.Provider value={controls}>
      <MusicTimeContext.Provider value={time}>
        {/* El `src` se gobierna sólo a mano en activateTrack, nunca como
            prop: si React lo re-escribe al re-renderizar, la spec dispara
            una carga nueva que aborta el play() en vuelo y el primer click
            en el radiocasete se queda mudo. */}
        {/* Música instrumental sin diálogo: no hay pista de subtítulos que ofrecer. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={handleEnded}
        />
        {children}
      </MusicTimeContext.Provider>
    </MusicControlsContext.Provider>
  );
}

// Los mandos: tema, estado y acciones. Identidad estable mientras suena.
export function useMusic() {
  const ctx = useContext(MusicControlsContext);
  if (!ctx) {
    throw new Error('useMusic debe usarse dentro de <MusicProvider>');
  }
  return ctx;
}

// El segundo actual del tema; sólo para quien pinta el progreso.
export function useMusicTime() {
  return useContext(MusicTimeContext);
}
