import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddToCartButton from './AddToCartButton.jsx';

const product = { id: 'tee', handle: 'tee', title: 'Tee' };

describe('AddToCartButton', () => {
  it.each([false, true])(
    'shows stock warnings and celebrates only an effective addition (%s)',
    async (added) => {
      const addToCart = vi
        .fn()
        .mockResolvedValue({ added, warnings: [{ message: 'Stock ajustado' }] });
      render(<AddToCartButton product={product} variantId="v1" addToCart={addToCart} />);
      fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Stock ajustado');
      expect(screen.getByRole('button')).toHaveTextContent(
        added ? 'Añadido ✓' : 'Añadir al carrito'
      );
    }
  );
  it('añade, celebra un momento y vuelve a su sitio', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const addToCart = vi.fn().mockResolvedValue({ added: true });
    render(<AddToCartButton product={product} variantId="v1" addToCart={addToCart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
    expect(addToCart).toHaveBeenCalledWith(product, 'v1');
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Añadido ✓'));
    act(() => vi.advanceTimersByTime(1300));
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Añadir al carrito'));
    vi.useRealTimers();
  });

  it('enseña el error del carrito sin perder el botón', async () => {
    const addToCart = vi.fn().mockRejectedValue(new Error('Sin stock para esa talla.'));
    render(<AddToCartButton product={product} variantId="v1" addToCart={addToCart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin stock para esa talla.');
    expect(screen.getByRole('button', { name: 'Añadir al carrito' })).toBeEnabled();
  });

  it('cuando no se puede añadir enseña el motivo y queda desactivado', () => {
    render(
      <AddToCartButton product={product} addToCart={vi.fn()} disabled unavailableLabel="Agotado" />
    );
    expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled();
  });
});
