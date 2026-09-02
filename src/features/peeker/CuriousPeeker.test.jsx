import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CuriousPeeker from './CuriousPeeker.jsx';

// Con Math.random fijo los tiempos quedan en el centro de cada rango.
const FIRST_WAIT = 6_000;
const VISIBLE_FOR = 3_100;
const GAP = 13_000;

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// La clase visible se activa en el frame siguiente al montaje.
function advanceToPeek(ms) {
  advance(ms);
  act(() => {
    vi.advanceTimersToNextFrame();
  });
}

function stubMedia(activeQuery) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({ matches: query === activeQuery }))
  );
}

/* Un escondite de verdad en la página: un bloque opaco lo bastante grande. Su
   rectángulo se puede mover a mano para simular el scroll. */
function plantarEscondite() {
  document.body.innerHTML =
    '<section class="escondite" style="background-color: rgb(255, 253, 248)"></section>';
  const bloque = document.querySelector('.escondite');
  const caja = { left: 200, top: 400, width: 600, height: 300 };
  bloque.getBoundingClientRect = () => ({
    ...caja,
    right: caja.left + caja.width,
    bottom: caja.top + caja.height,
  });
  return {
    desplazar(dy) {
      caja.top += dy;
    },
  };
}

describe('CuriousPeeker: apariciones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('espera, se asoma un momento y se vuelve a esconder', () => {
    render(<CuriousPeeker pathname="/" />);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advanceToPeek(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toHaveAttribute('data-beat', 'sale');

    advance(VISIBLE_FOR);
    expect(screen.getByTestId('curious-peeker')).toHaveAttribute('data-beat', 'escapa');

    advance(400);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('sale de golpe, se estira y se esconde, cada gesto con su tiempo', () => {
    render(<CuriousPeeker pathname="/" />);
    const peeker = () => screen.getByTestId('curious-peeker');
    const escondido = () => Number(peeker().firstChild.style.transform.match(/-?[\d.]+/)[0]);
    const alto = () => Number(peeker().style.height.replace('px', ''));

    advanceToPeek(FIRST_WAIT);
    const asomado = escondido();
    expect(asomado).toBeGreaterThan(0);
    expect(asomado).toBeLessThan(alto());

    // A media aparición se estira: queda menos escondido que al principio.
    advance(VISIBLE_FOR * 0.5);
    expect(peeker()).toHaveAttribute('data-beat', 'estira');
    expect(escondido()).toBeLessThan(asomado);

    // Y al final vuelve a meterse entero por debajo del canto.
    advance(VISIBLE_FOR * 0.5 + 50);
    expect(peeker()).toHaveAttribute('data-beat', 'escapa');
    expect(escondido()).toBeGreaterThan(asomado);
  });

  it('cada aparición arranca el vaivén en otro punto', () => {
    // Con Math.random fijo, la fase es estable y siempre negativa.
    render(<CuriousPeeker pathname="/" />);
    advanceToPeek(FIRST_WAIT);

    const art = screen.getByTestId('curious-peeker').querySelector('img');
    expect(art.style.getPropertyValue('--fase')).toMatch(/^-\d/);
    expect(['normal', 'reverse']).toContain(art.style.getPropertyValue('--mira'));
  });

  it('nunca hay dos a la vez en pantalla', () => {
    render(<CuriousPeeker pathname="/" />);

    // Tres ciclos completos: aparición, retirada y la siguiente aparición.
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      advanceToPeek(vuelta === 0 ? FIRST_WAIT : GAP);
      expect(screen.getAllByTestId('curious-peeker')).toHaveLength(1);
      advance(VISIBLE_FOR + 400);
      expect(screen.queryAllByTestId('curious-peeker')).toHaveLength(0);
    }
  });

  it('también se asoma en el carrito y en Rocky IA', () => {
    for (const pathname of ['/cart', '/rockyIA']) {
      const { unmount } = render(<CuriousPeeker pathname={pathname} />);
      advance(FIRST_WAIT);
      expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
      unmount();
    }
  });

  it('espacia más las apariciones en móvil', () => {
    stubMedia('(max-width: 640px)');
    render(<CuriousPeeker pathname="/" />);

    advance(8_499);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advance(1);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
  });

  it('no se monta durante el splash', () => {
    render(<CuriousPeeker pathname="/" disabled />);

    advance(60_000);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('desaparece con movimiento reducido', () => {
    stubMedia('(prefers-reduced-motion: reduce)');
    render(<CuriousPeeker pathname="/" />);

    advance(60_000);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('empieza de cero al cambiar de página', () => {
    const { rerender } = render(<CuriousPeeker pathname="/" />);

    advance(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();

    rerender(<CuriousPeeker pathname="/estudio" />);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advance(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
  });

  it('es decorativo y no captura interacciones', () => {
    render(<CuriousPeeker pathname="/" />);
    advance(FIRST_WAIT);

    const peeker = screen.getByTestId('curious-peeker');
    expect(peeker).toHaveAttribute('aria-hidden', 'true');
    expect(peeker.querySelector('img')).toHaveAttribute('alt', '');
    expect(peeker.querySelector('img')).toHaveAttribute('draggable', 'false');
  });

  it('sigue a su escondite al hacer scroll, y sólo entonces', () => {
    const escondite = plantarEscondite();
    render(<CuriousPeeker pathname="/" />);
    advanceToPeek(FIRST_WAIT);

    const peeker = screen.getByTestId('curious-peeker');
    expect(peeker).not.toHaveAttribute('data-spot', 'pantalla');
    const antes = peeker.style.transform;

    // El bloque sube 120 px, pero sin evento no hay motivo para recalcular.
    escondite.desplazar(-120);
    act(() => {
      vi.advanceTimersToNextFrame();
      vi.advanceTimersToNextFrame();
    });
    expect(peeker.style.transform).toBe(antes);

    // Con el scroll se recoloca, agrupado en un solo frame.
    act(() => {
      fireEvent.scroll(window);
      fireEvent.scroll(window);
    });
    expect(peeker.style.transform).toBe(antes);
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    const [, xAntes, yAntes] = antes.match(/translate3d\((-?\d+)px, (-?\d+)px/);
    const [, xDespues, yDespues] = peeker.style.transform.match(
      /translate3d\((-?\d+)px, (-?\d+)px/
    );
    expect(Number(xDespues)).toBe(Number(xAntes));
    expect(Number(yDespues)).toBe(Number(yAntes) - 120);
  });

  it('se mete dentro cuando su escondite se va de pantalla', () => {
    const escondite = plantarEscondite();
    render(<CuriousPeeker pathname="/" />);
    advanceToPeek(FIRST_WAIT);
    const peeker = screen.getByTestId('curious-peeker');
    expect(peeker).toHaveAttribute('data-beat', 'sale');

    escondite.desplazar(-2_000);
    act(() => {
      fireEvent.scroll(window);
      vi.advanceTimersToNextFrame();
    });
    expect(peeker).toHaveAttribute('data-beat', 'escapa');
  });
});
