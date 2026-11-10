import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createSerialQueue } from '../lib/serial-queue.mjs';
import { FILE_VERSION, clone, emptyState, pruneExpiredRecords, readRecord } from './records.mjs';

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

// Cuánto puede esperar en memoria una escritura diferida antes de ir a disco.
export const FLUSH_DELAY_MS = 5_000;
export const DURABILITIES = new Set(['confirmed', 'deferred']);
// Un temporal más reciente que esto puede ser de un volcado en curso.
const ORPHAN_MIN_AGE_MS = 10 * 60 * 1_000;

/* Un único sobre AES-256-GCM en disco, reescrito entero con escrituras
   atómicas. El estado descifrado vive en memoria: las lecturas no tocan el
   disco y las mutaciones se agrupan en volcados.

   Cada mutación es de una de dos clases:
   - confirmada (por defecto): termina cuando su volcado ha terminado. Es lo
     que hace falta para un crédito, un aviso o un cierre de sesión.
   - diferida ({ durability: 'deferred' }): termina al actualizar la memoria y
     llega al disco en FLUSH_DELAY_MS como mucho. Una caída brusca puede
     perderla; solo se usa para lo que se puede volver a crear.

   Un volcado lleva todo lo pendiente, sea de quien sea, así que el número de
   volcados depende del tiempo y no del número de escrituras. Si un volcado
   falla se descarta la copia en memoria: la siguiente operación parte de lo
   que hay en disco y nunca va por delante de él.

   Serializa las operaciones dentro del proceso; no ofrece bloqueo entre
   procesos. */
export class EncryptedFileStore {
  constructor({ filePath, key, clock = () => Date.now(), logger = null }) {
    if (!filePath) throw new Error('El almacenamiento cifrado necesita una ruta.');
    this.filePath = filePath;
    this.key = decodeEncryptionKey(key);
    this.clock = clock;
    this.logger = logger;
    this.state = null;
    this.withLock = createSerialQueue();
    // Cada mutación sube `version`; `flushedVersion` es la última que está en
    // disco. `epoch` cambia cuando un volcado falla y la memoria se descarta.
    this.version = 0;
    this.flushedVersion = 0;
    this.epoch = 0;
    this.lastFlushError = null;
    this.flushPromise = null;
    this.flushTimer = null;
    this.background = null;
    this.cleanedTemporaries = false;
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

  // Cifra y escribe el estado de forma atómica y duradera: temporal con
  // fsync, renombrado y fsync del directorio. Todo lo que lee del estado
  // ocurre antes del primer `await`, así que el volcado es una foto coherente.
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

    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      const file = await fs.open(temporaryPath, 'w', 0o600);
      try {
        await file.writeFile(envelope, 'utf8');
        // Sin esto, un corte de luz puede dejar un fichero vacío o viejo
        // aunque la operación se diera por buena.
        await file.sync();
      } finally {
        await file.close();
      }
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
    // El fichero nuevo ya está en su sitio. Sincronizar el directorio lo deja
    // a salvo de un corte de luz; si esto falla, la escritura no se da por
    // perdida, porque no lo está.
    try {
      const directoryHandle = await fs.open(directory, 'r');
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
    } catch {
      // Sin fsync de directorio (sistema de ficheros que no lo admite).
    }
  }

  // Temporales que dejó un proceso que murió en mitad de un volcado:
  // <fichero>.<pid>.<uuid>.tmp. Solo los de este fichero y solo los viejos: uno
  // reciente puede ser el volcado en curso de otro proceso (el servidor, si
  // quien carga es un script), y borrárselo le haría fallar la escritura.
  async removeOrphanTemporaries() {
    const directory = path.dirname(this.filePath);
    const prefix = `${path.basename(this.filePath)}.`;
    let names;
    try {
      names = await fs.readdir(directory);
    } catch {
      return;
    }
    const oldEnough = this.clock() - ORPHAN_MIN_AGE_MS;
    await Promise.all(
      names
        .filter(
          (name) =>
            name.startsWith(prefix) && /^\d+\.[0-9a-f-]{36}\.tmp$/.test(name.slice(prefix.length))
        )
        .map(async (name) => {
          const file = path.join(directory, name);
          try {
            if ((await fs.stat(file)).mtimeMs < oldEnough) await fs.rm(file, { force: true });
          } catch {
            // Ya no está, o no se puede leer: no es asunto de esta carga.
          }
        })
    );
  }

  // Descifra el fichero una sola vez; a partir de ahí el estado vive en memoria.
  async load() {
    if (!this.cleanedTemporaries) {
      this.cleanedTemporaries = true;
      await this.removeOrphanTemporaries();
    }
    if (!this.state) this.state = await this.readState();
    return this.state;
  }

  // El estado en memoria, garantizando que es el vigente: un volcado fallido
  // puede haberlo descartado mientras se esperaba la lectura.
  async currentState() {
    let state;
    do {
      state = await this.load();
    } while (state !== this.state);
    return state;
  }

