import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('fuentes críticas de la portada', () => {
  it('precarga únicamente las tres familias que forman el primer viewport', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const page = new DOMParser().parseFromString(html, 'text/html');
    const preloads = [...page.querySelectorAll('link[rel="preload"][as="font"]')];

    expect(preloads.map((link) => link.getAttribute('href'))).toEqual([
      '/src/fonts/archivo-latin-400-800.woff2',
      '/src/fonts/luckiest-guy-latin-400.woff2',
      '/src/fonts/fredoka-latin-300-700.woff2',
    ]);
    expect(preloads.every((link) => link.getAttribute('type') === 'font/woff2')).toBe(true);
    expect(preloads.every((link) => link.hasAttribute('crossorigin'))).toBe(true);
  });
});
