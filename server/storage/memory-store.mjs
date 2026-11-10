import { createSerialQueue } from '../lib/serial-queue.mjs';
import { DURABILITIES } from './encrypted-file-store.mjs';
import { clone, emptyState, pruneExpiredRecords, readRecord } from './records.mjs';

// La misma validación que el almacén cifrado: un valor mal escrito tiene que
// fallar en las pruebas, no en producción.
function checkDurability({ durability = 'confirmed' } = {}) {
  if (!DURABILITIES.has(durability)) {
    throw new Error(`durability desconocida: ${durability}. Usa "confirmed" o "deferred".`);
  }
}

// Almacén en memoria: el que se usa sin APP_ENCRYPTION_KEY y en los tests.
// Misma interfaz que el cifrado; se pierde al reiniciar. Acepta la opción
// `durability` del cifrado y la ignora: aquí no hay disco al que esperar.
export class MemoryStore {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.state = emptyState();
    this.withLock = createSerialQueue();
  }

  async probe() {
    return true;
  }

  // No hay nada pendiente de volcar.
  async flush() {}

  async get(namespace, key) {
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      return clone(readRecord(this.state, namespace, key, this.clock())?.value ?? null);
    });
  }

  async set(namespace, key, value, options = {}) {
    checkDurability(options);
    const { expiresAt = null } = options;
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      this.state.namespaces[namespace] ??= {};
      this.state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      return clone(value);
    });
  }

  async delete(namespace, key, options) {
    checkDurability(options);
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      const existed = Boolean(this.state.namespaces[namespace]?.[key]);
      if (this.state.namespaces[namespace]) delete this.state.namespaces[namespace][key];
      return existed;
    });
  }

  async consume(namespace, key, options) {
    checkDurability(options);
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      const record = readRecord(this.state, namespace, key, this.clock());
      if (this.state.namespaces[namespace]) delete this.state.namespaces[namespace][key];
      return clone(record?.value ?? null);
    });
  }

  async setIfAbsent(namespace, key, value, options = {}) {
    checkDurability(options);
    const { expiresAt = null } = options;
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      const current = readRecord(this.state, namespace, key, this.clock());
      if (current) return { inserted: false, value: clone(current.value) };
      this.state.namespaces[namespace] ??= {};
      this.state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      return { inserted: true, value: clone(value) };
    });
  }
}
