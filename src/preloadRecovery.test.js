import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPreloadRecoveryGuardAfterBoot, recoverFromPreloadError } from './preloadRecovery.js';

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
});
