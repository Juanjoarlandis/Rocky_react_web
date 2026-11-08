import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: 'demo',
          capabilities: { catalog: false, cart: false, customerAccounts: false },
        }),
        { status: 200 }
      )
    )
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderRoute(pathname) {
  sessionStorage.setItem('rocky-splash-seen', '1');
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
    </MemoryRouter>
  );
}

describe('MiniPlayer route ownership', () => {
  it('docks one player between the navigation and content', async () => {
    const { container } = renderRoute('/');
    await screen.findByText(/Modo demo/);
    const player = screen.getByRole('group', { name: /reproductor de rocky 035/i });
    const slot = container.querySelector('.mini-player-slot--content');
    const main = container.querySelector('.app-main');

    expect(slot).toContainElement(player);
    expect(slot.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('group', { name: /reproductor de rocky 035/i })).toHaveLength(1);
  });

  it.each(['/rockyIA', '/rockyIA/', '/RockyIA'])(
    'places one player inside the chat header at %s',
    async (route) => {
      const { container } = renderRoute(route);

      await screen.findByRole('heading', { name: 'Rocky IA' });
      const player = screen.getByRole('group', { name: /reproductor de rocky 035/i });
      const headerSlot = container.querySelector('.chat-header-player');

      expect(headerSlot).toContainElement(player);
      expect(container.querySelector('.app--chat')).toBeInTheDocument();
      expect(container.querySelector('footer')).not.toBeInTheDocument();
      expect(container.querySelector('.mini-player-slot--content')).not.toBeInTheDocument();
      expect(screen.getAllByRole('group', { name: /reproductor de rocky 035/i })).toHaveLength(1);
    }
  );

  it.each(['/estudio', '/estudio/', '/Estudio'])('renders no mini-player at %s', async (route) => {
    const { container } = renderRoute(route);

    await screen.findByRole('heading', { name: 'La Colmena' });
    expect(
      screen.queryByRole('group', { name: /reproductor de rocky 035/i })
    ).not.toBeInTheDocument();
    expect(container.querySelector('.mini-player-slot')).not.toBeInTheDocument();
    expect(container.querySelector('.chat-header-player')).not.toBeInTheDocument();
  });
});
