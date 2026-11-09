import { describe, expect, it } from 'vitest';
import { verifyPassword } from '../server/lib/password-hash.mjs';
import { base32Decode } from '../server/lib/totp.mjs';
import { buildTallerCredentials } from './taller-clave.mjs';

describe('npm run taller:clave', () => {
  it('inventa una clave fuerte cuyo hash la verifica', async () => {
    const credentials = await buildTallerCredentials();
    expect(credentials.password.length).toBeGreaterThanOrEqual(24);
    expect(await verifyPassword(credentials.password, credentials.hash)).toBe(true);
  }, 10_000);

  it('usa la clave dada y da un secreto TOTP de 160 bits con su URI', async () => {
    const credentials = await buildTallerCredentials({ password: 'la clave que elijo yo' });
    expect(await verifyPassword('la clave que elijo yo', credentials.hash)).toBe(true);
    expect(base32Decode(credentials.totpSecret)).toHaveLength(20);
    expect(credentials.uri).toContain(`secret=${credentials.totpSecret}`);
  }, 10_000);

  it('rechaza una clave corta', async () => {
    await expect(buildTallerCredentials({ password: 'corta' })).rejects.toThrow();
  });
});
