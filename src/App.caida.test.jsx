import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

/* La crew celebra la caída de un drop (vida-a-la-vista): App conecta el aviso
   de caída de useDrops con la Estampida. Cuándo avisa useDrops lo prueban sus
   propias pruebas; aquí solo la conexión, en su propio fichero porque simula
   el módulo entero. */
const useStorefront = vi.hoisted(() => vi.fn());
vi.mock('./features/storefront/useStorefront', () => ({ useStorefront }));

const dropsHook = vi.hoisted(() => ({ options: null }));
vi.mock('./features/drops/useDrops', () => ({
  useDrops: (options) => {
    dropsHook.options = options;
    return {
      drops: [],
      featured: null,
      loading: false,
      error: '',
      serverNow: () => Date.now(),
      reload: () => {},
    };
  },
}));

beforeEach(() => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  vi.stubGlobal('requestIdleCallback', () => 1);
  vi.stubGlobal('cancelIdleCallback', () => {});
  useStorefront.mockReturnValue({
    mode: 'shopify',
    capabilities: { catalog: true, cart: false, customerAccounts: false, admin: false },
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
    refreshCatalog: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    incrementQuantity: vi.fn(),
    decrementQuantity: vi.fn(),
    checkout: vi.fn(),
    logout: vi.fn(),
    updateCrewAvatar: vi.fn(),
  });
});

test('cuando cae un drop con la página abierta, la crew cruza la pantalla', async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();

  act(() => dropsHook.options.onFall());

  expect(await screen.findByTestId('estampida')).toBeInTheDocument();
});
