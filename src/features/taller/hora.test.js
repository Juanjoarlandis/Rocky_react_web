import { describe, expect, it } from 'vitest';
import { horaMadridAIso, isoAHoraMadrid } from './hora.js';

describe('hora de Madrid en el formulario del Taller', () => {
  it('convierte la hora local de Madrid a ISO con su zona, en invierno y en verano', () => {
    expect(horaMadridAIso('2026-11-12T20:00')).toBe('2026-11-12T20:00:00+01:00');
    expect(horaMadridAIso('2026-07-10T20:00')).toBe('2026-07-10T20:00:00+02:00');
  });

  it('respeta el cambio de hora de octubre y de marzo', () => {
    expect(horaMadridAIso('2026-10-25T04:00')).toBe('2026-10-25T04:00:00+01:00');
    expect(horaMadridAIso('2026-03-29T04:00')).toBe('2026-03-29T04:00:00+02:00');
  });

  it('vacío es sin fecha', () => {
    expect(horaMadridAIso('')).toBe(null);
    expect(horaMadridAIso(undefined)).toBe(null);
    expect(isoAHoraMadrid(null)).toBe('');
  });

  it('enseña en el campo la hora de Madrid de una fecha ISO cualquiera', () => {
    expect(isoAHoraMadrid('2026-11-12T19:00:00Z')).toBe('2026-11-12T20:00');
    expect(isoAHoraMadrid('2026-11-12T20:00:00+01:00')).toBe('2026-11-12T20:00');
  });

  it('ida y vuelta', () => {
    expect(isoAHoraMadrid(horaMadridAIso('2026-12-31T23:30'))).toBe('2026-12-31T23:30');
  });
});
