import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ProductPage from './ProductPage.jsx';

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
  });
});
