import { SITE_ORIGIN } from './links.js';

// Datos del titular de la tienda para las páginas legales. Un único sitio
// para cambiarlos. Los valores que empiezan por «PENDIENTE» no se han
// rellenado todavía: hay que ponerlos antes de abrir la web al público.
export const LEGAL_ENTITY = Object.freeze({
  nombreComercial: 'ROCKY 035',
  titular: 'PENDIENTE: nombre y apellidos o razón social',
  nif: 'PENDIENTE: NIF',
  domicilio: 'PENDIENTE: domicilio a efectos de notificaciones',
  email: 'hola@rocky035.com',
  web: SITE_ORIGIN,
});

export const LEGAL_PAGES = Object.freeze([
  { slug: 'aviso-legal', title: 'Aviso legal' },
  { slug: 'privacidad', title: 'Privacidad' },
  { slug: 'cookies', title: 'Cookies' },
  { slug: 'compra', title: 'Compras y devoluciones' },
]);

export const legalPath = (slug) => `/legal/${slug}`;

export function isLegalEntityComplete(entity = LEGAL_ENTITY) {
  return !Object.values(entity).some((value) => String(value).startsWith('PENDIENTE'));
}
