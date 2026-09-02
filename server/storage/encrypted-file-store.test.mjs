import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
