import express from 'express';
import { isLoopbackAddress } from '../access-gate.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';

// Sonda de salud para el healthcheck del contenedor. Con la puerta privada
// activa sólo responde desde loopback: hacia fuera, la web no existe.
export function createHealthRouter({ config }) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      if (config.siteAccess.enabled && !isLoopbackAddress(req.socket.remoteAddress)) {
        res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
        return res.status(404).json({ message: 'Ruta no encontrada.' });
      }
      return res.json({ status: 'ok' });
    })
  );

  return router;
}
