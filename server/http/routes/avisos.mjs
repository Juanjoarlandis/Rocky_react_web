import express from 'express';
import { asyncRoute } from '../middleware/async-route.mjs';
import { createFixedWindowRateLimiter } from '../middleware/rate-limit.mjs';

// El mostrador de avisos de un drop. El navegador manda producto, email,
// consentimiento y un campo trampa; la lista sólo sale por el script de
// exportación, nunca por la API. La respuesta es {ok, duplicate, product};
// los mensajes de error van en castellano porque los lee la persona.
export function createAvisosRouter({ config, avisos, requireOrigin }) {
  const router = express.Router();

  router.post(
    '/',
    requireOrigin,
    createFixedWindowRateLimiter({
      max: config.avisos.rateLimitMax,
      windowMs: config.avisos.rateLimitWindowMs,
    }),
    asyncRoute(async (req, res) => {
      const { producto, email, consentimiento, apodo } = req.body ?? {};

      // El campo trampa: ningún humano lo ve, así que quien lo rellena es un
      // bot. Se le dice que sí a todo y no se guarda nada.
      if (typeof apodo === 'string' && apodo.trim() !== '') {
        return res.json({ ok: true, duplicate: false, product: null });
      }

      const product = avisos.normalizeProduct(producto);
      if (!product) {
        return res.status(400).json({ message: 'Falta saber de qué producto avisarte.' });
      }
      const cleanEmail = avisos.normalizeEmail(email);
      if (!cleanEmail) {
        return res.status(400).json({ message: 'Ese email no parece un email.' });
      }
      if (consentimiento !== true) {
        return res.status(400).json({ message: 'Necesitamos tu permiso para apuntarte.' });
      }
      if (!(await avisos.isKnownProduct(product))) {
        return res.status(400).json({ message: 'Ese producto no está en la tienda.' });
      }

      const result = await avisos.register({ product, email: cleanEmail });
      if (result.status === 'full') {
        res.setHeader('Retry-After', '3600');
        return res.status(429).json({ message: 'La lista está a reventar; inténtalo más tarde.' });
      }
      return res.json({ ok: true, duplicate: result.status === 'duplicate', product });
    })
  );

  return router;
}
