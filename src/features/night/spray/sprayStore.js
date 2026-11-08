import { STORAGE_KEYS } from '../../../config/storageKeys.js';
import { readJson, writeJson } from '../../../utils/storage.js';

/* Las pintadas de cada visitante, guardadas en su navegador: vuelven la
   próxima noche en la misma página. Una sola clave para todas las páginas,
   así se puede poner techo al total (localStorage ronda los 5 MB).

   { v: 1, pages: { '/crew': { t: 1790000000000, strokes: [...] } } }
   Trazo: { c: color, s: semilla, p: [dx, y, dx, y…], d: [[dx, y, largo]…] } */

const VERSION = 1;
export const MAX_POINTS_PER_PAGE = 6000;
export const MAX_PAGES = 12;

function readAll() {
  const saved = readJson(STORAGE_KEYS.spray, null);
  if (!saved || saved.v !== VERSION || typeof saved.pages !== 'object' || !saved.pages) {
    return { v: VERSION, pages: {} };
  }
  return saved;
}

function isStroke(stroke) {
  return (
    stroke &&
    Number.isInteger(stroke.c) &&
    Number.isFinite(stroke.s) &&
    Array.isArray(stroke.p) &&
    stroke.p.length >= 2 &&
    stroke.p.length % 2 === 0 &&
    stroke.p.every(Number.isFinite)
  );
}

export function loadPage(pathname) {
  const page = readAll().pages[pathname];
  return Array.isArray(page?.strokes) ? page.strokes.filter(isStroke) : [];
}

// Si una página se pasa de puntos, se van primero los trazos más viejos.
function trimmed(strokes) {
  const kept = [];
  let points = 0;
  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    const size = strokes[index].p.length / 2;
    if (points + size > MAX_POINTS_PER_PAGE && kept.length) break;
    kept.unshift(strokes[index]);
    points += size;
  }
  return kept;
}

export function savePage(pathname, strokes, now = Date.now()) {
  const all = readAll();
  if (strokes.length === 0) {
    delete all.pages[pathname];
  } else {
    all.pages[pathname] = { t: now, strokes: trimmed(strokes) };
  }
  // Techo de páginas: fuera las que llevan más tiempo sin pintarse.
  const byAge = Object.entries(all.pages).sort(([, a], [, b]) => b.t - a.t);
  all.pages = Object.fromEntries(byAge.slice(0, MAX_PAGES));
  return writeJson(STORAGE_KEYS.spray, all);
}
