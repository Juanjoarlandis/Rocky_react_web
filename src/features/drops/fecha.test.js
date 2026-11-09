import { describe, expect, it } from 'vitest';
import { fechaAccesible, fechaCorta, fechaLarga, horaDeMadrid, quedan } from './fecha.js';

const LANZAMIENTO = '2026-11-13T19:00:00Z'; // 20:00 en Madrid (CET)

describe('fechas del drop en hora de Madrid', () => {
  it('da la fecha larga, la corta y la hora en Madrid aunque llegue en UTC', () => {
    expect(fechaLarga(LANZAMIENTO)).toBe('viernes 13 de noviembre');
    expect(horaDeMadrid(LANZAMIENTO)).toBe('20:00');
    expect(fechaCorta(LANZAMIENTO)).toBe('13·11');
  });

  it('respeta el horario de verano', () => {
    expect(horaDeMadrid('2026-07-10T18:00:00Z')).toBe('20:00');
  });

  it('da la frase completa para lectores de pantalla', () => {
    expect(fechaAccesible(LANZAMIENTO)).toBe(
      'Sale el viernes 13 de noviembre a las 20:00, hora de Madrid.'
    );
  });

  it('dice cuánto queda en horas o en días', () => {
    expect(quedan(30 * 3_600_000)).toBe('quedan 30 h');
    expect(quedan(47.9 * 3_600_000)).toBe('quedan 47 h');
    expect(quedan(50 * 60_000)).toBe('quedan 50 min');
    expect(quedan(3 * 86_400_000 + 3_600_000)).toBe('quedan 3 días');
    expect(quedan(0)).toBe('se acaba ya');
  });
});
