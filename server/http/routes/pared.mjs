import crypto from 'node:crypto';
import express from 'express';
import { clientKey } from '../../lib/client-key.mjs';
import { HttpError } from '../errors.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { createFixedWindowRateLimiter } from '../middleware/rate-limit.mjs';
import { rules, validateBody, validateQuery, ValidationError } from '../middleware/validate.mjs';
import { FIRMA_RE } from '../../services/pared/firmas.mjs';
import { ANCHOS, esPagina, validarTrazo } from '../../services/pared/validacion.mjs';

// LA PARED COMPARTIDA — API pública (pared-compartida, design.md D3).
// Leer una pared, pintar, deshacer, borrar lo propio y reportar. Todo con
// no-store; las mutaciones exigen el Origin exacto y tienen su límite por
// cliente (una IPv6 cuenta por su /64). Lo que llega se valida antes de abrir
// sesión o tocar el modelo.

const pagina = (value, field) => {
  if (!esPagina(value)) {
    throw new ValidationError('Esa página no tiene pared.', { field, code: 'WALL_INVALID_PAGE' });
  }
  return value;
};

const ancho = (value, field) => {
  if (!ANCHOS.includes(value)) {
    throw new ValidationError('Ese ancho de pared no existe.', {
      field,
      code: 'WALL_INVALID_WIDTH',
    });
  }
  return value;
};

const trazo = (value, field) => {
  const resultado = validarTrazo(value);
  if (!resultado.ok) {
    throw new ValidationError(resultado.message, { field, code: 'WALL_INVALID_STROKE' });
  }
  return resultado.trazo;
};

const firma = rules.string({
  max: 30,
  pattern: FIRMA_RE,
  message: 'Esa firma no existe.',
  code: 'WALL_SIGNATURE_NOT_FOUND',
});

const PARED = { pagina, ancho };

// Los mismos campos sirven a la limpieza de El Taller.
export const WALL_FIELDS = Object.freeze(PARED);
export const SIGNATURE_RULE = firma;
const STROKE_ID = /^[A-Za-z0-9_-]{11}$/;

const apagada = () =>
  new HttpError('La pared compartida está apagada.', { status: 404, code: 'WALL_DISABLED' });

const porCliente = (req) => clientKey(req.ip);

export function createWallRouter({ pared, sessions, requireOrigin }) {
  const router = express.Router();
  // Un sello por arranque en el ETag: si el proceso cae sin guardar el último
  // minuto, las versiones se repiten con otro contenido y un ETag viejo no
  // debe dar 304.
  const arranque = crypto.randomBytes(4).toString('hex');

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const activa = (req, res, next) => (pared.activa() ? next() : next(apagada()));

  router.get(
    '/',
    validateQuery(PARED),
    asyncRoute(async (req, res) => {
      await pared.listo;
      if (!pared.activa()) return res.json({ enabled: false });
      const sesion = await sessions.read(req);
      const vista = pared.leer({ ...req.query, sesion });
      // La respuesta depende de quién mira (sus firmas «mia»): el ETag también.
      const etag = `"${arranque}-${vista.version}-${vista.firma ?? 'anonimo'}"`;
      res.setHeader('ETag', etag);
      if (req.get('If-None-Match') === etag) return res.status(304).end();
      return res.json({ enabled: true, ...vista });
    })
  );

  router.post(
    '/trazos',
    requireOrigin,
    createFixedWindowRateLimiter({ max: 40, windowMs: 60_000, keyForRequest: porCliente }),
    validateBody({ ...PARED, trazo }),
    activa,
    asyncRoute(async (req, res) => {
      await pared.listo;
      const sesion = await sessions.open(req, res);
      const { pagina: p, ancho: a, trazo: t } = req.body;
      const pintado = pared.pintar({ pagina: p, ancho: a, sesion, trazo: t });
      return res.status(201).json(pintado);
    })
  );

  router.delete(
    '/trazos/:id',
    requireOrigin,
    validateQuery(PARED),
    activa,
    asyncRoute(async (req, res) => {
      if (!STROKE_ID.test(req.params.id)) {
        throw new HttpError('Ese trazo ya no está en la pared.', {
          status: 404,
          code: 'WALL_STROKE_NOT_FOUND',
        });
      }
      const sesion = await sessions.read(req);
      if (!sesion) {
        throw new HttpError('Ese trazo no es tuyo.', { status: 403, code: 'WALL_NOT_YOURS' });
      }
      pared.deshacer({ ...req.query, sesion, id: req.params.id });
      return res.status(204).end();
    })
  );

  router.delete(
    '/mios',
    requireOrigin,
    validateQuery(PARED),
    activa,
    asyncRoute(async (req, res) => {
      const sesion = await sessions.read(req);
      if (sesion) pared.borrarMios({ ...req.query, sesion });
      return res.status(204).end();
    })
  );

  router.post(
    '/reportes',
    requireOrigin,
    createFixedWindowRateLimiter({ max: 20, windowMs: 60 * 60_000, keyForRequest: porCliente }),
    validateBody({ ...PARED, firma }),
    activa,
    asyncRoute(async (req, res) => {
      const sesion = await sessions.open(req, res);
      const resultado = pared.reportar({ ...req.body, sesion, cliente: porCliente(req) });
      return res.status(202).json(resultado);
    })
  );

  return router;
}
