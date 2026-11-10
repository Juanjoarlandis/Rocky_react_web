// Las rutas de la aplicación, en un solo sitio para el cliente y el servidor
// (seo-y-cache): `src/App.jsx` pinta exactamente estas y `server/http/static.mjs`
// responde 200 solo a estas. Sin dependencias de Node ni del navegador.

export const LEGAL_SLUGS = Object.freeze(['aviso-legal', 'privacidad', 'cookies', 'compra']);

// Un handle de Shopify: minúsculas, cifras y guiones.
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* `path` es el patrón de React Router. `only` limita un parámetro a una lista
   cerrada; `canonical` calcula la ruta canónica a partir de los parámetros
   (por defecto, el propio patrón con sus parámetros codificados). */
export const APP_ROUTES = Object.freeze([
  { id: 'home', path: '/' },
  {
    id: 'catalog',
    path: '/products/:category?',
    // El listado sin categoría es la portada, y una categoría solo tiene la
    // URL de su handle: abierta por su nombre no declara canónica.
    canonical: ({ category }) =>
      category === undefined
        ? '/'
        : HANDLE.test(category)
          ? `/products/${encodeURIComponent(category)}`
          : null,
  },
  { id: 'drops', path: '/menudrop' },
  { id: 'cart', path: '/cart' },
  { id: 'product', path: '/product/:productId' },
  { id: 'chat', path: '/rockyIA' },
  { id: 'studio', path: '/estudio' },
  { id: 'crew', path: '/crew' },
  { id: 'myCrew', path: '/mi-crew' },
  { id: 'legal', path: '/legal/:page', only: { page: LEGAL_SLUGS } },
  { id: 'taller', path: '/taller' },
]);

const segmentsOf = (path) => path.split('/').filter(Boolean);

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function matchPattern(route, segments) {
  const pattern = segmentsOf(route.path);
  const params = {};
  if (segments.length > pattern.length) return null;
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index];
    const actual = segments[index];
    if (!expected.startsWith(':')) {
      // Como React Router: los tramos fijos no distinguen mayúsculas y pueden
      // venir escritos con %XX («/c%61rt» es «/cart»).
      const fixed = actual === undefined ? null : decode(actual);
      if (fixed === null || fixed.toLowerCase() !== expected.toLowerCase()) return null;
      continue;
    }
    const optional = expected.endsWith('?');
    const name = expected.slice(1, optional ? -1 : undefined);
    if (actual === undefined) {
      if (!optional) return null;
      continue;
    }
    const value = decode(actual);
    if (value === null) return null;
    if (route.only?.[name] && !route.only[name].includes(value)) return null;
    params[name] = value;
  }
  return params;
}

/* La ruta de la aplicación que pinta `pathname` y sus parámetros, o null si
   la aplicación no la conoce. Admite barras finales de más, como el router. */
export function matchRoute(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return null;
  }
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  // Un tramo vacío en medio («/a//b») no es de ninguna ruta.
  if (
    trimmed !== '/' &&
    trimmed
      .slice(1)
      .split('/')
      .some((segment) => segment === '')
  )
    return null;
  const segments = segmentsOf(trimmed);
  for (const route of APP_ROUTES) {
    const params = matchPattern(route, segments);
    if (params) return { route, params };
  }
  return null;
}

function fillPattern(route, params) {
  const filled = segmentsOf(route.path)
    .map((segment) => {
      if (!segment.startsWith(':')) return segment;
      const name = segment.replace(/^:|\?$/g, '');
      return params[name] === undefined ? null : encodeURIComponent(params[name]);
    })
    .filter((segment) => segment !== null);
  return `/${filled.join('/')}`;
}

/* La ruta canónica de `pathname`: sin barra final, con la grafía de la tabla y
   con los parámetros vueltos a codificar. Null si la ruta no existe o si no
   tiene canónica propia. */
export function canonicalPath(pathname) {
  const match = matchRoute(pathname);
  if (!match) return null;
  return match.route.canonical
    ? match.route.canonical(match.params)
    : fillPattern(match.route, match.params);
}

// La URL canónica completa: el origen público más la ruta canónica.
export function canonicalUrl(origin, pathname) {
  const path = canonicalPath(pathname);
  return path === null ? null : `${String(origin).replace(/\/+$/, '')}${path}`;
}
