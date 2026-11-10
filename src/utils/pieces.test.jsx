import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lazyPiece, preloadPieces, usePiecesReady } from './pieces.jsx';
import { installPreloadRecovery } from '../preloadRecovery.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('pieza opcional cargada aparte', () => {
  it('no pinta nada mientras llega y luego pinta la pieza con sus props', async () => {
    const Piece = lazyPiece(async () => ({ default: ({ name }) => <p>Hola, {name}</p> }));

    render(
      <>
        <h1>Página</h1>
        <Piece name="crew" />
      </>
    );

    expect(screen.getByRole('heading', { name: 'Página' })).toBeInTheDocument();
    expect(await screen.findByText('Hola, crew')).toBeInTheDocument();
  });

  it('si su chunk no llega se descarta y la página sigue en pie', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Piece = lazyPiece(() => Promise.reject(new Error('chunk caducado')));

    render(
      <>
        <h1>Página</h1>
        <Piece />
      </>
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Página' })).toBeInTheDocument();
    error.mockRestore();
  });

  it('se puede pedir por adelantado sin pintarla, y un fallo no revienta', async () => {
    const load = vi.fn(async () => ({ default: () => null }));
    const Piece = lazyPiece(load);
    const Broken = lazyPiece(() => Promise.reject(new Error('sin red')));

    await expect(Piece.preload()).resolves.toBeUndefined();
    await expect(Broken.preload()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('pieza opcional y la recarga por chunk caducado', () => {
  it('si su chunk falla como lo hace Vite, la página no se recarga y sigue en pie', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.clear();
    const reload = vi.fn();
    const uninstall = installPreloadRecovery({
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
      sessionStorage,
      location: { reload },
    });
    // Vite avisa con un evento cancelable y, si nadie lo cancela, rechaza el import
    const Piece = lazyPiece(() => {
      const event = new Event('vite:preloadError', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented
        ? Promise.resolve({ default: () => <p>No debería pintarse</p> })
        : Promise.reject(new Error('chunk caducado'));
    });

    try {
      render(
        <>
          <h1>Página</h1>
          <Piece />
        </>
      );
      await act(async () => {});

      expect(reload).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Página' })).toBeInTheDocument();
      expect(screen.queryByText('No debería pintarse')).not.toBeInTheDocument();
    } finally {
      uninstall();
      error.mockRestore();
    }
  });
});

describe('precarga en reposo', () => {
  it('pide el chunk de cada pieza sin montarla, salvo las que se guardan para su momento', async () => {
    const loaded = [];
    const piece = (name) => async () => {
      loaded.push(name);
      return { default: () => null };
    };
    lazyPiece(piece('lightbox'));
    lazyPiece(piece('estampida'));
    lazyPiece(piece('spray'), { idle: false });

    await preloadPieces();

    expect(loaded).toEqual(expect.arrayContaining(['lightbox', 'estampida']));
    expect(loaded).not.toContain('spray');
  });

  it('una pieza que no llega no rompe la precarga de las demás', async () => {
    const loaded = [];
    lazyPiece(() => Promise.reject(new Error('sin red')));
    lazyPiece(async () => {
      loaded.push('otra');
      return { default: () => null };
    });

    await expect(preloadPieces()).resolves.toBeUndefined();
    expect(loaded).toContain('otra');
  });
});

describe('cuándo se montan las piezas opcionales', () => {
  function Probe() {
    return <output>{usePiecesReady() ? 'listas' : 'en espera'}</output>;
  }

  it('esperan a que la página esté en reposo', () => {
    const idle = [];
    vi.stubGlobal('requestIdleCallback', (callback) => idle.push(callback));
    vi.stubGlobal('cancelIdleCallback', () => {});
    render(<Probe />);
    expect(screen.getByText('en espera')).toBeInTheDocument();

    act(() => idle.forEach((callback) => callback()));

    expect(screen.getByText('listas')).toBeInTheDocument();
  });

  it.each(['pointerdown', 'keydown', 'focusin', 'touchstart', 'click'])(
    'no esperan si antes hay un gesto (%s)',
    (type) => {
      vi.stubGlobal('requestIdleCallback', () => 1);
      vi.stubGlobal('cancelIdleCallback', () => {});
      render(<Probe />);

      fireEvent(window, new Event(type, { bubbles: true }));

      expect(screen.getByText('listas')).toBeInTheDocument();
    }
  );

  it('mientras la página espera sus datos no cuentan el reposo, pero un gesto las adelanta', () => {
    function Held({ hold }) {
      return <output>{usePiecesReady({ hold }) ? 'listas' : 'en espera'}</output>;
    }
    const idle = [];
    vi.stubGlobal('requestIdleCallback', (callback) => idle.push(callback));
    vi.stubGlobal('cancelIdleCallback', () => {});
    const { rerender, unmount } = render(<Held hold />);
    // Esperando al catálogo la red está ocupada aunque el hilo esté libre
    expect(idle).toHaveLength(0);

    rerender(<Held hold={false} />);
    expect(idle).toHaveLength(1);
    act(() => idle[0]());
    expect(screen.getByText('listas')).toBeInTheDocument();
    unmount();

    render(<Held hold />);
    fireEvent(window, new Event('pointerdown', { bubbles: true }));
    expect(screen.getByText('listas')).toBeInTheDocument();
  });

  it('sin requestIdleCallback usan un temporizador', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    render(<Probe />);
    expect(screen.getByText('en espera')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('listas')).toBeInTheDocument();
  });
});
