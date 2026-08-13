import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

function renderRoute(pathname) {
  sessionStorage.setItem('rocky-splash-seen', '1');
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
    </MemoryRouter>
  );
}

describe('MiniPlayer route ownership', () => {
  it('docks one player between the navigation and content', () => {
    const { container } = renderRoute('/');
    const player = screen.getByRole('group', { name: /reproductor de rocky 035/i });
    const slot = container.querySelector('.mini-player-slot--content');
    const main = container.querySelector('.app-main');

    expect(slot).toContainElement(player);
    expect(slot.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('group', { name: /reproductor de rocky 035/i })).toHaveLength(1);
  });

  it('places one player inside the Rocky IA header', async () => {
    const { container } = renderRoute('/rockyIA');

    await screen.findByRole('heading', { name: 'Rocky IA' });
    const player = screen.getByRole('group', { name: /reproductor de rocky 035/i });
    const headerSlot = container.querySelector('.chat-header-player');

    expect(headerSlot).toContainElement(player);
    expect(container.querySelector('.mini-player-slot--content')).not.toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /reproductor de rocky 035/i })).toHaveLength(1);
  });

  it('renders neither a player nor an empty slot in Studio', async () => {
    const { container } = renderRoute('/estudio');

    await screen.findByRole('heading', { name: 'La Colmena' });
    expect(screen.queryByRole('group', { name: /reproductor de rocky 035/i })).not.toBeInTheDocument();
    expect(container.querySelector('.mini-player-slot')).not.toBeInTheDocument();
    expect(container.querySelector('.chat-header-player')).not.toBeInTheDocument();
  });
});
