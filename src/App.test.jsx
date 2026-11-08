import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

/* La tienda se simula: App se prueba como armazón (splash, navbar, muñecos),
   sin fetch a /api/shopify/status en jsdom. */
const useStorefront = vi.hoisted(() => vi.fn());
vi.mock('./features/storefront/useStorefront', () => ({ useStorefront }));
vi.mock('./features/cart/CartRunner', () => ({
  default: ({ runId }) => <span aria-label="Carreras al carrito">{runId}</span>,
}));

function storefront(overrides = {}) {
  return {
    mode: 'demo',
    capabilities: {
      catalog: false,
      cart: false,
      customerAccounts: false,
      admin: false,
      webhooks: false,
    },
    products: [],
    cartItems: [],
    cartCost: null,
    cartWarnings: [],
    totalItems: 0,
    account: { loggedIn: false, customer: null },
    crewAvatarId: 'skater-head',
    crewProfile: { profile: null, loading: false, error: '', applyProfile: vi.fn() },
    loading: false,
    cartBusy: false,
    error: '',
    canCheckout: false,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    incrementQuantity: vi.fn(),
    decrementQuantity: vi.fn(),
    checkout: vi.fn(),
    logout: vi.fn(),
    updateCrewAvatar: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  useStorefront.mockReturnValue(storefront());
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

// Enseña la ruta en curso y su clave: una clave nueva es una entrada nueva en el historial.
function RutaActual() {
  const location = useLocation();
  return (
    <output data-testid="ruta" data-key={location.key}>
      {location.pathname}
    </output>
  );
}

function renderEn(path) {
  sessionStorage.setItem('rocky-splash-seen', '1');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <RutaActual />
    </MemoryRouter>
  );
}

test('encender el descontrol fuera de la portada lleva a ella cuando termina el rótulo', async () => {
  renderEn('/legal/privacidad');
  fireEvent.click(screen.getAllByRole('button', { name: 'Activar el descontrol' })[0]);
  expect(await screen.findByTestId('descontrol-flash')).toHaveTextContent('Descontrol activado');
  expect(screen.getByTestId('ruta')).toHaveTextContent('/legal/privacidad');
  await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/), {
    timeout: 3000,
  });
  expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
});

test('encender el descontrol en la portada no añade historial', async () => {
  renderEn('/');
  const antes = screen.getByTestId('ruta').dataset.key;
  fireEvent.click(screen.getAllByRole('button', { name: 'Activar el descontrol' })[0]);
  expect(await screen.findByTestId('descontrol-flash')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument(), {
    timeout: 3000,
  });
  expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/);
  expect(screen.getByTestId('ruta').dataset.key).toBe(antes);
});

test('apagar el descontrol no navega', async () => {
  document.documentElement.dataset.theme = 'neon';
  renderEn('/legal/privacidad');
  fireEvent.click(screen.getAllByRole('button', { name: 'Apagar el descontrol' })[0]);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
  });
  expect(screen.getByTestId('ruta')).toHaveTextContent('/legal/privacidad');
});

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
  expect(screen.getByRole('status')).toHaveTextContent(/modo demo/i);
});

test.each([false, true])('celebrates only an effective cart addition (%s)', async (added) => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  useStorefront.mockReturnValue(
    storefront({
      mode: 'shopify',
      canAddToCart: true,
      products: [
        {
          id: 'tee',
          handle: 'tee',
          title: 'Tee',
          image: '/tee.webp',
          price: '35',
          defaultVariantId: 'v1',
          availableForSale: true,
        },
      ],
      addToCart: vi.fn().mockResolvedValue({ added, warnings: [] }),
    })
  );
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: added ? 'Añadido ✓' : 'Añadir al carrito' })
    ).toBeEnabled()
  );
  expect(screen.getByLabelText('Carreras al carrito')).toHaveTextContent(added ? '1' : '0');
  expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
    'href',
    '#main-content'
  );
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
});

test('passes catalog loading to a directly opened product', async () => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  useStorefront.mockReturnValue(storefront({ mode: 'checking', loading: true }));
  render(
    <MemoryRouter initialEntries={['/product/tee']}>
      <App />
    </MemoryRouter>
  );
  expect(await screen.findByText('Cargando producto…')).toBeInTheDocument();
  expect(screen.queryByText('Producto no encontrado')).not.toBeInTheDocument();
});

test('la portada y las categorías comparten la misma página', () => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  useStorefront.mockReturnValue(
    storefront({
      products: [
        {
          id: 'rocky-airwave',
          handle: 'rocky-airwave',
          title: 'Airwave',
          drop: 'COLMENA SIGNAL',
          dropHandle: 'colmena-signal',
          image: '/products/rocky-airwave.webp',
          price: null,
          isPreview: true,
        },
      ],
    })
  );
  render(
    <MemoryRouter initialEntries={['/products/colmena-signal']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('COLMENA SIGNAL');
  expect(document.title).toBe('COLMENA SIGNAL · ROCKY 035');
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
