// SONDAS DEL MUÑECO CURIOSO — todo lo que mide la página de verdad.
// Lee rectángulos, estilos calculados y `elementFromPoint`; la aritmética de
// dónde cabe vive en `geometry.js`, que no sabe que existe un documento.

import {
  artBox,
  biteEdge,
  clamp,
  inflate,
  placeAtCorner,
  placeOnEdge,
  shadowExtents,
  topEdgeOf,
} from './geometry.js';

// Bloques de la página con canto suficiente para agarrarse a él.
export const SPOT_SELECTOR =
  'section, article, aside, figure, form, table, nav, header, footer, ' +
  'ul[class], ol[class], li[class], a[class], div[class]';

/* Elementos flotantes que no debe tapar aunque queden por encima de él.

   El contrato oficial es el atributo `data-peeker-blocked`: cualquier
   componente que no quiera al muñeco encima lo pone en su raíz y listo, sin
   que este módulo tenga que conocer sus clases. Las clases de la lista se
   conservan por los componentes que aún no llevan el atributo (navbar, radio,
   redactor del chat y cabecera editorial de la portada). */
export const BLOCKED_ATTRIBUTE = 'data-peeker-blocked';
export const BLOCKED_SELECTOR =
  `[${BLOCKED_ATTRIBUTE}], .navbar, .mini-player, .chat-composer, .product-page-head--home, ` +
  '.placeholder-tee__label, .badge, .product-actions, .add-to-cart-control';

/* Tope de bloques a los que se les lee el estilo calculado, que es lo caro.
   El rectángulo se lee de todos —es barato— y sólo llegan hasta aquí los que
   asoman por la pantalla, así que en una página larga (Crew) la parte de
   abajo es candidata igual que la de arriba cuando el usuario baja hasta ella. */
export const MAX_SPOT_NODES = 500;
const SAFE_GAP = 6;
// Hasta dónde busca el trazo real del canto y cuánto lo muerde al agarrarse.
const MAX_PROBE = 34;
const EDGE_BITE = 2;
// Lo que no es canto de un componente: si pinta el tramo que tapa al muñeco, se
// le vería el recorte de la imagen en vez del borde del bloque.
const MEDIA_SELECTOR = 'img, picture, svg, canvas, video';
// Los dibujos sueltos de la página (03-utilities.css): van encima de los bloques.
const DOODLE_SELECTOR = '.doodle';
// A qué profundidad del canto se mira qué hay pintado.
const EDGE_SAMPLE = 4;

/* Zona útil de la pantalla: por debajo de la barra y por encima del borde. */
export function readViewport() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  const navbar = document.querySelector('.navbar');
  const navRect = navbar?.getBoundingClientRect();
  const top = navRect && navRect.top <= 2 ? navRect.bottom + SAFE_GAP : SAFE_GAP;
  return { width, height, top, bottom: height - SAFE_GAP };
}

/* Solo cuenta el color de fondo. Una imagen de fondo (el punteado del cuaderno,
   un garabato, una textura) se transparenta entre sus trazos, y detrás de eso el
   recorte del muñeco quedaría en el aire. */
function hasOwnBackground(style) {
  const channels = style.backgroundColor.match(/[\d.]+/g);
  return Boolean(channels) && (channels.length < 4 || Number(channels[3]) >= 0.9);
}

/* Una franja interior no pinta fondo, pero si vive dentro de un bloque opaco
   que la contiene entera, ahí no se transparenta nada. */
