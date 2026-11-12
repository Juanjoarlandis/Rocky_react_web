import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Crew from './Crew.jsx';

function renderCrew(entry = '/crew', props = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Crew {...props} />
    </MemoryRouter>
  );
}

// El enlace del reverso, con el cromo ya girado.
function vistoEnDe(nombre) {
  const cromo = screen.getByRole('article', { name: `Cromo de ${nombre}` });
  fireEvent.click(within(cromo).getByRole('button', { name: '↻ expediente' }));
  return within(cromo).getByRole('link', { name: /→$/ });
}

describe('La Crew', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gira el cromo con un botón real y deja el reverso operable con el teclado', () => {
    renderCrew();
    const cromo = screen.getByRole('article', { name: 'Cromo de El Ollie' });
    const abrir = within(cromo).getByRole('button', { name: '↻ expediente' });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');

    abrir.focus();
    fireEvent.click(abrir);
    expect(cromo).toHaveClass('is-flipped');
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    expect(within(cromo).getByRole('button', { name: '↻ volver' })).toHaveFocus();
    expect(localStorage.getItem('rocky-album-abiertos')).toContain('ollie');

    // Enter sobre el enlace del expediente no vuelve a girar la carta
    const enlace = within(cromo).getByRole('link', { name: /Los Drops/ });
    fireEvent.keyDown(enlace, { key: 'Enter' });
    expect(cromo).toHaveClass('is-flipped');

    fireEvent.click(within(cromo).getByRole('button', { name: '↻ volver' }));
    expect(cromo).not.toHaveClass('is-flipped');
    expect(abrir).toHaveFocus();
    expect(document.title).toBe('La Crew · ROCKY 035');
  });

  it.each(['%', '%E0%A4%A', 'unknown'])('ignores an invalid or unknown fragment #%s', (hash) => {
    renderCrew(`/crew#${hash}`);
    expect(screen.getByRole('heading', { name: 'La Crew' })).toBeInTheDocument();
    expect(document.querySelector('.is-flipped')).toBeNull();
  });

  it('opens a shared card without animated scrolling when motion is reduced', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    try {
      renderCrew('/crew#dormilon');
      vi.advanceTimersByTime(350);
      expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
    } finally {
      delete HTMLElement.prototype.scrollIntoView;
      vi.useRealTimers();
    }
  });

  it('abre el cromo del enlace directo (#id) y lo apunta en la colección', () => {
    renderCrew('/crew#dormilon');
    const cromo = screen.getByRole('article', { name: 'Cromo de El Dormilón' });
    expect(cromo).toHaveClass('is-flipped');
    expect(screen.getByLabelText(/Has abierto 1 de/)).toBeInTheDocument();
  });

  it('copia el enlace del cromo al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderCrew();
    const cromo = screen.getByRole('article', { name: 'Cromo de El Ollie' });
    fireEvent.click(within(cromo).getByRole('button', { name: '↻ expediente' }));
    fireEvent.click(within(cromo).getByRole('button', { name: /compartir cromo/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/crew#ollie'));
    expect(await within(cromo).findByText('¡Enlace copiado!')).toBeInTheDocument();
  });

  // album-sin-enlaces-rotos: El Vigía y El Nube viven en todas las fichas; ningún handle a mano.
  it('«Las fichas de producto» abre la primera ficha del catálogo', () => {
    renderCrew('/crew', {
      products: [{ handle: 'rocky-ya-llego' }, { handle: 'rocky-modo-luna' }],
    });

    expect(vistoEnDe('El Vigía')).toHaveAttribute('href', '/product/rocky-ya-llego');
    expect(vistoEnDe('El Nube')).toHaveAttribute('href', '/product/rocky-ya-llego');
    expect(vistoEnDe('El Recadero')).toHaveAttribute('href', '/products/agotado');
  });

  it('sin catálogo, «Las fichas de producto» lleva a la tienda', () => {
    renderCrew();

    expect(vistoEnDe('El Vigía')).toHaveAttribute('href', '/');
    expect(vistoEnDe('El Recadero')).toHaveAttribute('href', '/products/agotado');
  });
});
