import crypto from 'node:crypto';
import { HttpError } from '../http/errors.mjs';
import { createAttemptTracker } from '../lib/attempt-tracker.mjs';
import { ensureLogger } from '../lib/logger.mjs';
import { verifyPassword } from '../lib/password-hash.mjs';
import { createTotpVerifier } from '../lib/totp.mjs';

// La entrada al Taller (taller-de-drops, design.md D7): clave scrypt más código
// TOTP, 5 intentos por IP cada 15 minutos, sesión rotada al entrar y permiso de
// 8 horas guardado en la propia sesión. El permiso lleva un secreto del proceso:
// reiniciar el servidor cierra el Taller, como la puerta de acceso.
//
// El código solo se comprueba si la clave es buena: quien prueba claves no
// puede gastar el código del dueño. El log no lleva ni claves, ni códigos, ni
// la IP.

const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
// Lo que la sesión conserva al rotar: el carrito, la cuenta y la puerta.
const PRESERVE = ['cartId', 'customerTokenId', 'siteAccessGrant', 'siteAccessExpiresAt'];
const FAILED_MESSAGE = 'La clave o el código no valen.';

export function createTallerAuth({
  config,
  sessions,
  logger,
  clock = () => Date.now(),
  processGrant = crypto.randomBytes(32).toString('base64url'),
}) {
  const log = ensureLogger(logger);
  const totp = createTotpVerifier({ secret: config.totpSecret, clock });
  const attempts = createAttemptTracker({
    limit: ATTEMPT_LIMIT,
    windowMs: ATTEMPT_WINDOW_MS,
    clock,
  });

  function grantOf(record) {
    const active =
      record?.tallerGrant === processGrant &&
      Number.isFinite(record.tallerExpiresAt) &&
      record.tallerExpiresAt > clock();
    return active
      ? { active: true, expiresAt: new Date(record.tallerExpiresAt).toISOString() }
      : { active: false, expiresAt: null };
  }

  async function status(req) {
    const session = await sessions.read(req);
    return grantOf(session?.record);
  }

  return {
    status,

    async login(req, res, { password, code }) {
      const key = req.ip || 'unknown';
      const limit = attempts.consume(key);
      if (limit.isLimited) {
        res.setHeader('Retry-After', String(limit.retryAfterSeconds));
        log.warn('Entrada al Taller limitada', {});
        throw new HttpError('Demasiados intentos. Espera un poco y vuelve a probar.', {
          status: 429,
          code: 'TALLER_TOO_MANY_ATTEMPTS',
        });
      }

      const passwordOk = await verifyPassword(password, config.passwordHash);
      const codeOk = passwordOk && totp.verify(code);
      if (!codeOk) {
        log.warn('Entrada al Taller fallida', {});
        throw new HttpError(FAILED_MESSAGE, { status: 401, code: 'TALLER_LOGIN_FAILED' });
      }

      attempts.clear(key);
      const expiresAt = clock() + config.sessionLifetimeMs;
      await sessions.rotate(
        req,
        res,
        { tallerGrant: processGrant, tallerExpiresAt: expiresAt },
        { preserve: PRESERVE }
      );
      log.info('Entrada al Taller', {});
      return { active: true, expiresAt: new Date(expiresAt).toISOString() };
    },

    async logout(req) {
      const session = await sessions.read(req);
      if (session) await sessions.save(session, { tallerGrant: null, tallerExpiresAt: 0 });
      log.info('Salida del Taller', {});
    },

    async requireTaller(req, res, next) {
      try {
        if ((await status(req)).active) return next();
        return next(
          new HttpError('Entra en el Taller para seguir.', {
            status: 401,
            code: 'TALLER_AUTH_REQUIRED',
          })
        );
      } catch (error) {
        return next(error);
      }
    },
  };
}
