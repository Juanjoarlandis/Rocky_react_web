import { EncryptedFileStore } from './encrypted-file-store.mjs';
import { MemoryStore } from './memory-store.mjs';

// Con clave, el estado va cifrado a disco; sin ella, se queda en memoria.
export function createStateStore(storageConfig) {
  return storageConfig.hasStateStore
    ? new EncryptedFileStore({
        filePath: storageConfig.stateStorePath,
        key: storageConfig.encryptionKey,
      })
    : new MemoryStore();
}
