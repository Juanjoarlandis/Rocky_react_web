// SONDAS DEL MUÑECO CURIOSO — todo lo que mide la página de verdad.
// Lee rectángulos, estilos calculados y `elementFromPoint`; la aritmética de
// dónde cabe vive en `geometry.js`, que no sabe que existe un documento.

import {
  artBox,
  biteEdge,
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

/* Zona útil de la pantalla: por debajo de la barra y por encima del borde. */
export function readViewport() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  const navbar = document.querySelector('.navbar');
  const navRect = navbar?.getBoundingClientRect();
  const top = navRect && navRect.top <= 2 ? navRect.bottom + SAFE_GAP : SAFE_GAP;
  return { width, height, top, bottom: height - SAFE_GAP };
}

function hasOwnBackground(style) {
  if (style.backgroundImage !== 'none') return true;
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
   agarrarse y el muñeco quedaría colgado de un canto invisible. */
function hasLineAbove(element, rect) {
  const own = parseFloat(window.getComputedStyle(element).borderTopWidth);
  if (own >= 1) return true;
  const previous = element.previousElementSibling;
  if (!previous) return false;
  const above = previous.getBoundingClientRect();
  if (Math.abs(above.bottom - rect.top) > 2) return false;
  return parseFloat(window.getComputedStyle(previous).borderBottomWidth) >= 1;
}

/* Devuelve cómo sirve de escondite el bloque, o null si no sirve.
   `topOnly` marca las franjas interiores: valen para asomarse por su canto
   superior, pero no para las esquinas, porque sus laterales no están pintados. */
function surfaceOf(element, rect) {
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || Number(style.opacity) < 0.9) return null;
  const shadow = shadowExtents(style.boxShadow);

  if (hasOwnBackground(style)) return { shadow, topOnly: false };
  if (hasLineAbove(element, rect) && sitsOnOpaqueBlock(element, rect)) {
    return { shadow, topOnly: true };
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

/* Los cantos de ROCKY están dibujados a mano: las tarjetas van giradas y las
   esquinas son irregulares, así que el rectángulo del navegador cae por fuera
   del trazo y el muñeco parecería flotar. Se palpa el trazo pintado de verdad
   caminando hacia dentro del bloque y se usa el punto más hondo. */
export function probeEdge(element, rect, side, samples) {
  if (typeof document.elementFromPoint !== 'function') return 0;
  let deepest = null;

  samples.forEach((along) => {
    for (let depth = 0; depth <= MAX_PROBE; depth += 1) {
      const x =
        side === 'left'
          ? rect.left + depth
          : side === 'right'
            ? rect.right - depth
            : Math.round(along);
      const y =
        side === 'top'
          ? rect.top + depth
          : side === 'bottom'
            ? rect.bottom - depth
            : Math.round(along);
      const hit = document.elementFromPoint(Math.round(x), Math.round(y));
      if (hit && (hit === element || element.contains(hit))) {
        if (deepest === null || depth > deepest) deepest = depth;
        return;
      }
    }
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
