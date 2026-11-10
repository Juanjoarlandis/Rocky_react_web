import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EncryptedStore } from './encrypted-file-store.mjs';
import { MemoryStore } from './memory-store.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

async function createStore(clock = () => Date.now()) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-store-test-'));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, 'state.enc');
  const key = crypto.randomBytes(32).toString('base64');
  return { store: new EncryptedStore({ filePath, key, clock }), filePath, key };
}

describe('EncryptedStore', () => {
  it('round-trips values without writing their plaintext to disk', async () => {
    const { store, filePath } = await createStore();

    await store.set('tokens', 'customer-1', { accessToken: 'highly-sensitive-token' });

    await expect(store.get('tokens', 'customer-1')).resolves.toEqual({
      accessToken: 'highly-sensitive-token',
    });
    const file = await fs.readFile(filePath, 'utf8');
    expect(file).not.toContain('highly-sensitive-token');
    expect(JSON.parse(file)).toEqual({
      version: 1,
      iv: expect.any(String),
      tag: expect.any(String),
      ciphertext: expect.any(String),
    });
  });

  it('serializes concurrent mutations without losing records', async () => {
    const { store } = await createStore();

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        store.set('webhooks', `delivery-${index}`, { index })
      )
    );

    const values = await Promise.all(
      Array.from({ length: 20 }, (_, index) => store.get('webhooks', `delivery-${index}`))
    );
    expect(values).toEqual(Array.from({ length: 20 }, (_, index) => ({ index })));
  });

  it('consumes one-time values atomically and rejects expired records', async () => {
    let now = 1_000;
    const { store } = await createStore(() => now);
    await store.set('oauth', 'state', { verifier: 'secret' }, { expiresAt: 2_000 });

    await expect(
      Promise.all([store.consume('oauth', 'state'), store.consume('oauth', 'state')])
    ).resolves.toEqual(expect.arrayContaining([{ verifier: 'secret' }, null]));

    await store.set('oauth', 'expired', { verifier: 'old' }, { expiresAt: 1_500 });
    now = 2_000;
    await expect(store.get('oauth', 'expired')).resolves.toBeNull();
    await expect(store.consume('oauth', 'expired')).resolves.toBeNull();
  });

  it('inserts deduplication records once under concurrency', async () => {
    const { store } = await createStore();

    const results = await Promise.all([
      store.setIfAbsent('webhooks', 'same-id', { attempt: 1 }),
      store.setIfAbsent('webhooks', 'same-id', { attempt: 2 }),
    ]);

    expect(results.filter((result) => result.inserted)).toHaveLength(1);
    expect(results.filter((result) => !result.inserted)).toHaveLength(1);
  });

  it('fails closed when the encryption key is invalid', () => {
    expect(() => new EncryptedStore({ filePath: '/tmp/unused', key: 'not-base64' })).toThrow(
      /APP_ENCRYPTION_KEY/
    );
  });

  it('decrypts the file once and serves later reads from memory', async () => {
    const { store, filePath, key } = await createStore();
    const readState = vi.spyOn(store, 'readState');

    await store.set('sessions', 'a', { n: 1 });
    await store.set('sessions', 'b', { n: 2 });
    await store.get('sessions', 'a');
    await store.get('sessions', 'b');
    await store.delete('sessions', 'a');

    expect(readState).toHaveBeenCalledTimes(1);
    // Cada mutación llega al disco: otra instancia con la misma clave lo ve.
    const reopened = new EncryptedStore({ filePath, key });
    await expect(reopened.get('sessions', 'a')).resolves.toBeNull();
    await expect(reopened.get('sessions', 'b')).resolves.toEqual({ n: 2 });
  });

  it('probes the file with the current key and rejects a key that cannot decrypt it', async () => {
    const { store, filePath } = await createStore();
    await store.set('sessions', 'a', { n: 1 });

    await expect(store.probe()).resolves.toBe(true);
    const wrongKey = new EncryptedStore({
      filePath,
      key: crypto.randomBytes(32).toString('base64'),
    });
    await expect(wrongKey.probe()).rejects.toThrow(/APP_ENCRYPTION_KEY/);
    await expect(new MemoryStore().probe()).resolves.toBe(true);
  });

  it('prunes expired records during later mutations', async () => {
    let now = 1_000;
    const store = new MemoryStore({ clock: () => now });
    await store.set('temporary', 'expired', { secret: true }, { expiresAt: 1_500 });

    now = 2_000;
    await store.set('temporary', 'current', { secret: false }, { expiresAt: 3_000 });

    expect(store.state.namespaces.temporary.expired).toBeUndefined();
    await expect(store.get('temporary', 'current')).resolves.toEqual({ secret: false });
  });
});

