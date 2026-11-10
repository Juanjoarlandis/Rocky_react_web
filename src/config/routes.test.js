import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_ROUTES, LEGAL_SLUGS, matchRoute } from '../../shared/routes.mjs';
import { LEGAL_PAGES } from './legal.js';
import { ROUTE_PATHS, ROUTES } from './routes.js';

/* Las rutas que pinta la aplicación son las de la tabla compartida, que es
   también la que usa el servidor para responder 200 o 404 (seo-y-cache). */
const appSource = fs.readFileSync(path.resolve(import.meta.dirname, '../App.jsx'), 'utf8');
const declared = [...appSource.matchAll(/<Route\s+path=(\{[^}]+\}|"[^"]+")/g)].map(
  (match) => match[1]
);

describe('rutas de la aplicación', () => {
  it('App solo pinta rutas de la tabla compartida, y las pinta todas', () => {
    const wildcard = declared.filter((value) => value === '"*"');
    const fromTable = declared.filter((value) => value !== '"*"');

    expect(wildcard).toHaveLength(1);
    // Ninguna ruta escrita a mano: todas salen de ROUTE_PATHS
    for (const value of fromTable) expect(value).toMatch(/^\{ROUTE_PATHS\.\w+\}$/);
    const ids = fromTable.map((value) => value.slice('{ROUTE_PATHS.'.length, -1));
    expect([...ids].sort()).toEqual(APP_ROUTES.map((route) => route.id).sort());
  });

  it('ROUTE_PATHS lleva el patrón de cada ruta de la tabla', () => {
    expect(ROUTE_PATHS).toEqual(
      Object.fromEntries(APP_ROUTES.map((route) => [route.id, route.path]))
    );
  });

  it('los destinos de los enlaces son rutas que la aplicación conoce', () => {
    const destinations = [
      ROUTES.home,
      ROUTES.drops,
      ROUTES.cart,
      ROUTES.chat,
      ROUTES.studio,
      ROUTES.crew,
      ROUTES.myCrew,
      ROUTES.taller,
      ROUTES.category('rocky-drop-4'),
      ROUTES.product('rocky-racing'),
    ];
    for (const destination of destinations)
      expect(matchRoute(destination), destination).not.toBeNull();
    expect(matchRoute(ROUTES.category('rocky-drop-4')).params).toEqual({
      category: 'rocky-drop-4',
    });
    expect(matchRoute(ROUTES.product('a b')).params).toEqual({ productId: 'a b' });
  });

  it('las páginas legales de la aplicación son las de la tabla', () => {
    expect(LEGAL_PAGES.map((page) => page.slug)).toEqual([...LEGAL_SLUGS]);
  });
  it('index.html no declara ninguna URL canónica ni og:url: las pone la aplicación en cada ruta', () => {
    const html = fs.readFileSync(path.resolve(import.meta.dirname, '../../index.html'), 'utf8');

    expect(html).not.toMatch(/rel="canonical"/);
    expect(html).not.toMatch(/property="og:url"/);
  });
});
