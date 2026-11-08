import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../storage/memory-store.mjs';
import { createSessionManager, parseCookies } from './sessions.mjs';

function responseDouble() {
  return { append: vi.fn() };
}

function requestDouble(cookie = '') {
  return { get: vi.fn((name) => (name.toLowerCase() === 'cookie' ? cookie : undefined)) };
}

describe('opaque application sessions', () => {
  it('serializes invalidation with an already pending session write', async () => {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const session = await sessions.open(requestDouble(), responseDouble());
    const req = requestDouble(`rocky_session=${session.id}`);
    const started = Promise.withResolvers();
    const released = Promise.withResolvers();
    const get = store.get.bind(store);
    vi.spyOn(store, 'get').mockImplementationOnce(async (...args) => {
      const record = await get(...args);
      started.resolve();
      await released.promise;
      return record;
    });
    const saving = sessions.save(session, { chatHistory: [] });
    await started.promise;
    const destroying = sessions.destroy(req, responseDouble());
    released.resolve();
    await Promise.all([saving, destroying]);
    expect(await sessions.read(req)).toBeNull();
  });

  it('does not save an expired session', async () => {
    let now = 1_000;
    const store = new MemoryStore({ clock: () => now });
    const sessions = createSessionManager({ store, isProduction: false, clock: () => now });
    const session = await sessions.open(requestDouble(), responseDouble());
    now += 31 * 24 * 60 * 60 * 1_000;
    await expect(sessions.save(session, { cartId: 'expired-cart' })).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('merges concurrent changes against the current session', async () => {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const first = await sessions.open(requestDouble(), responseDouble());
    const req = requestDouble(`rocky_session=${first.id}`);
    const other = await sessions.read(req);

    await Promise.all([
      sessions.save(first, { cartId: 'cart-current' }),
      sessions.save(other, { chatHistory: [{ role: 'user', content: 'hola' }] }),
    ]);

    expect((await sessions.read(req)).record).toMatchObject({
      cartId: 'cart-current',
      chatHistory: [{ role: 'user', content: 'hola' }],
    });
  });

  it.each(['rotate', 'destroy'])('does not restore a session after %s', async (action) => {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const session = await sessions.open(requestDouble(), responseDouble());
    const req = requestDouble(`rocky_session=${session.id}`);
    await sessions[action](req, responseDouble());

    await expect(sessions.save(session, { chatHistory: [] })).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED',
    });
    expect(await sessions.read(req)).toBeNull();
  });

  it('stores only a hash and emits a hardened production cookie', async () => {
    const clock = () => 1_000;
    const store = new MemoryStore({ clock });
    const sessions = createSessionManager({ store, isProduction: true, clock });
    const response = responseDouble();

    const session = await sessions.open(requestDouble(), response);

    expect(session.id).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(session.key).not.toBe(session.id);
    expect(await store.get('sessions', session.key)).toEqual({
      createdAt: 1_000,
      lastSeenAt: 1_000,
    });
    const cookie = response.append.mock.calls[0][1];
    expect(cookie).toContain('__Host-rocky_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain(session.key);
  });

  it('reuses a valid cookie and rotates it after authentication', async () => {
    const clock = () => 1_000;
    const store = new MemoryStore({ clock });
    const sessions = createSessionManager({ store, isProduction: false, clock });
    const firstResponse = responseDouble();
    const first = await sessions.open(requestDouble(), firstResponse);
    const cookie = firstResponse.append.mock.calls[0][1].split(';')[0];

    const reused = await sessions.open(requestDouble(cookie), responseDouble());
    const rotatedResponse = responseDouble();
    const rotated = await sessions.rotate(requestDouble(cookie), rotatedResponse, {
      customerTokenId: 'token-record',
    });

    expect(reused.id).toBe(first.id);
    expect(rotated.id).not.toBe(first.id);
    expect(await store.get('sessions', first.key)).toBeNull();
    expect(await store.get('sessions', rotated.key)).toMatchObject({
      customerTokenId: 'token-record',
    });
  });

  it('refreshes lastSeenAt only after five minutes to avoid a write per request', async () => {
    let now = 1_000;
    const store = new MemoryStore({ clock: () => now });
    const setSpy = vi.spyOn(store, 'set');
    const sessions = createSessionManager({ store, isProduction: false, clock: () => now });
    const response = responseDouble();
    const first = await sessions.open(requestDouble(), response);
    const cookie = response.append.mock.calls[0][1].split(';')[0];

    now = 1_000 + 4 * 60 * 1_000;
    const soon = await sessions.open(requestDouble(cookie), responseDouble());
    now = 1_000 + 6 * 60 * 1_000;
    const later = await sessions.open(requestDouble(cookie), responseDouble());

    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(soon.record.lastSeenAt).toBe(first.record.lastSeenAt);
    expect(later.record.lastSeenAt).toBe(now);
    expect(await store.get('sessions', first.key)).toMatchObject({ lastSeenAt: now });
  });

  it('reads without creating a session and ignores malformed cookies', async () => {
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });

    expect(parseCookies('rocky_session=%E0%A4%A; other=ok; flag')).toEqual({
      other: 'ok',
      flag: '',
    });
    expect(parseCookies(undefined)).toEqual({});
    await expect(sessions.read(requestDouble('rocky_session=%E0%A4%A'))).resolves.toBeNull();
    await expect(sessions.read(requestDouble())).resolves.toBeNull();
    expect(store.state.namespaces.sessions).toBeUndefined();
  });
});
