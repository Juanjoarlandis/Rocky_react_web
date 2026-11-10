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

describe('PlaceholderTee: tamaño de la imagen', () => {
  const imageOf = (name) => screen.getByRole('img', { name }).querySelector('img');

  it('ofrece las variantes del mockup en vez de bajar siempre el original', () => {
    render(<PlaceholderTee title="35 RED" />);
    const image = imageOf(/35 red/i);

    expect(image.getAttribute('srcset')).toBe(
      '/products/placeholder-unreleased-320.webp 320w, /products/placeholder-unreleased-640.webp 640w, /products/placeholder-unreleased.webp 1254w'
    );
    expect(image).toHaveAttribute(
      'sizes',
      '(max-width: 640px) 42vw, (max-width: 1100px) 380px, 280px'
    );
  });

  it('en miniatura declara un tamaño pequeño, salvo que quien la usa diga otro', () => {
    const { rerender } = render(<PlaceholderTee title="DWAG" compact />);
    expect(imageOf(/dwag/i)).toHaveAttribute('sizes', '96px');

    rerender(<PlaceholderTee title="DWAG" compact sizes="(max-width: 900px) 92vw, 600px" />);
    expect(imageOf(/dwag/i)).toHaveAttribute('sizes', '(max-width: 900px) 92vw, 600px');
  });
});
