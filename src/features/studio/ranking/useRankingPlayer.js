import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEngine } from '../../../audio/engine.js';
import { applyMix, triggerTrack } from '../audio/drumKit.js';
import { useStepSequencer } from '../useStepSequencer.js';
import { decodePattern, emptyPattern } from '../../../utils/beatCodec.js';
import { TONALIDADES, TRACKS } from '../../../data/mesa.js';
import { useMusic } from '../../music/MusicContext.jsx';
import { announcePlaying, onOtherPlaying } from '../mesaBus.js';

// La mezcla de fábrica de la mesa: así suena un beat del ranking igual que
// sonó en la mesa de quien lo hizo (salvo sus mutes, que no viajan).
const DEFAULT_MIX = Object.freeze({
  levels: TRACKS.map(() => 0.85),
  mutes: TRACKS.map(() => false),
  solos: TRACKS.map(() => false),
});

/* El tocadiscos del ranking: su propio motor y su propio secuenciador, así
   que escuchar un beat de otro no toca lo que tengas en tu mesa. Suena uno a
   la vez; al arrancar calla la radio y la mesa, y se calla si arrancan
   ellas. */
export function useRankingPlayer() {
  const [current, setCurrent] = useState(null);
  const engineRef = useRef(null);
  const tonicRef = useRef(TONALIDADES[0].midi);
  const { pause: pauseRadio } = useMusic();

  const pattern = useMemo(
    () => (current ? decodePattern(current.code) || emptyPattern() : emptyPattern()),
    [current]
  );

  const trigger = useCallback((index, time, velocity) => {
    triggerTrack(engineRef.current, index, time, velocity, { tonic: tonicRef.current });
  }, []);

  const { step, start, stop, isRunning } = useStepSequencer({
    pattern,
    bpm: current?.bpm ?? 92,
    swing: current?.swing ?? 0,
    trigger,
  });

  const halt = useCallback(() => {
    stop();
    setCurrent(null);
  }, [stop]);

  const play = useCallback(
    (beat) => {
      if (!engineRef.current) {
        const engine = createEngine();
        if (!engine) return;
        engine.setMasterLevel(0.85);
        applyMix(engine, DEFAULT_MIX);
        engineRef.current = engine;
      }
      engineRef.current.resume();
      tonicRef.current = (TONALIDADES.find((t) => t.id === beat.tono) || TONALIDADES[0]).midi;
      pauseRadio();
      announcePlaying('ranking');
      setCurrent(beat);
      if (!isRunning()) start(engineRef.current);
    },
    [isRunning, pauseRadio, start]
  );

  const toggle = useCallback(
    (beat) => {
      if (current?.id === beat.id) halt();
      else play(beat);
    },
    [current, halt, play]
  );

  // Si arranca la mesa, el ranking se calla.
  useEffect(() => onOtherPlaying('ranking', halt), [halt]);

  useEffect(
    () => () => {
      engineRef.current?.close();
      engineRef.current = null;
    },
    []
  );

  return { playingId: current?.id ?? null, step: current ? step : -1, toggle, stop: halt };
}
