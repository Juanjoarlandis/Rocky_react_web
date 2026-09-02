import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ProductPage from './ProductPage.jsx';

const productPageCss = readFileSync('src/styles/pages/home.css', 'utf8');
const buttonsCss = readFileSync('src/styles/04-buttons.css', 'utf8');

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
        <ProductPage
          products={[]}
          addToCart={vi.fn()}
          commerceMode="checking"
          loading
        />
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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ASPHALT AFTERDARK'
    );
    expect(screen.getByText('2 productos')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vista previa' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByText('HECHO DESDE LA COLMENA')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver Drop 4' })).not.toBeInTheDocument();
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
    expect(productPageCss).toMatch(/\.spray-line\s+path\s*\{[^}]*stroke-dasharray:\s*100cqw\s+100cqw;/);
    // Negativo: se descubre desde el final del trazo hacia atrás, que es donde
    // está el bote. En positivo saldría del lado contrario al que rocía.
    expect(productPageCss).toMatch(/\.spray-line\s+path\s*\{[^}]*stroke-dashoffset:\s*-95cqw;/);
    expect(productPageCss).toMatch(/@keyframes\s+spray-linea\s*\{[^}]*\{[^}]*stroke-dashoffset:\s*0;/);
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
    expect(reducido).toMatch(/\.spray-line\s+path\s*\{[^}]*animation:\s*none;[^}]*stroke-dashoffset:\s*0;/);
    expect(reducido).toMatch(/\.spray-cruiser\s*\{[^}]*animation:\s*none;/);
    // Y sin chorro, que sin animación serían tres puntos clavados en el aire.
    expect(reducido).toMatch(/\.spray-chorro\s*\{[^}]*display:\s*none;/);
  });
});

describe('ProductPage card anatomy', () => {
  it('reserves two title lines instead of truncating narrow cards to one line', () => {
    expect(productPageCss).toMatch(
      /\.product-title\s*\{[\s\S]*?min-height:\s*2\.4em;[\s\S]*?-webkit-line-clamp:\s*2;[\s\S]*?white-space:\s*normal;/
    );
  });

  it('gives purchase controls the dominant track and keeps every action touch-sized', () => {
    expect(productPageCss).toMatch(
      /\.product-actions\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*0\.85fr\)\s+minmax\(0,\s*1\.15fr\);/
    );
    expect(productPageCss).toMatch(
      /\.product-actions\s*>\s*\.add-to-cart-control\s*\{[\s\S]*?width:\s*100%;/
    );
    expect(buttonsCss).toMatch(/\.btn\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(buttonsCss).toMatch(/\.btn--block\s*\{[\s\S]*?width:\s*100%;/);
    expect(productPageCss).toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*?\.product-actions\s*\{[\s\S]*?grid-template-columns:\s*1fr;/
    );
  });

  it('uses a bounded editorial home hero with explicit tablet and mobile compositions', () => {
    expect(productPageCss).toMatch(
      /\.product-page-head--home\s+\.product-page-head-copy\s*\{[\s\S]*?margin-left:\s*clamp\(-96px,\s*calc\(\(1200px\s*-\s*100vw\)\s*\/\s*2\),\s*0px\);/
    );
    expect(productPageCss).toMatch(
      /\.product-page-head--home\s+\.page-title\s*\{[\s\S]*?font-size:\s*clamp\(5\.75rem,\s*12vw,\s*11\.25rem\);/
    );
    expect(productPageCss).toMatch(
      /\.product-page-hero-cta\s*\{[\s\S]*?min-width:\s*240px;[\s\S]*?min-height:\s*64px;/
    );
    expect(productPageCss).toMatch(
      /\.product-page-head--home\s+\.spray-line-wrap\s*\{[\s\S]*?bottom:\s*28px;/
    );
    expect(productPageCss).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.product-page-head--home/
    );
    expect(productPageCss).toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*?\.product-page-head--home/
    );
    expect(productPageCss).toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*?\.product-page-tagline\s*\{[\s\S]*?max-width:\s*100%;/
    );
  });
});