// ---------------------------------------------------------------------------
// Escritura agrupada (almacen-escritura-agrupada)
// ---------------------------------------------------------------------------

const DEFERRED = { durability: 'deferred' };

// Otra instancia sobre el mismo fichero: lo que lee es lo que hay en disco.
const reopen = (filePath, key) => new EncryptedStore({ filePath, key });

describe('EncryptedStore: escrituras confirmadas y diferidas', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin clase declarada la escritura es confirmada: al terminar está en disco', async () => {
    const { store, filePath, key } = await createStore();

    await store.set('avisos', 'rocky-airwave', ['a@example.test']);

    await expect(reopen(filePath, key).get('avisos', 'rocky-airwave')).resolves.toEqual([
      'a@example.test',
    ]);
  });

  it('una escritura diferida se lee al momento y no toca el disco', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store, filePath, key } = await createStore();
    await store.set('avisos', 'base', 1);
    const writes = vi.spyOn(store, 'writeState');

    await store.set('sessions', 's1', { cartId: 'c1' }, DEFERRED);

    await expect(store.get('sessions', 's1')).resolves.toEqual({ cartId: 'c1' });
    expect(writes).not.toHaveBeenCalled();
    await expect(reopen(filePath, key).get('sessions', 's1')).resolves.toBeNull();
  });

  it('una escritura diferida llega sola al disco a los 5 segundos', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store, filePath, key } = await createStore();
    await store.set('sessions', 's1', { cartId: 'c1' }, DEFERRED);

    await vi.advanceTimersByTimeAsync(4_999);
    await store.settled();
    await expect(reopen(filePath, key).get('sessions', 's1')).resolves.toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    await store.settled();
    await expect(reopen(filePath, key).get('sessions', 's1')).resolves.toEqual({ cartId: 'c1' });
  });

  it('la ventana cuenta desde la primera escritura pendiente y no se rearma', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store, filePath, key } = await createStore();
    await store.set('sessions', 's1', 1, DEFERRED);
    await vi.advanceTimersByTimeAsync(4_000);
    await store.set('sessions', 's2', 2, DEFERRED);

    await vi.advanceTimersByTimeAsync(1_000);
    await store.settled();

    await expect(reopen(filePath, key).get('sessions', 's2')).resolves.toBe(2);
  });

  it('200 escrituras diferidas seguidas reescriben el fichero una sola vez', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store, filePath, key } = await createStore();
    const writes = vi.spyOn(store, 'writeState');

    for (let i = 0; i < 200; i += 1) await store.set('sessions', `s${i}`, { i }, DEFERRED);
    await vi.advanceTimersByTimeAsync(5_000);
    await store.settled();

    expect(writes).toHaveBeenCalledTimes(1);
    await expect(reopen(filePath, key).get('sessions', 's199')).resolves.toEqual({ i: 199 });
  });

  it('una confirmada arrastra a las diferidas pendientes y cancela la espera', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store, filePath, key } = await createStore();
    await store.set('sessions', 's1', 1, DEFERRED);
    await store.delete('sessions', 'no-existe', DEFERRED);
    const writes = vi.spyOn(store, 'writeState');

    await store.set('avisos', 'rocky-airwave', ['a@example.test']);

    const disk = reopen(filePath, key);
    await expect(disk.get('sessions', 's1')).resolves.toBe(1);
    await expect(disk.get('avisos', 'rocky-airwave')).resolves.toEqual(['a@example.test']);
    await vi.advanceTimersByTimeAsync(10_000);
    await store.settled();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('las confirmadas que llegan durante un volcado comparten el siguiente', async () => {
    const { store, filePath, key } = await createStore();
    const realWrite = store.writeState.bind(store);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const writes = vi.spyOn(store, 'writeState').mockImplementation(async (state) => {
      if (writes.mock.calls.length === 1) await gate;
      return realWrite(state);
    });

    const first = store.set('avisos', 'a', 1);
    await vi.waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    const others = [
      store.set('avisos', 'b', 2),
      store.set('avisos', 'c', 3),
      store.delete('avisos', 'a'),
    ];
    release();
    await Promise.all([first, ...others]);

    expect(writes).toHaveBeenCalledTimes(2);
    const disk = reopen(filePath, key);
    await expect(disk.get('avisos', 'a')).resolves.toBeNull();
    await expect(disk.get('avisos', 'c')).resolves.toBe(3);
  });

  it('veinte confirmadas a la vez están todas en disco al terminar', async () => {
    const { store, filePath, key } = await createStore();

    await Promise.all(Array.from({ length: 20 }, (_, i) => store.set('webhooks', `d${i}`, { i })));

    const disk = reopen(filePath, key);
    for (let i = 0; i < 20; i += 1) {
      await expect(disk.get('webhooks', `d${i}`)).resolves.toEqual({ i });
    }
  });

  it('consume y setIfAbsent también admiten la clase diferida', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { store } = await createStore();
    await store.set('base', 'x', 1);
    const writes = vi.spyOn(store, 'writeState');

    await expect(store.setIfAbsent('oauth', 't1', { state: 'a' }, DEFERRED)).resolves.toEqual({
      inserted: true,
      value: { state: 'a' },
    });
    await expect(store.consume('oauth', 't1', DEFERRED)).resolves.toEqual({ state: 'a' });
    await expect(store.get('oauth', 't1')).resolves.toBeNull();
    expect(writes).not.toHaveBeenCalled();
  });

  it('flush() vuelca lo pendiente y, sin nada pendiente, no escribe', async () => {
    const { store, filePath, key } = await createStore();
    await store.set('sessions', 's1', 1, DEFERRED);
    const writes = vi.spyOn(store, 'writeState');

    await store.flush();
    await store.flush();

    expect(writes).toHaveBeenCalledTimes(1);
    await expect(reopen(filePath, key).get('sessions', 's1')).resolves.toBe(1);
  });

  it('la espera de un volcado diferido no mantiene vivo el proceso', async () => {
    const { store } = await createStore();

    await store.set('sessions', 's1', 1, DEFERRED);

    expect(store.flushTimer.hasRef()).toBe(false);
    await store.flush();
    expect(store.flushTimer).toBeNull();
  });

  it('los caducados se podan al volcar, no en cada escritura', async () => {
    let now = 1_000;
    const { store, filePath, key } = await createStore(() => now);
    await store.set('temporary', 'expired', { secret: true }, { expiresAt: 1_500 });
    now = 2_000;

    await store.set('temporary', 'current', 1, { expiresAt: 9_000, ...DEFERRED });
    await expect(store.get('temporary', 'expired')).resolves.toBeNull();
    await store.flush();

    const disk = await reopen(filePath, key).load();
    expect(disk.namespaces.temporary).toEqual({ current: { value: 1, expiresAt: 9_000 } });
  });

  it('rechaza una clase de escritura que no existe', async () => {
    const { store } = await createStore();

    await expect(store.set('a', 'b', 1, { durability: 'eventual' })).rejects.toThrow(/durability/);
  });
});

