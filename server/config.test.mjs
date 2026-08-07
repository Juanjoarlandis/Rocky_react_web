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
});
