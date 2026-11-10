import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

/* Piezas diferidas (carga-y-estabilidad): qué código se ha cargado y cuándo.
   Cada módulo vigilado es el de verdad; la fábrica solo apunta que se ha
   importado. Va en su propio fichero porque un módulo cargado se queda
   cargado: el orden de estas pruebas importa. */
const loaded = vi.hoisted(() => new Set());
const watched = vi.hoisted(() => (name) => async (original) => {
  loaded.add(name);
  return original();
});
vi.mock('./features/night/spray/Spray.jsx', watched('spray'));
vi.mock('./features/night/Descontrol', watched('descontrol'));
vi.mock('./features/estampida/Estampida', watched('estampida'));
vi.mock('./features/catalog/Lightbox', watched('lightbox'));
vi.mock('./features/peeker/CuriousPeeker', watched('curioso'));

const useStorefront = vi.hoisted(() => vi.fn());
vi.mock('./features/storefront/useStorefront', () => ({ useStorefront }));

const storefront = (overrides = {}) => ({
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
});

let idle;
beforeEach(() => {
  idle = [];
  vi.stubGlobal('requestIdleCallback', (callback) => idle.push(callback));
  vi.stubGlobal('cancelIdleCallback', () => {});
  sessionStorage.setItem('rocky-splash-seen', '1');
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

const montar = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
const reposo = () => act(async () => idle.splice(0).forEach((callback) => callback()));

test('mientras el catálogo carga no se pide ninguna pieza, aunque el hilo esté libre', async () => {
  useStorefront.mockReturnValue(storefront({ loading: true }));
  montar();
  await act(async () => {});

  expect(idle).toHaveLength(0);
  expect([...loaded]).toEqual([]);
});

test('de día y sin tocar nada: en reposo llegan las piezas, también las que no se montan solas, y el spray no', async () => {
  useStorefront.mockReturnValue(storefront());
  montar();
  expect([...loaded]).toEqual([]);

  await reposo();
  await waitFor(() =>
    expect([...loaded].sort()).toEqual(['curioso', 'descontrol', 'estampida', 'lightbox'])
  );
  // Con todo lo demás cargado, el código del spray sigue sin ejecutarse
  await act(async () => {});
  expect(loaded.has('spray')).toBe(false);
});

test('al encender el neón llega el spray', async () => {
  useStorefront.mockReturnValue(storefront());
  montar();
  await reposo();
  expect(loaded.has('spray')).toBe(false);

  fireEvent.click(screen.getAllByRole('button', { name: 'Activar el descontrol' })[0]);

  expect(await screen.findByRole('button', { name: 'Coge el spray' })).toBeInTheDocument();
  expect(loaded.has('spray')).toBe(true);
});
