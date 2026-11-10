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

/* Un solo AudioContext para todo el estudio (H-118): la mesa y el ranking
   tienen cada uno su motor, pero comparten contexto. */
describe('contexto de audio compartido', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup() {
    const created = [];
    vi.stubGlobal(
      'AudioContext',
      class extends FakeAudioContext {
        constructor() {
          super();
          created.push(this);
        }
      }
    );
    return created;
  }

  it('dos motores a la vez comparten el mismo contexto', () => {
    const created = setup();
    const mesa = createEngine();
    const ranking = createEngine();

    expect(created).toHaveLength(1);
    expect(ranking.ctx).toBe(mesa.ctx);
    mesa.close();
    ranking.close();
  });

  it('el contexto sigue abierto mientras lo use alguien y se cierra con el último', () => {
    setup();
    const mesa = createEngine();
    const ranking = createEngine();

    ranking.close();
    expect(mesa.ctx.state).toBe('running');
    mesa.close();
    expect(mesa.ctx.state).toBe('closed');
  });

  it('cerrar dos veces el mismo motor no cierra el contexto de otro', () => {
    setup();
    const mesa = createEngine();
    const ranking = createEngine();

    ranking.close();
    ranking.close();

    expect(mesa.ctx.state).toBe('running');
    mesa.close();
  });

  it('tras cerrarse del todo, el siguiente motor estrena contexto', () => {
    const created = setup();
    createEngine().close();

    const next = createEngine();

    expect(created).toHaveLength(2);
    expect(next.ctx.state).toBe('running');
    next.close();
  });

  it('al soltarlo, un motor deja de sonar aunque el contexto siga abierto', () => {
    setup();
    const mesa = createEngine();
    const ranking = createEngine();
    const disconnect = vi.spyOn(ranking.analyser, 'disconnect');

    ranking.close();

    expect(disconnect).toHaveBeenCalled();
    mesa.close();
  });
});
