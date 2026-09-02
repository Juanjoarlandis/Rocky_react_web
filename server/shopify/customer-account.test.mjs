import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../encrypted-store.mjs';
import { createCustomerAccountClient, normalizeReturnPath } from './customer-account.mjs';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('base64url');
}

function signIdToken({ privateKey, kid, payload }) {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${claims}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${signature.toString('base64url')}`;
}

const config = {
  storeDomain: 'rocky-dev.myshopify.com',
  customerClientId: 'customer-client-id',
  customerScopes: 'openid email customer-account-api:full',
  publicOrigin: 'https://rocky.test',
};

describe('Customer Account OAuth', () => {
  it('uses one-time PKCE state and verifies the returned ID token nonce', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicJwk = publicKey.export({ format: 'jwk' });
    const kid = 'shopify-key-1';
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authentication/1/oauth/authorize',
      token_endpoint: 'https://shopify.com/authentication/1/oauth/token',
      end_session_endpoint: 'https://shopify.com/authentication/1/logout',
      jwks_uri: 'https://shopify.com/authentication/1/.well-known/jwks.json',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(discovery));
    const store = new MemoryStore({ clock: () => 1_000_000 });
    const client = createCustomerAccountClient({
      config,
      store,
      fetchImpl,
      clock: () => 1_000_000,
    });

    const authorizationUrl = new URL(await client.beginAuthentication({
      returnPath: '/cart',
      sessionBinding: 'session-binding-for-tests',
    }));
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const state = authorizationUrl.searchParams.get('state');
    const transaction = await store.get('oauthTransactions', hash(state));
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('nonce')).toBe(transaction.nonce);
    expect(transaction.returnPath).toBe('/cart');

    const idToken = signIdToken({
      privateKey,
      kid,
      payload: {
        iss: discovery.issuer,
        aud: config.customerClientId,
        sub: 'gid://shopify/Customer/1',
        exp: 2_000,
        iat: 900,
        nonce: transaction.nonce,
      },
    });
    fetchImpl
      .mockResolvedValueOnce(
        response({
          access_token: 'customer-access-token',
          refresh_token: 'customer-refresh-token',
          id_token: idToken,
          expires_in: 600,
        })
      )
      .mockResolvedValueOnce(response({ keys: [{ ...publicJwk, kid, alg: 'ES256', use: 'sig' }] }));

    const completed = await client.completeAuthentication({
      state,
      code: 'authorization-code',
      sessionBinding: 'session-binding-for-tests',
    });

    expect(completed.returnPath).toBe('/cart');
    expect(completed.customerSubject).toBe('gid://shopify/Customer/1');
    expect(completed.tokenId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await store.get('customerTokens', completed.tokenId)).toMatchObject({
      accessToken: 'customer-access-token',
      refreshToken: 'customer-refresh-token',
      customerSubject: 'gid://shopify/Customer/1',
    });
    expect(fetchImpl.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchImpl.mock.calls[2][1].signal).toBeInstanceOf(AbortSignal);
    await expect(
      client.completeAuthentication({
        state,
        code: 'replayed-code',
        sessionBinding: 'session-binding-for-tests',
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects external return paths before creating OAuth state', async () => {
    const client = createCustomerAccountClient({
      config,
      store: new MemoryStore(),
      fetchImpl: vi.fn(),
    });

    for (const returnPath of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\\/evil.example',
      'javascript:alert(1)',
      'cart',
      '',
      42,
    ]) {
      await expect(
        client.beginAuthentication({
          returnPath,
          sessionBinding: 'session-binding-for-tests',
        })
      ).rejects.toMatchObject({ status: 400, code: 'INVALID_RETURN_PATH' });
    }
  });

  it('keeps encoded backslashes as a local path instead of a new origin', () => {
    expect(normalizeReturnPath('/%5C', config.publicOrigin)).toBe('/%5C');
    expect(normalizeReturnPath('/%5Cevil.example', config.publicOrigin)).toBe('/%5Cevil.example');
    expect(normalizeReturnPath('/mi-crew?tab=xp#top', config.publicOrigin)).toBe(
      '/mi-crew?tab=xp#top'
    );
    expect(normalizeReturnPath('/\\evil.example', config.publicOrigin)).toBeNull();
    expect(normalizeReturnPath('/\\/evil.example', config.publicOrigin)).toBeNull();
  });

  it('binds OAuth state to the browser session that started login', async () => {
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authorize',
      token_endpoint: 'https://shopify.com/token',
      jwks_uri: 'https://shopify.com/jwks',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi.fn().mockResolvedValue(response(discovery));
    const client = createCustomerAccountClient({
      config,
      store: new MemoryStore(),
      fetchImpl,
    });
    const authorizationUrl = new URL(await client.beginAuthentication({
      sessionBinding: 'original-browser-session',
    }));

    await expect(
      client.completeAuthentication({
        state: authorizationUrl.searchParams.get('state'),
        code: 'attacker-code',
        sessionBinding: 'different-browser-session',
      })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_STATE' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects insecure URLs returned by discovery', async () => {
    const client = createCustomerAccountClient({
      config,
      store: new MemoryStore(),
      fetchImpl: vi.fn().mockResolvedValue(
        response({
          authorization_endpoint: 'http://shopify.com/authorize',
          token_endpoint: 'https://shopify.com/token',
          jwks_uri: 'https://shopify.com/jwks',
          issuer: 'https://shopify.com/authentication/1',
        })
      ),
    });

    await expect(client.beginAuthentication({
      sessionBinding: 'session-binding-for-tests',
    })).rejects.toMatchObject({
      code: 'INSECURE_DISCOVERY_URL',
    });
  });

  it('rejects OAuth token responses with a non-numeric lifetime', async () => {
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authorize',
      token_endpoint: 'https://shopify.com/token',
      jwks_uri: 'https://shopify.com/jwks',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(discovery))
      .mockResolvedValueOnce(response({
        access_token: 'customer-access-token',
        refresh_token: 'customer-refresh-token',
        id_token: 'not-reached',
        expires_in: '600',
      }));
    const client = createCustomerAccountClient({
      config,
      store: new MemoryStore(),
      fetchImpl,
    });
    const authorizationUrl = new URL(await client.beginAuthentication({
      sessionBinding: 'session-binding-for-tests',
    }));

    await expect(client.completeAuthentication({
      state: authorizationUrl.searchParams.get('state'),
      code: 'authorization-code',
      sessionBinding: 'session-binding-for-tests',
    })).rejects.toMatchObject({ status: 401, code: 'TOKEN_ERROR' });
  });

  it('rejects a signed ID token whose expiration claim is missing', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicJwk = publicKey.export({ format: 'jwk' });
    const kid = 'shopify-key-without-exp';
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authorize',
      token_endpoint: 'https://shopify.com/token',
      jwks_uri: 'https://shopify.com/jwks',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(discovery));
    const store = new MemoryStore({ clock: () => 1_000 });
    const client = createCustomerAccountClient({
      config,
      store,
      fetchImpl,
      clock: () => 1_000,
    });
    const authorizationUrl = new URL(await client.beginAuthentication({
      sessionBinding: 'session-binding-for-tests',
    }));
    const state = authorizationUrl.searchParams.get('state');
    const transaction = await store.get('oauthTransactions', hash(state));
    const idToken = signIdToken({
      privateKey,
      kid,
      payload: {
        iss: discovery.issuer,
        aud: config.customerClientId,
        sub: 'gid://shopify/Customer/1',
        nonce: transaction.nonce,
      },
    });
    fetchImpl
      .mockResolvedValueOnce(response({
        access_token: 'customer-access-token',
        refresh_token: 'customer-refresh-token',
        id_token: idToken,
        expires_in: 600,
      }))
      .mockResolvedValueOnce(response({ keys: [{ ...publicJwk, kid, alg: 'ES256' }] }));

    await expect(client.completeAuthentication({
      state,
      code: 'authorization-code',
      sessionBinding: 'session-binding-for-tests',
    })).rejects.toMatchObject({ status: 401, code: 'INVALID_ID_TOKEN' });
  });

  it('normalizes the numeric subject returned by Shopify', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicJwk = publicKey.export({ format: 'jwk' });
    const kid = 'shopify-key-with-numeric-subject';
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authorize',
      token_endpoint: 'https://shopify.com/token',
      jwks_uri: 'https://shopify.com/jwks',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(discovery));
    const store = new MemoryStore({ clock: () => 1_000_000 });
    const client = createCustomerAccountClient({
      config,
      store,
      fetchImpl,
      clock: () => 1_000_000,
    });
    const authorizationUrl = new URL(await client.beginAuthentication({
      sessionBinding: 'session-binding-for-tests',
    }));
    const state = authorizationUrl.searchParams.get('state');
    const transaction = await store.get('oauthTransactions', hash(state));
    const idToken = signIdToken({
      privateKey,
      kid,
      payload: {
        iss: discovery.issuer,
        aud: config.customerClientId,
        sub: 123456789,
        exp: 2_000,
        iat: 900,
        nonce: transaction.nonce,
      },
    });
    fetchImpl
      .mockResolvedValueOnce(response({
        access_token: 'customer-access-token',
        refresh_token: 'customer-refresh-token',
        id_token: idToken,
        expires_in: 600,
      }))
      .mockResolvedValueOnce(response({ keys: [{ ...publicJwk, kid, alg: 'ES256' }] }));

    const completed = await client.completeAuthentication({
      state,
      code: 'authorization-code',
      sessionBinding: 'session-binding-for-tests',
    });

    expect(completed.customerSubject).toBe('123456789');
    expect(await store.get('customerTokens', completed.tokenId)).toMatchObject({
      customerSubject: '123456789',
    });
  });

  it('uses the customer name when Shopify repeats the email as displayName', async () => {
    const clock = () => 1_000_000;
    const store = new MemoryStore({ clock });
    await store.set('customerTokens', 'customer-token-id', {
      accessToken: 'customer-access-token',
      refreshToken: 'customer-refresh-token',
      expiresAt: clock() + 60_000,
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        graphql_api: 'https://shopify.com/customer-account/graphql',
      }))
      .mockResolvedValueOnce(response({
        data: {
          customer: {
            id: 'gid://shopify/Customer/1',
            displayName: 'juanjo.rocky035@example.com',
            firstName: ' Juanjo ',
            lastName: ' Rocky ',
            emailAddress: { emailAddress: 'JUANJO.ROCKY035@example.com' },
          },
        },
      }));
    const client = createCustomerAccountClient({ config, store, fetchImpl, clock });

    await expect(client.getCustomerProfile('customer-token-id')).resolves.toMatchObject({
      displayName: 'Juanjo Rocky',
      firstName: 'Juanjo',
      lastName: 'Rocky',
      email: 'JUANJO.ROCKY035@example.com',
    });
  });

  it('logs only safe validation metadata when ID token claims are rejected', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicJwk = publicKey.export({ format: 'jwk' });
    const kid = 'shopify-key-for-diagnostics';
    const discovery = {
      authorization_endpoint: 'https://shopify.com/authorize',
      token_endpoint: 'https://shopify.com/token',
      jwks_uri: 'https://shopify.com/jwks',
      issuer: 'https://shopify.com/authentication/1',
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(discovery));
    const store = new MemoryStore({ clock: () => 1_000_000 });
    const logger = { error: vi.fn() };
    const client = createCustomerAccountClient({
      config,
      store,
      fetchImpl,
      logger,
      clock: () => 1_000_000,
    });
    const authorizationUrl = new URL(await client.beginAuthentication({
      sessionBinding: 'session-binding-for-tests',
    }));
    const state = authorizationUrl.searchParams.get('state');
    const transaction = await store.get('oauthTransactions', hash(state));
    const idToken = signIdToken({
      privateKey,
      kid,
      payload: {
        iss: discovery.issuer,
        aud: config.customerClientId,
        sub: 'gid://shopify/Customer/sensitive-customer-id',
        iat: 900,
        nonce: transaction.nonce,
        email: 'private@example.com',
      },
    });
    fetchImpl
      .mockResolvedValueOnce(response({
        access_token: 'customer-access-token',
        refresh_token: 'customer-refresh-token',
        id_token: idToken,
        expires_in: 600,
      }))
      .mockResolvedValueOnce(response({ keys: [{ ...publicJwk, kid, alg: 'ES256' }] }));

    await expect(client.completeAuthentication({
      state,
      code: 'authorization-code',
      sessionBinding: 'session-binding-for-tests',
    })).rejects.toMatchObject({ status: 401, code: 'INVALID_ID_TOKEN' });

    expect(logger.error).toHaveBeenCalledWith(
      'Shopify ID token claim validation failed',
      {
        failedChecks: ['expiration'],
        audienceCount: 1,
        audienceType: 'string',
        hasAuthorizedParty: false,
        expirationType: 'undefined',
        issuedAtType: 'number',
        hasNotBefore: false,
        notBeforeType: 'undefined',
        subjectType: 'string',
      }
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private@example.com');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('sensitive-customer-id');
  });
});