describe('EncryptedStore: cuando un volcado falla', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('la escritura confirmada falla y la siguiente lectura devuelve lo que hay en disco', async () => {
    const { store } = await createStore();
    await store.set('avisos', 'lista', ['a']);
    await store.set('sessions', 's1', 'perdida', DEFERRED);
    vi.spyOn(store, 'writeState').mockRejectedValueOnce(new Error('disco lleno'));

    await expect(store.set('avisos', 'lista', ['a', 'b'])).rejects.toThrow('disco lleno');

    await expect(store.get('avisos', 'lista')).resolves.toEqual(['a']);
    await expect(store.get('sessions', 's1')).resolves.toBeNull();
    // Y el almacén sigue sirviendo.
    await store.set('avisos', 'lista', ['a', 'c']);
    await expect(store.get('avisos', 'lista')).resolves.toEqual(['a', 'c']);
  });

  it('un volcado diferido que falla deja una línea de error sin datos del estado', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-store-test-'));
    temporaryDirectories.push(directory);
    const store = new EncryptedStore({
      filePath: path.join(directory, 'state.enc'),
      key: crypto.randomBytes(32).toString('base64'),
      logger,
    });
    await store.set('avisos', 'lista', ['a']);
    await store.set('sessions', 'sesion-secreta', { token: 'no-debe-salir' }, DEFERRED);
    vi.spyOn(store, 'writeState').mockRejectedValueOnce(new Error('disco lleno'));

    await vi.advanceTimersByTimeAsync(5_000);
    await store.settled();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logger.error.mock.calls[0]);
    expect(logged).toContain('store_flush_failed');
    expect(logged).not.toContain('sesion-secreta');
    expect(logged).not.toContain('no-debe-salir');
    // La escritura diferida se ha perdido, que es lo que su clase admite, y el almacén sigue.
    await expect(store.get('sessions', 'sesion-secreta')).resolves.toBeNull();
    await expect(store.get('avisos', 'lista')).resolves.toEqual(['a']);
    await store.set('avisos', 'lista', ['a', 'b']);
  });
});