function sitsOnOpaqueBlock(element, rect) {
  let parent = element.parentElement;
  for (let hop = 0; parent && hop < 6; hop += 1) {
    const box = parent.getBoundingClientRect();
    if (
      hasOwnBackground(window.getComputedStyle(parent)) &&
      box.left <= rect.left + 1 &&
      box.right >= rect.right - 1 &&
      box.top <= rect.top + 1 &&
      box.bottom >= rect.bottom - 1
    ) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/* ¿Hay una línea dibujada en su canto de arriba? Puede ser su propio borde o el
   de abajo del hermano que tiene justo encima —así es como están hechos los
   separadores de las tarjetas de ROCKY—. Sin línea no hay nada a lo que
   agarrarse y el muñeco quedaría colgado de un canto invisible. Devuelve quién
   pinta la línea, o null si no hay. */
function lineAbove(element, rect) {
  const own = parseFloat(window.getComputedStyle(element).borderTopWidth);
  if (own >= 1) return element;
  const previous = element.previousElementSibling;
  if (!previous) return null;
  const above = previous.getBoundingClientRect();
  if (Math.abs(above.bottom - rect.top) > 2) return null;
  return parseFloat(window.getComputedStyle(previous).borderBottomWidth) >= 1 ? previous : null;
}

/* Devuelve cómo sirve de escondite el bloque, o null si no sirve.
   `topOnly` marca las franjas interiores: valen para asomarse por su canto
   superior, pero no para las esquinas, porque sus laterales no están pintados.
   `lineOwner` es quien dibuja la línea de ese canto: es parte del componente. */
function surfaceOf(element, rect) {
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || Number(style.opacity) < 0.9) return null;
  const shadow = shadowExtents(style.boxShadow);

  if (hasOwnBackground(style)) return { shadow, topOnly: false, lineOwner: null };
  const lineOwner = lineAbove(element, rect);
  if (lineOwner && sitsOnOpaqueBlock(element, rect)) {
    return { shadow, topOnly: true, lineOwner };
  }
  return null;
}

/* Sólo sirven de escondite los bloques opacos: si se transparentan se le vería
   el recorte. Y tienen que ser más grandes que él —más altos y vez y media más
   anchos—, porque detrás de un botón o de la píldora de la radio no se esconde
   nadie: se lee como que está delante, no detrás. */
export function collectSpots(view, scale) {
  const art = artBox(scale);
  const minWidth = Math.round(art.width * 1.5);
  const minHeight = art.height;
  const spots = [];
  let examined = 0;

  for (const element of document.querySelectorAll(SPOT_SELECTOR)) {
    if (examined >= MAX_SPOT_NODES) break;

    // Primero lo barato: fuera de pantalla o pequeño, no hay nada que mirar.
    const rect = element.getBoundingClientRect();
    if (rect.bottom < view.top + 24 || rect.top > view.bottom - 24) continue;
    if (rect.width < minWidth || rect.height < minHeight) continue;
    if (rect.height > view.height * 1.35) continue;
    if (rect.width > view.width * 0.99 && rect.height > view.height * 0.85) continue;
    if (element.closest('.curious-peeker')) continue;

    examined += 1;
    const surface = surfaceOf(element, rect);
    if (!surface) continue;

    spots.push({
      element,
      rect,
      shadow: surface.shadow,
      topOnly: surface.topOnly,
      lineOwner: surface.lineOwner,
      bulk: inflate(rect, surface.shadow),
    });
  }

  return spots;
}

export function readBlockedZones() {
  return [...document.querySelectorAll(BLOCKED_SELECTOR)]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return { rect, shadow: shadowExtents(style.boxShadow) };
    })
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .map(({ rect, shadow }) => inflate(rect, shadow));
}

/* Camina desde el rectángulo del navegador hacia dentro (paso `[dx, dy]`) hasta
   el trazo pintado del bloque. Devuelve el primer punto del bloque
   (`{ depth, hit, x, y }`) o null si no llega en MAX_PROBE px. Con
   `stopAtForeign`, se rinde (`{ foreign: true }`) al topar con algo que no es ni
   el bloque ni uno de sus contenedores: otra cosa le tapa el canto. Lo que está
   dentro de `ownLine` (quien dibuja la línea del canto) no es ajeno: se cruza. */
