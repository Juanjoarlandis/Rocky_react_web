import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ProductPage from './ProductPage.jsx';
import { normalizeDemoCatalog } from '../storefront/normalize.js';

const productPageCss = readFileSync('src/styles/pages/home.css', 'utf8');

const previewProducts = [
  {
    id: 'rocky-night-runner',
    handle: 'rocky-night-runner',
    title: 'Night Runner',
    drop: 'ASPHALT AFTERDARK',
    dropHandle: 'asphalt-afterdark',
    image: '/products/rocky-night-runner.webp',
    imageAlt: 'Camiseta negra Night Runner',
    price: null,
    isPreview: true,
  },
  {
    id: 'rocky-pit-crew',
    handle: 'rocky-pit-crew',
    title: 'Pit Crew 035',
    drop: 'ASPHALT AFTERDARK',
    dropHandle: 'asphalt-afterdark',
    image: '/products/rocky-pit-crew.webp',
    imageAlt: 'Camiseta gris Pit Crew 035',
    price: null,
    isPreview: true,
  },
];

describe('ProductPage preview drops', () => {
  it('opens the home with an editorial intro and a working jump to the catalog', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'ROCKY 035' });
    const tagline = screen.getByText('HECHO DESDE LA COLMENA');
    const catalogLink = screen.getByRole('link', { name: 'Ver Drop 4' });
    const productGrid = container.querySelector('.product-grid');

    expect(catalogLink).toHaveAttribute('href', '#productos');
    expect(productGrid).toHaveAttribute('id', 'productos');
    expect(screen.getByText('2 productos')).toBeInTheDocument();
    expect(
      heading.compareDocumentPosition(tagline) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      catalogLink.compareDocumentPosition(productGrid) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('reserves the catalog footprint while Shopify is loading', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductPage products={[]} addToCart={vi.fn()} commerceMode="checking" loading />
      </MemoryRouter>
    );

    const productGrid = container.querySelector('.product-grid');
    expect(productGrid).toHaveClass('product-grid--loading');
    expect(productGrid).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the editorial drop title and keeps preview products out of the cart', () => {
    render(
      <MemoryRouter initialEntries={['/products/asphalt-afterdark']}>
        <Routes>
          <Route
            path="/products/:category"
            element={
              <ProductPage
                products={previewProducts}
                addToCart={vi.fn()}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ASPHALT AFTERDARK');
    expect(screen.getByText('2 productos')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vista previa' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByText('HECHO DESDE LA COLMENA')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver Drop 4' })).not.toBeInTheDocument();
  });
});

