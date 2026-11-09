import express from 'express';
import { DROP_STATES, isDropHandle } from '../../../shared/drops.mjs';
import { calendarDrop, dropIcs } from '../../../shared/drop-calendar.mjs';
import { HttpError } from '../errors.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';

// La cara pública de los drops (calendario-de-drops, catalogo-vivo):
//   GET /api/drops                          → { now, featured, drops }
//   GET /api/drops/<handle>/calendario.ics  → el evento de un drop anunciado
// Del anunciado solo sale el teaser: el modelo ya no manda sus diseños.

export function sendIcs(res, drop, ics) {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rocky035-${drop.handle}.ics"`);
  res.setHeader('Cache-Control', 'no-cache');
  return res.send(ics);
}

const notFound = () =>
  new HttpError('Ese drop no existe.', { status: 404, code: 'DROP_NOT_FOUND' });

export function createDropsRouter({ config, drops, clock = () => new Date() }) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      // El estado depende de la hora: nada de cachés compartidas.
      res.setHeader('Cache-Control', 'no-cache');
      return res.json(await drops.publicPayload());
    })
  );

  router.get(
    '/:handle/calendario.ics',
    asyncRoute(async (req, res) => {
      const { handle } = req.params;
      if (!isDropHandle(handle)) throw notFound();
      const drop = await drops.publicDrop(handle);
      if (!drop) throw notFound();
      if (drop.state !== DROP_STATES.ANNOUNCED) {
        throw new HttpError('Ese drop ya no tiene fecha por delante.', {
          status: 404,
          code: 'DROP_NOT_ANNOUNCED',
        });
      }
      const event = calendarDrop(drop);
      return sendIcs(res, event, dropIcs(event, { origin: config.publicOrigin, now: clock() }));
    })
  );

  return router;
}
