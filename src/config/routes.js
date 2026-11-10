import { APP_ROUTES } from '../../shared/routes.mjs';

// Las rutas de la SPA salen de la tabla que comparte con el servidor
// (shared/routes.mjs): aquí no se escribe ninguna a mano.

// El patrón de cada ruta, para los <Route> de App.
export const ROUTE_PATHS = Object.freeze(
  Object.fromEntries(APP_ROUTES.map((route) => [route.id, route.path]))
);

// Destinos de los enlaces: nada de literales sueltos.
export const ROUTES = Object.freeze({
  home: ROUTE_PATHS.home,
  drops: ROUTE_PATHS.drops,
  cart: ROUTE_PATHS.cart,
  chat: ROUTE_PATHS.chat,
  studio: ROUTE_PATHS.studio,
  crew: ROUTE_PATHS.crew,
  myCrew: ROUTE_PATHS.myCrew,
  taller: ROUTE_PATHS.taller,
  category: (handle) => `/products/${encodeURIComponent(handle)}`,
  product: (handle) => `/product/${encodeURIComponent(handle)}`,
});

// Login de cuenta de cliente en Shopify, con vuelta a la ruta indicada.
export function accountLoginUrl(returnPath = ROUTES.myCrew) {
  return `/api/shopify/account/login?returnPath=${encodeURIComponent(returnPath)}`;
}
