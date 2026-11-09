import crypto from 'node:crypto';

// Códigos de un solo uso por tiempo (RFC 6238, HOTP del RFC 4226): SHA-1, seis
// dígitos y pasos de 30 s, que es lo que entienden todas las apps de códigos.
// Solo node:crypto; las pruebas usan los vectores de los RFC.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const CODE_RE = /^\d{6}$/;

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('El secreto TOTP no es base32 válido.');
    value = ((value << 5) | index) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function hotp(secret, counter, digits = DIGITS) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totpAt(secret, timeMs, { step = STEP_SECONDS, digits = DIGITS } = {}) {
  return hotp(secret, Math.floor(timeMs / 1000 / step), digits);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function otpauthUri({ secret, issuer, account }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = `secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
  return `otpauth://totp/${label}?${params}`;
}

function sameCode(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/* Comprueba códigos del secreto dado: vale el paso actual y los contiguos (un
   reloj de móvil desfasado unos segundos), y nunca un paso igual o anterior al
   último aceptado, así un código visto por encima del hombro no sirve dos veces.
   El último paso vive en memoria: reiniciar el servidor cierra igualmente las
   sesiones del Taller. */
export function createTotpVerifier({ secret, clock = () => Date.now(), window = 1 }) {
  const key = base32Decode(secret);
  let lastAcceptedStep = -Infinity;

  return {
    verify(code) {
      if (typeof code !== 'string' || !CODE_RE.test(code)) return false;
      const current = Math.floor(clock() / 1000 / STEP_SECONDS);
      for (let delta = -window; delta <= window; delta += 1) {
        const step = current + delta;
        if (step <= lastAcceptedStep) continue;
        if (sameCode(hotp(key, step), code)) {
          lastAcceptedStep = step;
          return true;
        }
      }
      return false;
    },
  };
}
