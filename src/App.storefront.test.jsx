import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

const useStorefront = vi.hoisted(() => vi.fn());

vi.mock('./features/storefront/useStorefront', () => ({ useStorefront }));

beforeEach(() => {
  sessionStorage.setItem('rocky-splash-seen', '1');
  useStorefront.mockReturnValue({
    mode: 'shopify',
    capabilities: {
      catalog: true,
      cart: true,
      customerAccounts: false,
      admin: false,
      webhooks: false,
    },
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
    cartItems: [],
    cartCost: null,
    cartWarnings: [],
    totalItems: 0,
    account: { loggedIn: false, customer: null },
    loading: false,
    cartBusy: false,
    error: '',
    canCheckout: true,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    incrementQuantity: vi.fn(),
    decrementQuantity: vi.fn(),
    checkout: vi.fn(),
    logout: vi.fn(),
  });
});

test('keeps previews in the demo catalog without passing a separate Shopify layer', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(useStorefront).toHaveBeenCalledWith({
    demoProducts: expect.arrayContaining([
      expect.objectContaining({ handle: 'rocky-airwave', isPreview: true }),
    ]),
  });
  expect(screen.getByText('Airwave')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Vista previa' })).toBeDisabled();
});
