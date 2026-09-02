import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

/* La tienda se simula: App se prueba como armazón (splash, navbar, muñecos),
   sin fetch a /api/shopify/status en jsdom. */
const useStorefront = vi.hoisted(() => vi.fn());
vi.mock('./features/storefront/useStorefront', () => ({ useStorefront }));

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
