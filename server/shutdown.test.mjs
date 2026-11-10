import { describe, expect, it, vi } from 'vitest';
import { closeGracefully } from './shutdown.mjs';

function setup({ closeError = null, wallError = null, storeError = null } = {}) {
  const steps = [];
  const server = {
    close: vi.fn((done) => {
      steps.push('cerrar');
      done(closeError);
    }),
  };
  const pared = {
    volcar: vi.fn(async () => {
      steps.push('volcar la pared');
      if (wallError) throw wallError;
    }),
  };
  const store = {
    flush: vi.fn(async () => {
      steps.push('volcar el almacén');
      if (storeError) throw storeError;
    }),
  };
  const logger = { info: vi.fn(), error: vi.fn() };
  return { steps, server, pared, store, logger };
}

describe('apagado ordenado', () => {
  it('cierra el servidor, vuelca la pared y el almacén, y sale con 0', async () => {
    const { steps, server, pared, store, logger } = setup();

    await expect(closeGracefully({ server, pared, store, logger })).resolves.toBe(0);

    expect(steps).toEqual(['cerrar', 'volcar la pared', 'volcar el almacén']);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('si el volcado del almacén falla lo registra y sale con 1', async () => {
    const { steps, server, pared, store, logger } = setup({ storeError: new Error('disco lleno') });

    await expect(closeGracefully({ server, pared, store, logger })).resolves.toBe(1);

    expect(steps).toEqual(['cerrar', 'volcar la pared', 'volcar el almacén']);
    expect(logger.error).toHaveBeenCalledWith('State store flush failed', expect.any(Object));
  });

  it('si falla el volcado de la pared, el almacén se vuelca igual', async () => {
    const { steps, server, pared, store, logger } = setup({ wallError: new Error('sin sitio') });

    await expect(closeGracefully({ server, pared, store, logger })).resolves.toBe(1);

    expect(steps).toEqual(['cerrar', 'volcar la pared', 'volcar el almacén']);
    expect(logger.error).toHaveBeenCalledWith('Wall flush failed', expect.any(Object));
  });

  it('funciona sin pared y con un almacén sin flush', async () => {
    const { server, logger } = setup();

    await expect(closeGracefully({ server, pared: null, store: {}, logger })).resolves.toBe(0);
  });

  it('un error al cerrar el servidor también acaba en 1, después de volcar', async () => {
    const { steps, server, pared, store, logger } = setup({ closeError: new Error('ya cerrado') });

    await expect(closeGracefully({ server, pared, store, logger })).resolves.toBe(1);
    expect(steps).toHaveLength(3);
  });
});
