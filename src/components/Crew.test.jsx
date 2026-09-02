import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Crew from './Crew.jsx';

function renderCrew(entry = '/crew') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Crew />
    </MemoryRouter>
  );
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

    fireEvent.click(abrir);
    expect(cromo).toHaveClass('is-flipped');
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem('rocky-album-abiertos')).toContain('ollie');

    // Enter sobre el enlace del expediente no vuelve a girar la carta
    const enlace = within(cromo).getByRole('link', { name: /Los Drops/ });
    fireEvent.keyDown(enlace, { key: 'Enter' });
    expect(cromo).toHaveClass('is-flipped');

    fireEvent.click(within(cromo).getByRole('button', { name: '↻ volver' }));
    expect(cromo).not.toHaveClass('is-flipped');
    expect(document.title).toBe('La Crew · ROCKY 035');
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
});
