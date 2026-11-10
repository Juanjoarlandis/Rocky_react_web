import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeAudioContext } from '../../../audio/fakeAudioContext.js';
import { olvidarAudio, traquetear } from './rattle.js';

describe('El traqueteo del bote', () => {
  afterEach(() => {
    olvidarAudio();
    vi.unstubAllGlobals();
  });

  it('sin audio en el navegador no hace nada ni falla', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    expect(() => traquetear()).not.toThrow();
  });

  it('si el audio revienta, se lo calla', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('sin permiso');
        }
      }
    );
    expect(() => traquetear()).not.toThrow();
  });

  it('con audio suena corto y bajo: unas pocas ráfagas de ruido filtrado en menos de medio segundo', () => {
    const creados = [];
    vi.stubGlobal(
      'AudioContext',
      class extends FakeAudioContext {
        constructor() {
          super();
          creados.push(this);
        }
      }
    );
    traquetear();
    expect(creados).toHaveLength(1);
    const [ctx] = creados;
    expect(ctx.started.length).toBeGreaterThanOrEqual(2);
    expect(ctx.started.length).toBeLessThanOrEqual(4);
    expect(Math.max(...ctx.started.map((golpe) => golpe.when))).toBeLessThan(0.5);
    const ganancias = ctx.nodes.filter((nodo) => nodo.kind === 'gain');
    expect(ganancias.length).toBeGreaterThan(0);
    for (const ganancia of ganancias) expect(ganancia.gain.value).toBeLessThanOrEqual(0.12);
    // Todo acaba en la salida a través de un filtro
    expect(ctx.nodes.some((nodo) => nodo.kind === 'biquad')).toBe(true);
    // El mismo contexto se reutiliza: no se abre uno por traqueteo
    traquetear();
    expect(creados).toHaveLength(1);
  });
});
