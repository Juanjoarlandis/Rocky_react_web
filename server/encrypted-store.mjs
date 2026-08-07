import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_VERSION = 1;
const ADDITIONAL_DATA = Buffer.from('rocky035-state-v1', 'utf8');

function decodeEncryptionKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('APP_ENCRYPTION_KEY debe ser una clave base64 de 32 bytes.');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY debe ser una clave base64 de 32 bytes.');
  }
  return key;
}

function emptyState() {
  return { version: FILE_VERSION, namespaces: {} };
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function isExpired(record, now) {
  return record?.expiresAt !== null && record?.expiresAt !== undefined && record.expiresAt <= now;
}

function readRecord(state, namespace, key, now) {
  const record = state.namespaces[namespace]?.[key];
  return !record || isExpired(record, now) ? null : record;
}

function pruneExpiredRecords(state, now) {
  for (const [namespace, records] of Object.entries(state.namespaces)) {
    for (const [key, record] of Object.entries(records)) {
      if (isExpired(record, now)) delete records[key];
    }
    if (Object.keys(records).length === 0) delete state.namespaces[namespace];
  }
}

export class MemoryStore {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.state = emptyState();
    this.queue = Promise.resolve();
  }

  withLock(action) {
    const result = this.queue.then(action, action);
    this.queue = result.catch(() => {});
    return result;
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

export class EncryptedStore {
  constructor({ filePath, key, clock = () => Date.now() }) {
    if (!filePath) throw new Error('El almacenamiento cifrado necesita una ruta.');
    this.filePath = filePath;
    this.key = decodeEncryptionKey(key);
    this.clock = clock;
    this.queue = Promise.resolve();
  }

  withLock(action) {
    const result = this.queue.then(action, action);
    this.queue = result.catch(() => {});
    return result;
  }

  async readState() {
    let serialized;
    try {
      serialized = await fs.readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return emptyState();
      throw error;
    }

    try {
      const envelope = JSON.parse(serialized);
      if (envelope.version !== FILE_VERSION) throw new Error('unsupported_version');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(envelope.iv, 'base64')
      );
      decipher.setAAD(ADDITIONAL_DATA);
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]);
      const state = JSON.parse(plaintext.toString('utf8'));
      if (state.version !== FILE_VERSION || typeof state.namespaces !== 'object') {
        throw new Error('invalid_state');
      }
      return state;
    } catch {
      throw new Error('No se pudo descifrar el estado local. Revisa APP_ENCRYPTION_KEY.');
    }
  }

  async writeState(state) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(ADDITIONAL_DATA);
    const plaintext = Buffer.from(JSON.stringify(state), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const envelope = JSON.stringify({
      version: FILE_VERSION,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    });

    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporaryPath, envelope, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporaryPath, this.filePath);
  }

  async get(namespace, key) {
    return this.withLock(async () => {
      const state = await this.readState();
      return clone(readRecord(state, namespace, key, this.clock())?.value ?? null);
    });
  }

  async set(namespace, key, value, { expiresAt = null } = {}) {
    return this.withLock(async () => {
      const state = await this.readState();
      pruneExpiredRecords(state, this.clock());
      state.namespaces[namespace] ??= {};
      state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      await this.writeState(state);
      return clone(value);
    });
  }

  async delete(namespace, key) {
    return this.withLock(async () => {
      const state = await this.readState();
      pruneExpiredRecords(state, this.clock());
      const existed = Boolean(state.namespaces[namespace]?.[key]);
      if (!existed) return false;
      delete state.namespaces[namespace][key];
      await this.writeState(state);
      return true;
    });
  }

  async consume(namespace, key) {
    return this.withLock(async () => {
      const state = await this.readState();
      pruneExpiredRecords(state, this.clock());
      const record = readRecord(state, namespace, key, this.clock());
      if (state.namespaces[namespace]?.[key]) {
        delete state.namespaces[namespace][key];
        await this.writeState(state);
      }
      return clone(record?.value ?? null);
    });
  }

  async setIfAbsent(namespace, key, value, { expiresAt = null } = {}) {
    return this.withLock(async () => {
      const state = await this.readState();
      pruneExpiredRecords(state, this.clock());
      const current = readRecord(state, namespace, key, this.clock());
      if (current) return { inserted: false, value: clone(current.value) };
      state.namespaces[namespace] ??= {};
      state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      await this.writeState(state);
      return { inserted: true, value: clone(value) };
    });
  }
}
