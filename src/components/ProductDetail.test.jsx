import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
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
      expect(addToCart).toHaveBeenCalledWith(
        product,
        'gid://shopify/ProductVariant/2'
      )
    );
  });

  it('places product identity and purchase controls before media in source order', () => {
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

    expect(title.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(addButton.compareDocumentPosition(mediaButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sin precio ofrece «Avísame» y lleva el foco al formulario del drop', () => {
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
              <ProductDetail products={[unreleased]} addToCart={vi.fn()} commerceMode="demo" canAddToCart />
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
  });
});
