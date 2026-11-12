import { ROUTES } from '../../config/routes.js';

/* Adónde lleva el «Visto en» de un cromo (album-sin-enlaces-rotos). Los productos cambian con
   cada drop y con la tienda, así que un cromo que vive en las fichas no guarda ningún handle:
   lleva `anyProductPage` y aquí se elige la primera ficha del catálogo cargado. Sin catálogo
   se queda en su `to`, la tienda, donde se abren las fichas. */
export function vistoEnTo(vistoEn, products = []) {
  if (!vistoEn?.anyProductPage) return vistoEn?.to;
  const handle = products?.[0]?.handle;
  return handle ? ROUTES.product(handle) : vistoEn.to;
}
