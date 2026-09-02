import express from 'express';
import { CrewRewardsError } from '../../services/crew/rewards.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { rules, validateBody } from '../middleware/validate.mjs';

const REWARD_ID_RULE = rules.string({
  max: 100,
  message: 'La recompensa no es válida.',
  code: 'INVALID_REWARD_ID',
});

const AVATAR_BODY = { rewardId: REWARD_ID_RULE };
const REDEEM_BODY = {
  rewardId: REWARD_ID_RULE,
  operationId: rules.string({
    min: 8,
    max: 100,
    pattern: /^[A-Za-z0-9_-]{8,100}$/,
    message: 'La operación de canje no es válida.',
    code: 'INVALID_OPERATION_ID',
  }),
};

// Perfil Crew: la identidad sale siempre de Customer Accounts a partir de la
// cookie opaca; el navegador nunca manda su saldo ni su id.
export function createCrewRouter({ sessions, customerAccounts, crewRewards, requireOrigin }) {
  const router = express.Router();

  async function requireCrewCustomer(req) {
    if (!customerAccounts || !crewRewards) {
      throw new CrewRewardsError('El perfil Crew todavía no está disponible.', {
        status: 503,
        code: 'CREW_UNAVAILABLE',
      });
    }
    const session = await sessions.read(req);
    if (!session?.record.customerTokenId) {
      throw new CrewRewardsError('Inicia sesión para entrar en tu perfil Crew.', {
        status: 401,
        code: 'CREW_AUTH_REQUIRED',
      });
    }
    const customer = await customerAccounts.getCustomerProfile(session.record.customerTokenId);
    return {
      id: customer.id,
      displayName: customer.displayName || customer.firstName || 'Miembro 035',
    };
  }

  router.get(
    '/account/crew',
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.getProfile(customer.id, {
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  router.patch(
    '/account/crew/avatar',
    requireOrigin,
    validateBody(AVATAR_BODY),
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.equipReward(customer.id, {
        rewardId: req.body.rewardId,
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  router.post(
    '/account/crew/redeem',
    requireOrigin,
    validateBody(REDEEM_BODY),
    asyncRoute(async (req, res) => {
      const customer = await requireCrewCustomer(req);
      const profile = await crewRewards.redeemReward(customer.id, {
        rewardId: req.body.rewardId,
        operationId: req.body.operationId,
        displayName: customer.displayName,
      });
      return res.json({ profile });
    })
  );

  return router;
}
