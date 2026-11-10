import { describe, expect, it, vi } from 'vitest';
import { sha256Base64Url } from '../../lib/hash.mjs';
import { MemoryStore } from '../../storage/memory-store.mjs';
import {
  CrewRewardsError,
  calculatePurchaseRewards,
  createCrewRewardsService,
  getCrewLevel,
} from './rewards.mjs';

function paidOrder({
  orderId = 'gid://shopify/Order/77',
  customerId = 'gid://shopify/Customer/1',
  amount = '34.99',
  currency = 'EUR',
} = {}) {
  return {
    admin_graphql_api_id: orderId,
    name: '#1035',
    processed_at: '2026-08-07T18:00:00Z',
    current_total_price_set: {
      shop_money: { amount, currency_code: currency },
    },
    customer: customerId ? { admin_graphql_api_id: customerId } : null,
    line_items: [
      { title: 'Rockydz Boyz', quantity: 1 },
      { title: 'Gorra 035', quantity: 1 },
    ],
  };
}

class BlockingCrewReadStore extends MemoryStore {
  armNextCrewRead() {
    this.blockNextCrewRead = true;
    this.readStarted = new Promise((resolve) => {
      this.markReadStarted = resolve;
    });
    this.readReleased = new Promise((resolve) => {
      this.releaseRead = resolve;
    });
  }

  async get(namespace, key) {
    const value = await super.get(namespace, key);
    if (namespace === 'crewProfiles' && this.blockNextCrewRead) {
      this.blockNextCrewRead = false;
      this.markReadStarted();
      await this.readReleased;
    }
    return value;
  }
}

describe('Crew reward rules', () => {
  it('converts paid euros into integer XP and ticket tenths', () => {
    expect(calculatePurchaseRewards({ amount: '34.99', currency: 'EUR' })).toEqual({
      eligibleCents: 3499,
      xp: 34,
      ticketTenths: 34,
    });
    expect(calculatePurchaseRewards({ amount: '34.99', currency: 'USD' })).toBeNull();
  });

  it('moves through the approved level thresholds', () => {
    expect(getCrewLevel(0).name).toBe('Recién Llegado');
    expect(getCrewLevel(99).name).toBe('Recién Llegado');
    expect(getCrewLevel(100).name).toBe('Del Barrio');
    expect(getCrewLevel(300).name).toBe('Crew Member');
    expect(getCrewLevel(3000).name).toBe('Leyenda 035');
  });
});

