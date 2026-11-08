import { afterEach, describe, expect, it } from 'vitest';
import { MAX_PAGES, MAX_POINTS_PER_PAGE, loadPage, savePage } from './sprayStore.js';
import { STORAGE_KEYS } from '../../../config/storageKeys.js';

const stroke = (points, seed = 1) => ({
  c: 0,
  s: seed,
  p: Array.from({ length: points * 2 }, (_, index) => index),
  d: [],
});

afterEach(() => localStorage.clear());

describe('Las pintadas guardadas', () => {
  it('vuelven en la misma página y en ninguna otra', () => {
    savePage('/crew', [stroke(3)]);
    expect(loadPage('/crew')).toEqual([stroke(3)]);
    expect(loadPage('/estudio')).toEqual([]);
  });

  it('borrar la pared la quita del todo', () => {
    savePage('/crew', [stroke(3)]);
    savePage('/crew', []);
    expect(loadPage('/crew')).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.spray)).pages).toEqual({});
  });

  it('si una página se pasa de puntos se van primero los trazos más viejos', () => {
    const viejo = stroke(MAX_POINTS_PER_PAGE - 10, 1);
    const nuevo = stroke(100, 2);
    savePage('/', [viejo, nuevo]);
    expect(loadPage('/')).toEqual([nuevo]);
  });

  it('guarda como mucho unas cuantas páginas: fuera las que llevan más sin pintarse', () => {
    for (let index = 0; index <= MAX_PAGES; index += 1) {
      savePage(`/pagina-${index}`, [stroke(2)], 1000 + index);
    }
    expect(loadPage('/pagina-0')).toEqual([]);
    expect(loadPage(`/pagina-${MAX_PAGES}`)).toHaveLength(1);
  });

  it('lo corrupto o de otra versión no rompe nada', () => {
    localStorage.setItem(STORAGE_KEYS.spray, '{no es json');
    expect(loadPage('/')).toEqual([]);
    localStorage.setItem(
      STORAGE_KEYS.spray,
      JSON.stringify({
        v: 1,
        pages: { '/': { t: 1, strokes: [{ c: 0, s: 1, p: [1] }, stroke(2)] } },
      })
    );
    expect(loadPage('/')).toEqual([stroke(2)]);
  });
});
