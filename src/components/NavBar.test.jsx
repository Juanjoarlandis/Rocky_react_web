import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NavBar from './NavBar.jsx';
import { MusicProvider } from '../features/music/MusicContext.jsx';

const navBarCss = readFileSync('src/styles/components/navbar.css', 'utf8');

function renderNavBar(props = {}) {
  return render(
    <MemoryRouter>
      <NavBar
        totalItems={0}
        accountEnabled={false}
        account={{ loggedIn: false, customer: null }}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('NavBar Crew entry', () => {
  it('keeps Mi Crew discoverable before Shopify Customer Accounts are connected', () => {
    renderNavBar();
    const links = screen.getAllByRole('link', { name: 'Mi Crew' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/mi-crew'));
  });

  it('shows the equipped Crew avatar instead of the customer name or email', () => {
    renderNavBar({
      accountEnabled: true,
      account: { loggedIn: true, customer: { displayName: 'juanjo@example.com' } },
      crewAvatarId: 'dormido-head',
    });

    const crewLink = screen.getByRole('link', { name: 'Mi Crew' });
    const avatar = crewLink.querySelector('img');

    expect(crewLink).toHaveAttribute('href', '/mi-crew');
    expect(avatar).toHaveAttribute('src', expect.stringContaining('dormido-head'));
    expect(avatar).toHaveAttribute('alt', '');
    expect(screen.queryByText('juanjo@example.com')).not.toBeInTheDocument();
  });

  it('announces the cart with its item count', () => {
    renderNavBar({ totalItems: 3 });
    expect(screen.getByRole('link', { name: 'Carrito, 3 artículos' })).toHaveAttribute(
      'href',
      '/cart'
    );
  });
});

describe('NavBar mobile menu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('closes at the desktop breakpoint and releases scroll and hidden focus', () => {
    let change;
    const media = {
      matches: false,
      addEventListener: (_event, fn) => {
        change = fn;
      },
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(media);
    renderNavBar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    // Se bloquea <html>, que es quien desplaza la página (H-010).
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('');
    act(() => {
      media.matches = true;
      change?.(media);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe('');
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveFocus();
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  it('returns focus when choosing the current destination', () => {
    renderNavBar();
    const button = screen.getByRole('button', { name: 'Abrir el menú' });
    fireEvent.click(button);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Tienda' }));
    expect(button).toHaveFocus();
  });
  it('opens a sheet with the six destinations, traps focus and closes with Escape', () => {
    renderNavBar();
    const button = screen.getByRole('button', { name: 'Abrir el menú' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(button);

    const sheet = screen.getByRole('dialog', { name: 'Menú' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', sheet.id);
    const links = within(sheet).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Tienda',
      'Drops',
      'Estudio',
      'Crew',
      'Rocky IA',
      'Mi Crew',
    ]);
    expect(document.activeElement).toBe(links[0]);

    // Shift+Tab desde el primer enlace vuelve al último control de la hoja
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(sheet.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(links[0]);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('closes the sheet when a destination is chosen', () => {
    renderNavBar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Drops' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /* H-014: el único cierre estaba fuera del diálogo modal. */
  it('se cierra desde dentro: «Cerrar» es el último control de la hoja', () => {
    renderNavBar();
    const button = screen.getByRole('button', { name: 'Abrir el menú' });
    fireEvent.click(button);
    const sheet = screen.getByRole('dialog', { name: 'Menú' });
    const cerrar = within(sheet).getByRole('button', { name: 'Cerrar' });

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(cerrar).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(within(sheet).getAllByRole('link')[0]).toHaveFocus();

    fireEvent.click(cerrar);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('«Cerrar» solo se ve al recibir el foco', () => {
    expect(navBarCss).toMatch(/\.navbar-sheet-close:not\(:focus-visible\)\s*\{[^}]*clip:/);
  });
});

describe('NavBar: la bombilla de la hoja', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('encender el descontrol desde la hoja la cierra', () => {
    renderNavBar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Activar el descontrol' })
    );
    expect(document.documentElement.dataset.theme).toBe('neon');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('apagarlo desde la hoja la deja abierta', () => {
    document.documentElement.dataset.theme = 'neon';
    renderNavBar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Apagar el descontrol' })
    );
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('NavBar responsive contract', () => {
  it('keeps a single row on every width: links hide behind the menu button at 640px', () => {
    expect(navBarCss).not.toMatch(/\.navbar-inner\s*\{[^}]*flex-direction:\s*column/);
    expect(navBarCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.navbar-links,\s*\.navbar-tools > \.navbar-theme\s*\{[\s\S]*?display:\s*none;/
    );
    expect(navBarCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.navbar-menu\s*\{[\s\S]*?display:\s*flex;/
    );
  });

  it('every control has an accessible name and the two navigations are labelled', () => {
    renderNavBar({ totalItems: 2 });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const names = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toEqual(['Tienda', 'Drops', 'Estudio', 'Crew', 'Rocky IA', 'Mi Crew']);
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Carrito, 2 artículos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /descontrol/ })).toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Abrir el menú' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});

describe('NavBar: la bombilla trae la música del descontrol', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset.theme;
  });

  it('al encender el neón suena su cinta en el mismo clic, y al apagarlo vuelve BARRO', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <MemoryRouter>
        <MusicProvider>
          <NavBar
            totalItems={0}
            accountEnabled={false}
            account={{ loggedIn: false, customer: null }}
          />
        </MusicProvider>
      </MemoryRouter>
    );
    const audio = container.querySelector('audio');

    fireEvent.click(screen.getAllByRole('button', { name: 'Activar el descontrol' })[0]);
    expect(document.documentElement.dataset.theme).toBe('neon');
    expect(audio).toHaveAttribute('src', '/music/modo-neon.m4a');
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Apagar el descontrol' })[0]);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(audio).toHaveAttribute('src', '/music/barro.m4a');
  });
});

/* seo-y-cache: la portada, los listados por categoría y las fichas son la
   tienda; «Tienda» queda marcada en las tres, en la barra y en el menú. */
describe('NavBar: «Tienda» activa en todo el catálogo', () => {
  const en = (ruta) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <NavBar
          totalItems={0}
          accountEnabled={false}
          account={{ loggedIn: false, customer: null }}
        />
      </MemoryRouter>
    );
  const tienda = () => {
    const barra = screen.getAllByRole('link', { name: 'Tienda' })[0];
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    const menu = within(screen.getByRole('dialog')).getByRole('link', { name: 'Tienda' });
    return [barra, menu];
  };

  it.each(['/', '/products', '/products/rocky-drop-4', '/product/rocky-racing'])(
    'en %s está activa en la barra y en el menú móvil',
    (ruta) => {
      en(ruta);
      for (const enlace of tienda()) {
        expect(enlace).toHaveClass('is-active');
        expect(enlace).toHaveAttribute('aria-current', 'page');
      }
    }
  );

  it.each(['/crew', '/menudrop', '/cart', '/productos-falsos'])('en %s no lo está', (ruta) => {
    en(ruta);
    for (const enlace of tienda()) {
      expect(enlace).not.toHaveClass('is-active');
      expect(enlace).not.toHaveAttribute('aria-current');
    }
  });
});
