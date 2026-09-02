import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
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

  it('apunta cada @font-face a un fichero que existe junto a src/fonts', () => {
    // La hoja vive en src/styles/, así que las url() son relativas a esa carpeta.
    // Si no resuelven, Vite las deja tal cual y en producción responden 404.
    const cssPath = resolve(process.cwd(), 'src/styles/01-fonts.css');
    const css = readFileSync(cssPath, 'utf8');
    const sources = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((match) => match[1]);

    expect(sources).toHaveLength(3);
    for (const source of sources) {
      expect(existsSync(resolve(dirname(cssPath), source)), source).toBe(true);
    }

    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const page = new DOMParser().parseFromString(html, 'text/html');
    const preloaded = [...page.querySelectorAll('link[rel="preload"][as="font"]')].map((link) =>
      basename(link.getAttribute('href'))
    );
    expect(sources.map((source) => basename(source)).sort()).toEqual(preloaded.sort());
  });
});