describe('ProductPage catalog grouping', () => {
  const demoProducts = [
    ...normalizeDemoCatalog([
      {
        id: 1,
        drop: 'ROCKY DROP 4',
        title: '35 RED',
        specifications: ['Próximamente'],
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
      {
        id: 2,
        drop: 'ROCKY DROP 4',
        title: '35 WHITE',
        specifications: ['Próximamente'],
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
      {
        id: 15,
        drop: 'ROCKY DROP 4',
        title: 'RockyRacing',
        price: '??',
        image: '/products/rocky-racing.webp',
      },
      {
        id: 3,
        drop: 'ROCKY DROP 4',
        title: 'Dots',
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
    ]),
    ...previewProducts,
  ];

  it('muestra primero los diseños con foto y agrupa los que siguen bajo llave con un solo aviso', () => {
    render(
      <MemoryRouter>
        <ProductPage products={demoProducts} addToCart={vi.fn()} commerceMode="demo" />
      </MemoryRouter>
    );

    const cards = document.querySelectorAll('.product-grid > .product-card');
    expect(cards[0]).toHaveTextContent('RockyRacing');
    expect(cards[1]).toHaveAttribute('data-testid', 'locked-designs');
    expect(screen.getByRole('heading', { name: '3 diseños bajo llave' })).toBeInTheDocument();
    expect(screen.getByText('35 RED · 35 WHITE · Dots')).toBeInTheDocument();
    expect(screen.getAllByTestId('drop-aviso')).toHaveLength(1);
  });

  it('sin precio conocido ofrece «Avísame» en vez de «Añadir al carrito», en cualquier modo', () => {
    render(
      <MemoryRouter>
        <ProductPage products={demoProducts} addToCart={vi.fn()} commerceMode="demo" canAddToCart />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Avísame' })).toHaveAttribute(
      'href',
      '/product/rockyracing#aviso'
    );
    expect(screen.getAllByRole('button', { name: 'Vista previa' })).toHaveLength(
      previewProducts.length
    );
  });
});

describe('ProductPage hero motion', () => {
  function pintarEncabezado() {
    return render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
  }

  it('el grafitero usa el dibujo sin el chorro pintado', () => {
    const { container } = pintarEncabezado();
    // Si volviera el dibujo con los puntos, se verían dos chorros: el pintado
    // encima del animado.
    expect(container.querySelector('.spray-guy').getAttribute('src')).toMatch(
      /grafitero-sin-chorro/
    );
    expect(container.querySelectorAll('.spray-chorro i')).toHaveLength(3);
  });

  it('la línea se revela entera y desde la punta del bote', () => {
    const { container } = pintarEncabezado();
    const trazo = container.querySelector('.spray-line path');

    // El trazo lleva `non-scaling-stroke`, así que el guion se mide en píxeles
    // de pantalla: tiene que ser más largo que la pista o la línea sale a rayas.
    expect(trazo).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(productPageCss).toMatch(
      /\.spray-line\s+path\s*\{[^}]*stroke-dasharray:\s*100cqw\s+100cqw;/
    );
    // Negativo: se descubre desde el final del trazo hacia atrás, que es donde
    // está el bote. En positivo saldría del lado contrario al que rocía.
    expect(productPageCss).toMatch(/\.spray-line\s+path\s*\{[^}]*stroke-dashoffset:\s*-95cqw;/);
    expect(productPageCss).toMatch(
      /@keyframes\s+spray-linea\s*\{[^}]*\{[^}]*stroke-dashoffset:\s*0;/
    );
  });

  it('la escena pasa una sola vez y no se repite', () => {
    const escena = productPageCss.slice(
      productPageCss.indexOf('.spray-line-wrap {'),
      productPageCss.indexOf('.product-grid {')
    );
    expect(escena).not.toMatch(/animation:[^;]*infinite/);
  });

  it('la Cruiser tiene un único sitio de reposo', () => {
    const sitios = [
      ...productPageCss.matchAll(/^[^{\n]*\.spray-cruiser[^\n{]*\{[^}]*?left:\s*([^;]+);/gm),
    ].map((m) => m[1].trim());

    expect(sitios).toEqual(['4%']);
  });

  it('con movimiento reducido la escena queda quieta y terminada', () => {
    const reducido = productPageCss.slice(
      productPageCss.indexOf('@media (prefers-reduced-motion: reduce)')
    );

    // La línea, pintada del todo; nadie se queda con media raya.
    expect(reducido).toMatch(
      /\.spray-line\s+path\s*\{[^}]*animation:\s*none;[^}]*stroke-dashoffset:\s*0;/
    );
    expect(reducido).toMatch(/\.spray-cruiser\s*\{[^}]*animation:\s*none;/);
    // Y sin chorro, que sin animación serían tres puntos clavados en el aire.
    expect(reducido).toMatch(/\.spray-chorro\s*\{[^}]*display:\s*none;/);
  });
});

describe('ProductPage card anatomy', () => {
  it('cada tarjeta lleva su título como encabezado, la foto con lupa y dos acciones con nombre', () => {
    render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
    const card = screen
      .getByRole('heading', { level: 2, name: 'Night Runner' })
      .closest('.product-card');
    expect(card).not.toBeNull();
    expect(within(card).getByRole('button', { name: 'Ver Night Runner en grande' })).toBeEnabled();
    expect(within(card).getByRole('link', { name: 'Detalles' })).toHaveAttribute(
      'href',
      '/product/rocky-night-runner'
    );
    expect(within(card).getByRole('button', { name: 'Vista previa' })).toBeDisabled();
    const image = within(card).getByRole('img', { name: /Night Runner/ });
    expect(image).toHaveAttribute('width');
    expect(image).toHaveAttribute('height');
  });

  it('la portada presenta el título, el lema, el contador y un salto real al catálogo', () => {
    render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ROCKY 035');
    expect(screen.getByText('HECHO DESDE LA COLMENA')).toBeInTheDocument();
    expect(screen.getByText(`${previewProducts.length} productos`)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Ver Drop 4' });
    expect(cta).toHaveAttribute('href', '#productos');
    expect(document.getElementById('productos')).not.toBeNull();
    expect(document.title).toBe('ROCKY 035');
  });
});
