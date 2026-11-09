import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWallConfig } from './pared.mjs';

const storage = { stateStorePath: '/var/lib/rocky035/rocky-state.enc', encryptionKey: 'k' };

describe('configuración de la pared compartida', () => {
  it('sin configurar está apagada (se deniega por defecto)', () => {
    expect(createWallConfig({}, storage).enabled).toBe(false);
  });

  it('se enciende solo con SHARED_WALL_ENABLED=true y no admite otros valores', () => {
    expect(createWallConfig({ SHARED_WALL_ENABLED: 'true' }, storage).enabled).toBe(true);
    expect(createWallConfig({ SHARED_WALL_ENABLED: 'false' }, storage).enabled).toBe(false);
    expect(() => createWallConfig({ SHARED_WALL_ENABLED: 'si' }, storage)).toThrow();
  });

  it('el fichero va junto al estado salvo que se diga otra ruta', () => {
    expect(createWallConfig({}, storage).filePath).toBe('/var/lib/rocky035/pared.enc');
    expect(createWallConfig({ SHARED_WALL_PATH: '/srv/pared.enc' }, storage).filePath).toBe(
      path.resolve('/srv/pared.enc')
    );
    expect(createWallConfig({}, storage).key).toBe('k');
  });

  it('no admite el mismo fichero que el estado: se pisarían', () => {
    expect(() =>
      createWallConfig({ SHARED_WALL_PATH: '/var/lib/rocky035/rocky-state.enc' }, storage)
    ).toThrow(/SHARED_WALL_PATH/);
  });
});
