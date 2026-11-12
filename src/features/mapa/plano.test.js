import { describe, expect, it } from 'vitest';
import { ALTO, ANCHO } from '../../../shared/lacoma.mjs';
import { PLANO } from './plano.js';

/* El plano horneado de Lacoma (barrio-en-mapa), que genera scripts/plano-lacoma.mjs. */
describe('el plano de Lacoma', () => {
  it('trae vías anchas, calles y parques', () => {
    for (const capa of [PLANO.anchas, PLANO.calles, PLANO.parques]) {
      expect(capa).toMatch(/^M-?\d/);
    }
    expect(PLANO.parques).toMatch(/Z$/);
  });

  it('el metro Lacoma cae en su punto, dentro del dibujo', () => {
    expect(PLANO.metro).toEqual([423, 231]);
  });

  it('no apunta a nada de fuera: ni teselas ni imágenes', () => {
    const todo = JSON.stringify(PLANO);

    expect(todo).not.toMatch(/https?:|url\(|data:/);
  });

  it('rotula cuatro calles, todas dentro del dibujo', () => {
    expect(PLANO.rotulos.map((rotulo) => rotulo.texto).sort()).toEqual([
      'Herrera Oria',
      'Pico Balaitus',
      'Ramón Gómez de la Serna',
      'Valle de Pinares Llanos',
    ]);
    for (const { x, y } of PLANO.rotulos) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(ANCHO);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(ALTO);
    }
  });
});
