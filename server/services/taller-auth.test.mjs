import { describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../lib/password-hash.mjs';
import { base32Decode, totpAt } from '../lib/totp.mjs';
import { MemoryStore } from '../storage/memory-store.mjs';
import { createSessionManager } from './sessions.mjs';
import { createTallerAuth } from './taller-auth.mjs';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const PASSWORD = 'la clave del taller de prueba';
const T0 = 1_800_000_000_000;

async function setup() {
  let now = T0;
  const clock = () => now;
  const store = new MemoryStore();
  const sessions = createSessionManager({ store, isProduction: false, clock });
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const config = {
    enabled: true,
    passwordHash: await hashPassword(PASSWORD, { N: 1024, r: 8, p: 1 }),
    totpSecret: SECRET,
    sessionLifetimeMs: 8 * 60 * 60 * 1000,
  };
  const auth = createTallerAuth({ config, sessions, logger, clock });
  return { auth, sessions, store, logger, advance: (ms) => (now += ms), now: () => now };
}

/* Petición y respuesta mínimas: la cookie que pone una respuesta la lleva la
   petición siguiente. */
function browser(ip = '203.0.113.7') {
  let cookie = '';
  return {
    req: () => ({ ip, get: (name) => (name.toLowerCase() === 'cookie' ? cookie : '') }),
    res: () => ({
      headers: {},
      append(name, value) {
        if (name === 'Set-Cookie') cookie = value.split(';')[0];
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
    }),
  };
}

const code = (now) => totpAt(base32Decode(SECRET), now);

describe('entrada al Taller', () => {
  it('con clave y código buenos entra, rota la sesión y conserva carrito y puerta', async () => {
    const { auth, sessions, now } = await setup();
    const b = browser();
    const before = await sessions.open(b.req(), b.res());
    await sessions.save(before, {
      cartId: 'cart-1',
      siteAccessGrant: 'g',
      siteAccessExpiresAt: T0 + 1e6,
    });

    const result = await auth.login(b.req(), b.res(), { password: PASSWORD, code: code(now()) });
    expect(result).toEqual({ active: true, expiresAt: new Date(T0 + 8 * 3_600_000).toISOString() });

    const after = await sessions.read(b.req());
    expect(after.key).not.toBe(before.key);
    expect(after.record).toMatchObject({ cartId: 'cart-1', siteAccessGrant: 'g' });
    expect((await auth.status(b.req())).active).toBe(true);
  });

  it('clave buena y código malo da el mismo error que clave mala', async () => {
    const { auth, now } = await setup();
    const b = browser();
    const wrongCode = await auth
      .login(b.req(), b.res(), { password: PASSWORD, code: '000000' })
      .catch((e) => e);
    const wrongPassword = await auth
      .login(b.req(), b.res(), { password: 'otra clave cualquiera', code: code(now()) })
      .catch((e) => e);
    expect(wrongCode).toMatchObject({ status: 401, code: 'TALLER_LOGIN_FAILED' });
    expect(wrongPassword).toMatchObject({ status: 401, code: 'TALLER_LOGIN_FAILED' });
    expect(wrongCode.message).toBe(wrongPassword.message);
  });

  it('una clave mala no gasta el código del dueño', async () => {
    const { auth, now } = await setup();
    const b = browser();
    const current = code(now());
    await auth
      .login(b.req(), b.res(), { password: 'clave equivocada aquí', code: current })
      .catch(() => {});
    await expect(
      auth.login(b.req(), b.res(), { password: PASSWORD, code: current })
    ).resolves.toMatchObject({
      active: true,
    });
  });

  it('un código ya usado no vale otra vez', async () => {
    const { auth, now } = await setup();
    const current = code(now());
    await auth.login(browser().req(), browser().res(), { password: PASSWORD, code: current });
    await expect(
      auth.login(browser().req(), browser().res(), { password: PASSWORD, code: current })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('el sexto intento de una IP responde 429 aunque la clave sea buena', async () => {
    const { auth, now } = await setup();
    const b = browser('198.51.100.9');
    for (let i = 0; i < 5; i += 1) {
      await auth
        .login(b.req(), b.res(), { password: 'no es la clave buena', code: '123456' })
        .catch(() => {});
    }
    const res = b.res();
    await expect(
      auth.login(b.req(), res, { password: PASSWORD, code: code(now()) })
    ).rejects.toMatchObject({
      status: 429,
      code: 'TALLER_TOO_MANY_ATTEMPTS',
    });
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('el permiso caduca a las 8 horas', async () => {
    const { auth, advance, now } = await setup();
    const b = browser();
    await auth.login(b.req(), b.res(), { password: PASSWORD, code: code(now()) });
    advance(8 * 3_600_000 - 1);
    expect((await auth.status(b.req())).active).toBe(true);
    advance(1);
    expect((await auth.status(b.req())).active).toBe(false);
  });

  it('salir quita el permiso y deja el carrito', async () => {
    const { auth, sessions, now } = await setup();
    const b = browser();
    await auth.login(b.req(), b.res(), { password: PASSWORD, code: code(now()) });
    const session = await sessions.read(b.req());
    await sessions.save(session, { cartId: 'cart-9' });
    await auth.logout(b.req());
    expect((await auth.status(b.req())).active).toBe(false);
    expect((await sessions.read(b.req())).record.cartId).toBe('cart-9');
  });

  it('un permiso de otro proceso (servidor reiniciado) no vale', async () => {
    const first = await setup();
    const b = browser();
    await first.auth.login(b.req(), b.res(), { password: PASSWORD, code: code(first.now()) });
    const other = createTallerAuth({
      config: { enabled: true, passwordHash: 'x', totpSecret: SECRET, sessionLifetimeMs: 1e9 },
      sessions: first.sessions,
      clock: first.now,
    });
    expect((await other.status(b.req())).active).toBe(false);
  });

  it('el log no lleva claves, códigos ni la IP', async () => {
    const { auth, logger, now } = await setup();
    const b = browser('192.0.2.44');
    await auth
      .login(b.req(), b.res(), { password: 'clave mala de prueba', code: '111111' })
      .catch(() => {});
    await auth.login(b.req(), b.res(), { password: PASSWORD, code: code(now()) });
    const logged = JSON.stringify([logger.info.mock.calls, logger.warn.mock.calls]);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain('clave mala');
    expect(logged).not.toContain('111111');
    expect(logged).not.toContain('192.0.2.44');
    expect(logger.warn).toHaveBeenCalledWith('Entrada al Taller fallida', {});
    expect(logger.info).toHaveBeenCalledWith('Entrada al Taller', {});
  });

  it('el middleware deja pasar con permiso y responde 401 sin él', async () => {
    const { auth, now } = await setup();
    const b = browser();
    const blocked = vi.fn();
    await auth.requireTaller(b.req(), b.res(), blocked);
    expect(blocked.mock.calls[0][0]).toMatchObject({ status: 401, code: 'TALLER_AUTH_REQUIRED' });
    await auth.login(b.req(), b.res(), { password: PASSWORD, code: code(now()) });
    const allowed = vi.fn();
    await auth.requireTaller(b.req(), b.res(), allowed);
    expect(allowed).toHaveBeenCalledWith();
  });
});
