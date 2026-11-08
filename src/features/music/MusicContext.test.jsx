import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicProvider, useMusic } from './MusicContext.jsx';
import { onOtherPlaying } from '../studio/mesaBus.js';

function MusicProbe() {
  const music = useMusic();
  return (
    <>
      <span data-testid="playing">{String(music.playing)}</span>
      <button type="button" onClick={music.toggle}>
        toggle
      </button>
      <button type="button" onClick={() => music.select(0)}>
        select
      </button>
      <button type="button" onClick={() => music.setNightTape(true)}>
        noche
      </button>
      <button type="button" onClick={() => music.setNightTape(false)}>
        día
      </button>
      <span data-testid="track">{music.track.title}</span>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('MusicProvider network activation', () => {
  it('keeps the audio source empty until the user requests playback', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const load = vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    const audio = container.querySelector('audio');

    expect(audio).not.toHaveAttribute('src');
    expect(audio).toHaveAttribute('preload', 'none');
    expect(load).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(audio).toHaveAttribute('src', '/music/barro.m4a');
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('marks the body with the beat while music plays and cleans up on pause', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    const audio = container.querySelector('audio');

    // Sin música no hay pulso que marcar.
    expect(document.body.dataset.groove).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.play(audio);

    // BARRO se cabecea a 77 golpes por minuto (medio tiempo del tema).
    expect(document.body.dataset.groove).toBe('1');
    expect(document.body.style.getPropertyValue('--bpm')).toBe('77');

    fireEvent.pause(audio);
    expect(document.body.dataset.groove).toBeUndefined();
    expect(document.body.style.getPropertyValue('--bpm')).toBe('');
  });

  it('de noche suena a su velocidad, sin cinta lenta, y los muñecos cabecean a su tempo', () => {
    document.documentElement.dataset.theme = 'neon';
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    const audio = container.querySelector('audio');
    expect(screen.getByTestId('track')).toHaveTextContent('MODO NEÓN');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.play(audio);
    expect(audio).toHaveAttribute('src', '/music/modo-neon.m4a');
    expect(audio.playbackRate).toBe(1);
    expect(document.body.style.getPropertyValue('--bpm')).toBe('75');
    fireEvent.pause(audio);
  });

  it('al encender el neón entra su cinta y suena sola; al apagarlo vuelve BARRO callada', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    const audio = container.querySelector('audio');

    fireEvent.click(screen.getByRole('button', { name: 'noche' }));
    expect(audio).toHaveAttribute('src', '/music/modo-neon.m4a');
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'día' }));
    expect(audio).toHaveAttribute('src', '/music/barro.m4a');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('si BARRO sonaba antes de la noche, vuelve a sonar al apagar el neón', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'noche' }));
    fireEvent.click(screen.getByRole('button', { name: 'día' }));
    expect(play).toHaveBeenCalledTimes(3);
  });

  it('cuando suena la radio, la mesa y el ranking se callan', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const mesa = vi.fn();
    const off = onOtherPlaying('mesa', mesa);
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.play(container.querySelector('audio'));
    expect(mesa).toHaveBeenCalledTimes(1);
    off();
  });

  it('derives the playing state from media events instead of optimistic selection', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MusicProvider>
        <MusicProbe />
      </MusicProvider>
    );
    const audio = container.querySelector('audio');

    fireEvent.click(screen.getByRole('button', { name: 'select' }));
    expect(screen.getByTestId('playing')).toHaveTextContent('false');

    fireEvent.play(audio);
    expect(screen.getByTestId('playing')).toHaveTextContent('true');

    fireEvent.pause(audio);
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });
});
