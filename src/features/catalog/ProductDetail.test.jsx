import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductDetail from './ProductDetail.jsx';

const product = {
  id: 'rocky-tee',
  handle: 'rocky-tee',
  title: 'Rocky Tee',
  drop: 'DROP 4',
  description: 'Camiseta de prueba',
  image: '/tee.jpg',
  availableForSale: true,
  defaultVariantId: 'gid://shopify/ProductVariant/1',
  variants: [
    {
      id: 'gid://shopify/ProductVariant/1',
      title: 'S',
      availableForSale: true,
      price: { amount: '35.00', currencyCode: 'EUR' },
      selectedOptions: [{ name: 'Talla', value: 'S' }],
    },
    {
      id: 'gid://shopify/ProductVariant/2',
      title: 'M',
      availableForSale: true,
      price: { amount: '40.00', currencyCode: 'EUR' },
      selectedOptions: [{ name: 'Talla', value: 'M' }],
    },
  ],
};

describe('ProductDetail', () => {
  afterEach(() => vi.restoreAllMocks());

  it('distinguishes pending catalog, failure and a missing product', () => {
    const view = (props) => (
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail products={[]} {...props} />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(view({ loading: true }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando producto');
    expect(screen.queryByText('Producto no encontrado')).not.toBeInTheDocument();
    rerender(view({ catalogError: 'Sin conexión' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    rerender(view({}));
    expect(screen.getByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument();
    rerender(view({ products: [product] }));
    expect(screen.getByRole('heading', { name: 'Rocky Tee' })).toBeInTheDocument();
  });
  it('un producto que no existe se titula «No encontrado» y no se indexa, pero solo con el catálogo ya cargado', () => {
    const robots = () =>
      [...document.head.querySelectorAll('meta[name="robots"]')].map((meta) => meta.content);
    const view = (props) => (
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail products={[]} {...props} />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender, unmount } = render(view({ loading: true }));
    expect(robots()).toEqual([]);
    expect(document.title).toBe('Cargando producto · ROCKY 035');
    // Un fallo del catálogo no es un producto que no existe
    rerender(view({ catalogError: 'Sin conexión' }));
    expect(robots()).toEqual([]);

    rerender(view({}));
    expect(document.title).toBe('No encontrado · ROCKY 035');
    expect(robots()).toEqual(['noindex']);

    rerender(view({ products: [product] }));
    expect(document.title).toBe('Rocky Tee · ROCKY 035');
    expect(robots()).toEqual([]);
    unmount();
  });

  it('changes the trusted variant price and adds the selected variant ID', async () => {
    const addToCart = vi.fn().mockResolvedValue(null);
    render(
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[product]}
                addToCart={addToCart}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByRole('combobox', { name: /variante/i }), {
      target: { value: 'gid://shopify/ProductVariant/2' },
    });
    expect(screen.getByText(/40,00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /añadir al carrito/i }));
    await waitFor(() =>
      expect(addToCart).toHaveBeenCalledWith(product, 'gid://shopify/ProductVariant/2')
    );
  });

  it('reads heading, media, description and purchase once in that order', () => {
    render(
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[product]}
                addToCart={vi.fn().mockResolvedValue(null)}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const title = screen.getByRole('heading', { name: 'Rocky Tee' });
    const addButton = screen.getByRole('button', { name: /añadir al carrito/i });
    const mediaButton = screen.getByRole('button', { name: /ver rocky tee en grande/i });
    const description = screen.getByText(product.description);

    expect(
      title.compareDocumentPosition(mediaButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      mediaButton.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      description.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Rocky Tee' })).toHaveLength(1);
  });

  it('la ficha de un producto agotado no lleva mira', () => {
    const agotado = {
      ...product,
      availableForSale: false,
      variants: product.variants.map((v) => ({ ...v, availableForSale: false })),
    };
    render(
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[agotado]}
                addToCart={vi.fn()}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
    const media = screen.getByRole('button', { name: /ver rocky tee en grande/i });
    expect(media.querySelector('.product-reticle')).toBeNull();
  });

  it('la foto de la ficha lleva la mira decorativa y conserva su nombre', () => {
    render(
      <MemoryRouter initialEntries={['/product/rocky-tee']}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[product]}
                addToCart={vi.fn().mockResolvedValue(null)}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
    const media = screen.getByRole('button', { name: /ver rocky tee en grande/i });
    const reticle = media.querySelector('svg.product-reticle');
    expect(reticle).not.toBeNull();
    expect(reticle).toHaveAttribute('aria-hidden', 'true');
    // El papel roto es solo del catálogo: la foto grande de la ficha se ve entera.
    expect(media.querySelector('.torn-sticker')).toBeNull();
  });

  it('sin precio ofrece «Avísame» y lleva el foco al formulario del drop', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    const unreleased = {
      id: '35-red',
      handle: '35-red',
      title: '35 RED',
      drop: 'ROCKY DROP 4',
      description: 'Roja',
      specifications: ['Próximamente'],
      image: '/products/placeholder-unreleased.webp',
      price: null,
      variants: [],
      defaultVariantId: null,
      availableForSale: false,
    };
    render(
      <MemoryRouter initialEntries={['/product/35-red']}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[unreleased]}
                addToCart={vi.fn()}
                commerceMode="demo"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(screen.getByText('Próximamente', { selector: '.badge' })).toBeInTheDocument();
    // Hay dos «Avísame»: el atajo de la ficha (primero) y el envío del formulario
    fireEvent.click(screen.getAllByRole('button', { name: 'Avísame' })[0]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /tu email/i }));
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
    delete HTMLElement.prototype.scrollIntoView;
  });

  const dropDe = (handle, number, state) => ({
    handle,
    number,
    title: `ROCKY DROP ${number}`,
    state,
    launchAt: '2026-11-01T19:00:00Z',
    endsAt: state === 'archivo' ? '2026-11-05T19:00:00Z' : null,
  });

  function renderFicha(item, drops = []) {
    return render(
      <MemoryRouter initialEntries={[`/product/${item.handle}`]}>
        <Routes>
          <Route
            path="/product/:productId"
            element={
              <ProductDetail
                products={[item]}
                addToCart={vi.fn()}
                commerceMode="shopify"
                canAddToCart
                drops={drops}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }

  it('el drop de la ficha enlaza a su página', () => {
    renderFicha(
      { ...product, drop: 'ROCKY DROP 5', dropHandle: 'rocky-drop-5', dropState: 'en-la-calle' },
      [dropDe('rocky-drop-5', 5, 'en-la-calle')]
    );
    expect(screen.getByRole('link', { name: 'ROCKY DROP 5' })).toHaveAttribute(
      'href',
      '/products/rocky-drop-5'
    );
  });

  it('un diseño del archivo avisa de que el drop ya voló y no se compra', () => {
    renderFicha(
      {
        ...product,
        drop: 'ROCKY DROP 3',
        dropHandle: 'rocky-drop-3',
        dropState: 'archivo',
        purchasable: false,
      },
      [dropDe('rocky-drop-3', 3, 'archivo')]
    );
    expect(screen.getByText(/este drop ya voló/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drop cerrado' })).toBeDisabled();
  });

  it('un diseño sin drop no enlaza a ningún drop', () => {
    renderFicha({ ...product, drop: 'Tienda', dropHandle: 'tienda' });
    expect(screen.queryByRole('link', { name: 'Tienda' })).not.toBeInTheDocument();
  });

  it('el aviso de un diseño de un drop que ya está en la calle va a la lista del diseño', async () => {
    // La lista del drop se envía y se borra al caer: apuntarse ahí ya no
    // traería ningún correo.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, duplicate: false }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    renderFicha(
      {
        ...product,
        drop: 'ROCKY DROP 5',
        dropHandle: 'rocky-drop-5',
        dropState: 'en-la-calle',
        price: null,
        variants: [],
        defaultVariantId: null,
      },
      [dropDe('rocky-drop-5', 5, 'en-la-calle')]
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Tu email para el aviso del drop' }), {
      target: { value: 'a@ejemplo.es' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByTestId('drop-aviso'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).producto).toBe(String(product.handle));
  });
});
