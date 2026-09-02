import { createSerialQueue } from '../lib/serial-queue.mjs';
import { clone, emptyState, pruneExpiredRecords, readRecord } from './records.mjs';

// Almacén en memoria: el que se usa sin APP_ENCRYPTION_KEY y en los tests.
// Misma interfaz que el cifrado; se pierde al reiniciar.
export class MemoryStore {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.state = emptyState();
    this.withLock = createSerialQueue();
  }

  async probe() {
    return true;
  }

  async get(namespace, key) {
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      return clone(readRecord(this.state, namespace, key, this.clock())?.value ?? null);
    });
  }

  async set(namespace, key, value, { expiresAt = null } = {}) {
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      this.state.namespaces[namespace] ??= {};
      this.state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      return clone(value);
    });
  }

  async delete(namespace, key) {
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      const existed = Boolean(this.state.namespaces[namespace]?.[key]);
      if (this.state.namespaces[namespace]) delete this.state.namespaces[namespace][key];
      return existed;
    });
  }

  async consume(namespace, key) {
    return this.withLock(() => {
      pruneExpiredRecords(this.state, this.clock());
      const record = readRecord(this.state, namespace, key, this.clock());
      if (this.state.namespaces[namespace]) delete this.state.namespaces[namespace][key];
      return clone(record?.value ?? null);
    });
  }

  async setIfAbsent(namespace, key, value, { expiresAt = null } = {}) {
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
