import { describe, expect, it } from 'vitest';
import { createTallerConfig } from './taller.mjs';

// Un hash de formato válido (no hace falta que sea de ninguna clave concreta).
const HASH = `scrypt$32768$8$1$${'a'.repeat(22)}$${'b'.repeat(43)}`;
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const PUBLICATION = 'gid://shopify/Publication/370651955577';
const ADMIN = Object.freeze({ capabilities: { admin: true } });

const env = (patch = {}) => ({
  TALLER_PASSWORD_HASH: HASH,
  TALLER_TOTP_SECRET: SECRET,
  SHOPIFY_HEADLESS_PUBLICATION_ID: PUBLICATION,
  ...patch,
});

describe('configuración del Taller', () => {
  it('se enciende con clave, TOTP, Admin de Shopify y publicación', () => {
    const config = createTallerConfig(env(), ADMIN);
    expect(config).toMatchObject({
      enabled: true,
      passwordHash: HASH,
      totpSecret: SECRET,
      publicationId: PUBLICATION,
      sessionLifetimeMs: 8 * 60 * 60 * 1000,
    });
  });

  it.each([
    ['sin hash de clave', { TALLER_PASSWORD_HASH: '' }, ADMIN, 'falta TALLER_PASSWORD_HASH'],
    ['sin secreto TOTP', { TALLER_TOTP_SECRET: '' }, ADMIN, 'falta TALLER_TOTP_SECRET'],
    [
      'sin publicación Headless',
      { SHOPIFY_HEADLESS_PUBLICATION_ID: '' },
      ADMIN,
      'falta SHOPIFY_HEADLESS_PUBLICATION_ID',
    ],
    [
      'sin Admin de Shopify',
      {},
      { capabilities: { admin: false } },
      'faltan las credenciales Admin de Shopify',
    ],
  ])('está apagado %s y dice por qué', (_name, patch, shopify, reason) => {
    const config = createTallerConfig(env(patch), shopify);
    expect(config.enabled).toBe(false);
    expect(config.reason).toContain(reason);
    expect(config.passwordHash).toBe('');
    expect(config.totpSecret).toBe('');
  });

  it('sin nada configurado está apagado sin error', () => {
    expect(createTallerConfig({}, ADMIN).enabled).toBe(false);
  });

  it('un hash mal copiado hace fallar el arranque', () => {
    expect(() =>
      createTallerConfig(env({ TALLER_PASSWORD_HASH: 'mi-clave-en-claro' }), ADMIN)
    ).toThrow(/TALLER_PASSWORD_HASH/);
  });

  it('un secreto TOTP corto o que no es base32 hace fallar el arranque', () => {
    expect(() => createTallerConfig(env({ TALLER_TOTP_SECRET: 'GEZDGNBV' }), ADMIN)).toThrow(
      /TALLER_TOTP_SECRET/
    );
    expect(() => createTallerConfig(env({ TALLER_TOTP_SECRET: 'no-es-base32!' }), ADMIN)).toThrow(
      /TALLER_TOTP_SECRET/
    );
  });

  it('una publicación que no es un id de Shopify hace fallar el arranque', () => {
    expect(() =>
      createTallerConfig(env({ SHOPIFY_HEADLESS_PUBLICATION_ID: 'Rocky Headless' }), ADMIN)
    ).toThrow(/SHOPIFY_HEADLESS_PUBLICATION_ID/);
  });
});
