import crypto from 'node:crypto';
import { promisify } from 'node:util';

// Contraseñas con scrypt (node:crypto). El hash guarda sus parámetros:
// «scrypt$N$r$p$sal$hash», con sal y hash en base64url. Los límites de los
// parámetros evitan que un hash mal copiado tumbe el servidor pidiendo gigas
// de memoria en cada intento de entrada.

const scrypt = promisify(crypto.scrypt);
const DEFAULTS = Object.freeze({ N: 32_768, r: 8, p: 1 });
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MIN_PASSWORD = 12;
const HASH_RE = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9_-]{16,})\$([A-Za-z0-9_-]{32,})$/;

const maxmem = ({ N, r, p }) => 128 * N * r * p + 32 * 1024 * 1024;

export function parsePasswordHash(stored) {
  const match = typeof stored === 'string' ? stored.match(HASH_RE) : null;
  if (!match) return null;
  const [N, r, p] = match.slice(1, 4).map(Number);
  const isPowerOfTwo = N > 1 && (N & (N - 1)) === 0;
  if (!isPowerOfTwo || N < 1024 || N > 2 ** 20 || r < 1 || r > 16 || p < 1 || p > 4) {
    return null;
  }
  const salt = Buffer.from(match[4], 'base64url');
  const hash = Buffer.from(match[5], 'base64url');
  if (salt.length < SALT_LENGTH || hash.length !== KEY_LENGTH) return null;
  return { N, r, p, salt, hash };
}

export async function hashPassword(password, params = DEFAULTS) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new Error(`La clave del Taller tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await scrypt(password, salt, KEY_LENGTH, { ...params, maxmem: maxmem(params) });
  const fields = [
    params.N,
    params.r,
    params.p,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ];
  return `scrypt$${fields.join('$')}`;
}

/* Nunca lanza: un formato raro o una clave vacía son simplemente «no». */
export async function verifyPassword(password, stored) {
  const parsed = parsePasswordHash(stored);
  if (!parsed || typeof password !== 'string' || password === '') return false;
  const { N, r, p, salt, hash } = parsed;
  const candidate = await scrypt(password, salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: maxmem({ N, r, p }),
  });
  return crypto.timingSafeEqual(candidate, hash);
}