describe('Crew reward profiles', () => {
  it('retains the deduplication baseline from profiles without the new order ledger', async () => {
    const store = new MemoryStore();
    const service = createCrewRewardsService({ store });
    await service.creditPaidOrder(paidOrder({ amount: '1.00' }));
    const key = sha256Base64Url('gid://shopify/Customer/1');
    const legacy = await store.get('crewProfiles', key);
    delete legacy.paidOrderIds;
    await store.set('crewProfiles', key, legacy);

    await service.creditPaidOrder(paidOrder({ orderId: 'gid://shopify/Order/78', amount: '1.00' }));
    const replay = await service.creditPaidOrder(paidOrder({ amount: '1.00' }));
    expect(replay).toMatchObject({
      credited: false,
      reason: 'duplicate_order',
      profile: { xp: 2 },
    });
    expect((await store.get('crewProfiles', key)).paidOrderIds).toEqual([
      'gid://shopify/Order/77',
      'gid://shopify/Order/78',
    ]);
  });

  it('retries a failed profile write without losing or duplicating the order credit', async () => {
    const store = new MemoryStore();
    const service = createCrewRewardsService({ store });
    vi.spyOn(store, 'set').mockRejectedValueOnce(new Error('synthetic disk failure'));
    await expect(service.creditPaidOrder(paidOrder({ amount: '1.00' }))).rejects.toThrow(
      'synthetic disk failure'
    );

    const [first, second] = await Promise.all([
      service.creditPaidOrder(paidOrder({ amount: '1.00' })),
      service.creditPaidOrder(paidOrder({ amount: '1.00' })),
    ]);
    expect(first).toMatchObject({ credited: true, profile: { xp: 1 } });
    expect(second).toMatchObject({
      credited: false,
      reason: 'duplicate_order',
      profile: { xp: 1 },
    });
  });

  it('remembers paid orders beyond the bounded history and across service restarts', async () => {
    const store = new MemoryStore();
    const service = createCrewRewardsService({ store });
    for (let index = 0; index < 251; index += 1) {
      await service.creditPaidOrder(
        paidOrder({ orderId: `gid://shopify/Order/${index}`, amount: '1.00' })
      );
    }
    const restarted = createCrewRewardsService({ store });
    const replay = await restarted.creditPaidOrder(
      paidOrder({ orderId: 'gid://shopify/Order/0', amount: '1.00' })
    );

    expect(replay).toMatchObject({
      credited: false,
      reason: 'duplicate_order',
      profile: { xp: 251 },
    });
    expect(replay.profile.purchases).toHaveLength(12);
  });

  it('creates a private profile with a public starter collection', async () => {
    const service = createCrewRewardsService({
      store: new MemoryStore(),
      clock: () => Date.parse('2026-08-07T18:00:00Z'),
    });

    const profile = await service.getProfile('gid://shopify/Customer/1', {
      displayName: 'Juanjo',
    });

    expect(profile).toMatchObject({
      displayName: 'Juanjo',
      xp: 0,
      ticketBalance: 0,
      equippedAvatarId: 'skater-head',
      level: { name: 'Recién Llegado', currentXp: 0, nextXp: 100 },
    });
    expect(profile.rewards.find((reward) => reward.id === 'skater-head')).toMatchObject({
      owned: true,
      equipped: true,
    });
    expect(JSON.stringify(profile)).not.toContain('gid://shopify/Customer');
    expect(JSON.stringify(profile)).not.toContain('creditedOrderIds');
  });

  it('credits a paid order once and keeps a bounded purchase summary', async () => {
    const service = createCrewRewardsService({ store: new MemoryStore() });

    const first = await service.creditPaidOrder(paidOrder({ amount: '349.99' }));
    const duplicate = await service.creditPaidOrder(paidOrder({ amount: '349.99' }));

    expect(first.credited).toBe(true);
    expect(first.profile).toMatchObject({
      xp: 349,
      ticketBalance: 34.9,
      lifetimeTicketsEarned: 34.9,
      level: { name: 'Crew Member' },
      purchases: [
        {
          orderName: '#1035',
          amount: '349.99',
          currency: 'EUR',
          xpEarned: 349,
          ticketsEarned: 34.9,
          items: ['Rockydz Boyz', 'Gorra 035'],
        },
      ],
    });
    expect(duplicate).toMatchObject({ credited: false, reason: 'duplicate_order' });
    expect(duplicate.profile.xp).toBe(349);
  });

  it('does not overwrite a paid order when the profile opens concurrently', async () => {
    const store = new BlockingCrewReadStore();
    const service = createCrewRewardsService({ store });
    await service.getProfile('gid://shopify/Customer/1');

    store.armNextCrewRead();
    const openingProfile = service.getProfile('gid://shopify/Customer/1', {
      displayName: 'Juanjo',
    });
    await store.readStarted;
    const creditingOrder = service.creditPaidOrder(paidOrder({ amount: '100.00' }));
    store.releaseRead();

    await Promise.all([openingProfile, creditingOrder]);
    const finalProfile = await service.getProfile('gid://shopify/Customer/1');
    expect(finalProfile).toMatchObject({ displayName: 'Juanjo', xp: 100 });
  });

  it('skips guest and non-EUR orders without creating a balance', async () => {
    const service = createCrewRewardsService({ store: new MemoryStore() });

    await expect(service.creditPaidOrder(paidOrder({ customerId: null }))).resolves.toEqual({
      credited: false,
      reason: 'missing_customer',
    });
    await expect(service.creditPaidOrder(paidOrder({ currency: 'USD' }))).resolves.toEqual({
      credited: false,
      reason: 'unsupported_currency',
    });
  });

  it('spends tickets idempotently without reducing XP or level', async () => {
    const service = createCrewRewardsService({ store: new MemoryStore() });
    await service.creditPaidOrder(paidOrder({ amount: '100.00' }));

    const first = await service.redeemReward('gid://shopify/Customer/1', {
      rewardId: 'frame-red-squiggle',
      operationId: 'redeem-frame-123',
    });
    const retry = await service.redeemReward('gid://shopify/Customer/1', {
      rewardId: 'frame-red-squiggle',
      operationId: 'redeem-frame-123',
    });

    expect(first).toMatchObject({
      xp: 100,
      ticketBalance: 5,
      lifetimeTicketsSpent: 5,
      level: { name: 'Del Barrio' },
      equippedFrameId: 'frame-red-squiggle',
    });
    expect(retry.ticketBalance).toBe(5);
  });

  it('rejects locked, unaffordable and unowned selections', async () => {
    const service = createCrewRewardsService({ store: new MemoryStore() });

    await expect(
      service.redeemReward('gid://shopify/Customer/1', {
        rewardId: 'grafitero-spray',
        operationId: 'redeem-locked-123',
      })
    ).rejects.toMatchObject({ code: 'REWARD_LOCKED' });
    await expect(
      service.equipReward('gid://shopify/Customer/1', { rewardId: 'dormido-head' })
    ).rejects.toBeInstanceOf(CrewRewardsError);

    await service.creditPaidOrder(paidOrder({ amount: '100.00' }));
    const equipped = await service.equipReward('gid://shopify/Customer/1', {
      rewardId: 'dormido-head',
    });
    expect(equipped.equippedAvatarId).toBe('dormido-head');

    await expect(
      service.redeemReward('gid://shopify/Customer/1', {
        rewardId: 'skater-ollie',
        operationId: 'redeem-expensive-123',
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_TICKETS' });
  });
});

describe('leer el perfil Crew no escribe', () => {
  function setup() {
    const store = new MemoryStore();
    const set = vi.spyOn(store, 'set');
    const service = createCrewRewardsService({
      store,
      clock: () => Date.parse('2026-08-07T18:00:00Z'),
    });
    return { service, set };
  }

  it('la primera lectura guarda el perfil y la segunda, sin cambios, no', async () => {
    const { service, set } = setup();

    const first = await service.getProfile('gid://shopify/Customer/1', { displayName: 'Juanjo' });
    const second = await service.getProfile('gid://shopify/Customer/1', { displayName: 'Juanjo' });
    const third = await service.getProfile('gid://shopify/Customer/1');

    expect(set).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('un nombre nuevo sí se guarda, una vez', async () => {
    const { service, set } = setup();
    await service.getProfile('gid://shopify/Customer/1', { displayName: 'Juanjo' });

    const renamed = await service.getProfile('gid://shopify/Customer/1', { displayName: 'JJ' });
    await service.getProfile('gid://shopify/Customer/1', { displayName: 'JJ' });

    expect(renamed.displayName).toBe('JJ');
    expect(set).toHaveBeenCalledTimes(2);
  });

  it('abonar un pedido es una escritura confirmada', async () => {
    const { service, set } = setup();

    await service.creditPaidOrder(paidOrder({ amount: '40.00' }));

    expect(set.mock.calls.length).toBeGreaterThan(0);
    for (const [namespace, , , options] of set.mock.calls) {
      expect(namespace).toBe('crewProfiles');
      expect(options?.durability ?? 'confirmed').toBe('confirmed');
    }
  });
});
