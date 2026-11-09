// DROPS DE DEMOSTRACIÓN — el muro sin tienda configurada.
//
// Sin Shopify la web enseña el catálogo de muestra y los conceptos de vista
// previa. Aquí se reparten en tres drops con fechas relativas a `now`, uno por
// estado, para que el muro se vea entero. Ninguno permite pagar: en modo demo no
// hay checkout.

import {
  CONFIG_STATUS,
  DROP_CONFIG_VERSION,
  featuredDrop,
  publicDrop,
  sortForWall,
} from './drops.mjs';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const DEMO_DROPS = Object.freeze([
  {
    handle: 'rocky-drop-4',
    title: 'ROCKY DROP 4',
    number: 4,
    tagline: 'Lo que viene. Cuando vuelan, vuelan.',
    story: 'El drop 4 de la crew, bajo llave hasta el día.',
    // Dentro de tres días, a en punto.
    launch: (now) => Math.ceil((now + 3 * DAY) / HOUR) * HOUR,
    ends: () => null,
  },
  {
    handle: 'colmena-signal',
    title: 'COLMENA SIGNAL',
    number: 3,
    tagline: 'La señal sale de la colmena.',
    story: 'Conceptos de la crew con la radio puesta. Vista previa, sin stock real.',
    launch: (now) => now - 2 * DAY,
    ends: () => null,
  },
  {
    handle: 'asphalt-afterdark',
    title: 'ASPHALT AFTERDARK',
    number: 2,
    tagline: 'De noche y en asfalto.',
    story: 'El drop de las carreras nocturnas. Ya voló.',
    launch: (now) => now - 40 * DAY,
    ends: (now) => now - 10 * DAY,
  },
]);

const iso = (time) => (time === null ? null : new Date(time).toISOString());

/* Devuelve lo mismo que GET /api/drops: { now, featured, drops }. */
export function createDemoDrops({ products = [], now = new Date() } = {}) {
  const time = now.getTime();
  const drops = DEMO_DROPS.map((demo) =>
    publicDrop(
      {
        handle: demo.handle,
        title: demo.title,
        poster: null,
        config: {
          version: DROP_CONFIG_VERSION,
          number: demo.number,
          tagline: demo.tagline,
          story: demo.story,
          launchAt: iso(demo.launch(time)),
          endsAt: iso(demo.ends(time)),
          status: CONFIG_STATUS.SCHEDULED,
        },
        // Los conceptos no tienen stock real: no se cuentan como agotados.
        designs: products
          .filter((product) => product.dropHandle === demo.handle)
          .map((product) => ({ handle: product.handle, availableForSale: true })),
      },
      now
    )
  ).filter(Boolean);
  const ordered = sortForWall(drops);
  return { now: now.toISOString(), featured: featuredDrop(ordered), drops: ordered };
}
