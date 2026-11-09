import { describe, expect, it } from 'vitest';
import { createAttemptTracker } from './attempt-tracker.mjs';

describe('contador de intentos por cliente', () => {
  function tracker(options = {}) {
    let now = 1_000_000;
    const t = createAttemptTracker({
      limit: 5,
      windowMs: 15 * 60_000,
      clock: () => now,
      ...options,
    });
    return { t, advance: (ms) => (now += ms) };
  }

  it('deja pasar cinco intentos y limita el sexto con su espera', () => {
    const { t } = tracker();
    for (let i = 0; i < 5; i += 1) expect(t.consume('ip').isLimited).toBe(false);
    const sixth = t.consume('ip');
    expect(sixth.isLimited).toBe(true);
    expect(sixth.retryAfterSeconds).toBe(15 * 60);
  });

  it('cada cliente lleva su cuenta', () => {
    const { t } = tracker();
    for (let i = 0; i < 6; i += 1) t.consume('a');
    expect(t.consume('b').isLimited).toBe(false);
  });

  it('la ventana caduca y vuelve a empezar', () => {
    const { t, advance } = tracker();
    for (let i = 0; i < 6; i += 1) t.consume('ip');
    advance(15 * 60_000);
    expect(t.consume('ip').isLimited).toBe(false);
  });

  it('borrar a un cliente le devuelve sus intentos', () => {
    const { t } = tracker();
    for (let i = 0; i < 5; i += 1) t.consume('ip');
    t.clear('ip');
    expect(t.consume('ip').isLimited).toBe(false);
  });

  it('no crece sin límite: expulsa al más antiguo', () => {
    const { t } = tracker({ maxClients: 2 });
    for (let i = 0; i < 6; i += 1) t.consume('viejo');
    t.consume('b');
    t.consume('c');
    expect(t.size()).toBe(2);
    expect(t.consume('viejo').isLimited).toBe(false);
  });
});
