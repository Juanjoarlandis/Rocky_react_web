import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MusicProvider } from '../context/MusicContext.jsx';
import MiniPlayer from './MiniPlayer.jsx';

function renderPlayer(variant = 'content') {
  return render(
    <MemoryRouter>
      <MusicProvider>
        <MiniPlayer variant={variant} />
      </MusicProvider>
    </MemoryRouter>
  );
}

describe('MiniPlayer', () => {
  it('keeps the track link and playback action separate and fully named', () => {
    renderPlayer();

    const player = screen.getByRole('group', { name: /reproductor de rocky 035/i });
    const title = screen.getByRole('link', { name: /barro/i });
    const play = screen.getByRole('button', { name: /reproducir barro/i });

    expect(player).toContainElement(title);
    expect(player).toContainElement(play);
    expect(title).toHaveAttribute('href', '/estudio');
    expect(title).toHaveAttribute('title', 'BARRO');
  });

  it('exposes the chat variant without deciding the current route', () => {
    const { container } = renderPlayer('chat');

    expect(container.querySelector('.mini-player--chat')).toBeInTheDocument();
  });
});
