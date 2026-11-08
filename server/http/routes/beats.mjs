import crypto from 'node:crypto';
import express from 'express';
import { HttpError } from '../errors.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { createFixedWindowRateLimiter } from '../middleware/rate-limit.mjs';
import { ValidationError, rules, validateBody, validateQuery } from '../middleware/validate.mjs';
import { ORDERS, checkSubmission, isBeatId, voterKeyOf } from '../../services/beats.mjs';

// El ranking de La Colmena. Leer es libre; publicar, votar y reportar exigen
// el origen de la web y van con su límite por IP. La sesión sólo se abre
// después de validar la entrada, y la lista se lee sin crearla.

const LIST_QUERY = {
  orden: rules.optional(
    rules.string({
      max: 10,
      pattern: new RegExp(`^(?:${ORDERS.join('|')})$`),
      message: 'Ese orden no existe.',
    })
  ),
};

function swingRule(value, field) {
  const swing = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(swing)) {
    throw new ValidationError('Ese swing no cabe en la mesa.', { field });
  }
  return swing;
}

const PUBLISH_BODY = {
  code: rules.string({
    min: 16,
    max: 65,
    pattern: /^[0-9a-f]+$/i,
    message: 'Ese beat no viene de la mesa.',
  }),
  bpm: rules.integer({ min: 60, max: 180, message: 'Ese tempo no cabe en la mesa.' }),
  swing: swingRule,
  tono: rules.string({ max: 3, pattern: /^[a-z]+$/, message: 'Esa tonalidad no está en la mesa.' }),
  name: rules.string({ max: 60, message: 'Ponle nombre a tu beat.' }),
  alias: rules.string({ max: 40, message: 'Pon tu apodo.' }),
  // Campo trampa: nadie lo ve, así que quien lo rellena es un bot.
  web: rules.optional(rules.string({ max: 200 })),
};

function notFound() {
  return new HttpError('Ese beat no existe.', { status: 404, code: 'BEAT_NOT_FOUND' });
}

function sameToken(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createBeatsRouter({
  config,
  beats,
  sessions,
  requireOrigin,
  hasPersistentStorage = false,
}) {
  const router = express.Router();
  const publishLimit = createFixedWindowRateLimiter({
    max: config.beats.publishRateLimitMax,
    windowMs: config.beats.rateLimitWindowMs,
  });
  const voteLimit = createFixedWindowRateLimiter({
    max: config.beats.voteRateLimitMax,
    windowMs: config.beats.rateLimitWindowMs,
  });
  // Sin almacén persistente, en producción los beats se perderían al
  // reiniciar: mejor decirlo que fingir que se han guardado.
  const requireStorage = (req, res, next) => {
    if (config.isProduction && !hasPersistentStorage) {
      return next(
        new HttpError('El ranking no está disponible ahora mismo.', {
          status: 503,
          code: 'BEATS_UNAVAILABLE',
        })
      );
    }
    return next();
  };

  router.get(
    '/',
    validateQuery(LIST_QUERY),
    asyncRoute(async (req, res) => {
      const orden = req.query.orden || 'semana';
      const session = await sessions.read(req);
      const list = await beats.list({ order: orden, voterKey: voterKeyOf(session) });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ orden, beats: list });
    })
  );

  router.post(
    '/',
    requireOrigin,
    publishLimit,
    requireStorage,
    validateBody(PUBLISH_BODY),
    asyncRoute(async (req, res) => {
      if (req.body.web) return res.status(201).json({ beat: null, duplicate: false });
      const { beat, error } = checkSubmission(req.body);
      if (error) throw new HttpError(error, { status: 400, code: 'BEAT_INVALID' });
      const session = await sessions.open(req, res);
      const result = await beats.publish(beat, voterKeyOf(session));
      if (result.status === 'limit') {
        throw new HttpError('Por hoy ya has publicado bastante: vuelve mañana.', {
          status: 429,
          code: 'BEATS_DAILY_LIMIT',
        });
      }
      // Si ese mismo beat ya estaba, no es un error: se devuelve el que había.
      const duplicate = result.status === 'duplicate';
      return res.status(duplicate ? 200 : 201).json({ beat: result.beat, duplicate });
    })
  );

  router.post(
    '/:id/like',
    requireOrigin,
    voteLimit,
    requireStorage,
    asyncRoute(async (req, res) => {
      if (!isBeatId(req.params.id)) throw notFound();
      const session = await sessions.open(req, res);
      const result = await beats.toggleLike(req.params.id, voterKeyOf(session));
      if (!result) throw notFound();
      res.json(result);
    })
  );

  router.post(
    '/:id/report',
    requireOrigin,
    voteLimit,
    requireStorage,
    asyncRoute(async (req, res) => {
      if (!isBeatId(req.params.id)) throw notFound();
      const session = await sessions.open(req, res);
      const result = await beats.report(req.params.id, voterKeyOf(session));
      if (!result) throw notFound();
      res.json({ ok: true, hidden: result.hidden });
    })
  );

  // Quitar un beat: sólo con BEATS_ADMIN_TOKEN configurado en el servidor.
  // Sin él, la ruta no existe.
  router.delete(
    '/:id',
    requireOrigin,
    voteLimit,
    asyncRoute(async (req, res) => {
      const expected = config.beats.adminToken;
      if (!expected) throw new HttpError('Ruta no encontrada.', { status: 404, code: 'NOT_FOUND' });
      const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!given || !sameToken(given, expected)) {
        throw new HttpError('No autorizado.', { status: 401, code: 'UNAUTHORIZED' });
      }
      if (!isBeatId(req.params.id)) throw notFound();
      const removed = await beats.remove(req.params.id);
      if (!removed) throw notFound();
      res.json({ ok: true });
    })
  );

  return router;
}