  clearFlushTimer() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  // Un volcado: todo lo que haya en memoria en este momento. Si falla, se
  // descarta la memoria para que la siguiente operación relea el disco.
  async runFlush() {
    const state = this.state;
    const version = this.version;
    this.clearFlushTimer();
    if (!state) return;
    pruneExpiredRecords(state, this.clock());
    try {
      await this.writeState(state);
      this.flushedVersion = Math.max(this.flushedVersion, version);
    } catch (error) {
      this.state = null;
      this.epoch += 1;
      this.lastFlushError = error;
      this.flushedVersion = this.version;
      // Con el volcado se pierden también las diferidas de otras peticiones:
      // queda registrado siempre, sin datos del estado.
      this.logger?.error('State store flush failed', {
        reason: 'store_flush_failed',
        name: error?.name,
        code: error?.code,
      });
      throw error;
    }
  }

  // Termina cuando la mutación `version` está en disco. Los que llegan
  // durante un volcado esperan al siguiente, que los lleva a todos.
  async flushThrough(version, epoch) {
    for (;;) {
      if (this.epoch !== epoch) throw this.lastFlushError;
      if (this.flushedVersion >= version) return;
      if (!this.flushPromise) {
        this.flushPromise = this.runFlush().finally(() => {
          this.flushPromise = null;
        });
      }
      await this.flushPromise;
    }
  }

  // Programa el volcado de lo diferido. Cuenta desde la primera escritura
  // pendiente y no se rearma, y no mantiene vivo un script.
  scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      // Nadie espera este volcado; si falla, runFlush ya lo ha registrado.
      this.background = this.flushThrough(this.version, this.epoch).catch(() => {});
    }, FLUSH_DELAY_MS);
    this.flushTimer.unref?.();
  }

  // Vuelca lo pendiente y termina cuando está en disco (apagado ordenado).
  async flush() {
    // En bucle: una escritura que llega mientras se vuelca también sale.
    do {
      await this.withLock(() => {});
      if (this.version > this.flushedVersion) await this.flushThrough(this.version, this.epoch);
    } while (this.version > this.flushedVersion);
    this.clearFlushTimer();
  }

  // Termina cuando no queda ningún volcado en curso. No vuelca nada.
  async settled() {
    await this.background;
    await this.flushPromise?.catch(() => {});
  }

  /* Aplica `change` al estado. `change` devuelve { changed, result }; si no
     cambia nada, no hay nada que volcar. */
  async mutate(durability, change) {
    if (!DURABILITIES.has(durability)) {
      throw new Error(`durability desconocida: ${durability}. Usa "confirmed" o "deferred".`);
    }
    const applied = await this.withLock(async () => {
      const state = await this.currentState();
      const { changed, result } = change(state);
      if (changed) this.version += 1;
      return { changed, result, version: this.version, epoch: this.epoch };
    });
    if (applied.changed) {
      if (durability === 'deferred') this.scheduleFlush();
      else await this.flushThrough(applied.version, applied.epoch);
    }
    return applied.result;
  }

  // Sonda: descifra con la clave actual y comprueba que se puede escribir en
  // el directorio. Se usa antes de escuchar y en /api/health.
  async probe() {
    return this.withLock(async () => {
      await this.load();
      const directory = path.dirname(this.filePath);
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      await fs.access(directory, fs.constants.W_OK);
      return true;
    });
  }

  async get(namespace, key) {
    return this.withLock(async () => {
      const state = await this.currentState();
      return clone(readRecord(state, namespace, key, this.clock())?.value ?? null);
    });
  }

  async set(namespace, key, value, { expiresAt = null, durability = 'confirmed' } = {}) {
    return this.mutate(durability, (state) => {
      state.namespaces[namespace] ??= {};
      state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      return { changed: true, result: clone(value) };
    });
  }

  async delete(namespace, key, { durability = 'confirmed' } = {}) {
    return this.mutate(durability, (state) => {
      const existed = Boolean(state.namespaces[namespace]?.[key]);
      if (existed) delete state.namespaces[namespace][key];
      return { changed: existed, result: existed };
    });
  }

  async consume(namespace, key, { durability = 'confirmed' } = {}) {
    return this.mutate(durability, (state) => {
      const record = readRecord(state, namespace, key, this.clock());
      const existed = Boolean(state.namespaces[namespace]?.[key]);
      if (existed) delete state.namespaces[namespace][key];
      return { changed: existed, result: clone(record?.value ?? null) };
    });
  }

  async setIfAbsent(namespace, key, value, { expiresAt = null, durability = 'confirmed' } = {}) {
    return this.mutate(durability, (state) => {
      const current = readRecord(state, namespace, key, this.clock());
      if (current)
        return { changed: false, result: { inserted: false, value: clone(current.value) } };
      state.namespaces[namespace] ??= {};
      state.namespaces[namespace][key] = { value: clone(value), expiresAt };
      return { changed: true, result: { inserted: true, value: clone(value) } };
    });
  }
}

// Nombre histórico del adaptador; los scripts y tests lo importan así.
export { EncryptedFileStore as EncryptedStore };
