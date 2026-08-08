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
});
