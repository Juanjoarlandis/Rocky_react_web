import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';

test('muestra el splash de carga en la primera visita', () => {
  sessionStorage.clear();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByAltText(/cargando rocky 035/i)).toBeInTheDocument();
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

test('no inserta un aviso temporal que desplace la portada mientras comprueba Shopify', () => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(
    screen.queryByText(/comprobando conexión segura con la tienda/i)
  ).not.toBeInTheDocument();
});
