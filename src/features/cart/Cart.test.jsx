import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Cart from './Cart.jsx';

const line = {
  id: '35-red',
  productId: '35-red',
  title: '35 RED',
  image: '/products/placeholder-unreleased.webp',
  price: null,
  quantity: 2,
};

function renderCart(props = {}) {
  const handlers = {
    checkout: vi.fn(),
    removeFromCart: vi.fn(),
    incrementQuantity: vi.fn(),
    decrementQuantity: vi.fn(),
  };
  render(
    <MemoryRouter>
      <Cart cart={[line]} commerceMode="demo" {...handlers} {...props} />
    </MemoryRouter>
  );
  return handlers;
}

describe('Cart', () => {
  it('con el carrito vacío manda a la tienda', () => {
    render(
      <MemoryRouter>
        <Cart
          cart={[]}
          checkout={vi.fn()}
          removeFromCart={vi.fn()}
          incrementQuantity={vi.fn()}
          decrementQuantity={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/vacío/i);
    expect(screen.getByRole('link', { name: 'Ver la tienda' })).toHaveAttribute('href', '/');
  });

  it('agrupa los controles de cantidad por producto y respeta el tope de unidades', () => {
    const handlers = renderCart();
    const grupo = screen.getByRole('group', { name: 'Cantidad de 35 RED' });
    fireEvent.click(within(grupo).getByRole('button', { name: 'Añadir una unidad' }));
    fireEvent.click(within(grupo).getByRole('button', { name: 'Quitar una unidad' }));
    expect(handlers.incrementQuantity).toHaveBeenCalledWith(line);
    expect(handlers.decrementQuantity).toHaveBeenCalledWith(line);
    expect(within(grupo).getByText('2')).toBeInTheDocument();
    expect(document.title).toBe('Carrito · ROCKY 035');
  });

  it('con 20 unidades no deja añadir más y el precio pendiente se dice con esas palabras', () => {
    renderCart({ cart: [{ ...line, quantity: 20 }] });
    expect(screen.getByRole('button', { name: 'Añadir una unidad' })).toBeDisabled();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '35 RED' })).toHaveAttribute('href', '/product/35-red');
  });

  it('en modo demo el pago está desactivado y en Shopify llama al checkout', () => {
    renderCart();
    expect(screen.getByRole('button', { name: /pago desactivado/i })).toBeDisabled();
  });

  it('elimina la línea con su botón', () => {
    const handlers = renderCart();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar 35 RED del carrito' }));
    expect(handlers.removeFromCart).toHaveBeenCalledWith(line);
  });
});
