import express from 'express';
import { CURRENT_DROP } from '../../../shared/campaign.mjs';
import { dropIcs } from '../../../shared/drop-calendar.mjs';
import { HttpError } from '../errors.mjs';

// El lanzamiento del drop para el calendario. Un archivo .ics servido con su
// tipo de verdad: así el móvil abre «Añadir al calendario» en vez de
// enseñar texto. Sin fecha en la campaña, no hay evento.
export function createDropRouter({ config, drop = CURRENT_DROP, clock = () => new Date() }) {
  const router = express.Router();

  router.get('/calendario.ics', (req, res, next) => {
    const ics = dropIcs(drop, { origin: config.publicOrigin, now: clock() });
    if (!ics) {
      return next(
        new HttpError('Aún no hay fecha para el drop.', { status: 404, code: 'DROP_WITHOUT_DATE' })
      );
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rocky035-${drop.handle}.ics"`);
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(ics);
  });

  return router;
}
