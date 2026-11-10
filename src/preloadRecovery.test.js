import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  asOptionalLoad,
  clearPreloadRecoveryGuardAfterBoot,
  recoverFromPreloadError,
} from './preloadRecovery.js';

describe('stale Vite chunk recovery', () => {
  beforeEach(() => sessionStorage.clear());

  it('reloads once when a deployed lazy chunk no longer exists', () => {
    const event = { preventDefault: vi.fn() };
    const reload = vi.fn();

    recoverFromPreloadError(event, { storage: sessionStorage, reload });
    recoverFromPreloadError(event, { storage: sessionStorage, reload });

    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the loop guard only after the new application has stayed booted', () => {
    sessionStorage.setItem('rocky-preload-reload', '1');
    const schedule = vi.fn();

    clearPreloadRecoveryGuardAfterBoot({ storage: sessionStorage, schedule });

    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 10_000);
    expect(sessionStorage.getItem('rocky-preload-reload')).toBe('1');

    schedule.mock.calls[0][0]();
    expect(sessionStorage.getItem('rocky-preload-reload')).toBeNull();
  });
  /* Las piezas opcionales (carga-y-estabilidad) se piden solas en reposo: si su
     chunk no llega, la página sigue sin ellas; recargarla, y más sin red,
     dejaría al visitante peor que antes. */
  it('does not reload while an optional chunk is the one loading', async () => {
    const event = { preventDefault: vi.fn() };
    const reload = vi.fn();
    let fail;
    const load = asOptionalLoad(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        })
    );
    const loading = load();

    expect(recoverFromPreloadError(event, { storage: sessionStorage, reload })).toBe(false);
    // Sin preventDefault el error sigue su camino y la pieza se descarta
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('rocky-preload-reload')).toBeNull();

    fail(new Error('chunk caducado'));
    await expect(loading).rejects.toThrow('chunk caducado');

    // Con la pieza ya resuelta, un chunk de ruta que falla sí recarga
    expect(recoverFromPreloadError(event, { storage: sessionStorage, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('an optional load passes its module through and stops counting when it settles', async () => {
    const reload = vi.fn();
    const load = asOptionalLoad(async () => ({ default: 'pieza' }));

    await expect(load()).resolves.toEqual({ default: 'pieza' });
    expect(
      recoverFromPreloadError({ preventDefault: vi.fn() }, { storage: sessionStorage, reload })
    ).toBe(true);
  });
});
