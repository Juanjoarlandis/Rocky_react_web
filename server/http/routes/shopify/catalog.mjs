import express from 'express';
import { asyncRoute } from '../../middleware/async-route.mjs';
import { rules, validateQuery } from '../../middleware/validate.mjs';

const PRODUCTS_QUERY = {
  first: rules.optional(rules.integer({ min: 1, max: 50, code: 'INVALID_QUERY' })),
  after: rules.optional(rules.string({ max: 500, code: 'INVALID_QUERY' })),
};

// El catálogo completo (catalogo-vivo): el BFF pagina y decora con el drop de
// cada diseño. `first` y `after` se siguen validando por compatibilidad, pero
// la respuesta trae siempre todo, con pageInfo.hasNextPage en false.
export function createCatalogRouter({ config, catalog }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json({
      mode: config.capabilities.catalog ? 'shopify' : 'demo',
      apiVersion: config.apiVersion,
      capabilities: config.capabilities,
    });
  });

  router.get(
    '/products',
    validateQuery(PRODUCTS_QUERY),
    asyncRoute(async (req, res) => {
      if (!catalog) {
        return res.status(503).json({ message: 'El catálogo Shopify no está configurado.' });
      }
      return res.json(await catalog.list({ buyerIp: req.ip }));
    })
  );

  return router;
}
