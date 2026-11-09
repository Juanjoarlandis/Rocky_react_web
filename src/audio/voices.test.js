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
    // Entra desde casi cero en 5 ms y sale a casi cero al final: sin chasquidos.
    expect(gain.gain.calls[0]).toEqual(['setValueAtTime', 0.0001, 2]);
    expect(gain.gain.calls).toContainEqual(['linearRampToValueAtTime', 1, 2.005]);
    expect(gain.gain.calls.at(-1)).toEqual(['linearRampToValueAtTime', 0.0001, 2.8]);
    expect(source.stoppedAt).toBeCloseTo(2 + 0.8, 5);
  });

  it('repetir el mismo pad corta el anterior; pads distintos se superponen', () => {
    const e = engine();
    triggerVoice(e, 'corte', 1, { buffer: tramo(e), out: e.padBus, choke: 'barro-01' });
    const primero = e.chokes.get('barro-01');
    const antesDeOtro = primero.gain.calls.length;
    triggerVoice(e, 'corte', 1.2, { buffer: tramo(e), out: e.padBus, choke: 'barro-02' });
    expect(e.chokes.get('barro-01')).toBe(primero);
    // Un pad distinto no lo toca: se superponen.
    expect(primero.gain.calls.length).toBe(antesDeOtro);
    const antes = primero.gain.calls.length;
    triggerVoice(e, 'corte', 1.4, { buffer: tramo(e), out: e.padBus, choke: 'barro-01' });
    expect(e.chokes.get('barro-01')).not.toBe(primero);
    // El anterior se corta justo cuando entra el nuevo, no cuando acababa.
    const corte = primero.gain.calls.slice(antes);
    expect(corte).toContainEqual(['cancelScheduledValues', 1.4]);
    expect(corte).toContainEqual(['setTargetAtTime', 0.0001, 1.4, 0.006]);
  });

  it('sin tramo cargado no suena ni rompe', () => {
    const e = engine();
    expect(() => triggerVoice(e, 'corte', 1, { out: e.padBus })).not.toThrow();
    expect(e.ctx.started).toHaveLength(0);
  });
});