function walkToEdge(element, [x0, y0], [dx, dy], { stopAtForeign = false, ownLine = null } = {}) {
  for (let depth = 0; depth <= MAX_PROBE; depth += 1) {
    const x = Math.round(x0 + dx * depth);
    const y = Math.round(y0 + dy * depth);
    const hit = document.elementFromPoint(x, y);
    if (hit && (hit === element || element.contains(hit))) return { depth, hit, x, y };
    const foreign = hit && !hit.contains(element) && !ownLine?.contains(hit);
    if (stopAtForeign && foreign) return { foreign: true };
  }
  return null;
}

// Desde qué punto y hacia dónde se camina para cada canto.
const INWARD = Object.freeze({
  left: (rect, along) => [
    [rect.left, along],
    [1, 0],
  ],
  right: (rect, along) => [
    [rect.right, along],
    [-1, 0],
  ],
  top: (rect, along) => [
    [along, rect.top],
    [0, 1],
  ],
  bottom: (rect, along) => [
    [along, rect.bottom],
    [0, -1],
  ],
});

/* Los cantos de ROCKY están dibujados a mano: las tarjetas van giradas y las
   esquinas son irregulares, así que el rectángulo del navegador cae por fuera
   del trazo y el muñeco parecería flotar. Se palpa el trazo pintado de verdad
   caminando hacia dentro del bloque y se usa el punto más hondo. */
export function probeEdge(element, rect, side, samples) {
  if (typeof document.elementFromPoint !== 'function') return 0;
  let deepest = null;
  samples.forEach((along) => {
    const edge = walkToEdge(element, ...INWARD[side](rect, Math.round(along)));
    if (edge && (deepest === null || edge.depth > deepest)) deepest = edge.depth;
  });
  return deepest ?? 0;
}

/* Palpa los cantos que toca esta colocación y devuelve cuánto hay que meterse.
   Arriba y por el lateral muerde un par de píxeles, para que las manos queden
   por delante del bloque. Por la base no muerde: la suela se apoya en la línea,
   y subirla dejaría hueco entre la zapatilla y el canto. */
export function measureBite(element, placement) {
  const rect = element.getBoundingClientRect();
  if (placement.pose === 'arriba') {
    const xs = [0.15, 0.35, 0.5, 0.65, 0.85].map((f) => placement.left + placement.width * f);
    // Baja hasta el trazo de arriba: la ventana se mete en el bloque.
    return { x: 0, y: probeEdge(element, rect, 'top', xs) + EDGE_BITE };
  }

  const height = placement.height;
  const ys = [0.2, 0.4, 0.6].map((f) => placement.top + height * f);
  const side = placement.side === 'izq' ? 'left' : 'right';
  const inward = placement.side === 'izq' ? 1 : -1;
  const xs = [5, 12, 20].map((d) => rect[side] + d * inward);
  // La base sube hasta el trazo pintado —en las esquinas de ROCKY se curva
  // mucho— y un píxel de vuelta para que la suela no despegue de la línea. Aquí
  // la sombra no cuenta: cae por debajo del bloque, y el muñeco ya está fuera
  // de él, así que no tiene sombra debajo sobre la que apoyarse.
  return {
    x: probeEdge(element, rect, side, ys) + EDGE_BITE,
    y: 1 - probeEdge(element, rect, 'bottom', xs),
  };
}

/* Rectángulos de lo que no es canto: las imágenes del bloque y los dibujos
   visibles de la página. Un dibujo transparente o sin caja no tapa nada. */
function paintedMediaBoxes(element) {
  const nodes = new Set([
    ...element.querySelectorAll(MEDIA_SELECTOR),
    ...document.querySelectorAll(DOODLE_SELECTOR),
  ]);
  return [...nodes]
    .filter((node) => {
      if (!node.classList.contains('doodle')) return true;
      const style = window.getComputedStyle(node);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
    })
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0);
}

// Por dónde se palpa el tramo del canto que tapa a una colocación.
const TOP_SAMPLES = [0.2, 0.4, 0.6, 0.8];
const SIDE_SAMPLES = [0.25, 0.5, 0.75];

