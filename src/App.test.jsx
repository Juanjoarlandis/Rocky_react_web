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

test('encender el descontrol fuera de la portada lleva a ella bajo la tinta, antes de que se retire el rótulo', async () => {
  renderEn('/legal/privacidad');
  fireEvent.click(screen.getAllByRole('button', { name: 'Activar el descontrol' })[0]);
  expect(await screen.findByTestId('descontrol-flash')).toHaveTextContent('Descontrol activado');
  expect(screen.getByTestId('ruta')).toHaveTextContent('/legal/privacidad');
  await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/), {
    timeout: 3000,
  });
  // El rótulo sigue encima: al retirarse ya asoma la portada.
  expect(screen.getByTestId('descontrol-flash')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument(), {
    timeout: 3000,
  });
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
  // El catálogo se pinta cuando también han llegado los drops (carga-y-estabilidad)
  fireEvent.click(await screen.findByRole('button', { name: 'Añadir al carrito' }));
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

test('El Curioso se asoma solo un rato después de entrar en la tienda', async () => {
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
    // El Curioso es una pieza opcional: se monta con la página en reposo.
    await act(async () => {
      vi.advanceTimersByTime(2_500);
      await vi.dynamicImportSettled();
    });
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

/* Piezas opcionales (carga-y-estabilidad): no se montan hasta que la página
   está en reposo o alguien la toca. */
test('el repartidor, el curioso y el descontrol no se montan hasta el reposo o el primer gesto', async () => {
  vi.stubGlobal('requestIdleCallback', () => 1);
  vi.stubGlobal('cancelIdleCallback', () => {});
  try {
    renderEn('/');
    expect(screen.queryByLabelText('Carreras al carrito')).not.toBeInTheDocument();

    fireEvent.pointerDown(window);

    expect(await screen.findByLabelText('Carreras al carrito')).toBeInTheDocument();
  } finally {
    vi.unstubAllGlobals();
  }
});

test('teclear 035 suelta la estampida aunque su pieza aún no estuviera cargada', async () => {
  vi.stubGlobal('requestIdleCallback', () => 1);
  vi.stubGlobal('cancelIdleCallback', () => {});
  try {
    renderEn('/');

    for (const key of ['0', '3', '5']) fireEvent.keyDown(window, { key });

    expect(await screen.findByTestId('estampida')).toBeInTheDocument();
  } finally {
    vi.unstubAllGlobals();
  }
});

test('una ruta que no existe sigue pintando la página 404', async () => {
  renderEn('/no-existe');

  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByTestId('ruta')).toHaveTextContent('/no-existe');
});

/* seo-y-cache: App mantiene la URL canónica de cada ruta, y una ruta que no
   existe lo dice y pide que no se indexe. */
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.href ?? null;
const robots = () =>
  [...document.head.querySelectorAll('meta[name="robots"]')].map((meta) => meta.content);

test('cada ruta declara su URL canónica y su og:url', async () => {
  renderEn('/crew?utm_source=x');

  expect(canonical()).toBe('https://rocky035.com/crew');
  expect(document.head.querySelector('meta[property="og:url"]').content).toBe(
    'https://rocky035.com/crew'
  );
  expect(robots()).toEqual([]);
});

test('una ruta que no existe se titula «No encontrado», no se indexa y no declara canónica; al volver a la tienda, sí', async () => {
  renderEn('/no-existe');
  await screen.findByRole('heading', { level: 1 });

  expect(document.title).toBe('No encontrado · ROCKY 035');
  expect(robots()).toEqual(['noindex']);
  expect(canonical()).toBeNull();

  fireEvent.click(screen.getByRole('link', { name: 'Volver a la tienda' }));
  await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/));
  expect(robots()).toEqual([]);
  expect(canonical()).toBe('https://rocky035.com/');
  expect(document.title).not.toMatch(/No encontrado/);
});
