import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCopyToClipboard } from './useCopyToClipboard.js';
import { useDocumentTitle } from './useDocumentTitle.js';
import { useLockBodyScroll } from './useLockBodyScroll.js';
import { useRevealOnScroll } from './useRevealOnScroll.js';

describe('hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.title = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('useDocumentTitle pone «Página · ROCKY 035» y lo restaura al desmontar', () => {
    document.title = 'antes';
    const { unmount, rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Drops' },
    });
    expect(document.title).toBe('Drops · ROCKY 035');
    rerender({ title: '' });
    expect(document.title).toBe('ROCKY 035');
    unmount();
    expect(document.title).toBe('antes');
  });

  /* Quien desplaza la página es <html> (H-010): bloquear el body no para nada
     y lo convierte en contenedor de scroll, al que se pega la barra sticky. */
  it('useLockBodyScroll bloquea el <html>, no toca el body y devuelve los valores anteriores', () => {
    const html = document.documentElement;
    html.style.overflow = 'auto';
    document.body.style.overflow = 'visible';
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(html.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('visible');
    unmount();
    expect(html.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('visible');
  });

  it('useLockBodyScroll con capas solapadas solo libera al soltar la última', () => {
    const html = document.documentElement;
    const primera = renderHook(() => useLockBodyScroll(true));
    const segunda = renderHook(({ on }) => useLockBodyScroll(on), { initialProps: { on: true } });
    // Se cierra antes la que se abrió primero: la otra sigue tapando la página.
    primera.unmount();
    expect(html.style.overflow).toBe('hidden');
    segunda.rerender({ on: false });
    expect(html.style.overflow).toBe('');
    segunda.unmount();
    expect(html.style.overflow).toBe('');
  });

  it('useLockBodyScroll guarda el hueco de la barra solo si la había', () => {
    const html = document.documentElement;
    // Con barra clásica (viewport más ancho que el contenido): se guarda su hueco.
    vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(window.innerWidth - 15);
    const conBarra = renderHook(() => useLockBodyScroll(true));
    expect(html.style.getPropertyValue('scrollbar-gutter')).toBe('stable');
    conBarra.unmount();
    expect(html.style.getPropertyValue('scrollbar-gutter')).toBe('');

    // Sin barra (móvil o página corta): no se reserva nada.
    vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(window.innerWidth);
    const sinBarra = renderHook(() => useLockBodyScroll(true));
    expect(html.style.overflow).toBe('hidden');
    expect(html.style.getPropertyValue('scrollbar-gutter')).toBe('');
    sinBarra.unmount();
  });

  it('useLockBodyScroll en falso no toca nada', () => {
    const { unmount } = renderHook(() => useLockBodyScroll(false));
    expect(document.documentElement.style.overflow).toBe('');
    unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('useCopyToClipboard copia, avisa un rato y devuelve false sin portapapeles', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { result } = renderHook(() => useCopyToClipboard({ resetAfterMs: 100 }));
    let ok;
    await act(async () => {
      ok = await result.current.copy('https://rocky035.com/crew#ollie');
    });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://rocky035.com/crew#ollie');
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(120));
    expect(result.current.copied).toBe(false);
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    await act(async () => {
      ok = await result.current.copy('x');
    });
    expect(ok).toBe(false);
  });

  it('useRevealOnScroll revela lo que entra en pantalla y cuenta todo como visto sin IntersectionObserver', () => {
    let callback;
    const observed = [];
    const original = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(cb) {
        callback = cb;
      }
      observe(el) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {}
    };
    function Album() {
      const ref = useRef(null);
      const { revealed, animated } = useRevealOnScroll(ref);
      return (
        <div ref={ref}>
          {['a', 'b'].map((id) => (
            <span key={id} data-reveal-id={id} data-testid={id}>
              {animated ? (revealed.has(id) ? 'visible' : 'oculto') : 'estático'}
            </span>
          ))}
        </div>
      );
    }
    render(<Album />);
    expect(observed).toHaveLength(2);
    expect(screen.getByTestId('a')).toHaveTextContent('oculto');
    act(() => callback([{ isIntersecting: true, target: observed[0] }]));
    expect(screen.getByTestId('a')).toHaveTextContent('visible');
    expect(screen.getByTestId('b')).toHaveTextContent('oculto');

    window.IntersectionObserver = undefined;
    render(<Album />);
    expect(screen.getAllByText('estático')).toHaveLength(2);
    window.IntersectionObserver = original;
  });
});
