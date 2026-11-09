import { describe, expect, it } from 'vitest';
import { hashPassword, parsePasswordHash, verifyPassword } from './password-hash.mjs';

// Parámetros pequeños para que las pruebas vayan rápido; el valor por defecto
// es más caro.
const FAST = { N: 1024, r: 8, p: 1 };

describe('hash de contraseñas con scrypt', () => {
  it('verifica la clave buena y rechaza la mala', async () => {
    const stored = await hashPassword('una clave larga de prueba', FAST);
    expect(stored).toMatch(/^scrypt\$1024\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(await verifyPassword('una clave larga de prueba', stored)).toBe(true);
    expect(await verifyPassword('una clave larga de prueb', stored)).toBe(false);
  });

  it('dos hashes de la misma clave no se parecen (sal distinta)', async () => {
    const a = await hashPassword('otra clave de prueba', FAST);
    const b = await hashPassword('otra clave de prueba', FAST);
    expect(a).not.toBe(b);
  });

  it('el valor por defecto es caro (N ≥ 32768)', async () => {
    const stored = await hashPassword('clave por defecto 123');
    expect(parsePasswordHash(stored).N).toBeGreaterThanOrEqual(32768);
  }, 10_000);

  it.each([
    'texto-plano',
    'scrypt$1024$8$1$sal',
    'bcrypt$1024$8$1$c2Fs$aGFzaA',
    'scrypt$1000$8$1$c2FsYWRh$aGFzaGhhc2g',
    'scrypt$2097152$8$1$c2FsYWRh$aGFzaGhhc2g',
    'scrypt$1024$64$1$c2FsYWRh$aGFzaGhhc2g',
  ])('no acepta el formato %s', async (stored) => {
    expect(parsePasswordHash(stored)).toBe(null);
    expect(await verifyPassword('loquesea', stored)).toBe(false);
  });

  it('no verifica claves vacías ni que no son texto', async () => {
    const stored = await hashPassword('clave buena para probar', FAST);
    expect(await verifyPassword('', stored)).toBe(false);
    expect(await verifyPassword(undefined, stored)).toBe(false);
  });

  it('no acepta generar el hash de una clave corta', async () => {
    await expect(hashPassword('corta', FAST)).rejects.toThrow();
  });
});
