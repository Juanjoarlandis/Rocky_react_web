import express from 'express';
import { asyncRoute } from '../../middleware/async-route.mjs';

export function createCheckoutRouter({ config, sessions, cartOperations, requireOrigin }) {
  const router = express.Router();

  router.post(
    '/checkout',
    requireOrigin,
    asyncRoute(async (req, res) => {
      if (!config.capabilities.cart) {
        return res.status(503).json({ message: 'El checkout Shopify no está configurado.' });
      }
      const session = await sessions.read(req);
      return res.json(await cartOperations.checkout(session, { buyerIp: req.ip }));
    })
  );

  return router;
}
