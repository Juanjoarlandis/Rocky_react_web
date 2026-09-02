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

  it('useLockBodyScroll bloquea el scroll y devuelve el valor anterior', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
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
