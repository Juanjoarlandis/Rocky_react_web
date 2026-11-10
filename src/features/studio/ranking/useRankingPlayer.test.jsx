import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRankingPlayer } from './useRankingPlayer.js';
import { MusicProvider } from '../../music/MusicContext.jsx';
import { createEngine } from '../../../audio/engine.js';
import { FakeAudioContext } from '../../../audio/fakeAudioContext.js';
import { announcePlaying } from '../mesaBus.js';
import { encodePattern, emptyPattern } from '../../../utils/beatCodec.js';

const BEAT = { id: 'b1', code: encodePattern(emptyPattern()), bpm: 92, swing: 0, tono: 'do' };

/* H-118: el estudio tenía un AudioContext por pieza (mesa y ranking) y otro
   más al remezclar. Ahora es uno por pestaña. */
describe('useRankingPlayer y el contexto de audio del estudio', () => {
  let created;

  beforeEach(() => {
    created = [];
    vi.stubGlobal(
      'AudioContext',
      class extends FakeAudioContext {
        constructor() {
          super();
          created.push(this);
        }
      }
    );
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const montar = () => renderHook(() => useRankingPlayer(), { wrapper: MusicProvider });

  it('el ranking suena en el mismo contexto que la mesa', () => {
    const mesa = createEngine();
    const { result, unmount } = montar();
    act(() => result.current.toggle(BEAT));

    expect(result.current.playingId).toBe('b1');
    expect(created).toHaveLength(1);
    unmount();
    // Lo sigue usando la mesa: no se cierra hasta que lo suelta ella
    expect(mesa.ctx.state).toBe('running');
    mesa.close();
    expect(mesa.ctx.state).toBe('closed');
  });

  it('«Remezclar» monta otra mesa sin crear otro contexto, y al sonar ella el ranking calla', () => {
    let mesa = createEngine();
    const { result, unmount } = montar();
    act(() => result.current.toggle(BEAT));

    // Remezclar desmonta la mesa y monta otra con el beat en la URL
    mesa.close();
    mesa = createEngine();
    expect(created).toHaveLength(1);
    expect(mesa.ctx).toBe(created[0]);

    act(() => announcePlaying('mesa'));
    expect(result.current.playingId).toBeNull();
    unmount();
    mesa.close();
    expect(created[0].state).toBe('closed');
  });
});
