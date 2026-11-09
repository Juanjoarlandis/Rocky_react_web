import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  createTotpVerifier,
  generateTotpSecret,
  hotp,
  otpauthUri,
  totpAt,
} from './totp.mjs';

// Secreto de los vectores del RFC 6238 (SHA-1): «12345678901234567890» en ASCII.
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');

describe('TOTP según el RFC 6238', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('a los %i s da %s (8 dígitos)', (seconds, code) => {
    expect(totpAt(RFC_SECRET, seconds * 1000, { digits: 8 })).toBe(code);
  });

  it('con 6 dígitos da los 6 últimos del vector', () => {
    expect(totpAt(RFC_SECRET, 59_000)).toBe('287082');
  });

  it('HOTP del RFC 4226 para el contador 0 y 1', () => {
    expect(hotp(RFC_SECRET, 0)).toBe('755224');
    expect(hotp(RFC_SECRET, 1)).toBe('287082');
  });
});

describe('base32', () => {
  it('va y vuelve, sin relleno y sin distinguir mayúsculas', () => {
    const encoded = base32Encode(RFC_SECRET);
    expect(encoded).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(encoded.toLowerCase())).toEqual(RFC_SECRET);
    expect(base32Decode('GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ====')).toEqual(RFC_SECRET);
  });

  it('rechaza caracteres que no son base32', () => {
    expect(() => base32Decode('GEZD1')).toThrow();
  });

  it('genera secretos de 160 bits distintos', () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(base32Decode(a)).toHaveLength(20);
    expect(a).not.toBe(b);
  });
});

describe('comprobación de códigos', () => {
  const secret = base32Encode(RFC_SECRET);
  const T = 1_111_111_111_000;

  function verifier(start = T) {
    let now = start;
    const v = createTotpVerifier({ secret, clock: () => now });
    return { v, setNow: (value) => (now = value) };
  }

  it('acepta el código de ahora', () => {
    const { v } = verifier();
    expect(v.verify(totpAt(RFC_SECRET, T))).toBe(true);
  });

  it('acepta el paso anterior y el siguiente, no los de más allá', () => {
    expect(verifier().v.verify(totpAt(RFC_SECRET, T - 30_000))).toBe(true);
    expect(verifier().v.verify(totpAt(RFC_SECRET, T + 30_000))).toBe(true);
    expect(verifier().v.verify(totpAt(RFC_SECRET, T - 60_000))).toBe(false);
    expect(verifier().v.verify(totpAt(RFC_SECRET, T + 60_000))).toBe(false);
  });

  it('no deja reutilizar un código ni usar uno más viejo después', () => {
    const { v } = verifier();
    const now = totpAt(RFC_SECRET, T);
    expect(v.verify(now)).toBe(true);
    expect(v.verify(now)).toBe(false);
    expect(v.verify(totpAt(RFC_SECRET, T - 30_000))).toBe(false);
  });

  it('el código del paso siguiente sigue valiendo cuando llega su turno', () => {
    const { v, setNow } = verifier();
    expect(v.verify(totpAt(RFC_SECRET, T))).toBe(true);
    setNow(T + 30_000);
    expect(v.verify(totpAt(RFC_SECRET, T + 30_000))).toBe(true);
  });

  it.each(['', '12345', '1234567', 'abcdef', ' 123456', null, undefined, 123456])(
    'rechaza %j sin lanzar',
    (code) => {
      expect(verifier().v.verify(code)).toBe(false);
    }
  );
});

describe('URI de alta en la app de códigos', () => {
  it('lleva el emisor, la cuenta y el secreto', () => {
    const uri = otpauthUri({ secret: 'ABC234', issuer: 'ROCKY 035', account: 'taller' });
    expect(uri).toBe(
      'otpauth://totp/ROCKY%20035:taller?secret=ABC234&issuer=ROCKY%20035&algorithm=SHA1&digits=6&period=30'
    );
  });
});
