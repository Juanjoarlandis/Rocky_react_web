import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StreetWall, { DISPARO_MS } from './StreetWall.jsx';

/* Con Math.random clavado en 0,5, los intervalos del componente dejan de ser
   una horquilla y caen siempre en su punto medio: la primera foto a los
   2.100 ms de encuadrar y las siguientes cada 12.500 ms. Sin clavarlo, el
   flash podría dispararse Y recogerse dentro de un mismo avance de timers. */
const PRIMERA_MEDIA = 2_100;
const ENTRE_MEDIA = 12_500;
// Para los tests de "no sale nadie": más allá de cualquier intervalo posible.
const ENTRE_MAX = 16_000;

let observers;

/* jsdom no trae IntersectionObserver: este doble apunta lo que observa y deja
   encuadrar y desencuadrar al fotógrafo a mano desde cada test. */
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

function renderWall() {
  return render(
    <MemoryRouter>
      <StreetWall />
    </MemoryRouter>
  );
}

function observerWatching(className) {
  return observers.find((observer) =>
    observer.observed.some((target) => target.classList.contains(className))
  );
}

function encuadra(visible) {
  const observer = observerWatching('street-photographer');
  act(() => {
    observer.callback([{ isIntersecting: visible }], observer);
  });
}

function acercaElMuro() {
  const observer = observerWatching('street-wall-grid');
  act(() => {
    observer.callback([{ isIntersecting: true }], observer);
  });
}

function wallImages(container) {
  return [...container.querySelectorAll('.street-photo img')];
}

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('StreetWall: el disparo del Paparazzi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    observers = [];
    vi.stubGlobal('IntersectionObserver', ObserverFalso);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('separa la vigilancia del fotógrafo de la carga de las fotos', () => {
    renderWall();

    expect(observers).toHaveLength(2);

    const paparazzi = observerWatching('street-photographer');
    expect(paparazzi.observed).toHaveLength(1);
    expect(paparazzi.options).toEqual({ threshold: 0.6 });

    const recursos = observerWatching('street-wall-grid');
    expect(recursos.observed).toHaveLength(1);
    expect(recursos.options).toEqual({
      rootMargin: '400px 0px',
      threshold: 0,
    });
  });

  it('no solicita las fotos del muro durante la carga inicial', () => {
    const { container } = renderWall();

    for (const image of wallImages(container)) {
      expect(image).not.toHaveAttribute('src');
      expect(image).toHaveAttribute('alt', '');
    }
  });

  it('solicita las fotos al acercarse y deja de observar', () => {
    const { container } = renderWall();
    acercaElMuro();

    const images = wallImages(container);
    expect(images[0]).toHaveAttribute('src', '/products/rockydz-boyz.webp');
    expect(images[1]).toHaveAttribute('src', '/products/rocky-racing.webp');
    expect(images[2]).toHaveAttribute('src', '/products/rocky35-camel.webp');
    expect(images.every((image) => image.getAttribute('alt'))).toBe(true);
    expect(observerWatching('street-wall-grid').disconnected).toBe(true);
  });

  it('carga las fotos normalmente si IntersectionObserver no existe', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = renderWall();

    expect(wallImages(container).every((image) => image.getAttribute('src'))).toBe(true);
  });

  it('no dispara mientras el muro no está a tiro', () => {
    renderWall();

    advance(ENTRE_MAX);
    expect(screen.queryByTestId('paparazzi-flash')).toBeNull();
  });

  it('te saca la foto al poco de llegar y el flash se recoge solo', () => {
    renderWall();
    encuadra(true);
    advance(PRIMERA_MEDIA);

    expect(screen.getByTestId('paparazzi-flash')).toBeInTheDocument();
    expect(screen.getByTestId('paparazzi-fogonazo')).toBeInTheDocument();

    advance(DISPARO_MS);
    expect(screen.queryByTestId('paparazzi-flash')).toBeNull();
    expect(screen.queryByTestId('paparazzi-fogonazo')).toBeNull();
  });

  it('si te quedas mirando repite, pero sin ametrallar', () => {
    renderWall();
    encuadra(true);
    advance(PRIMERA_MEDIA + DISPARO_MS);
    expect(screen.queryByTestId('paparazzi-flash')).toBeNull();

    // La siguiente cae ENTRE_MEDIA después del disparo anterior.
    advance(ENTRE_MEDIA - DISPARO_MS);
    expect(screen.getByTestId('paparazzi-flash')).toBeInTheDocument();
  });

  it('el fogonazo nace en el objetivo de la cámara, no en el centro', () => {
    renderWall();
    const figura = observerWatching('street-photographer').observed[0];
    figura.getBoundingClientRect = () => ({
      left: 1000,
      top: 300,
      width: 100,
      height: 150,
      right: 1100,
      bottom: 450,
    });

    encuadra(true);
    advance(PRIMERA_MEDIA);

    // El objetivo cae al 35% del ancho y al 40% del alto del encuadre.
    const fogonazo = screen.getByTestId('paparazzi-fogonazo');
    expect(fogonazo.style.getPropertyValue('--flash-x')).toBe('1035px');
    expect(fogonazo.style.getPropertyValue('--flash-y')).toBe('360px');
  });

  it('al sacar el muro de cuadro se corta la sesión', () => {
    renderWall();
    encuadra(true);
    encuadra(false);

    advance(ENTRE_MAX);
    expect(screen.queryByTestId('paparazzi-flash')).toBeNull();
  });

  it('si el navegador agrupa salir-y-entrar en un aviso, vale el último', () => {
    renderWall();
    // Un scroll rápido puede llegar como dos cruces en la misma llamada.
    act(() => {
      const observer = observerWatching('street-photographer');
      observer.callback(
        [{ isIntersecting: false }, { isIntersecting: true }],
        observer
      );
    });

    advance(PRIMERA_MEDIA);
    expect(screen.getByTestId('paparazzi-flash')).toBeInTheDocument();
  });

  it('con el movimiento reducido no hay sesión de fotos', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }))
    );

    renderWall();

    // El paparazzi se apaga, pero las fotos del muro siguen cargando cerca.
    expect(observerWatching('street-photographer')).toBeUndefined();
    expect(observerWatching('street-wall-grid')).toBeDefined();
    advance(ENTRE_MAX);
    expect(screen.queryByTestId('paparazzi-flash')).toBeNull();
  });

  it('al desmontar recoge el observador y los timers', () => {
    const { unmount } = renderWall();
    encuadra(true);
    unmount();

    expect(observers.every((observer) => observer.disconnected)).toBe(true);
    // Si quedara un timer vivo dispararía sobre un componente desmontado.
    expect(vi.getTimerCount()).toBe(0);
  });
});
