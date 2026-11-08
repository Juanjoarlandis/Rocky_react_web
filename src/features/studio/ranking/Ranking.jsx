import { useEffect, useState } from 'react';
import { likeBeat, listBeats, removeBeat, reportBeat } from '../../../api/beats.js';
import { isAbortError } from '../../../api/http.js';
import { STORAGE_KEYS } from '../../../config/storageKeys.js';
import { TONALIDADES } from '../../../data/mesa.js';
import { readStorage } from '../../../utils/storage.js';
import { onPublished } from '../mesaBus.js';
import PatternThumb from './PatternThumb.jsx';
import { useRankingPlayer } from './useRankingPlayer.js';
import '../../../styles/components/ranking.css';

const TABS = Object.freeze([
  { id: 'semana', label: 'Top de la semana' },
  { id: 'nuevos', label: 'Nuevos' },
]);

const tonoLabel = (id) => TONALIDADES.find((tono) => tono.id === id)?.label ?? id;

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M12 20 C5 15 3 11.5 3 8.6 C3 6 5 4 7.5 4 C9.3 4 10.8 5 12 6.7 C13.2 5 14.7 4 16.5 4 C19 4 21 6 21 8.6 C21 11.5 19 15 12 20 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* El ranking de La Colmena: los beats que monta la gente en la mesa. Se
   escuchan aquí mismo (sin tocar tu mesa), se les da «me mola», se pueden
   cargar en la mesa para remezclarlos y se reportan si algo no pinta ahí. */
