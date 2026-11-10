import { EncryptedFileStore } from './encrypted-file-store.mjs';
import { MemoryStore } from './memory-store.mjs';

// Con clave, el estado va cifrado a disco; sin ella, se queda en memoria.
export function createStateStore(storageConfig, { logger = null } = {}) {
  return storageConfig.hasStateStore
    ? new EncryptedFileStore({
        filePath: storageConfig.stateStorePath,
        key: storageConfig.encryptionKey,
        // Para el volcado diferido que falla sin nadie esperándolo.
        logger,
      })
    : new MemoryStore();
}