function edgeSamples(placement, rect) {
  if (placement.pose === 'arriba') {
    return TOP_SAMPLES.map((f) =>
      INWARD.top(rect, clamp(placement.left + placement.width * f, rect.left + 1, rect.right - 1))
    );
  }
  const side = placement.side === 'izq' ? 'left' : 'right';
  return SIDE_SAMPLES.map((f) =>
    INWARD[side](rect, clamp(placement.top + placement.height * f, rect.top + 1, rect.bottom - 1))
  );
}

/* La banda del canto que tapa al muñeco, de fuera hasta `depth` px adentro.
   Asomado por arriba se agarra al canto casi de punta a punta (su dibujo es
   opaco del 1 al 99 % del ancho en la base), así que cuenta todo su ancho; en la
   esquina, el mismo tramo central que se palpa. */
function edgeBand(placement, rect, depth) {
  if (placement.pose === 'arriba') {
    return {
      left: Math.max(rect.left, placement.left),
      right: Math.min(rect.right, placement.left + placement.width),
      top: rect.top,
      bottom: rect.top + depth,
    };
  }
  const along = (f) => clamp(placement.top + placement.height * f, rect.top, rect.bottom);
  const top = along(SIDE_SAMPLES[0]);
  const bottom = along(SIDE_SAMPLES[SIDE_SAMPLES.length - 1]);
  return placement.side === 'izq'
    ? { left: rect.left, right: rect.left + depth, top, bottom }
    : { left: rect.right - depth, right: rect.right, top, bottom };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/* ¿El tramo del canto que tapa al muñeco lo pinta el propio bloque? Se busca el
   trazo hacia dentro, como probeEdge (las tarjetas van giradas y con el borde a
   mano), y se mira qué hay justo ahí y un poco más adentro. Se veta si es una
   imagen —la foto de una tarjeta ocupa su canto de arriba— o si otra cosa tapa
   el canto: el muñeco saldría partido por el recorte de la imagen. La línea del
   canto de una franja la puede pintar su hermano de arriba (la foto, con su
   borde inferior): eso es del componente y se cruza. Las imágenes del bloque y
   los dibujos de la página se miran también por geometría, en toda la banda del
   canto, porque llevan pointer-events: none y elementFromPoint no los ve; los de
   una repisa (.doodle-shelf) son hermanos del bloque, no hijos. Sin
   elementFromPoint (jsdom) no veta nada. */
export function edgeIsPainted(placement, spot) {
  if (typeof document.elementFromPoint !== 'function' || !spot?.element) return true;
  const { element, rect } = spot;
  const ownLine = spot.lineOwner && spot.lineOwner !== element ? spot.lineOwner : null;
  let deepest = 0;

  const painted = edgeSamples(placement, rect).every(([start, step]) => {
    const edge = walkToEdge(element, start, step, { stopAtForeign: true, ownLine });
    if (!edge || edge.foreign) return false;
    const x = edge.x + step[0] * EDGE_SAMPLE;
    const y = edge.y + step[1] * EDGE_SAMPLE;
    const inner = document.elementFromPoint(Math.round(x), Math.round(y));
    if (edge.hit.closest(MEDIA_SELECTOR) || inner?.closest(MEDIA_SELECTOR)) return false;
    deepest = Math.max(deepest, edge.depth);
    return true;
  });
  if (!painted) return false;

  const band = edgeBand(placement, rect, deepest + EDGE_SAMPLE + 1);
  return !paintedMediaBoxes(element).some((box) => overlaps(box, band));
}

/* Vuelve a calcular la colocación desde el rectángulo actual del escondite. */
export function refreshPlacement(active, view) {
  if (!active.element) return null;
  const rect = active.element.getBoundingClientRect();
  const next =
    active.pose === 'arriba'
      ? placeOnEdge(topEdgeOf(rect, active.shadow), view, active.scale, active.alongRatio)
      : placeAtCorner(rect, active.side, view, active.scale, active.shadow);
  return next ? biteEdge(next, active.bite) : null;
}
