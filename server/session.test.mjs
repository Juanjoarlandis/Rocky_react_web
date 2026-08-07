import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from './encrypted-store.mjs';
import { createSessionManager } from './session.mjs';

function responseDouble() {
  return { append: vi.fn() };
}

function requestDouble(cookie = '') {
  return { get: vi.fn((name) => (name.toLowerCase() === 'cookie' ? cookie : undefined)) };
}

describe('opaque application sessions', () => {
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
});
