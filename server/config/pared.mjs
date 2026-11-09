import path from 'node:path';
import { readBooleanFlag } from './env.mjs';

// La pared compartida del modo neón (design.md D6): apagada si no se dice lo
// contrario, con su propio fichero cifrado junto al estado.
export function createWallConfig(env, storageConfig) {
  const filePath = path.resolve(
    env.SHARED_WALL_PATH || path.join(path.dirname(storageConfig.stateStorePath), 'pared.enc')
  );
  // Con la misma clave y el mismo fichero, la pared y el estado se pisarían.
  if (filePath === path.resolve(storageConfig.stateStorePath)) {
    throw new Error('SHARED_WALL_PATH no puede ser el mismo fichero que STATE_STORE_PATH.');
  }
  return {
    enabled: readBooleanFlag(env.SHARED_WALL_ENABLED, false, 'SHARED_WALL_ENABLED'),
    filePath,
    key: storageConfig.encryptionKey,
  };
}