describe('EncryptedStore: fsync y temporales', () => {
  it('sincroniza el fichero antes de renombrarlo y el directorio después', async () => {
    const { store, filePath } = await createStore();
    const steps = [];
    const realOpen = fs.open;
    const realRename = fs.rename;
    vi.spyOn(fs, 'open').mockImplementation(async (target, ...rest) => {
      const handle = await realOpen(target, ...rest);
      const kind = target === path.dirname(filePath) ? 'directorio' : 'temporal';
      const realSync = handle.sync.bind(handle);
      handle.sync = async () => {
        steps.push(`sync ${kind}`);
        return realSync();
      };
      return handle;
    });
    vi.spyOn(fs, 'rename').mockImplementation(async (...args) => {
      steps.push('rename');
      return realRename(...args);
    });

    await store.set('avisos', 'a', 1);
    vi.restoreAllMocks();

    expect(steps).toEqual(['sync temporal', 'rename', 'sync directorio']);
  });

  it('al cargar borra sus temporales huérfanos y no los de otros ficheros', async () => {
    const { store, filePath, key } = await createStore();
    await store.set('avisos', 'a', 1);
    const directory = path.dirname(filePath);
    const orphan = `${filePath}.4242.${crypto.randomUUID()}.tmp`;
    const foreign = path.join(directory, `otro.enc.4242.${crypto.randomUUID()}.tmp`);
    const backup = `${filePath}.bak`;
    await Promise.all([orphan, foreign, backup].map((file) => fs.writeFile(file, 'resto')));
    // Un huérfano es un temporal viejo: el de hace un momento puede ser de otro proceso vivo.
    const old = new Date(Date.now() - 60 * 60 * 1_000);
    await fs.utimes(orphan, old, old);

    await expect(reopen(filePath, key).get('avisos', 'a')).resolves.toBe(1);

    const names = await fs.readdir(directory);
    expect(names).not.toContain(path.basename(orphan));
    expect(names).toContain(path.basename(foreign));
    expect(names).toContain(path.basename(backup));
  });

  it('un volcado que falla no deja su temporal', async () => {
    const { store, filePath } = await createStore();
    await store.set('avisos', 'a', 1);
    vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('sin permiso'));

    await expect(store.set('avisos', 'a', 2)).rejects.toThrow('sin permiso');
    vi.restoreAllMocks();

    expect((await fs.readdir(path.dirname(filePath))).filter((n) => n.endsWith('.tmp'))).toEqual(
      []
    );
  });
});

describe('MemoryStore: misma interfaz', () => {
  it('acepta la clase de escritura y la ignora, y tiene flush()', async () => {
    const store = new MemoryStore();

    await store.set('sessions', 's1', 1, DEFERRED);
    await expect(store.setIfAbsent('sessions', 's2', 2, DEFERRED)).resolves.toMatchObject({
      inserted: true,
    });
    await expect(store.consume('sessions', 's2', DEFERRED)).resolves.toBe(2);
    await expect(store.delete('sessions', 's1', DEFERRED)).resolves.toBe(true);
    await expect(store.flush()).resolves.toBeUndefined();
  });
});

