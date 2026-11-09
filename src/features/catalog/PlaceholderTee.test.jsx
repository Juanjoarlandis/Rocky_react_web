import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaceholderTee from './PlaceholderTee.jsx';

describe('PlaceholderTee', () => {
  it('uses the unreleased product mockup without presenting it as the final design', () => {
    render(<PlaceholderTee title="35 RED" />);

    const placeholder = screen.getByRole('img', {
      name: /35 red — diseño todavía sin revelar/i,
    });
    expect(placeholder.querySelector('img')).toHaveAttribute(
      'src',
      '/products/placeholder-unreleased.webp'
    );
    expect(screen.getByText(/diseño bajo llave/i)).toBeInTheDocument();
    expect(screen.queryByText('35 RED')).not.toBeInTheDocument();
  });

  it('removes the editorial label in the compact cart version', () => {
    render(<PlaceholderTee title="DWAG" compact />);

    expect(screen.queryByText(/diseño bajo llave/i)).not.toBeInTheDocument();
  });

  it('no dice de qué drop es salvo que se le diga', () => {
    const { rerender } = render(<PlaceholderTee title="X" />);
    expect(screen.queryByText(/drop 4/i)).not.toBeInTheDocument();
    rerender(<PlaceholderTee title="X" kicker="Drop 6 · sin revelar" />);
    expect(screen.getByText('Drop 6 · sin revelar')).toBeInTheDocument();
  });

  it('un producto a la venta sin foto no se presenta como sin revelar', () => {
    render(<PlaceholderTee title="35 RED" compact description="sin foto todavía" />);
    expect(screen.getByRole('img', { name: '35 RED — sin foto todavía' })).toBeInTheDocument();
  });
});
