import crypto from 'node:crypto';

const CUSTOMER_GID = /^gid:\/\/shopify\/Customer\/[A-Za-z0-9_-]{1,100}$/;
const ORDER_GID = /^gid:\/\/shopify\/Order\/[A-Za-z0-9_-]{1,100}$/;
const OPERATION_ID = /^[A-Za-z0-9_-]{8,100}$/;
const MAX_PURCHASES = 12;
const MAX_ACTIVITY = 20;
const MAX_ORDER_IDS = 250;
const MAX_REDEMPTION_OPERATIONS = 50;

export const CREW_LEVELS = Object.freeze([
  { id: 'newcomer', name: 'Recién Llegado', minXp: 0 },
  { id: 'barrio', name: 'Del Barrio', minXp: 100 },
  { id: 'crew', name: 'Crew Member', minXp: 300 },
  { id: 'rider', name: 'Rocky Rider', minXp: 750 },
  { id: 'og', name: 'OG de la Colmena', minXp: 1_500 },
  { id: 'legend', name: 'Leyenda 035', minXp: 3_000 },
]);

export const CREW_REWARDS = Object.freeze([
  {
    id: 'skater-head',
    kind: 'avatar',
    name: 'Skater 035',
    description: 'La primera cara de la Crew. Entra rodando desde el minuto uno.',
    unlockMode: 'level',
    requiredXp: 0,
    ticketCostTenths: 0,
  },
  {
    id: 'dormido-head',
    kind: 'avatar',
    name: 'El Dormido',
    description: 'Cero prisa, máximo estilo. Se desbloquea al llegar al barrio.',
    unlockMode: 'level',
    requiredXp: 100,
    ticketCostTenths: 0,
  },
  {
    id: 'colgado-head',
    kind: 'avatar',
    name: 'El Colgado',
    description: 'Para quien ya está dentro de la Crew de verdad.',
    unlockMode: 'level',
    requiredXp: 300,
    ticketCostTenths: 0,
  },
  {
    id: 'bolsa-head',
    kind: 'avatar',
    name: 'Cabeza Cuadrada',
    description: 'La bolsa más buscada de la colmena.',
    unlockMode: 'level',
    requiredXp: 750,
    ticketCostTenths: 0,
  },
  {
    id: 'diana-jefe',
    kind: 'avatar',
    name: 'El Jefe Diana',
    description: 'Avatar reservado para los OG de la Colmena.',
    unlockMode: 'level',
    requiredXp: 1_500,
    ticketCostTenths: 0,
  },
  {
    id: 'estrella-apoyado',
    kind: 'avatar',
    name: 'Leyenda Estrella',
    description: 'La pieza final para quien llega a Leyenda 035.',
    unlockMode: 'level',
    requiredXp: 3_000,
    ticketCostTenths: 0,
  },
  {
    id: 'skater-ollie',
    kind: 'avatar',
    name: 'Ollie de la Crew',
    description: 'El skater completo entrando con un ollie.',
    unlockMode: 'tickets',
    requiredXp: 100,
    ticketCostTenths: 120,
  },
  {
    id: 'grafitero-spray',
    kind: 'avatar',
    name: 'Grafitero Spray',
    description: 'Trazo en una mano y lata en la otra.',
    unlockMode: 'tickets',
    requiredXp: 300,
    ticketCostTenths: 180,
  },
  {
    id: 'breakdance-freeze',
    kind: 'avatar',
    name: 'Freeze 035',
    description: 'Una postura imposible para perfiles con recorrido.',
    unlockMode: 'tickets',
    requiredXp: 750,
    ticketCostTenths: 250,
  },
  {
    id: 'frame-red-squiggle',
    kind: 'frame',
    name: 'Marco Trazo Rojo',
    description: 'El subrayado rojo de ROCKY rodeando tu perfil.',
    unlockMode: 'tickets',
    requiredXp: 100,
    ticketCostTenths: 50,
  },
  {
    id: 'frame-blue-ink',
    kind: 'frame',
    name: 'Marco Tinta Azul',
    description: 'Un borde azul irregular para perfiles Crew Member.',
    unlockMode: 'tickets',
    requiredXp: 300,
    ticketCostTenths: 90,
  },
]);