export default function Ranking({ onRemix }) {
  const [orden, setOrden] = useState('semana');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ status: 'loading', beats: [] });
  const [highlight, setHighlight] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState('');
  const player = useRankingPlayer();
  const adminToken = readStorage(STORAGE_KEYS.beatsAdmin);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, status: 'loading' }));
    listBeats(orden, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', beats: data?.beats ?? [] }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ status: 'error', beats: [] });
      });
    return () => controller.abort();
  }, [orden, reload]);

  // Lo recién publicado se enseña en «Nuevos», marcado.
  useEffect(
    () =>
      onPublished((beat) => {
        setOrden('nuevos');
        setReload((count) => count + 1);
        setHighlight(beat?.id ?? null);
      }),
    []
  );

  // Las confirmaciones de dos toques caducan solas.
  useEffect(() => {
    if (!confirming) return undefined;
    const timer = window.setTimeout(() => setConfirming(null), 3500);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const patch = (id, changes) =>
    setState((current) => ({
      ...current,
      beats: current.beats.map((beat) => (beat.id === id ? { ...beat, ...changes } : beat)),
    }));

  const drop = (id) =>
    setState((current) => ({ ...current, beats: current.beats.filter((beat) => beat.id !== id) }));

  const like = async (beat) => {
    // Al momento, y si el servidor dice otra cosa, manda el servidor.
    const optimistic = !beat.liked;
    patch(beat.id, { liked: optimistic, likes: beat.likes + (optimistic ? 1 : -1) });
    try {
      const result = await likeBeat(beat.id);
      patch(beat.id, { liked: result.liked, likes: result.likes });
    } catch (error) {
      patch(beat.id, { liked: beat.liked, likes: beat.likes });
      setNotice(error.message || 'No se ha podido guardar el like.');
    }
  };

  const ask = (action, beat) => setConfirming({ action, id: beat.id });
  const isAsking = (action, beat) => confirming?.action === action && confirming.id === beat.id;

  const report = async (beat) => {
    if (!isAsking('report', beat)) return ask('report', beat);
    setConfirming(null);
    try {
      const result = await reportBeat(beat.id);
      if (result.hidden) drop(beat.id);
      setNotice('Gracias: lo miramos.');
    } catch (error) {
      setNotice(error.message || 'No se ha podido reportar.');
    }
  };

  const remix = (beat) => {
    if (!isAsking('remix', beat)) return ask('remix', beat);
    setConfirming(null);
    player.stop();
    onRemix?.(beat);
  };

  const remove = async (beat) => {
    if (!isAsking('remove', beat)) return ask('remove', beat);
    setConfirming(null);
    try {
      await removeBeat(beat.id, adminToken);
      drop(beat.id);
    } catch (error) {
      setNotice(error.message || 'No se ha podido quitar.');
    }
  };

  const { status, beats } = state;

  return (
    <section className="ranking" aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="studio-section-title squiggle-underline">
        El ranking de La Colmena
      </h2>
      <p className="subtitle ranking-subtitle">
        Los beats de la gente. Dale al play y, si te mola, que se note.
      </p>

      <div className="ranking-tabs" role="tablist" aria-label="Orden del ranking">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ranking-tab-${tab.id}`}
            aria-selected={orden === tab.id}
            aria-controls="ranking-panel"
            className={`ranking-tab${orden === tab.id ? ' is-active' : ''}`}
            onClick={() => setOrden(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="ranking-panel"
        role="tabpanel"
        aria-labelledby={`ranking-tab-${orden}`}
        aria-busy={status === 'loading' || undefined}
        className="paper-card ranking-panel"
      >
        {status === 'error' && (
          <p className="ranking-empty">
            El ranking no responde ahora mismo.{' '}
            <button type="button" className="ranking-link" onClick={() => setReload((n) => n + 1)}>
              Reintentar
            </button>
          </p>
        )}
        {status !== 'error' && beats.length === 0 && (
          <p className="ranking-empty">
            {status === 'loading'
              ? 'Afinando la lista…'
              : 'Aún no hay beats. Monta uno en la mesa y publícalo: el primero se queda arriba.'}
          </p>
        )}
        {beats.length > 0 && (
          <ol className="ranking-list">
            {beats.map((beat, index) => {
              const playing = player.playingId === beat.id;
              const top = orden === 'semana' && index === 0 && beat.weekLikes > 0;
              return (
                <li
                  key={beat.id}
                  className={`ranking-beat${playing ? ' is-playing' : ''}${beat.id === highlight ? ' is-new' : ''}${top ? ' is-top' : ''}`}
                >
                  <span className="ranking-pos" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    className="ranking-play"
                    aria-pressed={playing}
                    aria-label={
                      playing ? `Parar «${beat.name}»` : `Escuchar «${beat.name}» de ${beat.alias}`
                    }
                    onClick={() => player.toggle(beat)}
                  >
                    <span aria-hidden="true">{playing ? '■' : '▶'}</span>
                  </button>
                  <PatternThumb code={beat.code} step={playing ? player.step : -1} />
                  <div className="ranking-info">
                    <p className="ranking-name">{beat.name}</p>
                    <p className="ranking-meta">
                      de {beat.alias} · {beat.bpm} BPM · {tonoLabel(beat.tono)}
                      {orden === 'semana' &&
                        beat.weekLikes > 0 &&
                        ` · ${beat.weekLikes} esta semana`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`ranking-like${beat.liked ? ' is-liked' : ''}`}
                    aria-pressed={beat.liked}
                    aria-label={`Me mola «${beat.name}» (${beat.likes})`}
                    onClick={() => like(beat)}
                  >
                    <HeartIcon />
                    <span aria-hidden="true">{beat.likes}</span>
                  </button>
                  <div className="ranking-actions">
                    <button type="button" className="ranking-link" onClick={() => remix(beat)}>
                      {isAsking('remix', beat) ? '¿Sustituir tu mesa?' : 'Remezclar'}
                    </button>
                    {!beat.mine && (
                      <button
                        type="button"
                        className="ranking-link ranking-link--muted"
                        onClick={() => report(beat)}
                      >
                        {isAsking('report', beat) ? '¿Reportar?' : 'Reportar'}
                      </button>
                    )}
                    {adminToken && (
                      <button
                        type="button"
                        className="ranking-link ranking-link--danger"
                        onClick={() => remove(beat)}
                      >
                        {isAsking('remove', beat) ? '¿Quitar?' : 'Quitar'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <p className="ranking-note" role="status">
        {notice || '* Un «me mola» por navegador. El top se renueva cada semana.'}
      </p>
    </section>
  );
}