describe('EncryptedStore: hallazgos de la revisión', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('otra instancia que solo lee no borra el temporal de un volcado en curso', async () => {
    const { store, filePath, key } = await createStore();
    await store.set('avisos', 'a', 1);
    const realRename = fs.rename;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    vi.spyOn(fs, 'rename').mockImplementationOnce(async (...args) => {
      await gate;
      return realRename(...args);
    });

    const writing = store.set('avisos', 'a', 2);
    await vi.waitFor(async () => {
      expect((await fs.readdir(path.dirname(filePath))).some((n) => n.endsWith('.tmp'))).toBe(true);
    });
    await expect(reopen(filePath, key).get('avisos', 'a')).resolves.toBe(1);
    release();

    await expect(writing).resolves.toBe(2);
    await expect(reopen(filePath, key).get('avisos', 'a')).resolves.toBe(2);
  });

  it('flush() no deja sin volcar una escritura diferida que llega mientras vuelca', async () => {
    const { store, filePath, key } = await createStore();
    await store.set('sessions', 's1', 1, DEFERRED);
    const realWrite = store.writeState.bind(store);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const writes = vi.spyOn(store, 'writeState').mockImplementation(async (state) => {
      const snapshot = structuredClone(state);
      if (writes.mock.calls.length === 1) await gate;
      return realWrite(snapshot);
    });

    const flushing = store.flush();
    await vi.waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    await store.set('sessions', 's2', 2, DEFERRED);
    release();
    await flushing;

    await expect(reopen(filePath, key).get('sessions', 's2')).resolves.toBe(2);
    expect(store.flushTimer).toBeNull();
  });

  it('un volcado confirmado que falla también deja su línea en el log', async () => {
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-store-test-'));
    temporaryDirectories.push(directory);
    const store = new EncryptedStore({
      filePath: path.join(directory, 'state.enc'),
      key: crypto.randomBytes(32).toString('base64'),
      logger,
    });
    vi.spyOn(store, 'writeState').mockRejectedValueOnce(new Error('disco lleno'));

    await expect(store.set('avisos', 'correo-privado@example.test', 1)).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logger.error.mock.calls[0]);
    expect(logged).toContain('store_flush_failed');
    expect(logged).not.toContain('correo-privado');
  });

  it('si solo falla el fsync del directorio, la escritura ya está hecha y no se da por perdida', async () => {
    const { store, filePath, key } = await createStore();
    const realOpen = fs.open;
    vi.spyOn(fs, 'open').mockImplementation(async (target, ...rest) => {
      if (target === path.dirname(filePath)) throw new Error('EINVAL');
      return realOpen(target, ...rest);
    });

    await expect(store.setIfAbsent('webhooks', 'd1', { ok: true })).resolves.toMatchObject({
      inserted: true,
    });
    vi.restoreAllMocks();

    await expect(reopen(filePath, key).get('webhooks', 'd1')).resolves.toEqual({ ok: true });
  });

  it('lee un fichero escrito por la versión anterior del almacén', async () => {
    // Sobre generado con el EncryptedFileStore del commit 7effff4 y una clave de prueba.
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-store-test-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'state.enc');
    await fs.writeFile(
      filePath,
      '{"version":1,"iv":"/YQnGIXLMcZ0T1tY","tag":"AhLwSnAyvrSIPpZwuAiZuA==","ciphertext":"mhZdQNWlm4L5lNpYZPlg/DvDhaNM5k1sZhaQTSwzkgLlowO9vM67Z06P93/dyncLInTyGq04JyGB08+cvfkV+lTAekwl72NwQ4WwzVTp6DSIpFNeJIokuvMLzUJnrZ/wAsaDrERSDTDccHEkWfxKs3EgfptPZOLLOH2KqJuo3YEoyTGZrlzKm7hImmhl/rl3ht0uRg=="}'
    );
    const store = new EncryptedStore({ filePath, key: Buffer.alloc(32, 7).toString('base64') });

    await expect(store.get('sessions', 's1')).resolves.toEqual({ cartId: 'c1' });
    await expect(store.get('crewProfiles', 'p1')).resolves.toEqual({ xp: 10 });
    // Y lo que escribe conserva el mismo sobre.
    await store.set('crewProfiles', 'p2', { xp: 5 });
    expect(Object.keys(JSON.parse(await fs.readFile(filePath, 'utf8')))).toEqual([
      'version',
      'iv',
      'tag',
      'ciphertext',
    ]);
  });
});

describe('MemoryStore: valida la clase de escritura como el cifrado', () => {
  it('rechaza una clase que no existe', async () => {
    const store = new MemoryStore();

    await expect(store.set('a', 'b', 1, { durability: 'defered' })).rejects.toThrow(/durability/);
    await expect(store.delete('a', 'b', { durability: 'eventual' })).rejects.toThrow(/durability/);
  });
});