const REWARDS_BY_ID = new Map(CREW_REWARDS.map((reward) => [reward.id, reward]));

export class CrewRewardsError extends Error {
  constructor(message, { status = 400, code = 'CREW_REWARDS_ERROR' } = {}) {
    super(message);
    this.name = 'CrewRewardsError';
    this.status = status;
    this.code = code;
  }
}

function parseEuroCents(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, decimals = ''] = normalized.split('.');
  const cents = Number(euros) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function calculatePurchaseRewards({ amount, currency }) {
  if (String(currency || '').toUpperCase() !== 'EUR') return null;
  const eligibleCents = parseEuroCents(amount);
  if (eligibleCents === null) return null;
  const completeEuros = Math.floor(eligibleCents / 100);
  return { eligibleCents, xp: completeEuros, ticketTenths: completeEuros };
}

export function getCrewLevel(value) {
  const xp = Number.isSafeInteger(value) && value > 0 ? value : 0;
  let index = 0;
  for (let candidate = 1; candidate < CREW_LEVELS.length; candidate += 1) {
    if (xp < CREW_LEVELS[candidate].minXp) break;
    index = candidate;
  }
  const level = CREW_LEVELS[index];
  const next = CREW_LEVELS[index + 1] || null;
  const span = next ? next.minXp - level.minXp : 0;
  const progress = next ? Math.min(100, Math.round(((xp - level.minXp) / span) * 100)) : 100;
  return {
    ...level,
    currentXp: xp,
    nextXp: next?.minXp ?? null,
    nextLevelName: next?.name ?? null,
    progress,
  };
}

function validateCustomerId(customerId) {
  if (!CUSTOMER_GID.test(customerId || '')) {
    throw new CrewRewardsError('La identidad de cliente no es válida.', {
      status: 401,
      code: 'INVALID_CUSTOMER',
    });
  }
  return customerId;
}

function profileKey(customerId) {
  return crypto.createHash('sha256').update(customerId, 'utf8').digest('base64url');
}

function createProfile(now, displayName = '') {
  return {
    version: 1,
    displayName:
      String(displayName || '')
        .trim()
        .slice(0, 80) || 'Miembro 035',
    xp: 0,
    ticketBalanceTenths: 0,
    lifetimeTicketsEarnedTenths: 0,
    lifetimeTicketsSpentTenths: 0,
    equippedAvatarId: 'skater-head',
    equippedFrameId: null,
    ownedRewardIds: [],
    creditedOrderIds: [],
    redemptionOperations: {},
    purchases: [],
    activity: [],
    createdAt: now,
    updatedAt: now,
  };
}

function rewardOwned(profile, reward) {
  return (
    (reward.unlockMode === 'level' && profile.xp >= reward.requiredXp) ||
    profile.ownedRewardIds.includes(reward.id)
  );
}

function toTicketValue(tenths) {
  return Number((tenths / 10).toFixed(1));
}

function publicProfile(profile) {
  const level = getCrewLevel(profile.xp);
  const rewards = CREW_REWARDS.map((reward) => {
    const owned = rewardOwned(profile, reward);
    const levelUnlocked = profile.xp >= reward.requiredXp;
    const { ticketCostTenths, ...publicReward } = reward;
    return {
      ...publicReward,
      ticketCost: toTicketValue(ticketCostTenths),
      owned,
      available: reward.unlockMode === 'tickets' && levelUnlocked && !owned,
      locked: !levelUnlocked,
      equipped: profile.equippedAvatarId === reward.id || profile.equippedFrameId === reward.id,
    };
  });
  return {
    displayName: profile.displayName,
    xp: profile.xp,
    ticketBalance: toTicketValue(profile.ticketBalanceTenths),
    lifetimeTicketsEarned: toTicketValue(profile.lifetimeTicketsEarnedTenths),
    lifetimeTicketsSpent: toTicketValue(profile.lifetimeTicketsSpentTenths),
    equippedAvatarId: profile.equippedAvatarId,
    equippedFrameId: profile.equippedFrameId,
    level,
    collectionCount: rewards.filter((reward) => reward.owned).length,
    rewards,
    purchases: profile.purchases.map(({ ticketTenths, ...purchase }) => ({
      ...purchase,
      ticketsEarned: toTicketValue(ticketTenths),
    })),
    activity: profile.activity.map(({ ticketTenths, ...entry }) => ({
      ...entry,
      tickets: ticketTenths === undefined ? undefined : toTicketValue(ticketTenths),
    })),
  };
}

