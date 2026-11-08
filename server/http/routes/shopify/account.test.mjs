import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createConfig } from '../../../config/app.mjs';
import { createSessionManager } from '../../../services/sessions.mjs';
import { MemoryStore } from '../../../storage/memory-store.mjs';
import { createAccessGate } from '../../access-gate.mjs';
import { requireTrustedOrigin } from '../../middleware/origin-policy.mjs';
import { createAccountRouter } from './account.mjs';

let server;
afterEach(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  server = null;
});

describe('customer login behind the private access gate', () => {
  it('preserves the grant on OAuth and the account and cart on gate revalidation', async () => {
    const config = createConfig({
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: 'https://rocky.test',
      SITE_ACCESS_ENABLED: 'true',
      SITE_ACCESS_PASSWORD: 'synthetic-access-password',
    });
    const store = new MemoryStore();
    const sessions = createSessionManager({ store, isProduction: false });
    const gate = createAccessGate({
      config,
      sessions,
      staticDirectory: '/nonexistent-test-static',
    });
    const app = express();
    app.set('query parser', 'simple');
    app.use('/access-gate', gate.router);
    app.use(gate.requireAccess);
    app.use(
      '/api/shopify',
      createAccountRouter({
        config,
        sessions,
        requireOrigin: requireTrustedOrigin(config),
        customerAccounts: {
          async completeAuthentication() {
            return { tokenId: 'test-token', returnPath: '/mi-crew' };
          },
          async getCustomerProfile() {
            return { id: 'gid://shopify/Customer/1' };
          },
        },
      })
    );
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const cookie = (response) => response.headers.get('set-cookie').split(';')[0];
    const request = (value) => ({ get: () => value });
    const enter = (value = '') =>
      fetch(`${baseUrl}/access-gate`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Origin: config.publicOrigin,
          Cookie: value,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'password=synthetic-access-password',
      });

    const admitted = await enter();
    const originalCookie = cookie(admitted);
    const initial = await sessions.read(request(originalCookie));
    await sessions.save(initial, { cartId: 'test-cart' });
    const callback = await fetch(
      `${baseUrl}/api/shopify/account/callback?state=test-state&code=test-code`,
      {
        headers: { Cookie: originalCookie },
        redirect: 'manual',
      }
    );
    expect(callback.status).toBe(302);
    const authenticatedCookie = cookie(callback);
    const account = await fetch(`${baseUrl}/api/shopify/account`, {
      headers: { Cookie: authenticatedCookie },
    });
    expect(account.status).toBe(200);
    expect(await account.json()).toMatchObject({ loggedIn: true });
    expect(await sessions.read(request(originalCookie))).toBeNull();
    expect((await sessions.read(request(authenticatedCookie))).record).toMatchObject({
      siteAccessGrant: initial.record.siteAccessGrant,
      siteAccessExpiresAt: initial.record.siteAccessExpiresAt,
      cartId: 'test-cart',
      customerTokenId: 'test-token',
    });

    const readmitted = await enter(authenticatedCookie);
    expect(readmitted.status).toBe(303);
    expect((await sessions.read(request(cookie(readmitted)))).record).toMatchObject({
      cartId: 'test-cart',
      customerTokenId: 'test-token',
    });
    expect(await sessions.read(request(authenticatedCookie))).toBeNull();
  });
});
