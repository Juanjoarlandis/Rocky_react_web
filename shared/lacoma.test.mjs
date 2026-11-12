import { describe, expect, it } from 'vitest';
import { ALTO, ANCHO, ENCUADRE, proyectar } from './lacoma.mjs';

/* El encuadre de Lacoma (barrio-en-mapa): de latitud y longitud al dibujo de 1000 × 620. */
describe('el encuadre de Lacoma', () => {
  it('las esquinas del encuadre son las esquinas del dibujo', () => {
    expect(proyectar(ENCUADRE.norte, ENCUADRE.oeste)).toEqual({ x: 0, y: 0 });
    expect(proyectar(ENCUADRE.sur, ENCUADRE.este)).toEqual({ x: ANCHO, y: ALTO });
  });

  it('el metro Lacoma cae donde lo pinta el plano', () => {
    // Nodo de OpenStreetMap 5304690747, la estación de Lacoma.
    const { x, y } = proyectar(40.4851113, -3.7231023);

    expect(Math.round(x)).toBe(423);
    expect(Math.round(y)).toBe(231);
  });

  it('el dibujo guarda la proporción del terreno: unos 1150 × 710 m', () => {
    const anchoKm =
      (ENCUADRE.este - ENCUADRE.oeste) *
      111.32 *
      Math.cos((((ENCUADRE.norte + ENCUADRE.sur) / 2) * Math.PI) / 180);
    const altoKm = (ENCUADRE.norte - ENCUADRE.sur) * 111.13;

    expect(anchoKm / altoKm).toBeCloseTo(ANCHO / ALTO, 1);
  });
});
