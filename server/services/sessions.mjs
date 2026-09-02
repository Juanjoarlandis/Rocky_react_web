import crypto from 'node:crypto';
import { sha256Base64Url } from '../lib/hash.mjs';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return [part, ''];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function isValidSessionId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{40,100}$/.test(value);
}

function hashSessionId(value) {
  return sha256Base64Url(value);
}

function sessionCookie(name, value, isProduction) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${Math.floor(SESSION_LIFETIME_MS / 1_000)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

export function createSessionManager({ store, isProduction, clock = () => Date.now() }) {
  const cookieName = isProduction ? '__Host-rocky_session' : 'rocky_session';

  function readId(req) {
    const value = parseCookies(req.get('cookie'))[cookieName];
    return isValidSessionId(value) ? value : null;
  }

  async function create(res, extra = {}) {
    const id = crypto.randomBytes(32).toString('base64url');
    const key = hashSessionId(id);
    const now = clock();
    const record = { createdAt: now, lastSeenAt: now, ...extra };
    await store.set('sessions', key, record, { expiresAt: now + SESSION_LIFETIME_MS });
    res.append('Set-Cookie', sessionCookie(cookieName, id, isProduction));
    return { id, key, record };
  }

  return {
    cookieName,

    async read(req) {
      const id = readId(req);
      if (!id) return null;
      const key = hashSessionId(id);
      const record = await store.get('sessions', key);
      return record ? { id, key, record } : null;
    },

    async open(req, res) {
      const id = readId(req);
      if (!id) return create(res);
      const key = hashSessionId(id);
      const record = await store.get('sessions', key);
      if (!record) return create(res);
      const updated = { ...record, lastSeenAt: clock() };
      await store.set('sessions', key, updated, {
        expiresAt: clock() + SESSION_LIFETIME_MS,
      });
      return { id, key, record: updated };
    },

    async save(session, updates) {
      const record = { ...session.record, ...updates, lastSeenAt: clock() };
      await store.set('sessions', session.key, record, {
        expiresAt: clock() + SESSION_LIFETIME_MS,
      });
      session.record = record;
      return session;
    },

    async rotate(req, res, extra = {}) {
      const id = readId(req);
      if (id) await store.delete('sessions', hashSessionId(id));
      return create(res, extra);
    },

    async destroy(req, res) {
      const id = readId(req);
      if (id) await store.delete('sessions', hashSessionId(id));
      const parts = [`${cookieName}=`, 'Max-Age=0', 'Path=/', 'HttpOnly', 'SameSite=Lax'];
      if (isProduction) parts.push('Secure');
      res.append('Set-Cookie', parts.join('; '));
    },
  };
}
