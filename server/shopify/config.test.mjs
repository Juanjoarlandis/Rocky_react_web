import { describe, expect, it } from 'vitest';
import { createShopifyConfig } from './config.mjs';

describe('Shopify configuration', () => {
  it('fails closed on a non-Shopify store domain', () => {
    expect(() =>
      createShopifyConfig(
        { SHOPIFY_STORE_DOMAIN: 'https://evil.example' },
        {
          publicOrigin: 'https://rocky.test',
          isProduction: true,
        }
      )
    ).toThrow(/SHOPIFY_STORE_DOMAIN/);
  });

  it('enables only capabilities whose complete secret configuration exists', () => {
    const config = createShopifyConfig(
      {
        SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com',
        SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'storefront-secret',
        SHOPIFY_CLIENT_ID: 'client-id',
        SHOPIFY_CLIENT_SECRET: 'client-secret',
        SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: 'customer-client',
        APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      },
      { publicOrigin: 'https://rocky.test', isProduction: true }
    );

    expect(config.apiVersion).toBe('2026-07');
    expect(config.storeDomain).toBe('rocky-dev.myshopify.com');
    expect(config.storefrontTokenType).toBe('private');
    expect(config.webhookTopics).toEqual(
      new Set(['app/uninstalled', 'app/scopes_update', 'orders/paid'])
    );
    expect(config.capabilities).toEqual({
      catalog: true,
      cart: true,
      customerAccounts: true,
      admin: true,
      webhooks: true,
    });
  });

  it('keeps stateful features disabled without an encryption key', () => {
    const config = createShopifyConfig(
      { SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com' },
      { publicOrigin: 'http://localhost:3000', isProduction: false }
    );

    expect(config.capabilities.catalog).toBe(true);
    expect(config.capabilities.cart).toBe(false);
    expect(config.capabilities.customerAccounts).toBe(false);
    expect(config.capabilities.webhooks).toBe(false);
  });

  it('rejects malformed checkout hosts instead of weakening the redirect allowlist', () => {
    expect(() =>
      createShopifyConfig(
        {
          SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com',
          SHOPIFY_CHECKOUT_HOSTS: 'checkout.rocky.test/unsafe-path',
        },
        { publicOrigin: 'https://rocky.test', isProduction: true }
      )
    ).toThrow(/SHOPIFY_CHECKOUT_HOSTS/);
  });
});