function createKeyedLock() {
  const tails = new Map();
  return async (key, action) => {
    const previous = tails.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    tails.set(key, tail);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

function orderSummary(order, rewards) {
  const items = Array.isArray(order.line_items)
    ? order.line_items
        .map((item) => String(item?.title || item?.name || '').trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return {
    orderName:
      String(order.name || '')
        .trim()
        .slice(0, 40) || 'Pedido ROCKY',
    amount: (rewards.eligibleCents / 100).toFixed(2),
    currency: 'EUR',
    xpEarned: rewards.xp,
    ticketTenths: rewards.ticketTenths,
    items,
    processedAt: String(order.processed_at || order.updated_at || '').slice(0, 40) || null,
  };
}

export function createCrewRewardsService({ store, clock = () => Date.now() }) {
  if (!store) throw new Error('Crew Rewards necesita almacenamiento.');
  const withCustomerLock = createKeyedLock();

  async function readPrivateProfile(customerId, { displayName = '' } = {}) {
    const key = profileKey(validateCustomerId(customerId));
    const stored = await store.get('crewProfiles', key);
    const profile = stored || createProfile(clock(), displayName);
    const nextName = String(displayName || '')
      .trim()
      .slice(0, 80);
    if (nextName && nextName !== profile.displayName) profile.displayName = nextName;
    return { key, profile };
  }

  async function saveProfile(key, profile) {
    profile.updatedAt = clock();
    await store.set('crewProfiles', key, profile);
    return publicProfile(profile);
  }

  return {
    async getProfile(customerId, options = {}) {
      const key = profileKey(validateCustomerId(customerId));
      return withCustomerLock(key, async () => {
        const { profile } = await readPrivateProfile(customerId, options);
        return saveProfile(key, profile);
      });
    },

    async creditPaidOrder(order) {
      const customerId = order?.customer?.admin_graphql_api_id;
      if (!CUSTOMER_GID.test(customerId || '')) {
        return { credited: false, reason: 'missing_customer' };
      }
      const orderId = order?.admin_graphql_api_id;
      if (!ORDER_GID.test(orderId || '')) {
        return { credited: false, reason: 'invalid_order' };
      }
      const money = order?.current_total_price_set?.shop_money;
      if (String(money?.currency_code || '').toUpperCase() !== 'EUR') {
        return { credited: false, reason: 'unsupported_currency' };
      }
      const rewards = calculatePurchaseRewards({
        amount: money?.amount,
        currency: money?.currency_code,
      });
      if (!rewards) return { credited: false, reason: 'invalid_total' };

      const key = profileKey(customerId);
      return withCustomerLock(key, async () => {
        const { profile } = await readPrivateProfile(customerId);
        if (profile.creditedOrderIds.includes(orderId)) {
          return { credited: false, reason: 'duplicate_order', profile: publicProfile(profile) };
        }

        profile.xp += rewards.xp;
        profile.ticketBalanceTenths += rewards.ticketTenths;
        profile.lifetimeTicketsEarnedTenths += rewards.ticketTenths;
        profile.creditedOrderIds = [...profile.creditedOrderIds, orderId].slice(-MAX_ORDER_IDS);
        const purchase = orderSummary(order, rewards);
        profile.purchases = [purchase, ...profile.purchases].slice(0, MAX_PURCHASES);
        profile.activity = [
          {
            type: 'purchase',
            label: `${purchase.orderName}: +${rewards.xp} XP`,
            xp: rewards.xp,
            ticketTenths: rewards.ticketTenths,
            occurredAt: purchase.processedAt,
          },
          ...profile.activity,
        ].slice(0, MAX_ACTIVITY);

        return { credited: true, profile: await saveProfile(key, profile) };
      });
    },

    async redeemReward(customerId, { rewardId, operationId, displayName = '' } = {}) {
      validateCustomerId(customerId);
      if (!OPERATION_ID.test(operationId || '')) {
        throw new CrewRewardsError('La operación de canje no es válida.', {
          code: 'INVALID_OPERATION_ID',
        });
      }
      const reward = REWARDS_BY_ID.get(rewardId);
      if (!reward || reward.unlockMode !== 'tickets') {
        throw new CrewRewardsError('La recompensa no se puede canjear.', {
          status: 404,
          code: 'REWARD_NOT_FOUND',
        });
      }
      const key = profileKey(customerId);
      return withCustomerLock(key, async () => {
        const { profile } = await readPrivateProfile(customerId, { displayName });
        const priorRewardId = profile.redemptionOperations[operationId];
        if (priorRewardId) {
          if (priorRewardId !== rewardId) {
            throw new CrewRewardsError('La operación ya se usó para otro canje.', {
              status: 409,
              code: 'OPERATION_CONFLICT',
            });
          }
          return publicProfile(profile);
        }
        if (profile.xp < reward.requiredXp) {
          throw new CrewRewardsError('Esta recompensa aún está bloqueada.', {
            status: 409,
            code: 'REWARD_LOCKED',
          });
        }
        if (rewardOwned(profile, reward)) {
          throw new CrewRewardsError('Esta recompensa ya pertenece a tu colección.', {
            status: 409,
            code: 'REWARD_ALREADY_OWNED',
          });
        }
        if (profile.ticketBalanceTenths < reward.ticketCostTenths) {
          throw new CrewRewardsError('No tienes suficientes Crew Tickets.', {
            status: 409,
            code: 'INSUFFICIENT_TICKETS',
          });
        }

        profile.ticketBalanceTenths -= reward.ticketCostTenths;
        profile.lifetimeTicketsSpentTenths += reward.ticketCostTenths;
        profile.ownedRewardIds.push(reward.id);
        profile.redemptionOperations = {
          ...profile.redemptionOperations,
          [operationId]: reward.id,
        };
        const operationEntries = Object.entries(profile.redemptionOperations);
        profile.redemptionOperations = Object.fromEntries(
          operationEntries.slice(-MAX_REDEMPTION_OPERATIONS)
        );
        if (reward.kind === 'avatar') profile.equippedAvatarId = reward.id;
        if (reward.kind === 'frame') profile.equippedFrameId = reward.id;
        profile.activity = [
          {
            type: 'redemption',
            label: `Canjeaste ${reward.name}`,
            ticketTenths: -reward.ticketCostTenths,
            occurredAt: new Date(clock()).toISOString(),
          },
          ...profile.activity,
        ].slice(0, MAX_ACTIVITY);
        return saveProfile(key, profile);
      });
    },

    async equipReward(customerId, { rewardId, displayName = '' } = {}) {
      validateCustomerId(customerId);
      const reward = REWARDS_BY_ID.get(rewardId);
      if (!reward || !['avatar', 'frame'].includes(reward.kind)) {
        throw new CrewRewardsError('La pieza de perfil no existe.', {
          status: 404,
          code: 'REWARD_NOT_FOUND',
        });
      }
      const key = profileKey(customerId);
      return withCustomerLock(key, async () => {
        const { profile } = await readPrivateProfile(customerId, { displayName });
        if (!rewardOwned(profile, reward)) {
          throw new CrewRewardsError('Primero tienes que desbloquear esta pieza.', {
            status: 409,
            code: 'REWARD_NOT_OWNED',
          });
        }
        if (reward.kind === 'avatar') profile.equippedAvatarId = reward.id;
        if (reward.kind === 'frame') profile.equippedFrameId = reward.id;
        return saveProfile(key, profile);
      });
    },

    async getContext(customerId) {
      const { profile } = await readPrivateProfile(customerId);
      const view = publicProfile(profile);
      const equippedAvatar = view.rewards.find((reward) => reward.id === view.equippedAvatarId);
      return {
        level: view.level.name,
        xp: view.xp,
        ticketBalance: view.ticketBalance,
        nextLevel: view.level.nextLevelName,
        nextXp: view.level.nextXp,
        collectionCount: view.collectionCount,
        equippedAvatar: equippedAvatar?.name || 'Skater 035',
      };
    },
  };
}
