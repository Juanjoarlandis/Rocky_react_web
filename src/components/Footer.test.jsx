import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Footer from './Footer';

let observers;

class ObserverFalso {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    observers.push(this);
  }

  observe(target) {
    this.observed.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }
}

function setReducedMotion(enabled) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({
      matches: enabled && query === '(prefers-reduced-motion: reduce)',
    }))
  );
}

describe('Footer: patrulla de El Lata', () => {
  beforeEach(() => {
    observers = [];
    setReducedMotion(false);
    vi.stubGlobal('IntersectionObserver', ObserverFalso);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reserva la misma imagen, pero arranca con el póster ligero', () => {
    const { container } = render(<Footer />);

    const image = container.querySelector('.ticker-lata-image');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    expect(image).toHaveAttribute('width', '166');
    expect(image).toHaveAttribute('height', '224');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('.ticker-lata video')).not.toBeInTheDocument();

    expect(observers).toHaveLength(1);
    expect(observers[0].observed[0]).toHaveClass('ticker');
    expect(observers[0].options).toEqual({
      rootMargin: '800px 0px',
      threshold: 0,
    });
  });

  it('activa el WebP animado al acercarse al footer y deja de observar', () => {
    const { container } = render(<Footer />);

    act(() => {
      observers[0].callback([{ isIntersecting: true }], observers[0]);
    });

    expect(container.querySelector('.ticker-lata-image')).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-224.webp')
    );
    expect(observers[0].disconnected).toBe(true);
  });

  it('mantiene siempre el póster cuando se pide movimiento reducido', () => {
    setReducedMotion(true);
    const { container } = render(<Footer />);

    const image = container.querySelector('.ticker-lata-image');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    const reducedMotionSource = container.querySelector(
      '.ticker-lata-picture source[media="(prefers-reduced-motion: reduce)"]'
    );
    expect(reducedMotionSource).toHaveAttribute(
      'srcset',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    expect(observers).toHaveLength(0);
  });

  it('carga la animación directamente si el navegador no puede observar', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Footer />);

    expect(container.querySelector('.ticker-lata-image')).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-224.webp')
    );
  });
});
