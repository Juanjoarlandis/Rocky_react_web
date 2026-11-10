import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductPhoto from './ProductPhoto.jsx';

describe('foto de producto', () => {
  it('ofrece las variantes locales por convención de nombre, con su tamaño real', () => {
    render(<ProductPhoto src="/products/rocky-airwave.webp" alt="Camiseta Airwave" sizes="42vw" />);
    const image = screen.getByRole('img', { name: 'Camiseta Airwave' });

    expect(image).toHaveAttribute('src', '/products/rocky-airwave.webp');
    expect(image).toHaveAttribute(
      'srcset',
      '/products/rocky-airwave-320.webp 320w, /products/rocky-airwave-640.webp 640w, /products/rocky-airwave.webp 1254w'
    );
    expect(image).toHaveAttribute('sizes', '42vw');
    expect(image).toHaveAttribute('width', '1254');
    expect(image).toHaveAttribute('height', '1254');
  });

  it('no ofrece una variante más ancha que el original', () => {
    render(<ProductPhoto src="/products/rocky-racing.webp" alt="Racing" sizes="42vw" />);

    expect(screen.getByRole('img', { name: 'Racing' })).toHaveAttribute(
      'srcset',
      '/products/rocky-racing-320.webp 320w, /products/rocky-racing-640.webp 640w, /products/rocky-racing.webp 850w'
    );
  });

  it('usa las variantes y el tamaño que manda Shopify', () => {
    render(
      <ProductPhoto
        src="https://cdn.shopify.com/s/files/foto.jpg"
        alt="Foto de Shopify"
        width={1200}
        height={1600}
        sizes="280px"
        sources={[
          { width: 1280, url: 'https://cdn.shopify.com/s/files/foto.jpg?width=1280' },
          { width: 320, url: 'https://cdn.shopify.com/s/files/foto.jpg?width=320' },
          { width: 640, url: 'https://cdn.shopify.com/s/files/foto.jpg?width=640' },
        ]}
      />
    );
    const image = screen.getByRole('img', { name: 'Foto de Shopify' });

    expect(image).toHaveAttribute(
      'srcset',
      'https://cdn.shopify.com/s/files/foto.jpg?width=320 320w, https://cdn.shopify.com/s/files/foto.jpg?width=640 640w, https://cdn.shopify.com/s/files/foto.jpg?width=1280 1280w'
    );
    expect(image).toHaveAttribute('width', '1200');
    expect(image).toHaveAttribute('height', '1600');
  });

  it('pinta una foto sin variantes con su URL y nada más', () => {
    render(<ProductPhoto src="https://cdn.shopify.com/s/files/sola.jpg" alt="Sola" sizes="42vw" />);
    const image = screen.getByRole('img', { name: 'Sola' });

    expect(image).toHaveAttribute('src', 'https://cdn.shopify.com/s/files/sola.jpg');
    expect(image).not.toHaveAttribute('srcset');
    expect(image).not.toHaveAttribute('sizes');
  });

  it('se carga con pereza salvo que sea prioritaria', () => {
    const { rerender } = render(
      <ProductPhoto src="/products/rocky-airwave.webp" alt="Airwave" sizes="42vw" />
    );
    const image = screen.getByRole('img', { name: 'Airwave' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).not.toHaveAttribute('fetchpriority');

    rerender(
      <ProductPhoto src="/products/rocky-airwave.webp" alt="Airwave" sizes="42vw" priority />
    );
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
  });

  it('pasa la clase y el aviso de error a la imagen', () => {
    render(
      <ProductPhoto
        src="/products/rocky-airwave.webp"
        alt="Airwave"
        sizes="72px"
        className="cart-item-image"
      />
    );

    expect(screen.getByRole('img', { name: 'Airwave' })).toHaveClass('cart-item-image');
  });

  it('avisa a quien la usa cuando la imagen falla', () => {
    const onError = vi.fn();
    render(<ProductPhoto src="/products/rocky-airwave.webp" alt="Airwave" onError={onError} />);

    fireEvent.error(screen.getByRole('img', { name: 'Airwave' }));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('puede pintarse sin reservar caja, para quien la ajusta por CSS', () => {
    render(<ProductPhoto src="/products/rocky-airwave.webp" alt="Airwave" intrinsicSize={false} />);
    const image = screen.getByRole('img', { name: 'Airwave' });

    expect(image).not.toHaveAttribute('width');
    expect(image).not.toHaveAttribute('height');
  });
});
