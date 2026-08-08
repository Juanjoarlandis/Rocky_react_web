import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicProvider, useMusic } from './MusicContext.jsx';

function MusicProbe() {
  const music = useMusic();
  return (
    <>
      <span data-testid="playing">{String(music.playing)}</span>
      <button type="button" onClick={music.toggle}>toggle</button>
      <button type="button" onClick={() => music.select(0)}>select</button>
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('MusicProvider network activation', () => {
  it('keeps the audio source empty until the user requests playback', () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValue();
    const load = vi
      .spyOn(window.HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => {});
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
