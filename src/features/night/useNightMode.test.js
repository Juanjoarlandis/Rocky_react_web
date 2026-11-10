import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNightMode } from './useNightMode.js';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe('useNightMode', () => {
  it('catorce suscriptores comparten un solo observador y todos se enteran del cambio', async () => {
    const RealObserver = window.MutationObserver;
    const created = [];
    vi.stubGlobal(
      'MutationObserver',
      class extends RealObserver {
        constructor(callback) {
          super(callback);
          created.push(this);
        }
      }
    );
    const hooks = Array.from({ length: 14 }, () => renderHook(() => useNightMode()));
    expect(hooks.map(({ result }) => result.current)).toEqual(Array(14).fill(false));

    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });

    expect(created).toHaveLength(1);
    expect(hooks.map(({ result }) => result.current)).toEqual(Array(14).fill(true));
  });

  it('al irse el último suscriptor deja de observar, y vuelve a hacerlo si llega otro', async () => {
    const RealObserver = window.MutationObserver;
    const disconnect = vi.fn();
    let created = 0;
    vi.stubGlobal(
      'MutationObserver',
      class extends RealObserver {
        constructor(callback) {
          super(callback);
          created += 1;
        }

        disconnect() {
          disconnect();
          super.disconnect();
        }
      }
    );
    const first = renderHook(() => useNightMode());
    const second = renderHook(() => useNightMode());
    first.unmount();
    expect(disconnect).not.toHaveBeenCalled();
    second.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);

    const third = renderHook(() => useNightMode());
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });

    expect(created).toBe(2);
    expect(third.result.current).toBe(true);
  });
});
