import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeAudioContext } from './fakeAudioContext.js';
import { TRACK_IDS, createEngine } from './engine.js';

describe('motor de la mesa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function engine() {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    return createEngine();
  }

  it('cada bus de pista tiene su analizador en derivación, sin dejar de ir a la mezcla', () => {
    const e = engine();
    for (const id of TRACK_IDS) {
      const bus = e.buses[id];
      const kinds = bus.connections.map((target) => target.kind);
      // A la mezcla (ganancia) y a un analizador que no sale a ningún sitio.
      expect(bus.connections).toContain(e.mix);
      expect(kinds).toContain('analyser');
      const meter = bus.connections.find((target) => target.kind === 'analyser');
      expect(meter.connections).toEqual([]);
      expect(meter.fftSize).toBe(1024);
    }
  });

  it('levels() da el nivel de cada pista en el orden de las pistas', () => {
    const e = engine();
    const meters = TRACK_IDS.map((id) =>
      e.buses[id].connections.find((target) => target.kind === 'analyser')
    );
    meters.forEach((meter, index) => {
      meter.signal = index === 1 ? 0.2 : 0;
    });
    const levels = e.levels();
    expect(levels).toHaveLength(TRACK_IDS.length);
    expect(levels[0]).toBe(0);
    expect(levels[1]).toBeGreaterThan(0);
    expect(levels[1]).toBeLessThanOrEqual(1);
  });

  it('el nivel de pista es el pico de la ventana, no la media', () => {
    const e = engine();
    const meter = e.buses.caja.connections.find((target) => target.kind === 'analyser');
    // Un golpe corto: casi toda la ventana en silencio y un pico de 0,5.
    meter.getFloatTimeDomainData = (data) => {
      data.fill(0);
      data[10] = 0.5;
    };
    expect(e.levels()[1]).toBeGreaterThan(0.5);
  });

  it('el nivel no pasa de 1 aunque la señal sature', () => {
    const e = engine();
    e.buses.bombo.connections.find((target) => target.kind === 'analyser').signal = 1;
    expect(e.levels()[0]).toBe(1);
  });
});
