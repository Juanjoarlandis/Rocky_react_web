import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from './App.jsx';

test('muestra el splash de carga en la primera visita', () => {
  sessionStorage.clear();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByAltText(/cargando rocky 035/i)).toBeInTheDocument();
  expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
});

test('muestra la tienda cuando el splash ya se ha visto', () => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
});

test('El Curioso se asoma solo un rato después de entrar en la tienda', () => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  vi.useFakeTimers();
  // Con el azar fijado, la primera aparición cae a los 6 s y dura 3,1 s.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  try {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
  } finally {
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});
