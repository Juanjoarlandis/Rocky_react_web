import { proyectar } from '../../../shared/lacoma.mjs';

/* LACOMA (barrio-en-mapa): los cuatro sitios del barrio que dio el usuario y quién vive en cada
   uno. Cada sitio está en su punto real (`lat`, `lon`; de dónde sale cada uno, en el design.md
   del cambio) y abre una sección de la web. Los vecinos salen del «visto en» de cada cromo del
   álbum (src/data/crew.js), así que el mapa no se desincroniza de él. `carta` es dónde va el
   centro de la tarjeta en el dibujo (1000 × 620): si dos chocan se mueve la tarjeta, nunca el
   punto. */

export const FUERA_DEL_MAPA = 'fuera';

export const LUGARES = Object.freeze([
  {
    id: 'bancos',
    nombre: 'Los bancos de La Salle',
    to: '/',
    seccion: 'La Tienda',
    lat: 40.4842,
    lon: -3.717077,
    carta: [846, 244],
    giro: 1.5,
    cabeza: 'Los Fundadores',
  },
  {
    id: 'mundus',
    nombre: 'Bar Mundus',
    to: '/rockyIA',
    seccion: 'Rocky IA',
    lat: 40.4849508,
    lon: -3.72053,
    carta: [690, 110],
    giro: -1.5,
    cabeza: 'El Portero',
  },
  {
    id: 'callejon',
    nombre: 'El callejón',
    to: '/menudrop',
    seccion: 'Los Drops',
    lat: 40.483911,
    lon: -3.720633,
    carta: [700, 452],
    giro: -1,
    cabeza: 'El Ollie',
  },
  {
    id: 'kebab',
    nombre: 'El kebab',
    to: '/cart',
    seccion: 'El carrito',
    lat: 40.483645,
    lon: -3.72705,
    carta: [230, 488],
    giro: 1,
    cabeza: 'El Paquetes',
  },
]);

const POR_RUTA = new Map(LUGARES.map((lugar) => [lugar.to, lugar.id]));

// Dónde cae el sitio en el dibujo.
export const puntoDe = (lugar) => proyectar(lugar.lat, lugar.lon);

/* A qué sitio pertenece una ruta del «visto en». Las fichas y las categorías son de la tienda;
   el 404 está fuera del mapa; una sección sin sitio (La Colmena) no se pinta. */
export function lugarDe(to) {
  if (typeof to !== 'string') return null;
  if (POR_RUTA.has(to)) return POR_RUTA.get(to);
  if (to.startsWith('/product/') || to.startsWith('/products/')) return POR_RUTA.get('/');
  if (to === '/te-has-perdido') return FUERA_DEL_MAPA;
  return null;
}

/* sitio → nombres de sus vecinos, en el orden del álbum. */
export function vecinosDe(crew) {
  const vecinos = new Map();
  for (const miembro of crew) {
    const lugar = lugarDe(miembro.vistoEn?.to);
    if (!lugar) continue;
    vecinos.set(lugar, [...(vecinos.get(lugar) ?? []), miembro.nombre]);
  }
  return vecinos;
}

/* «A», «A y B», «A, B y C»; con más de tres, «A, B y N más». */
export function resumen(nombres = []) {
  if (nombres.length > 3) return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`;
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}
