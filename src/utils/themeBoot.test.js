import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { aplicaTema } from './theme.js';

const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');

describe('theme boot', () => {
  it('loads startup code from the same origin instead of an inline script blocked by CSP', () => {
    const scripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];

    expect(indexHtml).toContain('<script src="/theme-init.js"></script>');
    expect(scripts).toHaveLength(2);
    expect(
      scripts.every(([, attributes, body]) => attributes.includes('src=') && body.trim() === '')
    ).toBe(true);
    expect(fs.existsSync(path.resolve('public/theme-init.js'))).toBe(true);
  });

  describe('siempre de día', () => {
    afterEach(() => {
      delete document.documentElement.dataset.theme;
      localStorage.clear();
    });

    it('la web arranca de día aunque una visita anterior se quedara en neón', () => {
      localStorage.setItem('rocky-theme', 'neon');
      new Function(fs.readFileSync(path.resolve('public/theme-init.js'), 'utf8'))();
      expect(document.documentElement.dataset.theme).toBeUndefined();
      expect(localStorage.getItem('rocky-theme')).toBeNull();
    });

    it('encender el neón no se guarda para la próxima visita', () => {
      aplicaTema('neon');
      expect(document.documentElement.dataset.theme).toBe('neon');
      expect(localStorage.length).toBe(0);
    });
  });
});
