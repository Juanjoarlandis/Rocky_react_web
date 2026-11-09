import express from 'express';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { calendarDrop, dropIcs } from '../../../shared/drop-calendar.mjs';
import { HttpError } from '../errors.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { sendIcs } from './drops.mjs';

// El calendario heredado: /api/drop/calendario.ics sirve el del drop destacado
// (calendario-de-drops). Los enlaces viejos siguen funcionando; los nuevos van
// a /api/drops/<handle>/calendario.ics.
export function createDropRouter({ config, drops, clock = () => new Date() }) {
  const router = express.Router();

  router.get(
    '/calendario.ics',
    asyncRoute(async (req, res) => {
      const { featured } = await drops.publicPayload();
      if (featured?.state !== DROP_STATES.ANNOUNCED) {
        throw new HttpError('Aún no hay fecha para el drop.', {
          status: 404,
          code: 'DROP_WITHOUT_DATE',
        });
      }
      const drop = calendarDrop(featured);
      return sendIcs(res, drop, dropIcs(drop, { origin: config.publicOrigin, now: clock() }));
    })
  );

  return router;
}
