import { describe, expect, it } from 'vitest';
import { isAllowedText } from './beats-filter.mjs';

describe('Filtro del ranking de beats', () => {
  it('deja pasar el tono de la calle y los nombres normales', () => {
    for (const text of [
      'Joder qué bajo',
      'Mierda buena',
      'Computadora 035',
      'Sexy loop',
      'BZZZZZ',
      'El Tachón',
      'Beat #3',
    ]) {
      expect(isAllowedText(text)).toBe(true);
    }
  });

  it('para insultos, lo sexual y el odio, aunque vengan disfrazados', () => {
    for (const text of [
      'maricón',
      'M4r1c0n',
      'p u t a',
      'P.U.T.A',
      'hijo de puta',
      'porno',
      'nazis',
    ]) {
      expect(isAllowedText(text)).toBe(false);
    }
  });

  it('para enlaces, cuentas y teléfonos, que son la puerta del spam', () => {
    for (const text of ['www.algo', 'mira algo.com', '@rocky', '600123456', 'http beat']) {
      expect(isAllowedText(text)).toBe(false);
    }
  });
});
