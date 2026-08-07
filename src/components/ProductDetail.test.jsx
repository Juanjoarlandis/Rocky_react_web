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

describe('ProductDetail Shopify variants', () => {
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
});
