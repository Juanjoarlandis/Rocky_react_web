import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../encrypted-store.mjs';
import { createCrewRewardsService } from '../crew/rewards.mjs';
import { createShopifyRouter } from './routes.mjs';

const runningServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...runningServers].map((server) => new Promise((resolve) => server.close(resolve)))
  );
  runningServers.clear();
});

function paidOrder(amount = '100.00') {
  return {
    admin_graphql_api_id: 'gid://shopify/Order/77',
    name: '#1035',
    current_total_price_set: {
      shop_money: { amount, currency_code: 'EUR' },
    },
    customer: { admin_graphql_api_id: 'gid://shopify/Customer/1' },
    line_items: [{ title: 'Rockydz Boyz', quantity: 1 }],
  };
}

async function startCrewRouter({ loggedIn = true } = {}) {
  const store = new MemoryStore();
  const crewRewards = createCrewRewardsService({ store });
  const customerAccounts = {
    getCustomerProfile: vi.fn().mockResolvedValue({
      id: 'gid://shopify/Customer/1',
      displayName: 'Juanjo',
    }),
  };
  const sessions = {
    read: vi
      .fn()
      .mockResolvedValue(
        loggedIn ? { record: { customerTokenId: 'customer-token-record' } } : null
      ),
  };
  const requireOrigin = (req, res, next) => {
    if (req.get('origin') === 'https://rocky.test') return next();
    return res.status(403).json({ message: 'Origen no permitido.' });
  };
  const config = {
    apiVersion: '2026-07',
    checkoutHosts: new Set(),
    capabilities: {
      catalog: false,
      cart: false,
      customerAccounts: true,
      admin: false,
      webhooks: false,
    },
  };
  const { router } = createShopifyRouter({
    config,
    store,
    sessions,
    requireOrigin,
    crewRewards,
    customerAccounts,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/shopify', router);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  runningServers.add(server);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    crewRewards,
    customerAccounts,
  };
}

describe('Crew account HTTP routes', () => {
  it('rejects profile access without a logged-in Shopify customer', async () => {
    const { baseUrl, customerAccounts } = await startCrewRouter({ loggedIn: false });

    const response = await fetch(`${baseUrl}/api/shopify/account/crew`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'CREW_AUTH_REQUIRED',
    });
    expect(customerAccounts.getCustomerProfile).not.toHaveBeenCalled();
  });

  it('returns only the authenticated customer Crew profile', async () => {
    const { baseUrl } = await startCrewRouter();

    const response = await fetch(`${baseUrl}/api/shopify/account/crew`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      profile: {
        displayName: 'Juanjo',
        xp: 0,
        ticketBalance: 0,
        equippedAvatarId: 'skater-head',
      },
    });
  });

  it('requires the exact origin before equipping an avatar', async () => {
    const { baseUrl, crewRewards } = await startCrewRouter();
    await crewRewards.creditPaidOrder(paidOrder());

    const blocked = await fetch(`${baseUrl}/api/shopify/account/crew/avatar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ rewardId: 'dormido-head' }),
    });
    const profile = await crewRewards.getProfile('gid://shopify/Customer/1');

    expect(blocked.status).toBe(403);
    expect(profile.equippedAvatarId).toBe('skater-head');
  });

  it('equips owned avatars and redeems ticket rewards', async () => {
    const { baseUrl, crewRewards } = await startCrewRouter();
    await crewRewards.creditPaidOrder(paidOrder());

    const equipped = await fetch(`${baseUrl}/api/shopify/account/crew/avatar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'https://rocky.test' },
      body: JSON.stringify({ rewardId: 'dormido-head' }),
    });
    const redeemed = await fetch(`${baseUrl}/api/shopify/account/crew/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://rocky.test' },
      body: JSON.stringify({
        rewardId: 'frame-red-squiggle',
        operationId: 'redeem-http-123',
      }),
    });

    expect(equipped.status).toBe(200);
    await expect(equipped.json()).resolves.toMatchObject({
      profile: { equippedAvatarId: 'dormido-head' },
    });
    expect(redeemed.status).toBe(200);
    await expect(redeemed.json()).resolves.toMatchObject({
      profile: {
        ticketBalance: 5,
        equippedFrameId: 'frame-red-squiggle',
      },
    });
  });
});
