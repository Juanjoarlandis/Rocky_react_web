import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import NotFound from './NotFound';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );
}

describe('404', () => {
  it('de día: te has salido del mapa y el botón de vuelta, sin oscuridad', () => {
    const { container } = renderNotFound();
    expect(screen.getByRole('heading', { name: 'Te has salido del mapa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute('href', '/');
    expect(container.querySelector('.notfound-oscuridad')).toBeNull();
  });

  it('de noche se va la luz y la salida se esconde, pero sigue siendo un enlace', () => {
    document.documentElement.dataset.theme = 'neon';
    const { container } = renderNotFound();
    expect(screen.getByRole('heading', { name: 'No deberías estar aquí' })).toBeInTheDocument();
    const salida = screen.getByRole('link', { name: 'Salir de aquí' });
    expect(salida).toHaveAttribute('href', '/');
    expect(salida).toHaveClass('notfound-salida');
    expect(salida.style.getPropertyValue('--sx')).toMatch(/%$/);
    expect(container.querySelector('.notfound-oscuridad')).not.toBeNull();
    expect(screen.getByText(/toca la pantalla para alumbrar/)).toBeInTheDocument();
  });
  it('se titula «No encontrado» y pide que no se indexe mientras está en pantalla', () => {
    document.title = 'ROCKY 035';
    const { unmount } = renderNotFound();
    const robots = () =>
      [...document.head.querySelectorAll('meta[name="robots"]')].map((meta) => meta.content);

    expect(document.title).toBe('No encontrado · ROCKY 035');
    expect(robots()).toEqual(['noindex']);
    unmount();
    expect(document.title).toBe('ROCKY 035');
    expect(robots()).toEqual([]);
  });
});
