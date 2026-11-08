import { describe, expect, it } from 'vitest';
import { graffitiFor, wallMargin } from './graffiti.js';

describe('Pintadas de tinta invisible', () => {
  it('cada página tiene las suyas y siempre en el mismo sitio', () => {
    expect(graffitiFor('/crew', 3000, 1366)).toEqual(graffitiFor('/crew', 3000, 1366));
    expect(graffitiFor('/crew', 3000, 1366)).not.toEqual(graffitiFor('/estudio', 3000, 1366));
  });

  it('al crecer la página sólo se añaden por abajo', () => {
    const corta = graffitiFor('/', 1800, 1366);
    const larga = graffitiFor('/', 5200, 1366);
    expect(larga.length).toBeGreaterThan(corta.length);
    expect(larga.slice(0, corta.length)).toEqual(corta);
  });

  it('no repite frase hasta gastar la baraja', () => {
    const textos = graffitiFor('/', 20000, 1366)
      .filter((tag) => tag.kind === 'nota')
      .map((tag) => tag.text)
      .slice(0, 10);
    expect(new Set(textos).size).toBe(textos.length);
  });

  it('se quedan en el margen: lo que no cabe en horizontal sube en vertical', () => {
    const margen = wallMargin(1366);
    for (const tag of graffitiFor('/', 6000, 1366)) {
      if (tag.vertical) expect(tag.kind === 'pinta' || tag.kind === 'nota').toBe(true);
      expect(tag.x).toBeGreaterThanOrEqual(6);
      expect(tag.x).toBeLessThanOrEqual(margen);
    }
  });
});
