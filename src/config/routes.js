// Rutas de la SPA y del BFF en un solo sitio: nada de literales sueltos.
export const ROUTES = Object.freeze({
  home: '/',
  drops: '/menudrop',
  cart: '/cart',
  chat: '/rockyIA',
  studio: '/estudio',
  crew: '/crew',
  myCrew: '/mi-crew',
  category: (handle) => `/products/${encodeURIComponent(handle)}`,
  product: (handle) => `/product/${encodeURIComponent(handle)}`,
});

// Login de cuenta de cliente en Shopify, con vuelta a la ruta indicada.
export function accountLoginUrl(returnPath = ROUTES.myCrew) {
  return `/api/shopify/account/login?returnPath=${encodeURIComponent(returnPath)}`;
}
