import express from 'express';
import { asyncRoute } from '../../middleware/async-route.mjs';
import { rules, validateQuery } from '../../middleware/validate.mjs';

const PRODUCTS_QUERY = {
  first: rules.optional(rules.integer({ min: 1, max: 50, code: 'INVALID_QUERY' })),
  after: rules.optional(rules.string({ max: 500, code: 'INVALID_QUERY' })),
};

export function createCatalogRouter({ config, storefront }) {
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
      if (!storefront) {
        return res.status(503).json({ message: 'El catálogo Shopify no está configurado.' });
      }
      const catalog = await storefront.listProducts({
        first: req.query.first,
        after: req.query.after,
        buyerIp: req.ip,
      });
      return res.json(catalog);
    })
  );

  return router;
}
