import { parsePasswordHash } from '../lib/password-hash.mjs';
import { base32Decode } from '../lib/totp.mjs';

// El Taller, el panel privado de drops. Está apagado salvo que estén las cuatro
// piezas: el hash de la clave, el secreto TOTP, las credenciales Admin de
// Shopify (para escribir drops) y la publicación Headless (para programarlos).
// Lo que falta lo apaga y deja dicho por qué; lo que está pero mal escrito hace
// fallar el arranque, como el resto de la configuración.

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const PUBLICATION_RE = /^gid:\/\/shopify\/Publication\/\d+$/;
const MIN_TOTP_BYTES = 16;

function readPasswordHash(value) {
  const hash = String(value || '').trim();
  if (hash && !parsePasswordHash(hash)) {
    throw new Error(
      'TALLER_PASSWORD_HASH no es un hash válido: genéralo con npm run taller:clave.'
    );
  }
  return hash;
}

function readTotpSecret(value) {
  const secret = String(value || '')
    .replace(/\s/g, '')
    .toUpperCase();
  if (!secret) return '';
  let bytes;
  try {
    bytes = base32Decode(secret);
  } catch {
    throw new Error(
      'TALLER_TOTP_SECRET tiene que estar en base32: genéralo con npm run taller:clave.'
    );
  }
  if (bytes.length < MIN_TOTP_BYTES) {
    throw new Error('TALLER_TOTP_SECRET es demasiado corto: genéralo con npm run taller:clave.');
  }
  return secret;
}

function readPublicationId(value) {
  const id = String(value || '').trim();
  if (id && !PUBLICATION_RE.test(id)) {
    throw new Error(
      'SHOPIFY_HEADLESS_PUBLICATION_ID debe ser un id gid://shopify/Publication/<número>.'
    );
  }
  return id;
}

export function createTallerConfig(env = process.env, shopifyConfig = { capabilities: {} }) {
  const passwordHash = readPasswordHash(env.TALLER_PASSWORD_HASH);
  const totpSecret = readTotpSecret(env.TALLER_TOTP_SECRET);
  const publicationId = readPublicationId(env.SHOPIFY_HEADLESS_PUBLICATION_ID);

  const missing = [
    !passwordHash && 'falta TALLER_PASSWORD_HASH',
    !totpSecret && 'falta TALLER_TOTP_SECRET',
    !publicationId && 'falta SHOPIFY_HEADLESS_PUBLICATION_ID',
    !shopifyConfig.capabilities?.admin && 'faltan las credenciales Admin de Shopify',
  ].filter(Boolean);

  const enabled = missing.length === 0;
  return Object.freeze({
    enabled,
    reason: enabled ? '' : `Taller apagado: ${missing.join(', ')}.`,
    // Apagado, no se conservan secretos en memoria que nadie va a usar.
    passwordHash: enabled ? passwordHash : '',
    totpSecret: enabled ? totpSecret : '',
    publicationId,
    sessionLifetimeMs: SESSION_LIFETIME_MS,
  });
}
