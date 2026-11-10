import { describe, expect, it } from 'vitest';
import { APP_ROUTES, LEGAL_SLUGS, canonicalPath, canonicalUrl, matchRoute } from './routes.mjs';

describe('tabla de rutas de la aplicación', () => {
  it.each([
    ['/', 'home'],
    ['/products', 'catalog'],
    ['/products/rocky-drop-4', 'catalog'],
    ['/menudrop', 'drops'],
    ['/cart', 'cart'],
    ['/product/rocky-racing', 'product'],
    ['/rockyIA', 'chat'],
    ['/estudio', 'studio'],
    ['/crew', 'crew'],
    ['/mi-crew', 'myCrew'],
    ['/legal/privacidad', 'legal'],
    ['/taller', 'taller'],
  ])('%s es la ruta %s', (pathname, id) => {
    expect(matchRoute(pathname)?.route.id).toBe(id);
  });

  it('casa como el router del cliente: sin distinguir mayúsculas y con barra final', () => {
    expect(matchRoute('/CART')?.route.id).toBe('cart');
    expect(matchRoute('/crew/')?.route.id).toBe('crew');
    expect(matchRoute('/rockyia')?.route.id).toBe('chat');
  });

  it('como el router: varias barras finales y tramos fijos escritos con %XX', () => {
    expect(matchRoute('/cart//')?.route.id).toBe('cart');
    expect(matchRoute('/products///')?.route.id).toBe('catalog');
    expect(matchRoute('/%63art')?.route.id).toBe('cart');
    expect(matchRoute('/c%61rt/')?.route.id).toBe('cart');
    expect(canonicalPath('/c%61rt//')).toBe('/cart');
    expect(canonicalPath('/products//')).toBe('/');
  });

  it('entrega los parámetros ya decodificados', () => {
    expect(matchRoute('/products/ROCKY%20DROP%204')?.params).toEqual({ category: 'ROCKY DROP 4' });
    expect(matchRoute('/product/rocky-racing')?.params).toEqual({ productId: 'rocky-racing' });
    expect(matchRoute('/products')?.params).toEqual({});
  });

  it.each([
    '/loquesea',
    '/cart/extra',
    '/product',
    '/product/a/b',
    '/products/a/b',
    '/legal',
    '/legal/loquesea',
    '/sitemap.xml',
    '/music/no-existe.m4a',
    '/product/%E0%A4%A',
    '',
    'cart',
    '//cart',
    '//',
    '/cart//extra',
    '/%2Fcart',
  ])('%s no es una ruta de la aplicación', (pathname) => {
    expect(matchRoute(pathname)).toBeNull();
  });

  it('las páginas legales solo existen con sus slugs', () => {
    for (const slug of LEGAL_SLUGS) expect(matchRoute(`/legal/${slug}`)?.route.id).toBe('legal');
    expect(LEGAL_SLUGS).toEqual(['aviso-legal', 'privacidad', 'cookies', 'compra']);
  });

  it('cada ruta tiene un identificador y un patrón únicos', () => {
    expect(new Set(APP_ROUTES.map((route) => route.id)).size).toBe(APP_ROUTES.length);
    expect(new Set(APP_ROUTES.map((route) => route.path)).size).toBe(APP_ROUTES.length);
  });
});

describe('URL canónica', () => {
  it.each([
    ['/', '/'],
    ['/crew', '/crew'],
    ['/crew/', '/crew'],
    ['/CREW', '/crew'],
    ['/rockyia', '/rockyIA'],
    ['/products', '/'],
    ['/products/', '/'],
    ['/products/rocky-drop-4', '/products/rocky-drop-4'],
    ['/product/rocky-racing', '/product/rocky-racing'],
    ['/product/rocky-racing/', '/product/rocky-racing'],
    ['/legal/cookies', '/legal/cookies'],
  ])('la de %s es %s', (pathname, canonical) => {
    expect(canonicalPath(pathname)).toBe(canonical);
  });

  it('una categoría sin forma de handle no tiene canónica: el cliente la sustituye', () => {
    expect(canonicalPath('/products/ROCKY%20DROP%204')).toBeNull();
    expect(canonicalPath('/products/Rocky-Drop-4')).toBeNull();
  });

  it('una ruta desconocida no tiene canónica', () => {
    expect(canonicalPath('/loquesea')).toBeNull();
    expect(canonicalPath('/legal/loquesea')).toBeNull();
  });

  it('vuelve a codificar el parámetro: nada de la petición llega crudo a una cabecera', () => {
    expect(canonicalPath('/product/a%3E%0D%0Ab')).toBe('/product/a%3E%0D%0Ab');
    expect(canonicalPath('/product/caf%C3%A9')).toBe('/product/caf%C3%A9');
  });

  it('la URL completa lleva el origen sin barra final y sin parámetros', () => {
    expect(canonicalUrl('https://rocky035.com', '/crew/')).toBe('https://rocky035.com/crew');
    expect(canonicalUrl('https://rocky035.com/', '/')).toBe('https://rocky035.com/');
    expect(canonicalUrl('https://rocky035.com', '/loquesea')).toBeNull();
  });
});
