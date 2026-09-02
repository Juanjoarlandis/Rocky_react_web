import { describe, expect, it } from 'vitest';
import { createConfig } from './config.mjs';

describe('application configuration', () => {
  it('requires a canonical HTTPS public origin in production', () => {
    expect(() =>
      createConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'http://rocky.test' })
    ).toThrow(/HTTPS/);

    expect(
      createConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://rocky.test' })
        .publicOrigin
    ).toBe('https://rocky.test');
  });

  it('accepts only explicit free OpenRouter models', () => {
    const defaults = createConfig({ NODE_ENV: 'test' });
    expect(defaults.chat.models.length).toBeGreaterThan(0);
    expect(
      defaults.chat.models.every(
        (model) => model === 'openrouter/free' || model.endsWith(':free')
      )
    ).toBe(true);

    expect(
      createConfig({
        NODE_ENV: 'test',
        OPENROUTER_MODELS: 'openai/gpt-oss-20b:free,openrouter/free',
      }).chat.models
    ).toEqual(['openai/gpt-oss-20b:free', 'openrouter/free']);
  });

  it('refuses paid, mixed or empty OpenRouter model lists', () => {
    expect(() =>
      createConfig({ NODE_ENV: 'test', OPENROUTER_MODELS: 'openai/gpt-4o' })
    ).toThrow(/modelos gratuitos/i);

    expect(() =>
      createConfig({
        NODE_ENV: 'test',
        OPENROUTER_MODELS: 'openai/gpt-oss-20b:free,openai/gpt-4o',
      })
    ).toThrow(/modelos gratuitos/i);

    expect(() =>
      createConfig({ NODE_ENV: 'test', OPENROUTER_MODELS: ' , ' })
    ).toThrow(/al menos un modelo gratuito/i);
  });

  it('keeps the site access gate off unless it is explicitly enabled', () => {
    expect(createConfig({ NODE_ENV: 'test' }).siteAccess).toEqual({
      enabled: false,
      password: '',
      sessionLifetimeMs: 12 * 60 * 60 * 1_000,
    });

    expect(
      createConfig({
        NODE_ENV: 'test',
        SITE_ACCESS_ENABLED: 'false',
        SITE_ACCESS_PASSWORD: 'unused-test-password',
      }).siteAccess.enabled
    ).toBe(false);
  });

  it('fails closed when the site access configuration is incomplete or ambiguous', () => {
    expect(() =>
      createConfig({ NODE_ENV: 'test', SITE_ACCESS_ENABLED: 'true' })
    ).toThrow(/SITE_ACCESS_PASSWORD/);

    expect(() =>
      createConfig({
        NODE_ENV: 'test',
        SITE_ACCESS_ENABLED: 'true',
        SITE_ACCESS_PASSWORD: 'too-short',
      })
    ).toThrow(/12 caracteres/);

    expect(() =>
      createConfig({ NODE_ENV: 'test', SITE_ACCESS_ENABLED: 'yes' })
    ).toThrow(/SITE_ACCESS_ENABLED/);
  });

  it('enables the site access gate without exposing the password to the client config', () => {
    const config = createConfig({
      NODE_ENV: 'test',
      SITE_ACCESS_ENABLED: 'true',
      SITE_ACCESS_PASSWORD: 'correct-horse-battery-staple',
    });

    expect(config.siteAccess).toEqual({
      enabled: true,
      password: 'correct-horse-battery-staple',
      sessionLifetimeMs: 12 * 60 * 60 * 1_000,
    });
  });
});
