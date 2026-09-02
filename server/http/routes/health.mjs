import express from 'express';
import { describeError } from '../errors.mjs';
import { ensureLogger } from '../../lib/logger.mjs';
import { isLoopbackAddress } from '../access-gate.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';

// Sonda de salud para el healthcheck del contenedor. Con la puerta privada
// activa sólo responde desde loopback: hacia fuera, la web no existe. Si el
// almacén no responde (clave incorrecta, disco no escribible) contesta 503.
export function createHealthRouter({ config, store, logger }) {
  const log = ensureLogger(logger);
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      if (config.siteAccess.enabled && !isLoopbackAddress(req.socket.remoteAddress)) {
        res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
        return res.status(404).json({ message: 'Ruta no encontrada.' });
      }
      try {
        await store.probe();
      } catch (error) {
        log.error('State store probe failed', {
          requestId: req.requestId,
          reason: 'store_unavailable',
          ...describeError(error),
        });
        return res.status(503).json({ status: 'unavailable' });
      }
      return res.json({ status: 'ok' });
    })
  );

  return router;
}
