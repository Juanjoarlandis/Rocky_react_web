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
});
