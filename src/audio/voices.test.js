import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeAudioContext } from './fakeAudioContext.js';
import { createEngine } from './engine.js';
import { VOICE_NAMES, triggerVoice } from './voices.js';

function engine() {
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return createEngine();
}

const tramo = (e, segundos = 1) => e.ctx.createBuffer(2, Math.round(segundos * 48_000), 48_000);

describe('la voz «corte» (los cortes de BARRO)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('es una voz conocida', () => {
    expect(VOICE_NAMES).toContain('corte');
  });

  it('toca el tramo desde su inicio por el bus de pads, con rampas que evitan clics', () => {
    const e = engine();
    const buffer = tramo(e, 0.8);
    triggerVoice(e, 'corte', 2, { buffer, out: e.padBus, choke: 'barro-01' });
    const [{ source, when, offset }] = e.ctx.started;
    expect(source.buffer).toBe(buffer);
    expect(when).toBe(2);
    expect(offset).toBe(0);
    const gain = source.connections[0];
    expect(gain.connections).toContain(e.padBus);
    // Sube de casi cero y baja a casi cero al final: sin chasquidos.
    expect(gain.gain.value).toBeLessThan(0.01);
    expect(source.stoppedAt).toBeCloseTo(2 + 0.8, 5);
  });

  it('repetir el mismo pad corta el anterior; pads distintos se superponen', () => {
    const e = engine();
    triggerVoice(e, 'corte', 1, { buffer: tramo(e), out: e.padBus, choke: 'barro-01' });
    const primero = e.chokes.get('barro-01');
    triggerVoice(e, 'corte', 1.2, { buffer: tramo(e), out: e.padBus, choke: 'barro-02' });
    expect(e.chokes.get('barro-01')).toBe(primero);
    triggerVoice(e, 'corte', 1.4, { buffer: tramo(e), out: e.padBus, choke: 'barro-01' });
    expect(e.chokes.get('barro-01')).not.toBe(primero);
    expect(primero.gain.value).toBeLessThan(0.01);
  });

  it('sin tramo cargado no suena ni rompe', () => {
    const e = engine();
    expect(() => triggerVoice(e, 'corte', 1, { out: e.padBus })).not.toThrow();
    expect(e.ctx.started).toHaveLength(0);
  });
});
