import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');

describe('theme boot', () => {
  it('loads startup code from the same origin instead of an inline script blocked by CSP', () => {
    const scripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];

    expect(indexHtml).toContain('<script src="/theme-init.js"></script>');
    expect(scripts).toHaveLength(2);
    expect(scripts.every(([, attributes, body]) => (
      attributes.includes('src=') && body.trim() === ''
    ))).toBe(true);
    expect(fs.existsSync(path.resolve('public/theme-init.js'))).toBe(true);
  });
});
