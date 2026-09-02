import crypto from 'node:crypto';
import { sha256Base64Url } from '../lib/hash.mjs';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;
// lastSeenAt sólo se refresca cada cinco minutos: evita una escritura (y un
// cifrado del fichero entero) por cada petición de lectura.
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1_000;

function decodeCookieValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

// Una cookie malformada (p. ej. un %E0%A4%A a medias) se ignora en lugar de
// tumbar la petición con un 500.
export function parseCookies(header = '') {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    const name = separator === -1 ? trimmed : trimmed.slice(0, separator);
    const value = separator === -1 ? '' : decodeCookieValue(trimmed.slice(separator + 1));
    if (value === null) continue;
    cookies[name] = value;
  }
  return cookies;
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

    // Lee la sesión sin crearla: para rutas de consulta que no deben dejar
    // rastro en el almacén.
    async read(req) {
      const id = readId(req);
      if (!id) return null;
      const key = hashSessionId(id);
      const record = await store.get('sessions', key);
      return record ? { id, key, record } : null;
    },

    // Abre (o crea) la sesión. Sólo escribe si toca refrescar lastSeenAt.
    async open(req, res) {
      const id = readId(req);
      if (!id) return create(res);
      const key = hashSessionId(id);
      const record = await store.get('sessions', key);
      if (!record) return create(res);
      const now = clock();
      if (now - (record.lastSeenAt || 0) < LAST_SEEN_REFRESH_MS) {
        return { id, key, record };
      }
      const updated = { ...record, lastSeenAt: now };
      await store.set('sessions', key, updated, { expiresAt: now + SESSION_LIFETIME_MS });
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
