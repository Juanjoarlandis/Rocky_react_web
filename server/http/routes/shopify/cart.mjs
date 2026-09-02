import express from 'express';
import { CART_LINE_ID, PRODUCT_VARIANT_ID } from '../../../integrations/shopify/storefront.mjs';
import { asyncRoute } from '../../middleware/async-route.mjs';
import { rules, validateBody } from '../../middleware/validate.mjs';

export const OPERATION_ID_RULE = rules.string({
  min: 8,
  max: 100,
  pattern: /^[A-Za-z0-9_-]{8,100}$/,
  message: 'operationId no válido.',
  code: 'INVALID_OPERATION_ID',
});

const VARIANT_ID_RULE = rules.string({
  max: 200,
  pattern: PRODUCT_VARIANT_ID,
  message: 'La variante no es válida.',
  code: 'INVALID_VARIANT',
});

const QUANTITY_RULE = rules.integer({
  min: 1,
  max: 20,
  message: 'La cantidad no es válida.',
  code: 'INVALID_QUANTITY',
});

const LINE_ID_RULE = rules.string({
  max: 300,
  pattern: CART_LINE_ID,
  message: 'La línea del carrito no es válida.',
  code: 'INVALID_LINE',
});

const ADD_LINE_BODY = {
  variantId: VARIANT_ID_RULE,
  quantity: QUANTITY_RULE,
  operationId: OPERATION_ID_RULE,
};
const UPDATE_LINE_BODY = {
  lineId: LINE_ID_RULE,
  quantity: QUANTITY_RULE,
  operationId: OPERATION_ID_RULE,
};
const REMOVE_LINE_BODY = { lineId: LINE_ID_RULE, operationId: OPERATION_ID_RULE };

export function createCartRouter({ config, sessions, cartOperations, requireOrigin }) {
  const router = express.Router();
  const requireCartCapability = (req, res, next) => {
    if (!config.capabilities.cart) {
      return res.status(503).json({ message: 'El carrito Shopify no está configurado.' });
    }
    return next();
  };
  const context = (req) => ({ buyerIp: req.ip });

  router.get(
    '/cart',
    requireCartCapability,
    asyncRoute(async (req, res) => {
      const session = await sessions.open(req, res);
      return res.json(await cartOperations.read(session, context(req)));
    })
  );

  router.post(
    '/cart/lines',
    requireOrigin,
    requireCartCapability,
    validateBody(ADD_LINE_BODY),
    asyncRoute(async (req, res) => {
      const session = await sessions.open(req, res);
      return res.json(await cartOperations.addLine(session, req.body, context(req)));
    })
  );

  router.patch(
    '/cart/lines',
    requireOrigin,
    requireCartCapability,
    validateBody(UPDATE_LINE_BODY),
    asyncRoute(async (req, res) => {
      const session = await sessions.open(req, res);
      return res.json(await cartOperations.updateLine(session, req.body, context(req)));
    })
  );

  router.delete(
    '/cart/lines',
    requireOrigin,
    requireCartCapability,
    validateBody(REMOVE_LINE_BODY),
    asyncRoute(async (req, res) => {
      const session = await sessions.open(req, res);
      return res.json(await cartOperations.removeLine(session, req.body, context(req)));
    })
  );

  return router;
}
